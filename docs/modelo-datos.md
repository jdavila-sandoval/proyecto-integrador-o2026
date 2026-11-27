# Modelo de datos y persistencia — EduStream

## 1. Visión general

EduStream utiliza **Amazon DynamoDB** como base de datos NoSQL para persistir metadatos de recursos audiovisuales y materias académicas, y **Amazon S3** para el almacenamiento seguro de archivos binarios de video.

El modelo está diseñado para desacoplar el almacenamiento de archivos del registro transaccional de metadatos, garantizando consistencia mediante patrones de dos fases:
1. **Fase de reserva / inicio:** Creación del registro en estado `pending` con tiempo de vida limitado (TTL).
2. **Fase de confirmación:** Verificación del archivo subido en S3, transición a estado `ready` y remoción del TTL.

---

## 2. Tabla `EduStream_Videos`

Almacena los metadatos de los videos subidos por los docentes.

- **Nombre de la tabla:** `EduStream_Videos`
- **Partition Key (PK):** `video_id` (String, formato UUID v4)
- **Sort Key (SK):** Ninguna (clave simple)
- **Modo de facturación:** `PAY_PER_REQUEST` (On-Demand)

### Atributos de la tabla

| Atributo | Tipo DynamoDB | Requerido | Descripción |
|---|---|:---:|---|
| `video_id` | `S` (String) | Sí | Identificador único del video (UUID v4 generado en backend). |
| `title` | `S` (String) | Sí | Título visible del video (máximo 200 caracteres). |
| `title_normalized` | `S` (String) | Sí | Título en minúsculas y sin acentos para búsquedas. |
| `subject_id` | `S` (String) | Sí | Identificador de la materia (ej. `SUB-NUBE`). |
| `subject_name` | `S` (String) | Sí | Nombre legible de la materia (ej. "Desarrollo en la Nube"). |
| `code` | `S` (String) | Sí | Código académico de la materia (ej. `NUBE-01`). |
| `unit` | `S` (String) | Sí | Unidad académica (ej. "Unidad 2"). |
| `description` | `S` (String) | Sí | Descripción pedagógica del video (hasta 5000 caracteres). |
| `visibility` | `S` (String) | Sí | Alcance de publicación: `"campus"` o `"group"`. |
| `owner_sub` | `S` (String) | Sí | Identificador `sub` del docente en Amazon Cognito (autor). |
| `status` | `S` (String) | Sí | Estado del ciclo de vida: `"pending"` o `"ready"`. |
| `object_key` | `S` (String) | Sí | Ruta del objeto en el bucket S3 (`videos/{video_id}/original.mp4`). |
| `content_type` | `S` (String) | Sí | Tipo MIME del video (`video/mp4`, `video/webm`, etc.). |
| `size_bytes` | `N` (Number) | Sí | Tamaño del archivo en bytes (hasta 500 MB). |
| `created_at` | `S` (String) | Sí | Marca temporal de creación en formato ISO 8601 UTC. |
| `updated_at` | `S` (String) | Sí | Marca temporal de última modificación en formato ISO 8601 UTC. |
| `thumbnail_class` | `S` (String) | Sí | Clase CSS para estilo de miniatura en el frontend. |
| `ttl` | `N` (Number) | Opcional | Marca de tiempo Unix epoch (segundos) para expiración automática. Solo presente mientras `status == "pending"`. |

---

## 3. Limpieza automática con DynamoDB TTL (Time-To-Live)

### Problemática resuelta
Cuando un docente inicia la carga de un video, el backend genera un registro preliminar (`status: pending`) y entrega credenciales prefirmadas de subida a S3. Si el usuario cancela la carga, se desconecta o cierra la pestaña, el archivo nunca se sube a S3, dejando un registro "huérfano" en la base de datos.

### Implementación técnica
1. **Activación de TTL:** La tabla tiene habilitada la funcionalidad de Time-To-Live en el atributo `ttl`.
2. **Generación al crear (`POST /videos`):**
   ```python
   pending_ttl_seconds = int(os.environ.get("PENDING_TTL_SECONDS", 7200)) # 2 horas
   ttl_epoch = int(time.time()) + pending_ttl_seconds
   item["ttl"] = ttl_epoch
   ```
3. **Remoción al completar (`POST /videos/{id}/complete`):**
   Dado que `ttl` es una palabra reservada en DynamoDB, la expresión de actualización utiliza un alias con `ExpressionAttributeNames`:
   ```python
   videos_table.update_item(
       Key={"video_id": video_id},
       UpdateExpression="SET #s = :ready, size_bytes = :size, updated_at = :now REMOVE #ttl",
       ConditionExpression="#s = :pending",
       ExpressionAttributeNames={"#s": "status", "#ttl": "ttl"},
       ExpressionAttributeValues={
           ":ready": "ready",
           ":pending": "pending",
           ":size": actual_size,
           ":now": now_iso,
       },
   )
   ```
4. **Comportamiento automático:** Si transcurren 2 horas sin confirmación, el servicio interno de DynamoDB purga el elemento huérfano de manera asíncrona sin costo adicional ni consumo de unidades de capacidad de lectura/escritura.

---

## 4. Tabla `EduStream_Subjects`

Catálogo centralizado de materias disponibles para asociar a los videos.

- **Nombre de la tabla:** `EduStream_Subjects`
- **Partition Key (PK):** `subject_id` (String)
- **Modo de facturación:** `PAY_PER_REQUEST`

### Atributos

| Atributo | Tipo | Descripción |
|---|---|---|
| `subject_id` | `S` | Clave primaria (ej. `SUB-NUBE`, `SUB-CLIENTE`, `SUB-ARQ`). |
| `id` | `S` | Identificador homologado para el frontend. |
| `name` | `S` | Nombre oficial de la asignatura. |
| `code` | `S` | Clave académica oficial de la materia. |

### Registros activos

```json
[
  {
    "subject_id": "SUB-NUBE",
    "id": "SUB-NUBE",
    "name": "Desarrollo en la Nube",
    "code": "NUBE-01"
  },
  {
    "subject_id": "SUB-CLIENTE",
    "id": "SUB-CLIENTE",
    "name": "Tecnologías en el Cliente",
    "code": "CLIENTE-01"
  },
  {
    "subject_id": "SUB-ARQ",
    "id": "SUB-ARQ",
    "name": "Arquitectura de Software",
    "code": "ARQ-01"
  }
]
```

---

## 5. Esquema de almacenamiento en Amazon S3

- **Bucket:** `edustream-videos-storage-jdavila`
- **Estructura de llaves (Object Keys):**
  ```text
  videos/{video_id}/original.mp4
  ```

### ¿Por qué `original.mp4`?
1. **Normalización y seguridad:** Evita problemas de caracteres especiales, espacios, nombres duplicados o inyecciones de ruta que podrían provenir del nombre de archivo local del usuario.
2. **Aislamiento por prefijo:** Cada video reside en su propio "directorio" virtual (`videos/{video_id}/`).
3. **Facilidad de borrado:** Cuando se invoca `DELETE /videos/{video_id}`, el backend puede referenciar y eliminar el archivo exacto sin consultar metadatos adicionales.
4. **Preparación para transcodificación:** Facilita agregar derivados futuros en el mismo prefijo (ej. `videos/{video_id}/hls/master.m3u8`, `videos/{video_id}/thumbnail.jpg`).
