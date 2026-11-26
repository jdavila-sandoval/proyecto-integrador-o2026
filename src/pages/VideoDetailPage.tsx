import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PortalLayout } from "../components/PortalLayout";
import { ApiError } from "../services/apiClient";
import { videoService } from "../services/videoService";
import type { VideoItem } from "../types";
import { formatDate } from "../utils/formatDate";

const visibilityLabels: Record<NonNullable<VideoItem["visibility"]>, string> = {
  campus: "Todo el campus",
  group: "Solo mi grupo",
};

export function VideoDetailPage() {
  const { id } = useParams();
  const [video, setVideo] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const refreshed = useRef(false);

  useEffect(() => {
    if (!id) {
      setVideo(null);
      setError("No se indicó qué recurso mostrar.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setVideo(null);
    setPlaybackUrl(null);
    setPlaybackError(null);
    refreshed.current = false;

    videoService
      .get(id)
      .then((result) => {
        if (!cancelled) setVideo(result);
      })
      .catch((reason) => {
        if (cancelled) return;
        setError(
          reason instanceof ApiError && reason.status === 404
            ? "No se encontró el recurso solicitado."
            : reason instanceof Error
              ? reason.message
              : "No se pudo cargar el detalle.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const loadPlayback = useCallback(async (videoId: string) => {
    try {
      const info = await videoService.playback(videoId);
      setPlaybackUrl(info.url);
      setPlaybackError(null);
    } catch (reason) {
      setPlaybackUrl(null);
      setPlaybackError(
        reason instanceof Error
          ? reason.message
          : "No se pudo preparar la reproducción.",
      );
    }
  }, []);

  useEffect(() => {
    if (video?.status === "ready") {
      void loadPlayback(String(video.id));
    }
  }, [video, loadPlayback]);

  const onPlayerError = () => {
    if (!video || refreshed.current) {
      setPlaybackError("No se pudo reproducir el video.");
      return;
    }
    refreshed.current = true;
    void loadPlayback(String(video.id));
  };

  return (
    <PortalLayout>
      <div className="portal-container container detail-page">
        <Link className="back-link" to="/manage-videos">
          ← Volver al catálogo
        </Link>

        {loading && <div className="empty-state">Cargando detalle...</div>}

        {!loading && error && (
          <div className="empty-state" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && video && (
          <section className="detail-card">
            {playbackUrl ? (
              <video
                className="detail-video"
                controls
                preload="metadata"
                src={playbackUrl}
                onError={onPlayerError}
              />
            ) : (
              <div className={`detail-video ${video.thumbnailClass}`}>
                <span>▶</span>
              </div>
            )}

            <div className="detail-content">
              <div className="eyebrow">
                {video.subject} · {video.code}
              </div>
              <h1>{video.title}</h1>
              <p>{video.description || "Sin descripción disponible."}</p>

              <div className="detail-meta">
                {video.unit && <span>Unidad: {video.unit}</span>}
                {video.visibility && (
                  <span>Visibilidad: {visibilityLabels[video.visibility]}</span>
                )}
                <span>Registrado: {formatDate(video.uploadedAt)}</span>
              </div>

              {video.status !== "ready" && (
                <p className="field-error">
                  Este recurso todavía no tiene un archivo de video.
                </p>
              )}
              {playbackError && (
                <p className="field-error" role="alert">
                  {playbackError}
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </PortalLayout>
  );
}
