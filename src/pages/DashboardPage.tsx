import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { PortalLayout, usePortalRole } from "../components/PortalLayout";
import { StatCard } from "../components/ui/StatCard";
import { useSubjects } from "../hooks/useSubjects";
import { useVideos } from "../hooks/useVideos";
import { formatDate } from "../utils/formatDate";
import type { CourseMetric } from "../types";

const SUBJECT_TONES = [
  "subject-purple",
  "subject-orange",
  "subject-blue",
  "subject-green",
];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function greetingFor(date: Date): string {
  const hour = date.getHours();

  if (hour < 12) return "Buen día";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function DashboardPage() {
  const auth = useAuth();
  const [role, setRole] = usePortalRole();
  const { videos, loading, error } = useVideos();
  const { subjects } = useSubjects();

  const now = new Date();
  const profile = auth.user?.profile;
  const firstName =
    profile?.given_name ??
    profile?.name?.split(" ")[0] ??
    profile?.email?.split("@")[0] ??
    "";

  const today = now
    .toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();

  const recent = useMemo(
    () =>
      [...videos]
        .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
        .slice(0, 3),
    [videos],
  );

  const countBySubject = useMemo(() => {
    const counts = new Map<string, number>();
    videos.forEach((video) =>
      counts.set(video.subject, (counts.get(video.subject) ?? 0) + 1),
    );
    return counts;
  }, [videos]);

  const lastWeek = videos.filter(
    (video) => Date.now() - new Date(video.uploadedAt).getTime() <= WEEK_MS,
  ).length;

  const metrics: CourseMetric[] = [
    {
      label: "Recursos publicados",
      value: String(videos.length),
      detail: "Registrados en la plataforma",
      icon: "▶",
      tone: "purple",
    },
    {
      label: "Publicados esta semana",
      value: String(lastWeek),
      detail: "Últimos 7 días",
      icon: "◷",
      tone: "orange",
    },
    {
      label: "Materias registradas",
      value: String(subjects.length),
      detail: "Catálogo de la plataforma",
      icon: "▦",
      tone: "blue",
    },
    {
      label: "Materias con contenido",
      value: String(countBySubject.size),
      detail: "Con al menos un recurso",
      icon: "✦",
      tone: "green",
    },
  ];

  return (
    <PortalLayout role={role} onRoleChange={setRole}>
      <div className="portal-container container">
        <div className="portal-welcome">
          <div>
            <div className="eyebrow">{today}</div>
            <h1>
              {greetingFor(now)}
              {firstName ? `, ${firstName}` : ""} <span>✦</span>
            </h1>
            <p>Consulta los recursos más recientes de la plataforma.</p>
          </div>
          {role === "Docente" && (
            <div className="portal-welcome-actions">
              <Link className="button button-secondary" to="/manage-videos">
                Ver catálogo
              </Link>
              <Link className="button button-primary" to="/upload-video">
                ＋ Nuevo recurso
              </Link>
            </div>
          )}
        </div>

        <div className="stats-grid">
          {metrics.map((metric) => (
            <StatCard key={metric.label} metric={metric} />
          ))}
        </div>

        <section className="portal-section">
          <div className="portal-section-heading">
            <div>
              <div className="eyebrow">RECIENTES</div>
              <h2>Últimos recursos publicados</h2>
            </div>
            <Link to="/manage-videos" className="text-link">
              Ver todo →
            </Link>
          </div>

          {loading && <div className="empty-state">Cargando recursos...</div>}
          {error && <div className="empty-state">{error}</div>}
          {!loading && !error && videos.length === 0 && (
            <div className="empty-state">
              Todavía no hay recursos disponibles.
            </div>
          )}

          <div className="continue-grid">
            {recent.map((video) => (
              <Link
                className="continue-card"
                to={`/videos/${video.id}`}
                key={video.id}
              >
                <div className={`continue-thumb ${video.thumbnailClass}`}>
                  <span className="continue-play">▶</span>
                </div>
                <div className="continue-content">
                  <small>{video.subject}</small>
                  <h3>{video.title}</h3>
                  <div className="progress-label">
                    <span>{video.unit}</span>
                    <span>{formatDate(video.uploadedAt)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="portal-section subjects-section">
          <div className="portal-section-heading">
            <div>
              <div className="eyebrow">MATERIAS</div>
              <h2>Catálogo por materia</h2>
            </div>
          </div>
          <div className="subject-grid">
            {subjects.map((subject, index) => {
              const count = countBySubject.get(subject.name) ?? 0;

              return (
                <Link
                  className={`subject-card ${SUBJECT_TONES[index % SUBJECT_TONES.length]}`}
                  to="/manage-videos"
                  key={subject.id}
                >
                  <span className="subject-icon">▦</span>
                  <div>
                    <strong>{subject.name}</strong>
                    <small>
                      {count} {count === 1 ? "recurso" : "recursos"}
                    </small>
                  </div>
                  <span className="card-arrow">↗</span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </PortalLayout>
  );
}
