import { FormEvent, useEffect, useRef, useState, type DragEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PortalLayout, usePortalRole } from "../components/PortalLayout";
import { VideoForm } from "../components/ui/VideoForm";
import { Toast } from "../components/ui/Toast";
import { validateVideoForm } from "../utils/videoValidation";
import type { VideoFieldErrors, VideoFormData } from "../types";
import { fileService } from "../services/fileService";

const initialForm: VideoFormData = {
  title: "",
  subject: "",
  code: "",
  unit: "",
  description: "",
  visibility: "campus",
};

export function UploadVideoPage() {
  const [role, setRole] = usePortalRole();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<VideoFieldErrors>({});
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const navigate = useNavigate();

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const chooseVideo = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setToast("Solo puedes seleccionar archivos de video (.mp4 o .webm).");
      setVideoFile(null);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setToast("El video excede el tamaño máximo de 10 MB.");
      setVideoFile(null);
      return;
    }
    setToast(null);
    setVideoFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    chooseVideo(event.dataTransfer.files[0]);
  };

  const cancelUpload = () => {
    xhrRef.current?.abort();
    xhrRef.current = null;
    setSubmitting(false);
    setUploadProgress(0);
    setToast("Subida cancelada.");
  };

  const update = (field: keyof VideoFormData, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateVideoForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!videoFile) {
      setToast("Selecciona el archivo de video antes de publicar.");
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);
    xhrRef.current = fileService.uploadVideo(
      {
        title: form.title,
        subject: form.subject,
        code: form.code,
        unit: form.unit,
        description: form.description,
        visibility: form.visibility,
      },
      videoFile,
      {
        onProgress: setUploadProgress,
        onSuccess: () => {
          setUploadProgress(100);
          setSubmitting(false);
          setToast("El video se subió y procesó correctamente.");
          window.setTimeout(() => navigate("/manage-videos"), 800);
        },
        onError: (message) => {
          setSubmitting(false);
          setUploadProgress(0);
          setToast(message);
        },
      },
    );
  };

  return (
    <PortalLayout role={role} onRoleChange={setRole}>
      <div className="portal-container container upload-page">
        <div className="page-title-row">
          <div>
            <Link className="back-link" to="/dashboard">← Volver al dashboard</Link>
            <h1>Publicar nuevo material audiovisual</h1>
            <p>Comparte una clase, tutorial o recurso con tu comunidad académica.</p>
          </div>
        </div>
        <div className="upload-layout">
          <section className="upload-form-card">
            <label className="upload-dropzone upload-dropzone-input" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
              <input
                type="file"
                accept="video/mp4,video/webm"
                disabled={submitting}
                onChange={(event) => chooseVideo(event.target.files?.[0])}
              />
              {previewUrl ? (
                <video className="upload-video-preview" src={previewUrl} controls muted />
              ) : (
                <div className="upload-icon">↑</div>
              )}
              <strong>{videoFile ? videoFile.name : <>Arrastra tu video aquí o <u>examina tus archivos</u></>}</strong>
              <span>{videoFile ? `${(videoFile.size / 1024 / 1024).toFixed(1)} MB` : "Formatos aceptados: .mp4, .webm · Máximo 10 MB"}</span>
            </label>
            {submitting && (
              <div className="upload-progress upload-page-progress">
                <div><span>Subiendo y procesando video...</span><strong>{uploadProgress}%</strong></div>
                <div className="file-bar"><i style={{ width: `${uploadProgress}%` }} /></div>
                <button type="button" onClick={cancelUpload}>Cancelar subida</button>
              </div>
            )}
            <div className="form-section-title">Información del material</div>
            <VideoForm data={form} errors={errors} submitting={submitting} submitLabel="Publicar video →" onChange={update} onSubmit={submit} onCancel={() => navigate("/dashboard")} />
            <button className="draft-button" type="button" onClick={() => setToast("Borrador guardado correctamente.")}>Guardar borrador</button>
          </section>
          <aside className="upload-aside">
            <div className="aside-card"><span className="aside-badge">TIP</span><h3>Haz que tu material destaque</h3><p>Un título claro, una descripción breve y referencias ayudan a tus alumnos a encontrar y aprovechar mejor tu contenido.</p></div>
            <div className="aside-card checklist"><h3>Checklist de publicación</h3><span>✓ Video en formato compatible</span><span>○ Título descriptivo</span><span>○ Materia y unidad asignadas</span><span>○ Referencias académicas</span></div>
          </aside>
        </div>
        <Toast message={toast} type={toast?.includes("correctamente") ? "success" : "error"} />
      </div>
    </PortalLayout>
  );
}
