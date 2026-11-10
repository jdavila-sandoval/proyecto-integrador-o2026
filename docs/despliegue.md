# Despliegue y pruebas — EduStream

## Alcance

Procedimiento para llegar desde el backend local hasta Docker en EC2. Ejecución y resultados pendientes de confirmación. No incluye todavía el despliegue de API Gateway ni S3.

Los comandos multilínea utilizan Bash. En PowerShell escribirlos en una línea o adaptar los continuadores. Se utiliza us-east-1 como ejemplo: sustituir por la región real.

## 1. Requisitos

- Python, Git, Docker y AWS CLI disponibles.
- Tabla EduStream_Videos con PK video_id de tipo String.
- Credenciales locales autorizadas y vigentes.
- Código inicial en src/backend/app/main.py.
- requirements.txt, Dockerfile y .dockerignore preparados.

```bash
python --version
git --version
docker --version
aws --version
aws sts get-caller-identity
aws dynamodb describe-table --table-name EduStream_Videos --region us-east-1
```

En Learner Lab, las credenciales temporales locales requieren access key, secret key y session token. Guardarlas fuera del repositorio en el archivo compartido de AWS. Renovarlas al expirar.

## 2. Ejecución local

```bash
cd src/backend
python -m venv .venv
```

Activación en Bash:

```bash
source .venv/bin/activate
```

Activación en PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Si requirements.txt ya existe:

```bash
python -m pip install -r requirements.txt
```

Si aún no se ha generado, instalar las dependencias y registrar sus versiones:

```bash
python -m pip install fastapi "uvicorn[standard]" boto3
python -m pip freeze > requirements.txt
```

Configuración Bash:

```bash
export AWS_DEFAULT_REGION=us-east-1
export DYNAMODB_TABLE=EduStream_Videos
```

Configuración PowerShell:

```powershell
$env:AWS_DEFAULT_REGION = "us-east-1"
$env:DYNAMODB_TABLE = "EduStream_Videos"
```

Iniciar:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Abrir http://localhost:8000/docs y ejecutar las pruebas de docs/api.md. No continuar sin verificar lectura y escritura en la tabla real.

## 3. Docker local

Dockerfile previsto:

```dockerfile
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN useradd --create-home appuser
COPY --chown=appuser:appuser app ./app
USER appuser
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

.dockerignore previsto:

```text
.venv/
__pycache__/
*.pyc
.env
.env.*
.aws/
.git/
```

Desde src/backend:

```bash
docker build -t edustream-backend:dev .
```

Detener el servidor local antes de utilizar el mismo puerto. Ejemplo Bash para montar las credenciales locales como solo lectura:

```bash
docker run -d \
  --name edustream-backend \
  -p 127.0.0.1:8000:8000 \
  -e AWS_DEFAULT_REGION=us-east-1 \
  -e DYNAMODB_TABLE=EduStream_Videos \
  -e AWS_SHARED_CREDENTIALS_FILE=/aws/credentials \
  -e AWS_CONFIG_FILE=/aws/config \
  -v "$HOME/.aws:/aws:ro" \
  edustream-backend:dev
