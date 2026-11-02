# EduStream

Parte del proyecto integrador para la materia de tecnologias en el cliente desarrollado con React, TypeScript, Vite y React Router.

## Entrega 3: fuente de datos

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

La autenticación aún es simulada en esta entrega mediante `AuthGuard`, todavía no se manejan tokens de sesión, queda pendiente para las siguientes entregas.
