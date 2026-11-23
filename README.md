# EduStream

Entrega parcial del proyecto integrador para la materia de tecnologias en el cliente desarrollado con React, TypeScript, Vite y React Router.

## Entrega 2: fuente de datos

Se eligió json-server como API simulada porque permite demostrar un CRUD REST real con persistencia en `db.json`, sin bloquear el avance del frontend por la configuración de un backend productivo. La capa de servicios está separada de los componentes y puede cambiarse posteriormente por una API Express, Supabase u otra fuente sin modificar las vistas.

## Ejecución local

Instala dependencias:

```bash
npm install
```

En una terminal inicia la API:

```bash
npm run server
```

En otra terminal inicia la aplicación:

```bash
npm run dev
```

La API estará disponible en `http://localhost:3001` y el frontend en `http://localhost:5173`.

La URL de la API puede cambiarse con un archivo `.env`:

```env
VITE_API_URL=http://localhost:3001
```

## Contrato de API

Entidad principal: `VideoItem`.

```ts
{
  id: number | string;
  title: string;
  subject: string;
  code: string;
  unit: string;
  description: string;
  visibility: "campus" | "group";
  duration: string;
  uploadedAt: string;
  views: number;
  thumbnailClass: string;
}
```

| Método | Endpoint | Uso |
|---|---|---|
| GET | `/videos` | Lista todos los videos |
| GET | `/videos/:id` | Obtiene el detalle de un video |
| POST | `/videos` | Crea un video |
| PATCH | `/videos/:id` | Actualiza un video |
| DELETE | `/videos/:id` | Elimina un video |

Las respuestas exitosas usan los códigos HTTP estándar de json-server. Cuando la API falla, `src/services/apiClient.ts` centraliza el error en `ApiError`; la interfaz muestra un mensaje amigable y, cuando aplica, un botón para reintentar.

## Formularios y estados

El alta y la edición usan el componente reutilizable `VideoForm` con validación manual en `src/utils/videoValidation.ts`. Se validan título, materia, código, unidad y descripción. Mientras se procesa una operación se deshabilita el botón y se muestra `Procesando...`.

Las vistas que consumen la API manejan:

- Carga: mensaje `Cargando...`.
- Error: mensaje de API y opción `Reintentar`.
- Vacío: mensaje cuando no existen registros o los filtros no encuentran resultados.
- Éxito: toast después de crear, editar o eliminar.

## Entrega 3: autenticación y permisos

La autenticación usa una API propia con Express y JWT. Las contraseñas se almacenan con hash bcrypt en `db.json`; nunca se guarda la contraseña original. El servidor expone:

| Método | Endpoint | Uso |
|---|---|---|
| POST | `/auth/register` | Registra un usuario y devuelve JWT |
| POST | `/auth/login` | Valida credenciales y devuelve JWT |
| GET | `/auth/me` | Valida el token y devuelve el usuario actual |

El frontend guarda el token y el usuario en `localStorage`, agrega automáticamente el token como `Authorization: Bearer ...` desde `apiClient.ts` y elimina la sesión cuando recibe un 401. El JWT expira después de 60 minutos. Al expirar, se redirige al login con un mensaje claro.

### Roles y permisos

| Rol | Puede ver dashboard y videos | Puede crear | Puede editar | Puede eliminar |
|---|---:|---:|---:|---:|
| `alumno` | Sí | No | No | No |
| `docente` | Sí | Sí | Sí | Sí |

Los botones se controlan con el componente reutilizable `Can`, pero la API también valida el rol y responde 403 si un alumno intenta modificar videos directamente.

### Guardias

- `ProtectedRoute`: exige una sesión activa y conserva la ruta solicitada.
- `GuestRoute`: evita que un usuario autenticado vuelva a login o registro.
- `RoleRoute`: restringe `/upload-video` al rol `docente` y muestra `/403` cuando no hay permiso.
- `/404`: vista para rutas inexistentes.

### Usuarios de prueba

```text
Docente: docente@edustream.mx / Demo123!
Alumno:  alumno@edustream.mx  / Demo123!
```

Inicia la API con `npm run server` y el frontend con `npm run dev`. Para despliegue real se debe reemplazar el secreto JWT de desarrollo mediante `JWT_SECRET`, migrar los usuarios a una base de datos y usar cookies HttpOnly o un mecanismo equivalente más seguro.

## Entrega 4: archivos y tiempo real

### Archivos asociados a videos

La Entrega 4 usa el mismo servidor Express de la aplicación con **Multer** para adjuntos locales. Los archivos se guardan en `mock-uploads/`, que está excluido de Git. Los archivos se muestran junto al detalle del video y pueden ser imágenes o videos de hasta 10 MB.

| Método | Endpoint | Uso |
|---|---|---|
| GET | `/videos/:id/files` | Lista los adjuntos de un video |
| POST | `/videos/:id/files` | Sube un adjunto como `multipart/form-data` |
| DELETE | `/videos/:id/files/:fileId` | Elimina un adjunto |
| GET | `/files/:filename` | Abre o descarga el archivo almacenado |

El formulario acepta archivos mediante selección o arrastrar y soltar. Se valida el tipo MIME y el tamaño máximo antes de enviar. Las imágenes muestran una vista previa local antes de la subida. La subida usa `XMLHttpRequest`, informa el porcentaje y permite cancelarla. Docentes pueden subir y eliminar; alumnos pueden abrir y descargar.

Esta integración es local y demostrativa. Para producción puede reemplazarse Multer por almacenamiento S3/Supabase/Firebase sin cambiar la interfaz: `fileService.ts` concentra las peticiones y `FileManager.tsx` consume el contrato de adjuntos.

### Tiempo real

La aplicación usa **Socket.IO** sobre el mismo servidor Express. `realtimeService.ts` mantiene una única instancia compartida, recibe el JWT al conectarse y se desconecta al cerrar sesión.

Estados visibles en el navbar:

- `conectado`
- `reconectando`
- `desconectado`

Socket.IO intenta reconectar automáticamente. Al recibir `sync:required`, las vistas vuelven a consultar la API para sincronizarse.

### Eventos Socket.IO

| Evento | Emisor | Payload | Uso |
|---|---|---|---|
| `catalog:changed` | Servidor | `{ action, videoId }` | Actualiza dashboard y catálogo |
| `file:changed` | Servidor | `{ action, videoId, attachment/fileId }` | Actualiza adjuntos visibles |
| `sync:required` | Servidor | `{ reason }` | Reconsulta datos después de reconectar |

Los listeners se registran con `useEffect` y se eliminan al salir de cada vista, evitando duplicados al navegar.

### Variables de entorno

```env
VITE_API_URL=http://localhost:3001
VITE_REALTIME_URL=http://localhost:3001
JWT_SECRET=change-this-secret-in-production
```
