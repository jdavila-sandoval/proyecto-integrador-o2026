# Pendientes para la entrega — EduStream

Estado al 9 de noviembre de 2026. Actualizar con resultados comprobados; recibir instrucciones no significa haber completado una tarea.

| Prioridad | Tarea | Criterio de aceptación | Responsable |
|---|---|---|---|
| 1 | Confirmar tabla y registros | Tabla e índice activos; tres registros en dos materias | Por asignar |
| 1 | Probar backend local | GET y POST contra DynamoDB; errores controlados | Por asignar |
| 1 | Validar materia | subject_id, nombre y código consistentes | Por asignar |
| 2 | Probar Docker | Mismas operaciones; datos persisten tras reinicio | Por asignar |
| 3 | Desplegar en EC2 | Rol autorizado, contenedor activo y prueba remota restringida | Por asignar |
| 4 | Configurar API Gateway | GET y POST funcionales en stage documentado | Por asignar |
| 5 | Conectar frontend | Añadir subject_id, configurar origen y crear/consultar desde interfaz | Por asignar |
| Continua | Documentación y evidencias | Diagrama real, contrato y capturas sin secretos | Ambos |

## Ampliaciones para la final

- Edición y eliminación en la API real.
- Consulta por materia mediante SubjectIndex.
- Autenticación y autorización por propietario.
- Archivos y miniaturas en S3; estados de publicación y reproducción.
- Notas privadas si se conserva el alcance aprobado.
- Recuperación del entorno probada y README actualizado.

## Riesgos y plan alterno

- Credenciales temporales vencidas: renovar el acceso autorizado y repetir las pruebas.
- Permisos insuficientes: confirmar perfil y servicios disponibles con el docente; no incrustar claves como solución.
- Diferencias frontend/backend: cerrar contrato antes de conectar las vistas.
- Falta de tiempo: priorizar un flujo pequeño real con Postman y documentar lo pendiente; no sustituir persistencia real por una simulación sin declararlo.

No publicar tareas pendientes como funcionalidades completadas.
