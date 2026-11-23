import cors from "cors";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import { Server as SocketServer } from "socket.io";
import multer from "multer";

const app = express();
const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || "edustream-development-secret";
const TOKEN_TTL = "60m";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "db.json");
const uploadsDir = path.join(__dirname, "..", "mock-uploads");
await fs.mkdir(uploadsDir, { recursive: true });

app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
app.use(express.json());
app.use("/files", express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadsDir),
  filename: (_req, file, callback) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    callback(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (
      file.mimetype.startsWith("image/")
      || file.mimetype.startsWith("video/")
      || (file.mimetype === "application/octet-stream" && [".mp4", ".webm"].includes(extension))
    ) {
      callback(null, true);
    } else {
      callback(new Error("Solo se permiten imágenes y videos."));
    }
  },
});

async function readDb() {
  return JSON.parse(await fs.readFile(dbPath, "utf8"));
}

async function writeDb(db) {
  await fs.writeFile(dbPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function createToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ message: "Debes iniciar sesión para continuar." });
  try {
    req.auth = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Tu sesión expiró o el token no es válido." });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.auth.role)) return res.status(403).json({ message: "No tienes permisos para realizar esta acción." });
    next();
  };
}

app.post("/auth/register", async (req, res) => {
  const { name, email, password, role = "alumno" } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: "Nombre, correo y contraseña son obligatorios." });
  if (!["alumno", "docente"].includes(role)) return res.status(400).json({ message: "El rol seleccionado no es válido." });
  const db = await readDb();
  if (db.users.some((user) => user.email.toLowerCase() === email.toLowerCase())) return res.status(409).json({ message: "El correo ya está registrado." });
  const user = { id: `u-${Date.now()}`, name, email: email.toLowerCase(), passwordHash: await bcrypt.hash(password, 10), role };
  db.users.push(user);
  await writeDb(db);
  res.status(201).json({ user: publicUser(user), token: createToken(user) });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const db = await readDb();
  const user = db.users.find((item) => item.email.toLowerCase() === String(email || "").toLowerCase());
  if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) return res.status(401).json({ message: "Correo o contraseña incorrectos." });
  res.json({ user: publicUser(user), token: createToken(user) });
});

app.get("/auth/me", authenticate, async (req, res) => {
  const db = await readDb();
  const user = db.users.find((item) => item.id === req.auth.sub);
  if (!user) return res.status(401).json({ message: "La sesión ya no corresponde a un usuario válido." });
  res.json({ user: publicUser(user) });
});

app.get("/videos", authenticate, async (req, res) => {
  const db = await readDb();
  res.json(db.videos);
});

app.get("/videos/:id", authenticate, async (req, res) => {
  const db = await readDb();
  const video = db.videos.find((item) => String(item.id) === req.params.id);
  if (!video) return res.status(404).json({ message: "Video no encontrado." });
  res.json(video);
});

app.post("/videos", authenticate, requireRole("docente"), async (req, res) => {
  const db = await readDb();
  const video = { id: Date.now(), ...req.body, duration: "00:00", uploadedAt: new Date().toLocaleDateString("es-MX"), views: 0, thumbnailClass: "thumb-blue" };
  db.videos.push(video);
  await writeDb(db);
  io.emit("catalog:changed", { action: "created", videoId: video.id });
  res.status(201).json(video);
});

app.post("/videos/upload", authenticate, requireRole("docente"), upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Selecciona el archivo de video antes de publicar." });
  const extension = path.extname(req.file.originalname).toLowerCase();
  if (!req.file.mimetype.startsWith("video/") && !(req.file.mimetype === "application/octet-stream" && [".mp4", ".webm"].includes(extension))) {
    await fs.unlink(req.file.path).catch(() => {});
    return res.status(400).json({ message: "El archivo debe ser un video MP4 o WebM." });
  }
  const db = await readDb();
  const video = {
    id: Date.now(),
    title: req.body.title,
    subject: req.body.subject,
    code: req.body.code,
    unit: req.body.unit,
    description: req.body.description,
    visibility: req.body.visibility,
    duration: "00:00",
    uploadedAt: new Date().toLocaleDateString("es-MX"),
    views: 0,
    thumbnailClass: "thumb-blue",
  };
  if (!video.title || !video.subject || !video.code || !video.unit || !video.description) {
    await fs.unlink(req.file.path).catch(() => {});
    return res.status(400).json({ message: "Completa todos los campos obligatorios del video." });
  }
  const attachment = {
    id: `file-${Date.now()}`,
    name: req.file.originalname,
    filename: req.file.filename,
    mimeType: req.file.mimetype,
    size: req.file.size,
    url: `/files/${encodeURIComponent(req.file.filename)}`,
  };
  video.attachments = [attachment];
  db.videos.push(video);
  await writeDb(db);
  io.emit("catalog:changed", { action: "created", videoId: video.id });
  io.emit("file:changed", { action: "uploaded", videoId: video.id, attachment });
  res.status(201).json({ video, attachment });
});

