import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Project, Word } from '../src/remotion/types';
import { DEFAULT_STYLE, normalizeStyle } from '../src/remotion/presets';
import { buildClips, findSpeech, packWindows, readWav, snapWords, SR, suspiciousRuns, windows, writeWav } from './cuts';
import { ffmpeg, probe } from './ffmpeg';
import { PROJECTS, projectDir } from './paths';
import { transcribeWindows } from './whisper';

const cache = new Map<string, Project>();

export const save = (p: Project) => {
  cache.set(p.id, p);
  const file = path.join(projectDir(p.id), 'project.json');
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(p, null, 1));
  fs.renameSync(`${file}.tmp`, file);
  return p;
};

export const get = (id: string): Project | null => {
  if (cache.has(id)) return cache.get(id)!;
  const file = path.join(projectDir(id), 'project.json');
  if (!fs.existsSync(file)) return null;
  const p = JSON.parse(fs.readFileSync(file, 'utf8')) as Project;
  p.style = normalizeStyle(p.style);
  cache.set(id, p);
  return p;
};

export const list = () =>
  fs.readdirSync(PROJECTS)
    .map((id) => get(id))
    .filter((p): p is Project => !!p)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const create = (name: string): Project => {
  const id = `${new Date().toISOString().slice(0, 10)}-${crypto.randomBytes(3).toString('hex')}`;
  fs.mkdirSync(projectDir(id), { recursive: true });
  return save({
    id, name, createdAt: new Date().toISOString(), status: 'uploading', language: 'uk', fps: 30, width: 1080, height: 1920,
    duration: 0, words: [], clips: [], style: structuredClone(DEFAULT_STYLE), exports: [],
  });
};

export const remove = (id: string) => {
  cache.delete(id);
  fs.rmSync(projectDir(id), { recursive: true, force: true });
};

const step = (p: Project, s: string, progress?: number) => { p.step = s; p.progress = progress; save(p); console.log(`[${p.id}] ${s}${progress !== undefined ? ` ${Math.round(progress * 100)}%` : ''}`); };

// Upload -> proxies -> audio -> speech runs -> transcription -> clips with retakes switched off.
export const processProject = async (id: string, sourceFile: string) => {
  const p = get(id)!;
  const dir = projectDir(id);
  try {
    p.status = 'processing';
    step(p, 'Читаю відео', 0);
    const info = await probe(sourceFile);
    p.duration = info.duration;

    // Remotion's bundled ffmpeg has no fps/setsar filters: the frame rate is set per output with -r
    const cover = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920';
    const done = path.join(dir, 'proxy.done');
    if (!fs.existsSync(done)) {
    step(p, 'Готую відео для монтажу', 0);
    await ffmpeg([
      '-i', sourceFile,
      '-filter_complex', `[0:v]${cover},split=2[a][b];[b]scale=540:960[c]`,
      '-map', '[a]', ...(info.hasAudio ? ['-map', '0:a:0'] : []), '-r', '30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-g', '30', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', path.join(dir, 'proxy.mp4'),
      '-map', '[c]', ...(info.hasAudio ? ['-map', '0:a:0'] : []), '-r', '30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '25', '-g', '10', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-movflags', '+faststart', path.join(dir, 'preview.mp4'),
    ], (t) => step(p, 'Готую відео для монтажу', Math.min(0.99, t / info.duration)));
    fs.writeFileSync(done, '');
    }

    if (!info.hasAudio) {
      p.clips = [{ id: 'c0', start: 0, end: info.duration, enabled: true }];
      p.status = 'ready'; p.step = undefined; save(p); return;
    }
    step(p, 'Шукаю паузи');
    const wav = path.join(dir, 'audio.wav');
    await ffmpeg(['-i', sourceFile, '-map', '0:a:0', '-ac', '1', '-ar', String(SR), '-c:a', 'pcm_s16le', wav]);
    const pcm = readWav(wav);
    const speech = findSpeech(pcm);

    step(p, 'Розпізнаю мову', 0);
    const wdir = path.join(dir, 'asr');
    fs.rmSync(wdir, { recursive: true, force: true });
    fs.mkdirSync(wdir);
    const toFiles = (list: { start: number; end: number }[], prefix: string) => list.map((w, i) => {
      const file = path.join(wdir, `${prefix}${String(i).padStart(3, '0')}.wav`);
      writeWav(file, pcm.subarray(Math.floor(w.start * SR), Math.min(pcm.length, Math.ceil(w.end * SR))));
      return { file, offset: w.start, seconds: w.end - w.start };
    });
    const t0 = Date.now();
    let words: Word[] = [];
    let passInfo = '';
    if ((p.asrMode ?? 'fast') === 'precise') {
      const wins = toFiles(windows(speech), 'w');
      words = wins.length ? await transcribeWindows(wins, p.language, (x) => step(p, 'Розпізнаю мову', x)) : [];
      passInfo = `${wins.length} вікон по одній фразі`;
    } else {
      // pass 1: big windows (few encoder runs)
      const big = toFiles(packWindows(speech), 'a');
      words = big.length ? snapWords(speech, await transcribeWindows(big, p.language, (x) => step(p, 'Розпізнаю мову', x * 0.55))) : [];
      // pass 2: only phrases that look wrong (merged retakes, missing words) + their neighbours
      const bad = suspiciousRuns(speech, words);
      if (bad.length) {
        const runs = bad.map((k) => speech[k]);
        const small = toFiles(windows(runs), 'b');
        const fixed = small.length ? await transcribeWindows(small, p.language, (x) => step(p, 'Перевіряю сумнівні фрази', 0.55 + x * 0.45)) : [];
        const inBad = (t: number) => runs.some((r) => t >= r.start - 0.05 && t <= r.end + 0.05);
        words = [...words.filter((w) => !inBad((w.start + w.end) / 2)), ...fixed].sort((a, b) => a.start - b.start);
      }
      passInfo = `${big.length} великих вікон + ${bad.length} фраз повторно`;
    }
    p.asrSeconds = +((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[${p.id}] розпізнавання: ${p.asrSeconds} с (${passInfo}) на ${info.duration.toFixed(1)} с запису`);
    p.words = words;
    p.clips = buildClips(speech, words);
    fs.writeFileSync(path.join(dir, 'words.auto.json'), JSON.stringify(words));
    p.status = 'ready';
    p.step = undefined;
    p.progress = undefined;
    save(p);
    console.log(`[${p.id}] готово: ${words.length} слів, ${p.clips.length} фраз, ${p.clips.filter((c) => !c.enabled).length} вимкнено`);
  } catch (e: any) {
    console.error(e);
    p.status = 'error';
    p.error = e.message;
    save(p);
  }
};
