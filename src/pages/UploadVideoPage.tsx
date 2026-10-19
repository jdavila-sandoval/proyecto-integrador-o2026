import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PortalLayout, usePortalRole } from "../components/PortalLayout";
import { Toast } from "../components/ui/Toast";
import { subjects } from "../data/mockVideos";

export function UploadVideoPage() {
  const [role, setRole] = usePortalRole();
  const [toast, setToast] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const navigate = useNavigate();
  const publish = () => {
    if (!title.trim()) {
      setToast("Escribe un título para el material antes de publicarlo.");
      return;
    }
    setToast("El video se subió y procesó correctamente.");
    window.setTimeout(() => navigate("/manage-videos"), 850);
  };
  return (
    <PortalLayout role={role} onRoleChange={setRole}>
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
            <div className="upload-dropzone">
              <div className="upload-icon">↑</div>
              <strong>
                Arrastra tu video aquí o <u>examina tus archivos</u>
              </strong>
              <span>Formatos aceptados: .mp4, .webm · Máximo 2 GB</span>
              <div className="file-progress">
                <div>
                  <span>Archivo cargado: clase_semana_04.mp4</span>
                  <small>45.2 MB · 100%</small>
                </div>
                <span className="file-bar">
                  <i />
                </span>
              </div>
            </div>
            <div className="form-section-title">Información del material</div>
            <label className="portal-field">
              <span>Título de la clase / video</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Introducción a los contenedores"
              />
            </label>
            <div className="portal-form-row">
              <label className="portal-field">
                <span>Asignatura / Materia</span>
                <select defaultValue={subjects[0]}>
                  {subjects.map((subject) => (
                    <option key={subject}>{subject}</option>
                  ))}
                </select>
              </label>
              <label className="portal-field">
                <span>Unidad / Módulo temático</span>
                <input placeholder="Ej. Unidad 4: Despliegue" />
              </label>
            </div>
            <label className="portal-field">
              <span>Descripción y referencias académicas</span>
              <textarea
                rows={4}
                placeholder="Describe los temas abordados y agrega referencias..."
              />
            </label>
            <div className="portal-field">
              <span>Visibilidad</span>
              <label className="radio-option">
                <input type="radio" name="visibility" defaultChecked /> Público
                para el campus{" "}
                <small>Cualquier alumno inscrito podrá verlo.</small>
              </label>
              <label className="radio-option">
                <input type="radio" name="visibility" /> Privado para el grupo{" "}
                <small>Solo estará disponible para tu grupo.</small>
              </label>
            </div>
            <div className="upload-actions">
              <button
                className="button button-secondary"
                onClick={() => navigate("/dashboard")}
              >
                Cancelar
              </button>
              <button
                className="button button-secondary"
                onClick={() => setToast("Borrador guardado correctamente.")}
              >
                Guardar borrador
              </button>
              <button className="button button-primary" onClick={publish}>
                Publicar Video <span>→</span>
              </button>
            </div>
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
              <span>✓ Video en formato compatible</span>
              <span>○ Título descriptivo</span>
              <span>○ Materia y unidad asignadas</span>
              <span>○ Referencias académicas</span>
            </div>
          </aside>
        </div>
        <Toast
          message={toast}
          type={
            toast?.includes("correctamente") || toast?.includes("guardado")
              ? "success"
              : "error"
          }
        />
      </div>
    </PortalLayout>
  );
}