app.patch("/videos/:id", authenticate, requireRole("docente"), async (req, res) => {
  const db = await readDb();
  const index = db.videos.findIndex((item) => String(item.id) === req.params.id);
  if (index < 0) return res.status(404).json({ message: "Video no encontrado." });
  db.videos[index] = { ...db.videos[index], ...req.body };
  await writeDb(db);
  io.emit("catalog:changed", { action: "updated", videoId: db.videos[index].id });
  res.json(db.videos[index]);
});

app.delete("/videos/:id", authenticate, requireRole("docente"), async (req, res) => {
  const db = await readDb();
  const originalLength = db.videos.length;
  db.videos = db.videos.filter((item) => String(item.id) !== req.params.id);
  if (db.videos.length === originalLength) return res.status(404).json({ message: "Video no encontrado." });
  await writeDb(db);
  io.emit("catalog:changed", { action: "deleted", videoId: req.params.id });
  res.status(204).end();
});

app.get("/videos/:id/files", authenticate, async (req, res) => {
  const db = await readDb();
  const video = db.videos.find((item) => String(item.id) === req.params.id);
  if (!video) return res.status(404).json({ message: "Video no encontrado." });
  res.json(video.attachments ?? []);
});

app.post("/videos/:id/files", authenticate, requireRole("docente"), upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Selecciona un archivo válido." });
  const db = await readDb();
  const video = db.videos.find((item) => String(item.id) === req.params.id);
  if (!video) {
    await fs.unlink(req.file.path).catch(() => {});
    return res.status(404).json({ message: "Video no encontrado." });
  }
  const attachment = {
    id: `file-${Date.now()}`,
    name: req.file.originalname,
    filename: req.file.filename,
    mimeType: req.file.mimetype,
    size: req.file.size,
    url: `/files/${encodeURIComponent(req.file.filename)}`,
  };
  video.attachments = [...(video.attachments ?? []), attachment];
  await writeDb(db);
  io.emit("file:changed", { action: "uploaded", videoId: req.params.id, attachment });
  io.emit("catalog:changed", { action: "file-added", videoId: req.params.id });
  res.status(201).json(attachment);
});

app.delete("/videos/:id/files/:fileId", authenticate, requireRole("docente"), async (req, res) => {
  const db = await readDb();
  const video = db.videos.find((item) => String(item.id) === req.params.id);
  if (!video) return res.status(404).json({ message: "Video no encontrado." });
  const attachment = (video.attachments ?? []).find((item) => item.id === req.params.fileId);
  if (!attachment) return res.status(404).json({ message: "Archivo no encontrado." });
  await fs.unlink(path.join(uploadsDir, attachment.filename)).catch(() => {});
  video.attachments = (video.attachments ?? []).filter((item) => item.id !== req.params.fileId);
  await writeDb(db);
  io.emit("file:changed", { action: "deleted", videoId: req.params.id, fileId: req.params.fileId });
  io.emit("catalog:changed", { action: "file-removed", videoId: req.params.id });
  res.status(204).end();
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "El archivo excede el tamaño máximo de 10 MB." });
  }
  return res.status(400).json({ message: error.message || "No se pudo procesar el archivo." });
});

const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: ["http://localhost:5173", "http://127.0.0.1:5173"], methods: ["GET", "POST"] },
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Se requiere autenticación."));
  try {
    socket.data.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new Error("Token inválido o expirado."));
  }
});

io.on("connection", (socket) => {
  socket.emit("sync:required", { reason: "connected" });
});

server.listen(PORT, () => console.log(`EduStream API disponible en http://localhost:${PORT}`));
