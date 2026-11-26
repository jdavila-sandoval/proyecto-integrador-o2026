import { getIdToken } from "../auth/token";

const API_URL = (import.meta.env.VITE_API_URL ?? "")
  .trim()
  .replace(/\/+$/, "")

export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(
    message: string,
    status: number,
    details: unknown = null
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getErrorMessage(body: unknown, status: number): string {
  if (isRecord(body)) {
    if (typeof body.detail === "string" && body.detail.trim()) {
      return body.detail;
    }

    if (Array.isArray(body.detail)) {
      const message = body.detail
        .filter(isRecord)
        .map((issue) => {
          if (typeof issue.msg !== "string") {
            return "";
          }

          const field = Array.isArray(issue.loc)
            ? issue.loc
              .filter(
                (part) =>
                  typeof part === "string" ||
                  typeof part === "number"
              )
              .filter(
                (part, index) => 
                  index !== 0 ||
                  !["body", "query", "path", "header"].includes(String(part))
              )
              .join(".")
            : "";
          
          return field ? `${field}: ${issue.msg}` : issue.msg;
        })
        .filter(Boolean);

      if (message.length > 0) {
        return message.join(" . ");
      }
    }

    if (typeof body.message === "string" && body.message.trim()) {
      return body.message;
    }
  }

  switch (status) {
    case 401:
      return "La solicitud no está autenticada o la sesion ya no es válida.";
    case 403:
      return "La API rechazó el acceso a este recurso.";
    case 404:
      return "No se encontró el recurso solicitado.";
    case 422:
      return "Revisa los datos enviados: hay campos inválidos o faltantes.";
    case 429:
      return "Se realizaron demasiadas solicitudes. Intente más tarde.";
    case 503:
      return "El servicio no está disponible temporalmente.";
      default:
        return `La API no pudo completar la operación (HTTP ${status})`;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!API_URL) {
    throw new ApiError("Falta configura VITE_APU_URL en las variables de entorno.", 0);
  }

  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new ApiError("La ruta API debe comenzar con una sola barra (/).", 0);
  }

  const headers = new Headers(options.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (
    typeof options.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const token = getIdToken();
  console.debug("[api]", path, "token:", Boolean(token));

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer: ${token}`);
  }

  let response: Response;
  let rawBody: string;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers
    });

    rawBody = await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    throw new ApiError("No se pudo completar la comunicación con la API. Revisa la conexión, la URL y la configuración de CORS", 0);
  }

  let body: unknown = null;
  let validJson = false;

  if (rawBody.trim()) {
    try {
      body = JSON.parse(rawBody);
      validJson = true;
    } catch {
      body = rawBody;
    }
  }

  if (!response.ok) {
    throw new ApiError(getErrorMessage(body, response.status), response.status, body);
  }

  if (!rawBody.trim()) {
    return undefined as T;
  }
  
  if (!validJson) {
    throw new ApiError("La API devolvió una respuesta que no es un JSON válido.", response.status);
  }

  return body as T;
}
