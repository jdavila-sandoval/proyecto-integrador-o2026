# EduStream

Plataforma académica para organizar y consultar recursos educativos por materia.

## Integrantes

- Fabián Patricio Gaxiola Valades.
- José Ignacio Dávila Sandoval.

## Objetivo de la entrega intermedia

Demostrar el registro y consulta de un recurso educativo mediante el flujo:

```text
Cliente → API Gateway → backend en Docker sobre EC2 → DynamoDB
```

Registrar un recurso significa guardar sus metadatos. No implica que la carga o reproducción de archivos reales esté implementada.

## Estado de esta documentación

Actualización: 9 de noviembre de 2026.

Se ha definido el modelo de datos y se han proporcionado ejemplos, código inicial e instrucciones de despliegue. El equipo debe confirmar qué pasos ejecutó exitosamente. Esta documentación no certifica un despliegue ni sustituye sus evidencias.

| Componente | Estado conocido |
|---|---|
| Frontend React, TypeScript y Vite | Existente según la revisión previa del repositorio |
| API simulada json-server | Documentada en el frontend existente |
| Modelo DynamoDB | Definido |
| Tres recursos de prueba | Ejemplos proporcionados; inserción completa por verificar |
| Backend Python, FastAPI y boto3 | Código inicial proporcionado; ejecución por confirmar |
| Docker y EC2 | Instrucciones proporcionadas; despliegue por confirmar |
| API Gateway | Pendiente de configurar y verificar |
| Integración del frontend con AWS | Pendiente de verificar |
| Autenticación, autorización y archivos reales | Fuera del primer incremento |

## Stack del incremento actual

- Frontend: React, TypeScript, Vite y React Router.
- Backend propuesto: Python, FastAPI, Uvicorn y boto3.
- Empaquetado y ejecución: Docker en EC2.
- Persistencia: DynamoDB.
- Exposición posterior: API Gateway con integración HTTP proxy.
- S3: previsto para archivos o estáticos, no verificado en este incremento.

Para esta entrega se utiliza EC2 con Docker, no Lambda. Si documentos anteriores mantienen una arquitectura serverless, deben actualizarse o ratificarse con los docentes para evitar contradicciones.

## Organización objetivo

```text
README.md
docs/
  modelo-datos.md
  api.md
  despliegue.md
  pendientes.md
  solucion.png
  evidencias/
src/
  services/
  backend/
    app/
      __init__.py
      main.py
    requirements.txt
    Dockerfile
    .dockerignore
  scripts/
```

La estructura es objetivo; verificar los archivos realmente presentes. Revisar TypeScript y Vite antes de incorporar carpetas ajenas al frontend en src/.

## Frontend local con API simulada

```bash
npm install
```

Crear .env local:

```env
VITE_API_URL=http://localhost:3001
```

En terminales separadas:

```bash
npm run server
```

```bash
npm run dev
```

Direcciones documentadas: frontend http://localhost:5173 y API simulada http://localhost:3001. Utilizar la dirección real que muestre cada proceso.

No cambiar todavía la URL a AWS sin comprobar el contrato y la conectividad. No guardar secretos en variables VITE_.

## Documentación

- [Modelo de datos](docs/modelo-datos.md)
- [API](docs/api.md)
- [Despliegue y pruebas](docs/despliegue.md)
- [Pendientes](docs/pendientes.md)

El modelo de datos se entrega por separado en este paquete y debe conservar los mismos nombres que AWS y el código.

## Seguridad y limitaciones

- Autenticación del frontend simulada; no sustituye validaciones del servidor.
- visibility no aplica permisos por sí mismo.
- No almacenar credenciales, tokens, llaves SSH ni contraseñas en Git.
- En EC2 utilizar un perfil IAM autorizado; no incrustar credenciales en la imagen.
- La prueba directa HTTP a EC2 es temporal y restringida a la IP del equipo.
- duration y views siguen siendo valores de compatibilidad, no métricas reales.

## Criterio de finalización

Un POST mediante API Gateway debe crear un elemento en DynamoDB, y un GET debe permitir recuperarlo. Deben mostrarse el contenedor en EC2, sus logs y el registro persistido. Guardar las evidencias reales en docs/evidencias/.
