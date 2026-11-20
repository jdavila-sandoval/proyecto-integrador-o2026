# API — EduStream

## Estado y alcance

Actualizado el 18 de noviembre de 2026. La REST API Regional está desplegada en `dev` (`us-east-1`). El equipo verificó en Postman el listado, la creación y la consulta por ID, así como el bloqueo de una solicitud desde una red no autorizada. El backend usa Python, FastAPI y boto3. La conexión del frontend React a la API real sigue pendiente; su entorno local utiliza `json-server`.

## Arquitectura desplegada

```text
Postman → HTTPS → API Gateway Regional (dev)
        → HTTP proxy mediante VPC Link V2
        → ALB interno (HTTP:80)
        → EC2:8000 → FastAPI en Docker → DynamoDB (EduStream_Videos)
```

La respuesta regresa por el mismo recorrido. El proxy conserva el contrato y las validaciones del backend. `/dev` forma parte de la URL pública de invocación; las rutas de FastAPI no incluyen ese prefijo.

## URL de invocación

```text
https://i08xd81pvb.execute-api.us-east-1.amazonaws.com/dev
```

URL construida con el ID de API que aparece en los logs, la región y el stage. Confirmar que coincide con `Stages → dev → Invoke URL` antes de entregar. En Postman se puede guardar como `baseUrl`, sin barra final.

## Recursos, métodos e integración

| Método y recurso público | Entrada | Integración y destino lógico | Respuesta |
|---|---|---|---|
| `GET /videos` | Sin cuerpo | HTTP proxy, VPC Link V2 → `GET /videos` | `200` y arreglo de recursos |
| `POST /videos` | JSON de metadatos | HTTP proxy, VPC Link V2 → `POST /videos` | `201` y recurso creado; `422` si los datos son inválidos |
| `GET /videos/{id}` | `id` en la ruta | HTTP proxy, VPC Link V2 → `GET /videos/{id}` | `200` y recurso; `404` si no existe |

El parámetro `id` se toma de `method.request.path.id`. FastAPI lo recibe como `video_id` y DynamoDB lo usa como clave primaria. `GET /health` es un endpoint del backend y del health check del ALB: no forma parte de los métodos públicos documentados y no verifica DynamoDB.

## Control de acceso

La política de recursos de API Gateway limita las invocaciones a las IP públicas autorizadas. Usa `aws:SourceIp` con `NotIpAddress` en una regla `Deny` para bloquear orígenes fuera de la lista. No publicar las IP autorizadas en este documento. Si cambia la IP de la red de prueba, actualizar la política y volver a desplegar `dev`.

El ALB interno protege el acceso directo al backend; la política controla quién puede invocar API Gateway. Esta restricción por IP no autentica usuarios. El campo `visibility` es un metadato, no un permiso.

## Pruebas en Postman

| Solicitud | Resultado verificado |
|---|---|
| `GET {{baseUrl}}/videos` desde la red autorizada | `200 OK`, catálogo |
| `POST {{baseUrl}}/videos` desde la red autorizada | `201 Created`, recurso con `id` generado |
| `GET {{baseUrl}}/videos/{{id}}` con el ID devuelto por el POST | `200 OK`, detalle del recurso |
| `GET {{baseUrl}}/videos` desde una red no autorizada | `403 Forbidden`, acceso bloqueado |

### Cuerpo de prueba del POST

En Postman: `Body → raw → JSON`, con `Content-Type: application/json`.

```json
{
  "title": "Integración de API Gateway con EC2",
  "subject_id": "SUB-NUBE",
  "subject": "Desarrollo en la Nube",
  "code": "NUBE-01",
  "unit": "Unidad 4",
  "description": "Recurso de prueba creado desde Postman para verificar el flujo de API Gateway a EC2 y DynamoDB.",
  "visibility": "campus"
}
```

Son obligatorios `title`, `subject_id`, `subject`, `code`, `unit` y `description`. No admiten cadenas vacías tras recortar espacios. Los límites son 200 caracteres para `title` y `subject`, 100 para `subject_id`, `code` y `unit`, y 5000 para `description`. `visibility` admite `campus` o `group` y usa `campus` si se omite. La validación cruzada entre identificador, nombre y código de materia sigue pendiente.

El backend genera el UUID, las fechas UTC, el título normalizado y `thumbnail_class`. El POST usa JSON normal, sin los envoltorios tipados de DynamoDB.

### Respuesta de recurso

Ejemplo ilustrativo: sustituir los marcadores por los valores de la respuesta real si se incorpora al expediente de evidencia.

```json
{
  "id": "<UUID_GENERADO>",
  "title": "Integración de API Gateway con EC2",
  "subject": "Desarrollo en la Nube",
  "code": "NUBE-01",
  "unit": "Unidad 4",
  "description": "Recurso de prueba creado desde Postman para verificar el flujo de API Gateway a EC2 y DynamoDB.",
  "visibility": "campus",
  "duration": "00:00",
  "uploadedAt": "<FECHA_UTC_ISO8601>",
  "views": 0,
  "thumbnailClass": "thumb-blue"
}
```

`uploadedAt` se devuelve en ISO 8601. `duration` y `views` son valores de compatibilidad, no mediciones reales. `GET /videos` devuelve un arreglo de objetos con esta estructura. El backend recorre internamente las páginas del `Scan` con `LastEvaluatedKey`; no ofrece cursor al cliente, orden cronológico garantizado ni filtros por materia. `SubjectIndex` está previsto para la consulta por materia, pero no se expone en estas rutas.

## Errores

| Código | Origen | Significado |
|---|---|---|
| `403` | API Gateway | Origen no autorizado por la política; bloqueo verificado |
| `404` | FastAPI | No existe un recurso con el ID solicitado |
| `422` | FastAPI | Solicitud inválida según el modelo de entrada |
| `503` | FastAPI | El backend capturó un error al operar con DynamoDB |

Los códigos `404`, `422` y `503` describen el contrato del backend; no se presentan aquí como respuestas capturadas en Postman. `422` devuelve el detalle estructurado de validación de FastAPI, no un mensaje de texto único.

## Evidencias y pendientes

- Guardar en `docs/evidencias/` las solicitudes y respuestas reales de Postman y la prueba de bloqueo. No incluir credenciales ni IP de clientes autorizados.
- Relacionar el `id` real del POST y del GET de detalle con el `video_id` del elemento en DynamoDB. Adjuntar evidencia del contenedor, los logs y el despliegue del stage.
- Para conectar React: configurar `VITE_API_URL` y CORS para el origen previsto, resolver `subject_id` en el alta y adaptar fechas y errores a la interfaz.
- Mantener edición (`PATCH`) y eliminación (`DELETE`) como pendientes en la API real; las operaciones de `json-server` no cuentan como desplegadas en AWS.
