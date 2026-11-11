import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { Word } from '../src/remotion/types';
import { run } from './ffmpeg';
import { DEFAULT_MODEL, IS_WIN, MODELS_DIR, TOOLS, WHISPER_DIR, WHISPER_VERSION, whisperBinary, whisperFastBinary, whisperModel } from './paths';

const download = async (url: string, to: string, label: string) => {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Не вдалося завантажити ${label}: HTTP ${res.status}`);
  const total = Number(res.headers.get('content-length') ?? 0);
  let got = 0;
  let last = 0;
  const tmp = `${to}.part`;
  const body = Readable.fromWeb(res.body as any);
  body.on('data', (c: Buffer) => {
    got += c.length;
    if (total && Date.now() - last > 1500) { last = Date.now(); process.stdout.write(`\r  ${label}: ${Math.round((got / total) * 100)}%   `); }
  });
  await pipeline(body, fs.createWriteStream(tmp));
  fs.renameSync(tmp, to);
  process.stdout.write(`\r  ${label}: готово          \n`);
};

// Installs whisper.cpp (prebuilt on Windows, built from source elsewhere) and the speech model.
export const setupWhisper = async () => {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
  if (!whisperFastBinary()) {
    console.log(`Встановлюю whisper.cpp v${WHISPER_VERSION} (OpenBLAS)...`);
    if (IS_WIN) {
      const zip = path.join(TOOLS, 'whisper-blas-bin-x64.zip');
      await download(`https://github.com/ggml-org/whisper.cpp/releases/download/v${WHISPER_VERSION}/whisper-blas-bin-x64.zip`, zip, 'whisper.cpp');
      fs.mkdirSync(WHISPER_DIR, { recursive: true });
      await run('powershell', ['-NoProfile', '-NonInteractive', '-Command', `Expand-Archive -Force -LiteralPath '${zip}' -DestinationPath '${WHISPER_DIR}'`], { env: process.env });
      fs.rmSync(zip, { force: true });
    } else {
      if (!fs.existsSync(WHISPER_DIR)) {
        await run('git', ['clone', '--depth', '1', '-b', `v${WHISPER_VERSION}`, 'https://github.com/ggml-org/whisper.cpp.git', WHISPER_DIR], { env: process.env });
      }
      await new Promise<void>((resolve, reject) => {
        const p = spawn('sh', ['-c', 'cmake -B build -DCMAKE_BUILD_TYPE=Release -DWHISPER_BUILD_TESTS=OFF -DWHISPER_SDL2=OFF -DBUILD_SHARED_LIBS=OFF && cmake --build build -j --config Release --target whisper-cli'], { cwd: WHISPER_DIR, stdio: 'inherit' });
        p.on('error', reject);
        p.on('close', (c) => (c === 0 ? resolve() : reject(new Error('Збірка whisper.cpp не вдалася: потрібні cmake і компілятор C++'))));
      });
    }
    if (!whisperBinary()) throw new Error('whisper-cli не знайдено після встановлення');
  }
  console.log(`whisper.cpp: ${whisperBinary()}`);
  if (!whisperModel()) {
    console.log(`Завантажую модель розпізнавання ${DEFAULT_MODEL} (~550 МБ, один раз)...`);
    await download(`https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${DEFAULT_MODEL}`, path.join(MODELS_DIR, DEFAULT_MODEL), 'модель');
  }
  console.log(`модель: ${whisperModel()}`);
};

const HALLUCINATIONS = /^(дякуємо|дякую|субтитр|продовження|підписуйтесь|музика|\[|\()/i;

// Transcribes phrase windows in one whisper run (one 30 s encoder pass per phrase: slower than packing
// phrases together, but whisper merges repeated takes when it sees several at once). Returns words in source seconds.
export const transcribeWindows = async (
  files: { file: string; offset: number; seconds: number }[],
  language: string,
  onProgress: (p: number) => void,
): Promise<Word[]> => {
  const bin = whisperBinary();
  const model = whisperModel();
  if (!bin || !model) throw new Error('Розпізнавання мови не встановлене: запусти setup (npm run setup:whisper)');
  const threads = String(Math.max(2, Math.min(8, os.cpus().length)));
  const args = ['-m', model, '-l', language, '-t', threads, '-ml', '1', '-sow', '-oj', '-np', '-nf', '-mc', '0', '-bs', '3', '-bo', '3'];
  for (const f of files) args.push('-f', f.file);
  const tick = setInterval(() => onProgress(files.filter((f) => fs.existsSync(`${f.file}.json`)).length / files.length), 1000);
  try {
    await new Promise<void>((resolve, reject) => {
      const p = spawn(bin, args, { cwd: path.dirname(bin), windowsHide: true });
      let err = '';
      p.stderr.on('data', (d) => { err += d.toString(); if (err.length > 50000) err = err.slice(-20000); });
      p.stdout.on('data', () => {});
      p.on('error', reject);
      p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`whisper завершився з кодом ${c}: ${err.slice(-800)}`))));
    });
  } finally { clearInterval(tick); }
  const words: Word[] = [];
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(`${f.file}.json`, 'utf8'));
    for (const seg of j.transcription ?? []) {
      const raw: string = seg.text ?? '';
      const text = raw.trim();
      if (!text) continue;
      const start = f.offset + seg.offsets.from / 1000;
      const end = f.offset + seg.offsets.to / 1000;
      const prev = words[words.length - 1];
      // a token without a leading space continues the previous word ("20" + "-ти")
      if (prev && !/^\s/.test(raw) && start - prev.end < 0.15) { prev.text += text; prev.end = end; continue; }
      words.push({ text, start: +start.toFixed(3), end: +end.toFixed(3) });
    }
  }
  return words.filter((w) => !HALLUCINATIONS.test(w.text) && /[\p{L}\p{N}]/u.test(w.text));
};
