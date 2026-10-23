const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const DATA_FILE = path.join(ROOT, 'videos.json');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');
app.use(express.static(ROOT, { index: 'index.html' }));
app.use('/uploads', express.static(UPLOAD_DIR));
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 10);
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 }, fileFilter: (_req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('video/')) cb(null, true);
  else cb(new Error('Only video files can be uploaded.'));
}});
function readVideos() { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return []; } }
function saveVideos(videos) { fs.writeFileSync(DATA_FILE, JSON.stringify(videos, null, 2)); }
app.get('/api/videos', (_req, res) => res.json(readVideos()));
app.post('/api/videos', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose a video file first.' });
  const title = String(req.body.title || '').trim();
  if (!title || title.length > 120) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'Title must be between 1 and 120 characters.' });
  }
  const videos = readVideos();
  const video = {
    id: crypto.randomUUID(), username: 'community', title,
    video_url: `/uploads/${req.file.filename}`, content_type: req.file.mimetype,
    file_size: req.file.size, created_at: new Date().toISOString(), is_owner: true
  };
  videos.unshift(video); saveVideos(videos);
  res.status(201).json({ ok: true, video });
});
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Video must be smaller than 100 MB.' });
  res.status(400).json({ error: err.message || 'Upload failed.' });
});
app.listen(PORT, () => console.log(`PlayBack running on port ${PORT}`));
