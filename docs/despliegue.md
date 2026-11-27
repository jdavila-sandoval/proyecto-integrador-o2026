# Guía de despliegue y resiliencia — EduStream

## 1. Alcance y contexto

Este documento describe la arquitectura de infraestructura, los pasos de despliegue y los procedimientos de resiliencia implementados en **Amazon Web Services (AWS)** para la plataforma EduStream.

El despliegue está optimizado para ejecutarse dentro del entorno restringido de **AWS Learner Lab** (cuenta `735415568412`, perfil IAM `LabRole`), resolviendo los desafíos característicos del entorno:
- Sesiones de laboratorio efímeras de 4 horas con reinicio de IP pública en EC2.
- Restricción de acceso a CloudFront (`AccessDenied`).
- Exigencia de endpoints HTTPS para las URLs de redirección de Amazon Cognito.
- Permisos administrados a través de `LabRole` sin capacidad para crear roles IAM personalizados.

---

## 2. Inventario y diagramas de recursos desplegados en AWS

### Diagramas de arquitectura:
- **Topología general de infraestructura:** [`docs/arquitectura-aws.svg`](arquitectura-aws.svg)
- **Mapa de interacción entre servicios:** [`docs/diagrama-interaccion-servicios-aws.svg`](diagrama-interaccion-servicios-aws.svg)
- **Definición YAML de arquitectura:** [`docs/arquitectura-aws.yaml`](arquitectura-aws.yaml)

### Inventario de servicios y componentes:

| Servicio | Recurso / Identificador | Rol en el sistema |
|---|---|---|
| **Amazon S3** | `edustream-frontend-jdavila` | Alojamiento de la aplicación estática React (Vite) |
| **Amazon S3** | `edustream-videos-storage-jdavila` | Almacenamiento privado de videos con soporte CORS |
| **Amazon API Gateway v2** | `4q76jvcjwa` (`edustream-frontend`) | Proxy HTTPS para servir el frontend estático |
| **Amazon API Gateway v2** | `j72eps3z3f` (`edustream-backend-api`) | Entrada pública HTTPS para la API REST del backend |
| **Amazon EC2** | `i-0da66503c5157fdcd` (`t3.micro`) | Instancia Amazon Linux 2023 con Docker para FastAPI |
| **Security Group** | `sg-0108695f0d2701501` (`edustream-backend-sg`) | Control de tráfico de entrada (puertos 22 y 8000) |
| **Amazon Cognito** | `us-east-1_rNhUTDMSd` (`EduStream_UserPool`) | Directorio de usuarios, grupos y autenticación |
| **Cognito App Client** | `6ihn9phjh33qc2b1i45mrmnptl` (`edustream-web-client`) | Cliente público web OIDC con PKCE |
| **Cognito Domain** | `edustream-auth-jdavila` | Hosted UI para inicio de sesión seguro |
| **Amazon DynamoDB** | `EduStream_Videos` | Tabla de metadatos de videos con TTL activado |
| **Amazon DynamoDB** | `EduStream_Subjects` | Tabla de catálogo de materias académicas |

---

## 3. Despliegue de la infraestructura paso a paso

### Paso 1: Configuración de Amazon Cognito

1. **Creación del User Pool y grupos:**
   ```bash
   aws cognito-idp create-user-pool \
     --pool-name EduStream_UserPool \
     --region us-east-1

   aws cognito-idp create-group --group-name docentes --user-pool-id us-east-1_rNhUTDMSd
   aws cognito-idp create-group --group-name alumnos --user-pool-id us-east-1_rNhUTDMSd
   ```

2. **Creación de usuarios iniciales:**
   ```bash
   # Docente
   aws cognito-idp admin-create-user \
     --user-pool-id us-east-1_rNhUTDMSd \
     --username docente@iteso.mx \
     --user-attributes Name=email,Value=docente@iteso.mx Name=email_verified,Value=true \
     --message-action SUPPRESS

   aws cognito-idp admin-set-user-password \
     --user-pool-id us-east-1_rNhUTDMSd \
     --username docente@iteso.mx \
     --password "Password123!" --permanent

   aws cognito-idp admin-add-user-to-group \
     --user-pool-id us-east-1_rNhUTDMSd \
     --username docente@iteso.mx \
     --group-name docentes

   # Alumno
   aws cognito-idp admin-create-user \
     --user-pool-id us-east-1_rNhUTDMSd \
     --username alumno@iteso.mx \
     --user-attributes Name=email,Value=alumno@iteso.mx Name=email_verified,Value=true \
     --message-action SUPPRESS

   aws cognito-idp admin-set-user-password \
     --user-pool-id us-east-1_rNhUTDMSd \
     --username alumno@iteso.mx \
     --password "Password123!" --permanent

   aws cognito-idp admin-add-user-to-group \
     --user-pool-id us-east-1_rNhUTDMSd \
     --username alumno@iteso.mx \
     --group-name alumnos
   ```

