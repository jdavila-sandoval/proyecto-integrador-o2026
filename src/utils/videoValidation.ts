import type { VideoFieldErrors, VideoFormData } from "../types";

export function validateVideoForm(data: VideoFormData): VideoFieldErrors {
  const errors: VideoFieldErrors = {};
  
  if (!data.title.trim()) {
    errors.title = "El título es obligatorio.";
  } else if (data.title.trim().length < 5) {
    errors.title = "El título debe tener al menos 5 caracteres.";
  }

  if (!data.subject_id) {
    errors.subject_id = "Selecciona una materia.";
  }
  
  if (!data.unit.trim()) {
    errors.unit = "La unidad o módulo es obligatorio.";
  }
  
  if (!data.description.trim()) {
    errors.description = "Agrega una descripción breve.";
  }

  if (data.title.trim().length > 200) {
    errors.title = "El título no puede superar 200 caracteres.";
  }
  if (data.unit.trim().length > 100) {
    errors.unit = "La unidad no puede superar 100 caracteres.";
  }
  if (data.description.trim().length > 5000) {
    errors.description = "La descripción no puede superar 5000 caracteres.";
  }

  return errors;
}
