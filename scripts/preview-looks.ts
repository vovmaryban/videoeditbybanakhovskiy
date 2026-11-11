// Dev helper: one still per look through the real export renderer → tools/looks/*.jpg
// Usage (studio running): npx tsx scripts/preview-looks.ts <projectId> [frame] [look-a,look-b]
import fs from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { BUILTIN_FONTS } from '../src/remotion/fonts';
import { applyLook, LOOKS, normalizeStyle } from '../src/remotion/presets';
import type { ReelProps } from '../src/remotion/types';

const [, , projectId, frameArg, only] = process.argv;
const ROOT = process.cwd();
const origin = 'http://localhost:4610';
const p = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'projects', projectId, 'project.json'), 'utf8'));
const out = path.join(ROOT, 'tools', 'looks');
fs.mkdirSync(out, { recursive: true });
const fonts = BUILTIN_FONTS.map((f) => ({ ...f, file: origin + f.file, italic: f.italic ? origin + f.italic : undefined }));

(async () => {
  const serveUrl = await bundle({ entryPoint: path.join(ROOT, 'src', 'remotion', 'index.ts'), publicDir: path.join(ROOT, 'public') });
  const base = normalizeStyle(p.style);
  base.headline = { ...base.headline, enabled: true, text: '3 ПОМИЛКИ\nУ REELS', kicker: '01' };
  base.color = { ...base.color, filter: 'cinema', intensity: 1 };
  const looks = LOOKS.filter((l) => !only || only.split(',').includes(l.id));
  for (const l of looks) {
    const props: ReelProps = { src: `${origin}/media/${p.id}/proxy.mp4`, project: { words: p.words, clips: p.clips, fps: p.fps, style: applyLook(base, l) }, fonts, musicSrc: null };
    const composition = await selectComposition({ serveUrl, id: 'Reel', inputProps: props });
    await renderStill({ composition, serveUrl, inputProps: props, frame: Number(frameArg ?? 400), output: path.join(out, `${l.id}.jpg`), imageFormat: 'jpeg', scale: 0.3 });
    console.log('ok', l.id);
  }
})().catch((e) => { console.error(e); process.exit(1); });
