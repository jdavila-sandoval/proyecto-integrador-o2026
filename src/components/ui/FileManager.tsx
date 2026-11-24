import { useEffect, useRef, useState, type DragEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { realtimeService } from "../../services/realtimeService";
import { fileService } from "../../services/fileService";
import type { AttachmentItem } from "../../types";
import { Modal } from "./Modal";
import { Toast } from "./Toast";

interface FileManagerProps {
  videoId: string | number;
}

export function FileManager({ videoId }: FileManagerProps) {
  const { user } = useAuth();
  const [files, setFiles] = useState<AttachmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [deleteFile, setDeleteFile] = useState<AttachmentItem | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const canManage = user?.role === "docente";

  const load = async () => {
    setLoading(true);
    setError(null);
    try { setFiles(await fileService.list(videoId)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudieron cargar los archivos."); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    void load();
    const unsubscribeFile = realtimeService.subscribe("file:changed", (payload) => {
      if (String(payload.videoId) === String(videoId)) void load();
    });
    const unsubscribeSync = realtimeService.subscribe("sync:required", () => void load());
    return () => { unsubscribeFile(); unsubscribeSync(); };
  }, [videoId]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const validate = (file: File) => {
    const validType = file.type.startsWith("image/") || file.type.startsWith("video/");
    if (!validType) return "Solo se permiten imágenes y videos.";
    if (file.size > 10 * 1024 * 1024) return "El archivo excede el tamaño máximo de 10 MB.";
    return null;
  };

  const chooseFile = (file?: File) => {
    if (!file) return;
    const validationError = validate(file);
    if (validationError) { setToast(validationError); setSelectedFile(null); return; }
    setSelectedFile(file);
    setToast(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    chooseFile(event.dataTransfer.files[0]);
  };

  const startUpload = () => {
    if (!selectedFile) { setToast("Selecciona un archivo antes de subirlo."); return; }
    setUploading(true);
    setProgress(0);
    xhrRef.current = fileService.upload(videoId, selectedFile, {
      onProgress: setProgress,
      onSuccess: (attachment) => {
        setFiles((current) => [...current, attachment]);
        setSelectedFile(null);
        setProgress(100);
        setUploading(false);
        setToast("Archivo subido correctamente.");
      },
      onError: (message) => { setUploading(false); setProgress(0); setToast(message); },
    });
  };

  const cancelUpload = () => {
    xhrRef.current?.abort();
    xhrRef.current = null;
    setUploading(false);
    setProgress(0);
    setToast("Subida cancelada.");
  };

  const confirmDelete = async () => {
    if (!deleteFile) return;
    try {
      await fileService.remove(videoId, deleteFile.id);
      setFiles((current) => current.filter((file) => file.id !== deleteFile.id));
      setDeleteFile(null);
      setToast("Archivo eliminado correctamente.");
    } catch (reason) { setToast(reason instanceof Error ? reason.message : "No se pudo eliminar el archivo."); }
  };

  const formatSize = (size: number) => size < 1024 * 1024 ? `${Math.round(size / 1024)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;

  return <section className="file-manager"><div className="file-manager-heading"><div><span className="eyebrow">ADJUNTOS</span><h2>Archivos del material</h2></div></div>
    {canManage && <div className="file-upload-area"><label className="file-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}><input type="file" accept="image/*,video/*" disabled={uploading} onChange={(event) => chooseFile(event.target.files?.[0])} /><span className="upload-icon">↑</span><strong>Arrastra una imagen o video aquí</strong><small>o selecciona un archivo · Máximo 10 MB</small></label>{previewUrl && <div className="file-preview"><img src={previewUrl} alt="Vista previa del archivo seleccionado" /></div>}{selectedFile && !previewUrl && <div className="file-selected"><strong>{selectedFile.name}</strong><span>{formatSize(selectedFile.size)}</span></div>}{uploading && <div className="upload-progress"><div><span>Subiendo archivo...</span><strong>{progress}%</strong></div><div className="file-bar"><i style={{ width: `${progress}%` }} /></div><button type="button" onClick={cancelUpload}>Cancelar subida</button></div>}{selectedFile && !uploading && <button className="button button-primary" type="button" onClick={startUpload}>Subir archivo</button>}</div>}
    {loading && <div className="empty-state">Cargando archivos...</div>}
    {error && <div className="empty-state"><p>{error}</p><button className="button button-secondary" onClick={() => void load()}>Reintentar</button></div>}
    {!loading && !error && files.length === 0 && <div className="empty-state">Este material todavía no tiene archivos adjuntos.</div>}
    {!loading && !error && files.length > 0 && <div className="file-grid">{files.map((file) => <article className="file-card" key={file.id}>{file.mimeType.startsWith("image/") ? <img src={fileService.getUrl(file.url)} alt={file.name} /> : <div className="file-video-preview">▶<small>{file.mimeType}</small></div>}<div className="file-card-info"><strong title={file.name}>{file.name}</strong><span>{file.mimeType} · {formatSize(file.size)}</span><div><a href={fileService.getUrl(file.url)} target="_blank" rel="noreferrer">Abrir</a><a href={fileService.getUrl(file.url)} download={file.name}>Descargar</a>{canManage && <button type="button" onClick={() => setDeleteFile(file)}>Eliminar</button>}</div></div></article>)}</div>}
    <Toast message={toast} type={toast?.includes("correctamente") ? "success" : "error"} />
    {deleteFile && <Modal title="¿Eliminar este archivo?" description={`Se eliminará “${deleteFile.name}”.`} onClose={() => setDeleteFile(null)}><div className="modal-actions"><button className="button button-secondary" onClick={() => setDeleteFile(null)}>No</button><button className="button button-danger" onClick={() => void confirmDelete()}>Sí, eliminar</button></div></Modal>}
  </section>;
}
