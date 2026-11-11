import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import type { Project } from '../src/remotion/types';
import { BUILTIN_FONTS } from '../src/remotion/fonts';
import { userFonts } from './fonts';
import { DATA, PORT, PROJECTS, PUBLIC, ROOT, USER_FONTS, projectDir, whisperBinary, whisperModel } from './paths';
import * as store from './projects';
import { jobs, startRender } from './render';

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use((_req, res, next) => { res.setHeader('Access-Control-Allow-Origin', '*'); next(); }); // renderer loads fonts/media cross-origin

const upload = multer({ dest: path.join(DATA, 'tmp'), limits: { fileSize: 8 * 1024 ** 3 } });
const safeName = (n: string) => Buffer.from(n, 'latin1').toString('utf8').replace(/[\\/:*?"<>|]/g, '_');

app.get('/api/status', (_req, res) => {
  res.json({ whisper: !!whisperBinary(), model: !!whisperModel() });
});

app.get('/api/projects', (_req, res) => {
  res.json(store.list().map(({ words, clips, ...p }) => ({ ...p, clipCount: clips.length })));
});

app.post('/api/projects', upload.single('file'), (req, res) => {
  if (!req.file) return void res.status(400).json({ error: 'Файл не отримано' });
  const original = safeName(req.file.originalname);
  const p = store.create(path.parse(original).name);
  const src = path.join(projectDir(p.id), `source${path.extname(original).toLowerCase() || '.mp4'}`);
  fs.renameSync(req.file.path, src);
  store.processProject(p.id, src);
  res.json(p);
});

app.get('/api/projects/:id', (req, res) => {
  const p = store.get(req.params.id);
  if (!p) return void res.status(404).json({ error: 'Немає такого проєкту' });
  res.json(p);
});

app.patch('/api/projects/:id', (req, res) => {
  const p = store.get(req.params.id);
  if (!p) return void res.status(404).json({ error: 'Немає такого проєкту' });
  const allowed: (keyof Project)[] = ['name', 'words', 'clips', 'style', 'language'];
  for (const k of allowed) if (req.body[k] !== undefined) (p as any)[k] = req.body[k];
  res.json(store.save(p));
});

app.delete('/api/projects/:id', (req, res) => {
  store.remove(req.params.id);
  res.json({ ok: true });
});

app.post('/api/projects/:id/music', upload.single('file'), (req, res) => {
  const p = store.get(req.params.id);
  if (!p || !req.file) return void res.status(400).json({ error: 'Немає проєкту або файлу' });
  const name = `music-${Date.now()}${path.extname(safeName(req.file.originalname)).toLowerCase() || '.mp3'}`;
  fs.renameSync(req.file.path, path.join(projectDir(p.id), name));
  p.style.music.file = name;
  res.json(store.save(p));
});

// re-run cuts + transcription (e.g. after changing the language); keeps the style
app.post('/api/projects/:id/reprocess', (req, res) => {
  const p = store.get(req.params.id);
  if (!p) return void res.status(404).json({ error: 'Немає такого проєкту' });
  const src = fs.readdirSync(projectDir(p.id)).find((f) => f.startsWith('source.'));
  if (!src) return void res.status(400).json({ error: 'Оригінал відео не знайдено' });
  if (typeof req.body?.language === 'string') p.language = req.body.language;
  p.status = 'processing'; p.error = undefined; store.save(p);
  store.processProject(p.id, path.join(projectDir(p.id), src));
  res.json(p);
});

app.post('/api/projects/:id/render', (req, res) => {
  try { res.json(startRender(req.params.id)); } catch (e: any) { res.status(400).json({ error: e.message }); }
});
app.get('/api/renders/:id', (req, res) => {
  const j = jobs.get(req.params.id);
  if (!j) return void res.status(404).json({ error: 'Немає такого рендеру' });
  res.json(j);
});

app.get('/api/fonts', (_req, res) => res.json([...BUILTIN_FONTS, ...userFonts()]));
app.post('/api/fonts', upload.single('file'), (req, res) => {
  if (!req.file) return void res.status(400).json({ error: 'Файл не отримано' });
  const name = safeName(req.file.originalname);
  if (!/\.(ttf|otf|woff2?)$/i.test(name)) return void res.status(400).json({ error: 'Потрібен .ttf, .otf або .woff2' });
  fs.renameSync(req.file.path, path.join(USER_FONTS, name));
  res.json(userFonts());
});

app.use('/media', express.static(PROJECTS, { acceptRanges: true, maxAge: 0 }));
app.use('/user-fonts', express.static(USER_FONTS));
app.use('/fonts', express.static(path.join(PUBLIC, 'fonts')));

const dist = path.join(ROOT, 'dist');
if (process.argv.includes('--prod') && fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/(api|media)\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// resume projects interrupted by a restart
for (const p of store.list()) {
  if (p.status === 'processing' || p.status === 'uploading') {
    const src = fs.readdirSync(projectDir(p.id)).find((f) => f.startsWith('source.'));
    if (src) store.processProject(p.id, path.join(projectDir(p.id), src));
    else { p.status = 'error'; p.error = 'Завантаження перервалося'; store.save(p); }
  }
}

app.listen(PORT, () => {
  console.log(`\n  Video Studio: http://localhost:${process.argv.includes('--prod') ? PORT : 5173}\n`);
  if (!whisperBinary() || !whisperModel()) console.log('  Увага: розпізнавання мови не встановлене. Запусти: npm run setup:whisper\n');
});
