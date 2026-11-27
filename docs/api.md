# Especificación de la API — EduStream

## Información general y estado

- **Versión de la API:** 1.0.0
- **Fecha de actualización:** 27 de noviembre de 2026
- **Entorno de despliegue:** AWS `us-east-1`
- **URL base activa (API Gateway v2 HTTP API):**
  ```text
  https://j72eps3z3f.execute-api.us-east-1.amazonaws.com
  ```

La API de EduStream es un servicio RESTful desarrollado con **FastAPI** en Python, empaquetado en un contenedor Docker sobre una instancia **Amazon EC2** y expuesto públicamente a través de **Amazon API Gateway v2 (HTTP API)** con terminación TLS/HTTPS y soporte para CORS.

---

## Arquitectura de conectividad

```text
Cliente (Navegador / cURL)
   │ HTTPS
   ▼
Amazon API Gateway v2 HTTP API (ID: j72eps3z3f)
   │ HTTP (Proxy inverso al puerto 8000)
   ▼
Amazon EC2 (Docker: FastAPI + Uvicorn :8000)
   ├─► Amazon Cognito (Validación de tokens JWT mediante JWKS)
   ├─► Amazon DynamoDB (Tablas EduStream_Videos y EduStream_Subjects)
   └─► Amazon S3 (Generación de URLs prefirmadas para subida y reproducción)
```

---

## Autenticación y autorización

La API utiliza tokens **JWT (OIDC / OAuth 2.0)** emitidos por **Amazon Cognito**:
- **User Pool ID:** `us-east-1_rNhUTDMSd`
- **Client ID:** `6ihn9phjh33qc2b1i45mrmnptl`

Para todos los endpoints protegidos, el cliente debe incluir la cabecera:
```http
Authorization: Bearer <ID_TOKEN_JWT>
```

### Roles y grupos:
1. **`docentes`:** Capacidad para crear videos (`status: pending`), confirmar cargas completas (`status: ready`) y eliminar recursos propios (`DELETE`).
2. **`alumnos`:** Capacidad para consultar el catálogo, ver materias y solicitar URLs de reproducción para streaming.

---

