import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PortalLayout } from "../components/PortalLayout";
import { Toast } from "../components/ui/Toast";
import { VideoForm } from "../components/ui/VideoForm";
import { uploadToStorage } from "../services/uploadService";
import { videoService } from "../services/videoService";
import type { VideoFieldErrors, VideoFormData } from "../types";
import { validateVideoForm } from "../utils/videoValidation";

const ACCEPTED_TYPES = ["video/mp4", "video/webm"];
const MAX_BYTES = 500 * 1024 * 1024;

const initialForm: VideoFormData = {
  title: "",
  subject_id: "",
  unit: "",
  description: "",
  visibility: "campus",
};

type Phase = "idle" | "registering" | "uploading" | "finalizing";

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function validateFile(file: File | null): string | null {
  if (!file) return "Selecciona un archivo de video.";
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Formato no admitido. Usa .mp4 o .webm.";
  }
  if (file.size > MAX_BYTES) return "El archivo supera el máximo de 500 MB.";
  if (file.size === 0) return "El archivo está vacío.";
  return null;
}

export function UploadVideoPage() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<VideoFieldErrors>({});
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const submitting = phase !== "idle";

  const update = (field: keyof VideoFormData, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const chooseFile = (candidate: File | null) => {
    setFile(candidate);
    setFileError(candidate ? validateFile(candidate) : null);
    setProgress(0);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!submitting) chooseFile(event.dataTransfer.files[0] ?? null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    const nextErrors = validateVideoForm(form);
    const nextFileError = validateFile(file);
    setErrors(nextErrors);
    setFileError(nextFileError);

    if (Object.keys(nextErrors).length > 0 || nextFileError || !file) return;

    try {
      setPhase("registering");
      const created = await videoService.create(form, file);

      setPhase("uploading");
      setProgress(0);
      await uploadToStorage(created.upload, file, setProgress);

      setPhase("finalizing");
      await videoService.complete(created.id);

      setToast("El video se publicó correctamente.");
      window.setTimeout(() => navigate(`/videos/${created.id}`), 800);
    } catch (reason) {
      setToast(
        reason instanceof Error
          ? reason.message
          : "No se pudo publicar el video.",
      );
      setPhase("idle");
    }
  };

  const phaseLabel: Record<Phase, string> = {
    idle: "",
    registering: "Registrando el recurso...",
    uploading: `Subiendo archivo... ${progress}%`,
    finalizing: "Verificando el archivo...",
  };

  const checklist = [
    { done: Boolean(file) && !fileError, label: "Video en formato compatible" },
    { done: form.title.trim().length >= 5, label: "Título descriptivo" },
    {
      done: Boolean(form.subject_id) && Boolean(form.unit.trim()),
      label: "Materia y unidad asignadas",
    },
    { done: Boolean(form.description.trim()), label: "Descripción agregada" },
  ];

  return (
    <PortalLayout>
      <div className="portal-container container upload-page">
        <div className="page-title-row">
          <div>
            <Link className="back-link" to="/dashboard">
              ← Volver al dashboard
            </Link>
            <h1>Publicar nuevo material audiovisual</h1>
            <p>
              Comparte una clase, tutorial o recurso con tu comunidad académica.
            </p>
          </div>
        </div>

        <div className="upload-layout">
          <section className="upload-form-card">
            <div
              className="upload-dropzone"
              onDragOver={(event) => event.preventDefault()}
              onDrop={onDrop}
            >
              <div className="upload-icon">↑</div>
              <strong>
                Arrastra tu video aquí o{" "}
                <u
                  role="button"
                  tabIndex={0}
                  onClick={() => !submitting && inputRef.current?.click()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !submitting) {
                      inputRef.current?.click();
                    }
                  }}
                >
                  examina tus archivos
                </u>
              </strong>
              <span>Formatos aceptados: .mp4, .webm · Máximo 500 MB</span>

              <input
                ref={inputRef}
                type="file"
                accept=".mp4,.webm,video/mp4,video/webm"
                hidden
                disabled={submitting}
                onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
              />

              {file && (
                <div className="file-progress">
                  <div>
                    <span>Archivo seleccionado: {file.name}</span>
                    <small>
                      {formatSize(file.size)}
                      {phase === "uploading" ? ` · ${progress}%` : ""}
                    </small>
                  </div>
                  <span className="file-bar">
                    <i style={{ width: `${progress}%` }} />
                  </span>
                </div>
              )}

              {fileError && (
                <small className="field-error" role="alert">
                  {fileError}
                </small>
              )}
              {submitting && <small>{phaseLabel[phase]}</small>}
            </div>

            <div className="form-section-title">Información del material</div>
            <VideoForm
              data={form}
              errors={errors}
              submitting={submitting}
              submitLabel="Publicar video →"
              onChange={update}
              onSubmit={submit}
              onCancel={() => navigate("/dashboard")}
            />
          </section>

          <aside className="upload-aside">
            <div className="aside-card">
              <span className="aside-badge">TIP</span>
              <h3>Haz que tu material destaque</h3>
              <p>
                Un título claro, una descripción breve y referencias ayudan a
                tus alumnos a encontrar y aprovechar mejor tu contenido.
              </p>
            </div>
            <div className="aside-card checklist">
              <h3>Checklist de publicación</h3>
              {checklist.map((item) => (
                <span key={item.label}>
                  {item.done ? "✓" : "○"} {item.label}
                </span>
              ))}
            </div>
          </aside>
        </div>

        <Toast
          message={toast}
          type={toast?.includes("correctamente") ? "success" : "error"}
        />
      </div>
    </PortalLayout>
  );
}
