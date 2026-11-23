import type { AttachmentItem } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const TOKEN_KEY = "edustream_token";

export interface UploadCallbacks {
  onProgress: (percent: number) => void;
  onSuccess: (attachment: AttachmentItem) => void;
  onError: (message: string) => void;
}

export interface UploadVideoCallbacks {
  onProgress: (percent: number) => void;
  onSuccess: (result: { video: unknown; attachment: AttachmentItem }) => void;
  onError: (message: string) => void;
}

export const fileService = {
  uploadVideo(form: Record<string, string>, file: File, callbacks: UploadVideoCallbacks) {
    const xhr = new XMLHttpRequest();
    const multipart = new FormData();
    Object.entries(form).forEach(([key, value]) => multipart.append(key, value));
    multipart.append("file", file);
    xhr.open("POST", `${API_URL}/videos/upload`);
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) callbacks.onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let body: { message?: string; video?: unknown; attachment?: AttachmentItem };
      try { body = JSON.parse(xhr.responseText); } catch { body = {}; }
      if (xhr.status >= 200 && xhr.status < 300 && body.video && body.attachment) callbacks.onSuccess({ video: body.video, attachment: body.attachment });
      else if (xhr.status === 401) callbacks.onError(body.message || "Tu sesión expiró. Inicia sesión nuevamente.");
      else if (xhr.status === 403) callbacks.onError(body.message || "No tienes permisos para publicar videos.");
      else if (xhr.status === 404) callbacks.onError("La ruta de publicación no está disponible. Reinicia el servidor.");
      else callbacks.onError(body.message || `No se pudo publicar el video (HTTP ${xhr.status}).`);
    };
    xhr.onerror = () => callbacks.onError("La conexión se perdió durante la subida.");
    xhr.send(multipart);
    return xhr;
  },
  list(videoId: string | number) {
    return fetch(`${API_URL}/videos/${encodeURIComponent(videoId)}/files`, {
      headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ""}` },
    }).then(async (response) => {
      const body = await response.json().catch(() => []);
      if (!response.ok) throw new Error(body.message || "No se pudieron cargar los archivos.");
      return body as AttachmentItem[];
    });
  },
  upload(videoId: string | number, file: File, callbacks: UploadCallbacks) {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", file);
    xhr.open("POST", `${API_URL}/videos/${encodeURIComponent(videoId)}/files`);
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) callbacks.onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let body: { message?: string };
      try { body = JSON.parse(xhr.responseText); } catch { body = {}; }
      if (xhr.status >= 200 && xhr.status < 300) callbacks.onSuccess(body as unknown as AttachmentItem);
      else callbacks.onError(body.message || "No se pudo subir el archivo.");
    };
    xhr.onerror = () => callbacks.onError("La conexión se perdió durante la subida.");
    xhr.send(form);
    return xhr;
  },
  remove(videoId: string | number, fileId: string) {
    return fetch(`${API_URL}/videos/${encodeURIComponent(videoId)}/files/${encodeURIComponent(fileId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ""}` },
    }).then(async (response) => {
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || "No se pudo eliminar el archivo.");
      }
    });
  },
  getUrl(url: string) {
    return `${API_URL}${url}`;
  },
};
