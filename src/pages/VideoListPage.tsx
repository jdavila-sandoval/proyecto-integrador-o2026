import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PortalLayout, usePortalRole } from "../components/PortalLayout";
import { VideoRow } from "../components/ui/VideoRow";
import { useSubjects } from "../hooks/useSubject";
import { useVideos } from "../hooks/useVideos";

const ALL_SUBJECTS = "Todas las materias";

export function VideoListPage() {
  const [role, setRole] = usePortalRole();
  const { videos, loading, error, reload } = useVideos();
  const { subjects, error: subjectsError } = useSubjects();
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState(ALL_SUBJECTS);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const term = search
      .trim()
      .toLowerCase();
    
    return videos.filter(
      (video) =>
        video.title.toLowerCase().includes(term) &&
        (subject === ALL_SUBJECTS || video.subject === subject)
    );
  }, [videos, search, subject]);

  return (
    <PortalLayout role={ role } onRoleChange={ setRole }>
      <div className="portal-container container list-page">
        <div className="page-title-row">
          <div>
            <h1>Catálogo de recursos publicados</h1>
            <p>Consulta los recursos registrados en la plataforma</p>
          </div>
          {role === "Docente" && (
            <Link className="button button-primary" to="/upload-video">
              ＋ Nuevo recurso
            </Link>
          )}
        </div>

        <div className="list-toolbar">
          <div className="list-search">
            <span>⌕</span>
            <input
              value={ search }
              onChange={ (e) => setSearch(e.target.value) }
              placeholder="Buscar por título..."
            />
          </div>
          <select
            value={ subject }
            onChange={ (e) => setSubject(e.target.value) }
            disabled={ Boolean(subjectsError) }
          >
            <option value={ ALL_SUBJECTS }>{ ALL_SUBJECTS }</option>
            {subjects.map((item) => (
              <option key={ item.id } value={ item.name }>
                { item.name }
              </option>
            ))}
          </select>
          <span className="result-count">
            { loading ? "Cargando..." : `${filtered.length} registros`}
          </span>
        </div>

        { subjectsError && (
          <p role="alert" className="field-error">
            { subjectsError}
          </p>
        ) }

        <section className="video-table">
          <div className="table-head">
            <span>Material audiovisual</span>
            <span>Duración</span>
            <span>Fecha de registro</span>
            <span>Vistas</span>
            <span>Acciones</span>
          </div>

          { loading && <div className="empty-state">Cargando recursos...</div> }

          { error && (
            <div className="empty-state">
              <p>{error}</p>
              <button
                className="button button-secondary"
                onClick={() => void reload()}
              >
                Reintentar
              </button>
            </div>
          ) }

          { !loading &&
            !error &&
            filtered.map((video) => (
              <VideoRow
                key={video.id}
                video={video}
                onPreview={(item) => navigate(`/videos/${item.id}`)}
              />
            )) }

          { !loading && !error && filtered.length === 0 && (
            <div className="empty-state">
              No encontramos recursos con esos filtros.
            </div>
          ) }
        </section>

        <Link className="back-link list-back" to="/dashboard">
          ← Regresar al dashboard
        </Link>
      </div>
    </PortalLayout>
  );
}
