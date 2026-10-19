import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PortalLayout, usePortalRole } from "../components/PortalLayout";
import { Modal } from "../components/ui/Modal";
import { Toast } from "../components/ui/Toast";
import { VideoRow } from "../components/ui/VideoRow";
import { mockVideos, subjects } from "../data/mockVideos";
import type { VideoItem } from "../types";

export function VideoListPage() {
  const [role, setRole] = usePortalRole();
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("Todas las materias");
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState<"delete" | "edit" | "preview" | null>(
    null,
  );
  const [selected, setSelected] = useState<VideoItem | null>(null);
  const filtered = useMemo(
    () =>
      mockVideos.filter(
        (video) =>
          video.title.toLowerCase().includes(search.toLowerCase()) &&
          (subject === "Todas las materias" || video.subject === subject),
      ),
    [search, subject],
  );
  const open = (kind: "delete" | "edit" | "preview", video: VideoItem) => {
    setSelected(video);
    setModal(kind);
  };
  const close = () => {
    setModal(null);
    setSelected(null);
  };
  return (
    <PortalLayout role={role} onRoleChange={setRole}>
      <div className="portal-container container list-page">
        <div className="page-title-row">
          <div>
            <div className="eyebrow">ESPACIO DOCENTE</div>
            <h1>Catálogo y Gestión de Videos Publicados</h1>
            <p>Administra, revisa y comparte tus materiales audiovisuales.</p>
          </div>
          <Link className="button button-primary" to="/upload-video">
            ＋ Nuevo Video
          </Link>
        </div>
        <div className="list-toolbar">
          <div className="list-search">
            <span>⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título..."
            />
          </div>
          <select value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option>Todas las materias</option>
            {subjects.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <span className="result-count">{filtered.length} registros</span>
        </div>
        <section className="video-table">
          <div className="table-head">
            <span>Material audiovisual</span>
            <span>Duración</span>
            <span>Fecha de subida</span>
            <span>Vistas</span>
            <span>Acciones</span>
          </div>
          {filtered.map((video) => (
            <VideoRow
              key={video.id}
              video={video}
              onPreview={(item) => open("preview", item)}
              onEdit={(item) => open("edit", item)}
              onDelete={(item) => open("delete", item)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="empty-state">
              No encontramos videos con esos filtros.
            </div>
          )}
        </section>
        <Toast message={toast} />
        <Link className="back-link list-back" to="/dashboard">
          ← Regresar al dashboard
        </Link>
      </div>
      {modal === "delete" && selected && (
        <Modal
          title="¿Deseas eliminar este registro?"
          description={`Se eliminaría “${selected.title}”. En este modo demo los datos no se modificarán.`}
          onClose={close}
        >
          <div className="modal-actions">
            <button className="button button-secondary" onClick={close}>
              No, conservar
            </button>
            <button
              className="button button-danger"
              onClick={() => {
                close();
                setToast(
                  "Registro eliminado correctamente (modo demostración, no persistido).",
                );
              }}
            >
              Sí, eliminar
            </button>
          </div>
        </Modal>
      )}
      {modal === "preview" && selected && (
        <Modal
          title="Vista previa del material"
          description={`Abriendo una previsualización de “${selected.title}”.`}
          onClose={close}
        >
          <div className={`modal-preview ${selected.thumbnailClass}`}>
            <span>▶</span>
          </div>
          <button
            className="button button-primary modal-full-button"
            onClick={close}
          >
            Cerrar previsualización
          </button>
        </Modal>
      )}
      {modal === "edit" && selected && (
        <Modal
          title="Editar material"
          description="Los cambios son visuales y no se persisten en esta entrega."
          onClose={close}
        >
          <label className="portal-field">
            <span>Título del video</span>
            <input defaultValue={selected.title} />
          </label>
          <div className="modal-actions">
            <button className="button button-secondary" onClick={close}>
              Cancelar
            </button>
            <button
              className="button button-primary"
              onClick={() => {
                close();
                setToast("Cambios guardados correctamente.");
              }}
            >
              Guardar cambios
            </button>
          </div>
        </Modal>
      )}
    </PortalLayout>
  );
}
