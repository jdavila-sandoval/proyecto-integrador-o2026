# API — EduStream

## Estado y alcance

Especificación del código inicial propuesto el 9 de noviembre de 2026. No se han proporcionado resultados de ejecución que acrediten su despliegue.

El backend utiliza Python, FastAPI y boto3. El frontend existente utiliza json-server; ambas implementaciones no deben confundirse.

## Flujo objetivo

```text
Cliente → API Gateway → integración HTTP proxy → EC2/Docker/FastAPI → DynamoDB
```

La respuesta regresa por el mismo camino. API Gateway sigue pendiente de configuración y prueba.

## Direcciones

| Entorno | URL |
|---|---|
| Local propuesto | http://localhost:8000 |
| EC2 directo, temporal | http://<IP_PUBLICA_EC2>:8000 |
| API Gateway | Por registrar tras el despliegue |
| Stage previsto | dev |
| Región real | Por confirmar |

Los valores entre < > son marcadores, no endpoints existentes.

## Operaciones del código inicial

| Método | Ruta | Entrada | Respuesta |
|---|---|---|---|
| GET | /health | Sin cuerpo | 200, estado del proceso |
| GET | /videos | Sin cuerpo | 200, arreglo de recursos |
| GET | /videos/{video_id} | ID en ruta | 200, recurso; 404 si no existe |
| POST | /videos | JSON de metadatos | 201, recurso creado; 422 si falla validación |

GET /health no comprueba acceso a DynamoDB. Los errores de AWS capturados por el código inicial se traducen a 503 con un mensaje genérico. No todos los posibles errores de programación quedan cubiertos por ese manejo.

PATCH y DELETE existen en la API simulada del frontend, pero no en el backend inicial. Deben mantenerse deshabilitados o indicarse como pendientes al conectar el cliente real.

## POST /videos

```json
{
  "title": "Prueba de integración del backend",
  "subject_id": "SUB-NUBE",
  "subject": "Desarrollo en la Nube",
  "code": "NUBE-01",
  "unit": "Unidad 3",
  "description": "Recurso creado desde el backend conectado a DynamoDB.",
  "visibility": "campus"
}
```

Campos requeridos: title, subject_id, subject, code, unit y description. visibility admite campus o group y utiliza campus si se omite.

| Campo | Longitud máxima propuesta |
|---|---|
| title | 200 |
| subject_id, code, unit | 100 |
| subject | 200 |
| description | 5000 |

Los campos de texto requeridos no admiten cadenas vacías después de recortar espacios. Falta comprobar correspondencia entre materia, nombre y código.

El backend genera UUID, fechas UTC, título normalizado y thumbnail_class. El cliente no determina el ID persistido.

## Respuesta de recurso

Ejemplo ilustrativo, no respuesta capturada:

```json
{
  "id": "<UUID_GENERADO>",
  "title": "Prueba de integración del backend",
  "subject": "Desarrollo en la Nube",
  "code": "NUBE-01",
  "unit": "Unidad 3",
  "description": "Recurso creado desde el backend conectado a DynamoDB.",
  "visibility": "campus",
  "duration": "00:00",
  "uploadedAt": "<FECHA_UTC_ISO8601>",
  "views": 0,
  "thumbnailClass": "thumb-blue"
}
```

uploadedAt se devuelve como ISO 8601 en el código inicial; comprobar su presentación en la interfaz. duration y views son valores temporales.

## Listado y paginación

GET /videos devuelve un arreglo, no un objeto con data o cursor. El código inicial recorre internamente las páginas del Scan mediante LastEvaluatedKey. No implementa paginación visible para el cliente ni garantiza orden cronológico. Uso limitado al dataset académico pequeño.

La consulta por materia mediante SubjectIndex está diseñada en el modelo, pero no implementada en este código inicial. No anunciar todavía filtros por query string.

## Errores

| Código | Significado en el incremento inicial |
|---|---|
| 404 | Recurso inexistente |
| 422 | Validación de entrada por FastAPI |
| 503 | Error de AWS capturado al operar con DynamoDB |

Ejemplo de 404 previsto:

```json
{"detail": "Recurso no encontrado."}
```

La respuesta 422 utiliza la estructura de validación de FastAPI, no un único mensaje de texto. No documentar 400 como implementado mientras no exista un manejador que lo produzca.

## Integración pendiente con el frontend

- Añadir subject_id al POST o resolverlo de forma controlada en el backend.
- Mantener id en la respuesta, aunque DynamoDB utilice video_id.
- Revisar uploadedAt en la vista.
- Configurar CORS para los orígenes autorizados.
- Ajustar el tratamiento de errores 422 y 503.
- Deshabilitar edición y eliminación hasta implementarlas.

## API Gateway pendiente

| Método/recurso | Integración propuesta | Destino lógico |
|---|---|---|
| GET /videos | HTTP proxy | Backend: GET /videos |
| POST /videos | HTTP proxy | Backend: POST /videos |
| GET /videos/{id} | HTTP proxy | Backend: GET /videos/{id} |

Mapear correctamente el parámetro de ruta al endpoint de integración. Registrar stage, URL completa y configuración real al desplegar. La integración proxy se propone para conservar en el backend el contrato y las validaciones.

## Pruebas a registrar

- GET /health: 200.
- GET /videos: recursos existentes.
- GET de ID existente: 200.
- GET de ID inexistente: 404.
- POST válido: 201 y registro persistido.
- POST con título vacío: 422.
- Reiniciar contenedor y recuperar el registro.
- Repetir el flujo mediante API Gateway cuando esté configurado.

Guardar solicitudes y respuestas reales, fecha, entorno y evidencias. Esta especificación no sustituye esas capturas.
