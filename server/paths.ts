import fs from 'node:fs';
import path from 'node:path';

export const ROOT = process.cwd();
export const DATA = path.join(ROOT, 'data');
export const PROJECTS = path.join(DATA, 'projects');
export const USER_FONTS = path.join(DATA, 'fonts');
export const TOOLS = path.join(ROOT, 'tools');
export const PUBLIC = path.join(ROOT, 'public');
export const PORT = Number(process.env.STUDIO_PORT ?? 4610);
export const IS_WIN = process.platform === 'win32';

for (const d of [DATA, PROJECTS, USER_FONTS, TOOLS, path.join(DATA, 'tmp')]) fs.mkdirSync(d, { recursive: true });

export const projectDir = (id: string) => path.join(PROJECTS, id.replace(/[^a-zA-Z0-9_-]/g, ''));

// ffmpeg/ffprobe: env override, otherwise the binaries Remotion ships for this platform.
const findCompositorDir = () => {
  const base = path.join(ROOT, 'node_modules', '@remotion');
  const dirs = fs.existsSync(base) ? fs.readdirSync(base).filter((d) => d.startsWith(`compositor-${process.platform}-${process.arch}`)) : [];
  for (const d of dirs) {
    const full = path.join(base, d);
    if (fs.existsSync(path.join(full, IS_WIN ? 'ffmpeg.exe' : 'ffmpeg'))) return full;
  }
  return null;
};

const COMPOSITOR = findCompositorDir();
export const FFMPEG = process.env.FFMPEG_PATH ?? (COMPOSITOR ? path.join(COMPOSITOR, IS_WIN ? 'ffmpeg.exe' : 'ffmpeg') : 'ffmpeg');
export const FFPROBE = process.env.FFPROBE_PATH ?? (COMPOSITOR ? path.join(COMPOSITOR, IS_WIN ? 'ffprobe.exe' : 'ffprobe') : 'ffprobe');
export const FF_ENV: NodeJS.ProcessEnv = COMPOSITOR && !process.env.FFMPEG_PATH
  ? { ...process.env, LD_LIBRARY_PATH: [COMPOSITOR, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':'), DYLD_LIBRARY_PATH: COMPOSITOR }
  : process.env;

// whisper.cpp
export const WHISPER_VERSION = '1.8.2';
export const WHISPER_DIR = path.join(TOOLS, 'whisper');
export const MODELS_DIR = path.join(TOOLS, 'models');
export const DEFAULT_MODEL = process.env.WHISPER_MODEL ?? 'ggml-large-v3-turbo-q5_0.bin';

export const findFile = (dir: string, names: string[]): string | null => {
  if (!fs.existsSync(dir)) return null;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop()!;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (names.includes(e.name)) return p;
    }
  }
  return null;
};

export const whisperBinary = () => process.env.WHISPER_BIN ?? findFile(WHISPER_DIR, IS_WIN ? ['whisper-cli.exe'] : ['whisper-cli']);
export const whisperModel = () => {
  const p = process.env.WHISPER_MODEL_PATH ?? path.join(MODELS_DIR, DEFAULT_MODEL);
  return fs.existsSync(p) ? p : null;
};