## Resumen de endpoints

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/health` | Público | Comprobación de estado del servicio y conectividad básica |
| `GET` | `/me` | Autenticado | Devuelve identidad del usuario, `sub`, email y rol asignado |
| `GET` | `/subjects` | Autenticado | Catálogo de materias registradas |
| `GET` | `/videos` | Autenticado | Catálogo de videos publicados (`status: ready`) |
| `GET` | `/videos/{video_id}` | Autenticado | Metadatos y detalle de un video específico |
| `POST` | `/videos` | Docentes | Crea registro en `pending`, define TTL (2h) y retorna URL prefirmada S3 |
| `POST` | `/videos/{video_id}/complete` | Docentes | Valida archivo en S3, marca como `ready` y remueve el TTL |
| `GET` | `/videos/{video_id}/playback` | Autenticado | Retorna URL prefirmada GET temporal para reproducir video |
| `DELETE` | `/videos/{video_id}` | Docente (autor) | Valida autoría (`owner_sub`), elimina objeto en S3 y registro DynamoDB |

---

## Detalle de endpoints

### 1. `GET /health`
Comprobación de vida del servicio. Utilizado por scripts de resiliencia y monitores de estado.

- **Autenticación:** No requerida.
- **Respuesta `200 OK`:**
  ```json
  {
    "status": "ok"
  }
  ```

---

### 2. `GET /me`
Retorna los datos de identidad y pertenencia a grupos del usuario autenticado a partir de su JWT.

- **Autenticación:** Requerida (`Bearer token`).
- **Respuesta `200 OK`:**
  ```json
  {
    "sub": "b4888428-8001-7029-a6bf-369a02c879cc",
    "email": "docente@iteso.mx",
    "groups": ["docentes"],
    "role": "docente"
  }
  ```

---

### 3. `GET /subjects`
Retorna la lista de materias disponibles en la base de datos `EduStream_Subjects`.

- **Autenticación:** Requerida (`Bearer token`).
- **Respuesta `200 OK`:**
  ```json
  [
    {
      "id": "SUB-NUBE",
      "name": "Desarrollo en la Nube",
      "code": "NUBE-01"
    },
    {
      "id": "SUB-CLIENTE",
      "name": "Tecnologías en el Cliente",
      "code": "CLIENTE-01"
    },
    {
      "id": "SUB-ARQ",
      "name": "Arquitectura de Software",
      "code": "ARQ-01"
    }
  ]
  ```

---

### 4. `GET /videos`
Lista todos los videos que han completado satisfactoriamente su proceso de subida (`status: ready`).

- **Autenticación:** Requerida (`Bearer token`).
- **Respuesta `200 OK`:**
  ```json
  [
    {
      "id": "e6a4b11f-c208-4e1b-9ecb-365778842cba",
      "title": "Introducción a Contenedores con Docker",
      "subject": "Desarrollo en la Nube",
      "code": "NUBE-01",
      "unit": "Unidad 2",
      "description": "Fundamentos de virtualización a nivel de SO y primeros contenedores.",
      "visibility": "campus",
      "duration": "00:00",
      "uploadedAt": "2026-11-27T08:15:30Z",
      "views": 0,
      "thumbnailClass": "thumb-blue",
      "status": "ready"
    }
  ]
  ```

---

### 5. `GET /videos/{video_id}`
Obtiene el detalle completo de un video por su identificador único.

- **Autenticación:** Requerida (`Bearer token`).
- **Parámetros de ruta:**
  - `video_id` (string, UUID): Identificador del video.
- **Respuesta `200 OK`:**
  ```json
  {
    "id": "e6a4b11f-c208-4e1b-9ecb-365778842cba",
    "title": "Introducción a Contenedores con Docker",
    "subject": "Desarrollo en la Nube",
    "code": "NUBE-01",
    "unit": "Unidad 2",
    "description": "Fundamentos de virtualización a nivel de SO y primeros contenedores.",
    "visibility": "campus",
    "duration": "00:00",
    "uploadedAt": "2026-11-27T08:15:30Z",
    "views": 0,
    "thumbnailClass": "thumb-blue",
    "status": "ready"
  }
  ```
- **Errores posibles:** `404 Not Found` si el ID no existe en la base de datos.

---

### 6. `POST /videos`
Registra la intención de publicar un video. Crea un registro en `EduStream_Videos` con `status: pending`, calcula el epoch de expiración TTL (por defecto 7200 segundos / 2 horas) y genera una solicitud POST prefirmada para que el navegador suba el archivo directamente al bucket de S3 sin pasar el flujo binario por el backend.

- **Autenticación:** Requerida (Grupo `docentes`).
- **Cuerpo de la petición (`Content-Type: application/json`):**
  ```json
  {
    "title": "Arquitectura de Microservicios en AWS",
    "subject_id": "SUB-NUBE",
    "unit": "Unidad 3",
    "description": "Diseño de APIs desacopladas utilizando API Gateway y EC2.",
    "visibility": "campus",
    "content_type": "video/mp4",
    "size_bytes": 14258900
  }
  ```
- **Validaciones:**
  - `title`: Entre 1 y 200 caracteres.
  - `unit`: Entre 1 y 100 caracteres.
  - `description`: Hasta 5000 caracteres.
  - `visibility`: `"campus"` o `"group"` (por defecto `"campus"`).
  - `content_type`: Solo se permiten tipos de video válidos (`video/mp4`, `video/webm`, `video/quicktime`).
  - `size_bytes`: Límite máximo de 500 MB (524,288,000 bytes).
- **Respuesta `201 Created`:**
  ```json
  {
    "video": {
      "id": "a910fc33-671e-45fa-a83d-04535b1d4ef0",
      "title": "Arquitectura de Microservicios en AWS",
      "subject": "Desarrollo en la Nube",
      "code": "NUBE-01",
      "unit": "Unidad 3",
      "description": "Diseño de APIs desacopladas utilizando API Gateway y EC2.",
      "visibility": "campus",
      "duration": "00:00",
      "uploadedAt": "2026-11-27T09:00:00Z",
      "views": 0,
      "thumbnailClass": "thumb-blue",
      "status": "pending"
    },
    "upload": {
      "url": "https://edustream-videos-storage-jdavila.s3.amazonaws.com/",
      "fields": {
        "key": "videos/a910fc33-671e-45fa-a83d-04535b1d4ef0/original.mp4",
        "Content-Type": "video/mp4",
        "AWSAccessKeyId": "ASIA...",
        "policy": "eyJleHBpcmF0aW9uIj...",
        "signature": "...",
        "x-amz-security-token": "..."
      },
      "maxSizeBytes": 524288000
    }
  }
  ```

---

### 7. `POST /videos/{video_id}/complete`
Confirma que la subida multipart hacia S3 se completó exitosamente. El backend valida mediante `s3.head_object` que el archivo exista en el bucket y coincida con el tamaño declarado, actualiza el estado del video a `ready` y ejecuta una expresión DynamoDB para **remover el atributo `ttl`**, asegurando que el registro persista indefinidamente.

- **Autenticación:** Requerida (Grupo `docentes`).
- **Parámetros de ruta:**
  - `video_id` (string, UUID).
- **Respuesta `200 OK`:**
  ```json
  {
    "id": "a910fc33-671e-45fa-a83d-04535b1d4ef0",
    "title": "Arquitectura de Microservicios en AWS",
    "subject": "Desarrollo en la Nube",
    "code": "NUBE-01",
    "unit": "Unidad 3",
    "description": "Diseño de APIs desacopladas utilizando API Gateway y EC2.",
    "visibility": "campus",
    "duration": "00:00",
    "uploadedAt": "2026-11-27T09:00:00Z",
    "views": 0,
    "thumbnailClass": "thumb-blue",
    "status": "ready"
  }
  ```
- **Errores posibles:**
  - `400 Bad Request`: Si el archivo no existe en S3 o si su tamaño no corresponde.
  - `404 Not Found`: Si el `video_id` no existe en DynamoDB.

---

### 8. `GET /videos/{video_id}/playback`
Genera una URL prefirmada GET de corta duración (300 segundos / 5 minutos) para reproducir el video en streaming directo desde Amazon S3.

- **Autenticación:** Requerida (`Bearer token`).
- **Parámetros de ruta:**
  - `video_id` (string, UUID).
- **Respuesta `200 OK`:**
  ```json
  {
    "url": "https://edustream-videos-storage-jdavila.s3.amazonaws.com/videos/a910fc33-671e-45fa-a83d-04535b1d4ef0/original.mp4?AWSAccessKeyId=ASIA...&Signature=...&Expires=1764264000",
    "expiresIn": 300
  }
  ```
- **Errores posibles:**
  - `400 Bad Request`: Si el video aún no está en estado `ready`.
  - `404 Not Found`: Si el recurso no existe.

---

### 9. `DELETE /videos/{video_id}`
Elimina de forma permanente un video y todos sus recursos asociados:
1. Verifica que el usuario pertenezca al grupo `docentes`.
2. Valida que el `owner_sub` registrado en el ítem coincida con el `sub` del usuario autenticado (control de acceso a nivel de propietario).
3. Elimina el archivo binario almacenado en Amazon S3 (`videos/{video_id}/original.mp4`).
4. Elimina el registro correspondiente en la tabla `EduStream_Videos` de Amazon DynamoDB.

- **Autenticación:** Requerida (Grupo `docentes`, solo autor del recurso).
- **Parámetros de ruta:**
  - `video_id` (string, UUID).
- **Respuesta `204 No Content`:** (Sin cuerpo de respuesta).
- **Errores posibles:**
  - `403 Forbidden`: `"No tienes permiso para eliminar este recurso porque no eres su autor."`
  - `404 Not Found`: Si el recurso no existe en DynamoDB.
  - `503 Service Unavailable`: Si ocurre un error al comunicarse con DynamoDB o S3.

---

## Códigos de estado HTTP y manejo de errores

| Código | Descripción | Causa común |
|---|---|---|
| `200 OK` | Petición exitosa | Consulta o actualización completada |
| `201 Created` | Recurso creado | Video registrado exitosamente |
| `204 No Content` | Eliminación exitosa | Video y archivo eliminados correctamente |
| `400 Bad Request` | Petición inválida | Parámetros incorrectos, archivo ausente en S3 o video no listo |
| `401 Unauthorized` | No autenticado | Token ausente, vencido o con firma inválida |
| `403 Forbidden` | Acceso denegado | Rol insuficiente (ej. alumno intentando publicar o eliminar) o no es propietario del recurso |
| `404 Not Found` | No encontrado | El `video_id` o `subject_id` no existe en la base de datos |
| `422 Unprocessable Entity` | Error de validación | El cuerpo JSON no cumple con el esquema Pydantic requerido |
| `503 Service Unavailable` | Error del servicio | Falla de conexión con Amazon DynamoDB o Amazon S3 |
