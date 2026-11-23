import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { PortalLayout, usePortalRole } from "../components/PortalLayout";
import { Toast } from "../components/ui/Toast";
import { videoService } from "../services/videoService";
import type { VideoItem } from "../types";
import { FileManager } from "../components/ui/FileManager";
import { realtimeService } from "../services/realtimeService";
import { fileService } from "../services/fileService";

export function VideoDetailPage() {
  const [role, setRole] = usePortalRole();
  const { id } = useParams();
  const [video, setVideo] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    videoService.get(id).then(setVideo).catch((reason) => setError(reason instanceof Error ? reason.message : "No se pudo cargar el detalle.")).finally(() => setLoading(false));
  }, [id]);
  useEffect(() => {
    if (!id) return;
    const refresh = () => videoService.get(id).then(setVideo).catch((reason) => setError(reason instanceof Error ? reason.message : "No se pudo sincronizar."));
    const unsubCatalog = realtimeService.subscribe("catalog:changed", (payload) => {
      if (String(payload.videoId) === String(id)) refresh();
    });
    const unsubSync = realtimeService.subscribe("sync:required", refresh);
    return () => { unsubCatalog(); unsubSync(); };
  }, [id]);

  const playableAttachment = video?.attachments?.find((attachment) => attachment.mimeType.startsWith("video/"));
  return <PortalLayout role={role} onRoleChange={setRole}><div className="portal-container container detail-page"><Link className="back-link" to="/manage-videos">← Volver al catálogo</Link>{loading && <div className="empty-state">Cargando detalle...</div>}{error && <div className="empty-state">{error}</div>}{!loading && !error && !video && <div className="empty-state">No se encontró el video solicitado.</div>}{video && <><section className="detail-card"><div className={`detail-video ${video.thumbnailClass}`}>{playableAttachment ? <video className="video-player" controls preload="metadata" src={fileService.getUrl(playableAttachment.url)}><track kind="captions" srcLang="es" label="Español" /></video> : <div className="video-player-empty"><span>▶</span><small>Este material aún no tiene un video adjunto</small></div>}</div><div className="detail-content"><div className="eyebrow">{video.subject} · {video.code}</div><h1>{video.title}</h1><p>{video.description || "Sin descripción disponible."}</p><div className="detail-meta"><span>Duración: {video.duration}</span><span>Vistas: {video.views}</span><span>Subido: {video.uploadedAt}</span></div>{playableAttachment && <a className="button button-primary" href={fileService.getUrl(playableAttachment.url)} target="_blank" rel="noreferrer">Abrir video</a>}</div></section><FileManager videoId={video.id} /></>}<Toast message={toast} /></div></PortalLayout>;
}
