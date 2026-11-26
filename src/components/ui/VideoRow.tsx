import type { VideoItem } from "../../types";

interface VideoRowProps {
  video: VideoItem;
  onPreview: (video: VideoItem) => void;
  onEdit?: (video: VideoItem) => void;
  onDelete?: (video: VideoItem) => void;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function VideoRow({
  video,
  onPreview,
  onEdit,
  onDelete,
}: VideoRowProps) {
  return (
    <div className="video-row">
      <div className={`video-thumb ${video.thumbnailClass}`}>
        <span>▶</span>
        <small>{video.duration}</small>
      </div>
      <div className="video-row-title">
        <strong>{video.title}</strong>
        <span>
          {video.subject} · {video.code}
        </span>
      </div>
      <span className="video-row-duration">{video.duration}</span>
      <span className="video-row-date">{video.uploadedAt}</span>
      <span className="video-row-views">{video.views}</span>
      <div className="row-actions">
        <button
          onClick={() => onPreview(video)}
          aria-label={`Ver ${video.title}`}
        >
          Ver
        </button>
        { onEdit && (
          <button
            onClick={() => onEdit(video)}
            aria-label={`Editar ${video.title}`}
          >
            Editar
          </button>
        )}
        { onDelete && (
          <button
            className="delete-action"
            onClick={() => onDelete(video)}
            aria-label={`Eliminar ${video.title}`}
          >
            ⌫
          </button>
        )}
      </div>
    </div>
  );
}