3. **Configuración del App Client con soporte para redirección HTTPS y flujos de autenticación:**
   ```bash
   aws cognito-idp create-user-pool-client \
     --user-pool-id us-east-1_rNhUTDMSd \
     --client-name edustream-web-client \
     --no-generate-secret \
     --allowed-o-auth-flows code \
     --allowed-o-auth-scopes email openid profile \
     --allowed-o-auth-flows-user-pool-client \
     --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH \
     --callback-urls "http://localhost:5173/auth/callback" "https://4q76jvcjwa.execute-api.us-east-1.amazonaws.com/auth/callback" \
     --logout-urls "http://localhost:5173" "https://4q76jvcjwa.execute-api.us-east-1.amazonaws.com"
   ```

4. **Creación del dominio Hosted UI:**
   ```bash
   aws cognito-idp create-user-pool-domain \
     --user-pool-id us-east-1_rNhUTDMSd \
     --domain edustream-auth-jdavila
   ```

---

### Paso 2: Despliegue del Frontend en S3 con Proxy HTTPS

Dado que S3 Static Website Hosting solo entrega tráfico vía HTTP y Cognito rechaza callbacks HTTP no locales, se utilizó un API Gateway HTTP API como proxy transparente HTTPS.

1. **Creación y configuración del bucket S3:**
   ```bash
   aws s3 mb s3://edustream-frontend-jdavila --region us-east-1
   aws s3api delete-public-access-block --bucket edustream-frontend-jdavila

   # Configurar como sitio web estático
   aws s3api put-bucket-website --bucket edustream-frontend-jdavila \
     --website-configuration '{"IndexDocument": {"Suffix": "index.html"}, "ErrorDocument": {"Key": "index.html"}}'
   ```

