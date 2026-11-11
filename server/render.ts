import fs from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import type { FontEntry, Project, ReelProps } from '../src/remotion/types';
import { BUILTIN_FONTS } from '../src/remotion/fonts';
import { PORT, ROOT, projectDir } from './paths';
import { get, save } from './projects';
import { userFonts } from './fonts';

type Job = { id: string; projectId: string; status: 'bundling' | 'rendering' | 'done' | 'error'; progress: number; file?: string; error?: string };
export const jobs = new Map<string, Job>();

let bundled: Promise<string> | null = null;
const getBundle = () => {
  bundled ??= bundle({ entryPoint: path.join(ROOT, 'src', 'remotion', 'index.ts'), publicDir: path.join(ROOT, 'public') }).catch((e) => { bundled = null; throw e; });
  return bundled;
};
export const resetBundle = () => { bundled = null; };

const nextVersion = (p: Project) => {
  const dir = path.join(projectDir(p.id), 'exports');
  fs.mkdirSync(dir, { recursive: true });
  let v = 1;
  while (fs.existsSync(path.join(dir, `v${v}.mp4`))) v++; // never overwrite an earlier export
  return { dir, name: `v${v}.mp4` };
};

export const startRender = (projectId: string) => {
  const p = get(projectId);
  if (!p) throw new Error('Проєкт не знайдено');
  const id = `${projectId}-${Date.now()}`;
  const job: Job = { id, projectId, status: 'bundling', progress: 0 };
  jobs.set(id, job);
  const origin = `http://localhost:${PORT}`;
  const abs = (u: string) => (u.startsWith('http') ? u : origin + u);
  const fonts: FontEntry[] = [...BUILTIN_FONTS, ...userFonts()].map((f) => ({ ...f, file: abs(f.file), italic: f.italic ? abs(f.italic) : undefined }));
  const props: ReelProps = {
    src: `${origin}/media/${p.id}/proxy.mp4`,
    project: { words: p.words, clips: p.clips, fps: p.fps, style: p.style },
    fonts,
    musicSrc: p.style.music.file ? `${origin}/media/${p.id}/${encodeURIComponent(p.style.music.file)}` : null,
  };
  const { dir, name } = nextVersion(p);
  (async () => {
    try {
      const serveUrl = await getBundle();
      job.status = 'rendering';
      const composition = await selectComposition({ serveUrl, id: 'Reel', inputProps: props, browserExecutable: process.env.CHROME_PATH ?? null });
      await renderMedia({
        composition, serveUrl, codec: 'h264', crf: 18, pixelFormat: 'yuv420p', audioBitrate: '192k',
        outputLocation: path.join(dir, name), inputProps: props, browserExecutable: process.env.CHROME_PATH ?? null,
        onProgress: ({ progress }) => { job.progress = progress; },
      });
      job.status = 'done';
      job.progress = 1;
      job.file = `/media/${p.id}/exports/${name}`;
      const fresh = get(p.id)!;
      fresh.exports.push({ file: name, createdAt: new Date().toISOString() });
      save(fresh);
    } catch (e: any) {
      console.error(e);
      job.status = 'error';
      job.error = e.message;
    }
  })();
  return job;
};