```

Comprobar que el usuario del contenedor tenga permisos para leer los archivos montados sin ampliar innecesariamente sus permisos en el host. No copiar credenciales a la imagen como solución.

```bash
docker ps
docker logs --tail 100 edustream-backend
docker restart edustream-backend
```

Repetir GET y POST en http://localhost:8000/docs. Comprobar que el recurso permanece después del reinicio.

## 4. Configuración de EC2

Propuesta:

| Propiedad | Configuración |
|---|---|
| Nombre | edustream-backend-dev |
| AMI | Amazon Linux 2023 |
| Arquitectura | x86_64 |
| Tipo | Pequeño y autorizado por el laboratorio |
| Región | Preferentemente la de DynamoDB |
| Acceso | Key pair autorizado |
| Red inicial | Subred con salida a Internet e IP pública para la prueba directa |
| Perfil IAM | Autorizado para acceder a la tabla |

Permisos requeridos por el código inicial: dynamodb:GetItem, dynamodb:PutItem y dynamodb:Scan sobre la tabla. Query será necesario cuando se implemente la consulta al índice. Limitar recursos según los permisos disponibles y las reglas del laboratorio.

Utilizar el perfil IAM de la instancia, no las credenciales locales. Mantener IMDSv2 requerido y revisar el hop limit 2 para acceso desde contenedores bridge, sujeto a los permisos del entorno.

Security group para la prueba:

| Puerto | Origen |
|---|---|
| TCP 22 | IP pública del equipo /32 |
| TCP 8000 | IP pública del equipo /32 |

Esta regla de 8000 es temporal; no resuelve por sí misma la futura conectividad de API Gateway. No abrir una API sin autenticación a todo Internet.

## 5. Instalación y despliegue en Amazon Linux 2023

```bash
ssh -i "tu-llave.pem" ec2-user@IP_PUBLICA_EC2
```

En macOS/Linux, corregir permisos de la llave si es necesario:

```bash
chmod 400 tu-llave.pem
```

Dentro de EC2:

```bash
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo docker version
```

Después de subir el backend al repositorio:

```bash
git clone https://github.com/jdavila-sandoval/proyecto-integrador-o2026.git
cd proyecto-integrador-o2026/src/backend
sudo docker build -t edustream-backend:dev .
```

Si el repositorio es privado, utilizar acceso autorizado o transferencia segura. No poner tokens en la URL del comando.

```bash
sudo docker run -d \
  --name edustream-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  -e AWS_DEFAULT_REGION=us-east-1 \
  -e DYNAMODB_TABLE=EduStream_Videos \
  edustream-backend:dev
```

No montar .aws ni inyectar credenciales locales en este contenedor. Debe obtenerlas del rol de EC2.

## 6. Verificación

En EC2:

```bash
sudo docker ps
sudo docker logs --tail 100 edustream-backend
curl http://localhost:8000/health
curl http://localhost:8000/videos
```

Desde el equipo autorizado, abrir http://IP_PUBLICA_EC2:8000/docs y repetir GET y POST. El acceso HTTP directo es temporal: no enviar contraseñas ni datos sensibles.

## 7. Recuperación y actualización

Antes de la demo, confirmar laboratorio activo, instancia encendida, perfil IAM, contenedor, conectividad y acceso a la tabla.

Para reconstruir una versión actualizada, desde src/backend:

```bash
git pull
sudo docker build -t edustream-backend:dev .
sudo docker stop edustream-backend
sudo docker rm edustream-backend
```

Ejecutar nuevamente el comando docker run documentado arriba. Este procedimiento produce una interrupción temporal y no es despliegue sin caída.

Detener o retirar recursos según las reglas del laboratorio al terminar. No eliminar tabla ni datos de prueba sin revisar si todavía se requieren para la evaluación.

## 8. Diagnóstico

| Síntoma | Revisar |
|---|---|
| /health funciona pero /videos falla | Tabla, región, credenciales y permisos |
| NoCredentialsError en EC2 | Perfil IAM y acceso a IMDS desde Docker |
| ExpiredToken local | Renovar las credenciales del laboratorio |
| AccessDeniedException | Permisos de la identidad o rol |
| ResourceNotFoundException | Tabla, región y cuenta |
| Funciona en localhost de EC2, no desde fuera | Red, IP pública y security group |
| Contenedor detenido | docker logs |
| Puerto ocupado | Otro proceso o contenedor usando 8000 |
| Nombre de contenedor en uso | Revisar docker ps -a antes de recrear |

## 9. Evidencias

Guardar capturas de contenedor activo, logs, prueba de creación, registro en DynamoDB y consulta posterior al reinicio. Registrar fecha, entorno y resultado. Ocultar credenciales, tokens y datos sensibles.
