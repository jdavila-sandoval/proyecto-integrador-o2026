# EduStream

EduStream es un prototipo de portal académico para explorar material audiovisual de cursos. Está construido con React, TypeScript, React Router y Vite.

## Alcance actual

La aplicación presenta flujos de interfaz para alumnos y docentes:

- **Inicio:** página informativa con características y un catálogo de cursos de demostración.
- **Registro:** formulario para elegir el rol de alumno o profesor y validar campos obligatorios, coincidencia de contraseñas y aceptación de términos.
- **Inicio de sesión:** formulario con validación básica de correo y contraseña.
- **Dashboard:** resumen con métricas de ejemplo, videos para continuar viendo y accesos rápidos a materias.
- **Gestión de videos:** lista de materiales de ejemplo con búsqueda por título, filtro por materia, vista previa y diálogos de edición y eliminación.
- **Publicación de material:** formulario visual para describir un video y seleccionar materia, unidad y visibilidad.

### Limitaciones de la demostración

Este alcance es de frontend y demostración. No hay servidor ni base de datos conectados: los videos y las métricas son datos estáticos de ejemplo; no se suben archivos reales; y los cambios, borradores, registros y sesiones no se guardan ni se validan contra un servicio. Las acciones de edición y eliminación solo muestran mensajes en pantalla. El formulario de inicio de sesión acepta cualquier correo y contraseña no vacíos, y las rutas del portal están abiertas en esta versión.

## Requisitos

- Node.js 18 o posterior
- npm

## Instalación y ejecución

Desde una terminal, entra a la carpeta del proyecto e instala sus dependencias:

```powershell
npm install
```

Inicia el servidor de desarrollo:

```powershell
npm run dev
```

Abre en el navegador la URL que muestre Vite (normalmente `http://localhost:5173/`). Para detener el servidor, presiona `Ctrl+C` en la terminal.

## Rutas disponibles

| Ruta | Pantalla |
| --- | --- |
| `/` | Inicio y catálogo de demostración |
| `/login` | Inicio de sesión simulado |
| `/register` | Registro simulado |
| `/dashboard` | Dashboard |
| `/upload-video` | Formulario de publicación |
| `/manage-videos` | Catálogo y gestión de videos |

Las rutas no reconocidas redirigen al inicio.

## Otros comandos

```powershell
npm run build
```

Ejecuta la comprobación de TypeScript y genera la versión de producción en `dist/`.

```powershell
npm run preview
```

Sirve localmente la compilación de producción después de ejecutar `npm run build`.
