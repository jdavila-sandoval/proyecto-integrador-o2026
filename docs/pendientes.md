# Control de pendientes y roadmap — EduStream

**Última actualización:** 27 de noviembre de 2026

Este documento registra las tareas completadas, los hitos alcanzados y los ítems pendientes para evoluciones futuras de la plataforma EduStream.

---

## 1. Hitos completados y verificados en AWS

| Tarea / Funcionalidad | Componentes afectados | Estado | Verificación |
|---|---|:---:|---|
| **Autenticación real OIDC / PKCE** | Cognito, React, FastAPI | ✅ Completado | Inicio de sesión con Hosted UI, emisión y validación de JWT |
| **Separación de roles por grupo** | Cognito, React, FastAPI | ✅ Completado | Grupos `docentes` y `alumnos` con guardias en UI y backend |
| **Catálogo de materias en base de datos** | DynamoDB `EduStream_Subjects` | ✅ Completado | Tabla creada, poblada y consultada vía `GET /subjects` |
| **Subida directa multipart a S3** | S3, FastAPI, React | ✅ Completado | URLs prefirmadas POST, barra de progreso y confirmación con `complete` |
| **Reproducción de video en streaming** | S3, FastAPI, React | ✅ Completado | URLs prefirmadas GET temporales (300s) conectadas al reproductor HTML5 |
| **Eliminación completa de recursos** | S3, DynamoDB, FastAPI, React | ✅ Completado | Endpoint `DELETE /videos/{id}` con validación de autor (`owner_sub`) |
| **Limpieza automática con DynamoDB TTL** | DynamoDB, FastAPI | ✅ Completado | Atributo `ttl` configurado a 2 horas para descartar subidas huérfanas |
| **Despliegue del Frontend en la nube** | S3 Website, API Gateway v2 | ✅ Completado | Alojado en S3 estático con proxy HTTPS en API Gateway |
| **Despliegue del Backend en la nube** | EC2, Docker, API Gateway v2 | ✅ Completado | Contenedor FastAPI en ejecución continua sobre EC2 |
| **Scripts de resiliencia ante reinicios** | PowerShell, Bash, AWS CLI | ✅ Completado | Scripts de sincronización de IP y Security Groups para Learner Lab |
| **Documentación técnica integral** | `README.md`, `docs/*` | ✅ Completado | Arquitectura, modelo de datos, API y despliegue actualizados |

---

## 2. Roadmap y tareas pendientes para próximas entregas

| Prioridad | Tarea | Descripción técnica | Esfuerzo estimado |
|:---:|---|---|:---:|
| **Alta** | **Edición de metadatos (`PATCH /videos/{id}`)** | Permitir al docente autor modificar título, unidad, materia y descripción desde la interfaz web. | Medio |
| **Media** | **Consulta por materia con GSI (`SubjectIndex`)** | Crear índice secundario global en `EduStream_Videos` (PK: `subject_id`, SK: `created_at`) y habilitar `GET /videos?subject_id=...` para optimizar consultas sin recurrir a `Scan`. | Bajo |
| **Media** | **Restricción estricta de visibilidad** | Implementar filtrado en base de datos para que videos con `visibility: "group"` no sean accesibles para usuarios fuera del grupo académico. | Medio |
| **Baja** | **Transcodificación y generación de miniaturas** | Configurar función AWS Lambda o AWS Elemental MediaConvert disparada por eventos S3 `ObjectCreated` para generar miniaturas automáticas y streams HLS adaptativos. | Alto |
| **Baja** | **Notas personales y comentarios** | Tabla DynamoDB `EduStream_Notes` para notas de estudio vinculadas a marcas de tiempo de los videos. | Medio |

---

## 3. Matriz de riesgos y mitigaciones

| Riesgo | Impacto | Mitigación implementada |
|---|:---:|---|
| **Caducidad de sesión en AWS Learner Lab (4 horas)** | Alto | Ejecutar `scripts/actualizar-entorno.ps1` o `.sh` para resincronizar automáticamente la nueva IP pública de EC2 en API Gateway y Security Groups. |
| **Subidas canceladas o incompletas en S3** | Medio | TTL de DynamoDB purga automáticamente los registros `pending` tras 2 horas sin intervención manual. |
| **Eliminación no autorizada de videos** | Alto | El backend valida estrictamente que `item.owner_sub == user.sub` antes de permitir cualquier borrado. |
| **Tokens JWT manipulados o vencidos** | Alto | FastAPI valida criptográficamente cada token contra el conjunto de claves públicas JWKS de Amazon Cognito antes de procesar cualquier solicitud. |
