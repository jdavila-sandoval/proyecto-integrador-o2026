import type { UploadTarget } from "../types";

export function uploadToStorage(
  target: UploadTarget,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData();

    Object.entries(target.fields).forEach(([key, value]) =>
      form.append(key, value),
    );
    form.append("file", file);

    const request = new XMLHttpRequest();
    request.open("POST", target.url);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
      } else {
        reject(
          new Error(
            `El almacenamiento rechazó el archivo (HTTP ${request.status}).`,
          ),
        );
      }
    };

    request.onerror = () =>
      reject(
        new Error(
          "No se pudo subir el archivo. Revisa la conexión y la configuración de CORS del bucket.",
        ),
      );

    request.send(form);
  });
}