import fs from 'node:fs';
import type { Clip, Word } from '../src/remotion/types';

export const SR = 16000;

export const readWav = (file: string): Int16Array => {
  const buf = fs.readFileSync(file);
  let off = 12;
  while (off < buf.length - 8) {
    const id = buf.toString('ascii', off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === 'data') return new Int16Array(buf.buffer.slice(buf.byteOffset + off + 8, buf.byteOffset + off + 8 + size - (size % 2)));
    off += 8 + size + (size % 2);
  }
  throw new Error('WAV без даних');
};

export const writeWav = (file: string, pcm: Int16Array) => {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.byteLength, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28);
  h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.byteLength, 40);
  fs.writeFileSync(file, Buffer.concat([h, Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength)]));
};

// 10 ms energy in dB
export const energy = (pcm: Int16Array) => {
  const hop = SR / 100;
  const n = Math.floor(pcm.length / hop);
  const db = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = i * hop; k < (i + 1) * hop; k++) s += (pcm[k] / 32768) ** 2;
    db[i] = 10 * Math.log10(s / hop + 1e-12);
  }
  return db;
};

export type SpeechOptions = { minPause: number; pad: number; thresholdDb: number };
export const DEFAULT_SPEECH: SpeechOptions = { minPause: 0.2, pad: 0.09, thresholdDb: 7 };
const MAX_PHRASE = 14; // seconds: longer runs are split at their quietest moment

// Speech runs ("phrases") separated by real silence, relative to the room noise floor.
export const findSpeech = (pcm: Int16Array, o: SpeechOptions = DEFAULT_SPEECH) => {
  const db = energy(pcm);
  const sorted = Float32Array.from(db).sort();
  const floor = sorted[Math.floor(sorted.length * 0.1)] ?? -60;
  const thr = floor + o.thresholdDb;
  const runs: [number, number][] = [];
  let i = 0;
  while (i < db.length) {
    if (db[i] <= thr) { i++; continue; }
    let j = i;
    while (j < db.length && db[j] > thr) j++;
    runs.push([i, j]);
    i = j;
  }
  let merged: [number, number][] = [];
  for (const r of runs) {
    const last = merged[merged.length - 1];
    if (last && (r[0] - last[1]) / 100 < o.minPause) last[1] = r[1];
    else merged.push([...r]);
  }
  merged = merged.filter(([a, b]) => b - a >= 12);
  // split very long runs at the quietest 50 ms between 5 s and MAX_PHRASE s
  const split: [number, number][] = [];
  for (let [a, b] of merged) {
    while ((b - a) / 100 > MAX_PHRASE) {
      let best = a + 500;
      let bestE = Infinity;
      for (let k = a + 500; k < Math.min(b - 100, a + MAX_PHRASE * 100); k++) {
        const e = db[k] + db[k + 1] + db[k + 2] + db[k + 3] + db[k + 4];
        if (e < bestE) { bestE = e; best = k + 2; }
      }
      split.push([a, best]);
      a = best;
    }
    split.push([a, b]);
  }
  const dur = pcm.length / SR;
  const sp = split.map(([a, b]) => [a / 100, b / 100] as [number, number]);
  return sp.map(([a, b], k) => {
    const prevEnd = k ? sp[k - 1][1] : 0;
    const nextStart = k < sp.length - 1 ? sp[k + 1][0] : dur;
    return { start: Math.max(a - o.pad, (a + prevEnd) / 2, 0), end: Math.min(b + o.pad, (b + nextStart) / 2, dur) };
  });
};

// One transcription window per phrase (whisper merges repeated takes when it sees several at once).
// Tiny phrases are glued to a neighbour so whisper has enough context.
export const windows = (speech: { start: number; end: number }[]) => {
  const out: { start: number; end: number }[] = [];
  for (const s of speech) {
    const last = out[out.length - 1];
    const small = (x: { start: number; end: number }) => x.end - x.start < 1.0;
    if (last && s.start - last.end < 0.6 && (small(s) || small(last)) && s.end - last.start <= MAX_PHRASE) last.end = s.end;
    else out.push({ ...s });
  }
  // isolated scraps under 0.45 s are breaths or clicks: whisper only hallucinates on them
  return out.filter((w) => w.end - w.start >= 0.45).map((w) => ({ start: Math.max(0, w.start - 0.1), end: w.end + 0.1 }));
};

const stem = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '').slice(0, 5);

// Clips from speech runs; earlier takes of a phrase that is repeated soon after are switched off.
export const buildClips = (speech: { start: number; end: number }[], words: Word[]): Clip[] => {
  const clips: (Clip & { stems: string[] })[] = speech.map((s, i) => ({ id: `c${i}`, start: +s.start.toFixed(3), end: +s.end.toFixed(3), enabled: true, stems: [] }));
  for (const w of words) {
    const mid = (w.start + w.end) / 2;
    let best = -1;
    let bestD = Infinity;
    clips.forEach((c, k) => {
      const d = mid < c.start ? c.start - mid : mid > c.end ? mid - c.end : 0;
      if (d < bestD) { bestD = d; best = k; }
    });
    if (best >= 0 && bestD < 0.6) clips[best].stems.push(stem(w.text));
  }
  for (let i = 0; i < clips.length; i++) {
    const a = clips[i].stems.filter(Boolean);
    if (!a.length) {
      if (clips[i].end - clips[i].start < 1.2) { clips[i].enabled = false; clips[i].reason = 'noise'; }
      continue;
    }
    if (a.length < 2) continue;
    const head = new Set(a.slice(0, 5));
    for (let j = i + 1; j <= Math.min(i + 5, clips.length - 1); j++) {
      const b = clips[j].stems.filter(Boolean).slice(0, 5);
      if (b.length < 2) continue;
      const overlap = b.filter((x) => head.has(x)).length / Math.min(head.size, b.length);
      if (overlap >= 0.6) { clips[i].enabled = false; clips[i].reason = 'retake'; break; }
    }
  }
  return clips.map(({ stems, ...c }) => c);
};