2. **Política de lectura pública:**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::edustream-frontend-jdavila/*"
       }
     ]
   }
   ```
   ```bash
   aws s3api put-bucket-policy --bucket edustream-frontend-jdavila --policy file://bucket-policy.json
   ```

3. **Creación de API Gateway como proxy HTTPS hacia S3 Website:**
   ```bash
   aws apigatewayv2 create-api \
     --name edustream-frontend \
     --protocol-type HTTP \
     --target "http://edustream-frontend-jdavila.s3-website-us-east-1.amazonaws.com"
   ```

4. **Compilación y despliegue del código React:**
   ```bash
   npm run build
   aws s3 sync dist/ s3://edustream-frontend-jdavila/ --delete
   ```

---

### Paso 3: Almacenamiento de Videos en S3

1. **Crear bucket privado:**
   ```bash
   aws s3 mb s3://edustream-videos-storage-jdavila --region us-east-1
   ```

2. **Configuración de CORS para subida directa desde el navegador:**
   ```json
   {
     "CORSRules": [
       {
         "AllowedHeaders": ["*"],
         "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
         "AllowedOrigins": ["*"],
         "ExposeHeaders": ["ETag"]
       }
     ]
   }
   ```
   ```bash
   aws s3api put-bucket-cors --bucket edustream-videos-storage-jdavila --cors-configuration file://s3-cors.json
   ```

---

### Paso 4: Tablas de Amazon DynamoDB

1. **Crear tabla `EduStream_Videos` y activar TTL:**
   ```bash
   aws dynamodb create-table \
     --table-name EduStream_Videos \
     --attribute-definitions AttributeName=video_id,AttributeType=S \
     --key-schema AttributeName=video_id,KeyType=HASH \
     --billing-mode PAY_PER_REQUEST \
     --region us-east-1

   # Activar Time-To-Live en el atributo 'ttl'
   aws dynamodb update-time-to-live \
     --table-name EduStream_Videos \
     --time-to-live-specification "Enabled=true, AttributeName=ttl"
   ```

2. **Crear tabla `EduStream_Subjects` y poblar materias:**
   ```bash
   aws dynamodb create-table \
     --table-name EduStream_Subjects \
     --attribute-definitions AttributeName=subject_id,AttributeType=S \
     --key-schema AttributeName=subject_id,KeyType=HASH \
     --billing-mode PAY_PER_REQUEST \
     --region us-east-1
   ```

   Inserción de materias académicas:
   - `SUB-NUBE`: "Desarrollo en la Nube" (`NUBE-01`)
   - `SUB-CLIENTE`: "Tecnologías en el Cliente" (`CLIENTE-01`)
   - `SUB-ARQ`: "Arquitectura de Software" (`ARQ-01`)

---

### Paso 5: Despliegue del Backend en EC2 con Docker

1. **Conexión SSH a la instancia EC2:**
   ```bash
   ssh -i "edustream-key.pem" ec2-user@<IP_PUBLICA_EC2>
   ```

2. **Instalación de Docker y Git:**
   ```bash
   sudo dnf install -y docker git
   sudo systemctl enable --now docker
   ```

3. **Construcción y ejecución del contenedor:**
   ```bash
   cd proyecto-integrador-o2026/src/backend
   git pull
   sudo docker build -t edustream-api .

   sudo docker stop edustream-backend 2>/dev/null || true
   sudo docker rm edustream-backend 2>/dev/null || true

   sudo docker run -d \
     --name edustream-backend \
     --restart unless-stopped \
     -p 8000:8000 \
     -e AWS_DEFAULT_REGION=us-east-1 \
     -e DYNAMODB_TABLE=EduStream_Videos \
     -e SUBJECTS_TABLE=EduStream_Subjects \
     -e VIDEOS_BUCKET=edustream-videos-storage-jdavila \
     -e MAX_UPLOAD_BYTES=524288000 \
     -e COGNITO_REGION=us-east-1 \
     -e COGNITO_USER_POOL_ID=us-east-1_rNhUTDMSd \
     -e COGNITO_CLIENT_ID=6ihn9phjh33qc2b1i45mrmnptl \
     -e CORS_ORIGINS='*' \
     edustream-api
   ```

---

### Paso 6: Configuración del API Gateway para el Backend

1. **Crear API HTTP apuntando a la IP de EC2:**
   ```bash
   aws apigatewayv2 create-api \
     --name edustream-backend-api \
     --protocol-type HTTP \
     --target "http://<IP_PUBLICA_EC2>:8000"
   ```

2. **Configuración de CORS en API Gateway:**
   ```bash
   aws apigatewayv2 update-api \
     --api-id j72eps3z3f \
     --cors-configuration '{
       "AllowOrigins": ["*"],
       "AllowMethods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
       "AllowHeaders": ["Content-Type", "Authorization"]
     }'
   ```

---

## 4. Procedimiento de resiliencia y recuperación automática

En AWS Learner Lab, al cerrar o reiniciar la sesión de 4 horas, la instancia EC2 se detiene y al volverse a encender adquiere una **nueva dirección IP pública**.

Para no tener que reconfigurar manualmente las integraciones de API Gateway ni los Security Groups, se crearon scripts que automatizan el 100% de la recuperación:

### Ejecución en Windows (PowerShell):
```powershell
.\scripts\actualizar-entorno.ps1
```

### Ejecución en Linux / macOS (Bash):
```bash
chmod +x scripts/actualizar-entorno.sh
./scripts/actualizar-entorno.sh
```

### Flujo de ejecución del script:
1. **Paso 1:** Verifica vigencia de credenciales temporales de AWS CLI con `aws sts get-caller-identity`.
2. **Paso 2:** Consulta el estado de la instancia EC2 `i-0da66503c5157fdcd`. Si está detenida (`stopped`), envía el comando `start-instances` y espera a que esté activa.
3. **Paso 3:** Obtiene la nueva IP pública asignada a la instancia.
4. **Paso 4:** Actualiza la regla de entrada del Security Group `sg-0108695f0d2701501` para autorizar el tráfico en el puerto `8000`.
5. **Paso 5:** Modifica la integración de API Gateway (`j72eps3z3f` / integración `8m5f8ar`) actualizando `IntegrationUri` a `http://<NUEVA_IP>:8000`.
6. **Paso 6:** Realiza una petición de validación `GET /health` a través de la URL HTTPS de API Gateway para confirmar la recuperación completa.
