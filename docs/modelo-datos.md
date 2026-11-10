# Modelo de datos — EduStream

## Alcance y estado

Modelo para registrar y consultar metadatos de recursos educativos. Configuración e inserción reales deben respaldarse con evidencias. Usuarios, notas y archivos no forman parte del primer incremento.

## Tabla principal

| Propiedad | Valor |
|---|---|
| Nombre | EduStream_Videos |
| Partition key | video_id, String |
| Sort key | No utiliza |
| ID | UUID generado por el backend |

## Atributos del incremento inicial

Todos los atributos de esta tabla son String. El backend valida los atributos requeridos; no se configuran como columnas SQL.

| Atributo | Uso |
|---|---|
| video_id | Clave primaria |
| title | Título visible |
| title_normalized | Título en minúsculas, sin acentos y con espacios exteriores recortados |
| subject_id | Identificador estable de materia |
| subject_name | Nombre visible de materia |
| code | Código académico de materia |
| unit | Unidad |
| description | Descripción |
| visibility | campus o group; inicialmente metadato sin control de acceso |
| created_at | Fecha UTC ISO 8601 de creación |
| updated_at | Fecha UTC ISO 8601 de modificación |
| thumbnail_class | Compatibilidad visual con el cliente |

## Índice por materia

| Propiedad | Valor |
|---|---|
| Nombre | SubjectIndex |
| Tipo | GSI |
| Partition key | subject_id, String |
| Sort key | created_at, String |
| Proyección propuesta | ALL |

La consulta al índice está prevista, pero no incluida en el código inicial del backend. No confundir índice creado con endpoint implementado.

## Patrones de acceso

| Necesidad | Operación prevista | Estado en el código inicial |
|---|---|---|
| Detalle por ID | GetItem por video_id | Incluida; prueba pendiente |
| Catálogo | Scan con recorrido de páginas | Incluida; prueba pendiente |
| Recursos por materia | Query sobre SubjectIndex | Pendiente |

El listado inicial devuelve un arreglo y recorre las páginas internamente. No hay cursor público ni orden cronológico garantizado. Uso propuesto para un dataset académico de hasta 100 recursos. La búsqueda por título es futura y no constituye búsqueda de texto completo.

## Datos de prueba acordados

| video_id | Título | subject_id |
|---|---|---|
| 79f5ee28-1af3-4f3e-a2e6-858ccb9ac473 | Introducción a Docker | SUB-NUBE |
| c204f687-9a31-4d2b-8e65-0f713b962ad8 | Almacenamiento de archivos con Amazon S3 | SUB-NUBE |
| e7352b90-6c48-47a1-bd32-9f084e21c675 | Componentes y propiedades en React | SUB-CLIENTE |

Dos registros comparten NUBE-01 como código de materia; Cliente usa CLIENTE-01. video_id es el identificador único del recurso.

## Escritura

POST /videos recibe title, subject_id, subject, code, unit, description y visibility. subject se almacena como subject_name. El backend genera ID, fechas y título normalizado. Se propone una condición de escritura que evite sobrescribir un ID existente.

El código inicial valida campos vacíos, longitudes y visibility; aún falta validar la correspondencia entre identificador, nombre y código de materia.

## Adaptación al frontend

| DynamoDB | Respuesta |
|---|---|
| video_id | id |
| subject_name | subject |
| created_at | uploadedAt en ISO 8601 en el código inicial |
| thumbnail_class | thumbnailClass |

Se devuelven duration = "00:00" y views = 0 como compatibilidad temporal, no como mediciones reales.

## Ampliaciones

- author_id: String, derivado de identidad validada.
- duration_seconds: Number, cuando exista duración real.
- s3_key y thumbnail_key: String, claves de objetos; no URLs prefirmadas.
- status: String, pending/published/deleting, al implementar publicación.
- AuthorIndex: GSI con author_id y created_at, pendiente.
- Usuarios y notas: tablas separadas por diseñar e implementar en sus incrementos.

No marcar registros como published sin un archivo cargado y verificado. No almacenar secretos en esta tabla.

## Verificación

Confirmar tabla e índice activos, datos de prueba, consulta por ID, consulta por materia cuando se implemente y persistencia tras reiniciar el contenedor. Guardar evidencias en docs/evidencias/.
