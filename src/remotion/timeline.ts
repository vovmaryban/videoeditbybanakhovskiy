import type { CaptionStyle, Clip, Word } from './types';

export type Piece = {
  clip: Clip;
  index: number;
  from: number; // output frame where this piece starts
  frames: number; // length in frames
  srcFrom: number; // source frame where it starts
};

// Kept clips laid end to end on the output timeline.
export const buildTimeline = (clips: Clip[], fps: number) => {
  const kept = clips.filter((c) => c.enabled && c.end > c.start).sort((a, b) => a.start - b.start);
  const pieces: Piece[] = [];
  let at = 0;
  kept.forEach((clip, index) => {
    const srcFrom = Math.round(clip.start * fps);
    const frames = Math.max(1, Math.round(clip.end * fps) - srcFrom);
    pieces.push({ clip, index, from: at, frames, srcFrom });
    at += frames;
  });
  return { pieces, durationInFrames: Math.max(1, at) };
};

// Source seconds -> output frame (null when that moment was cut out).
export const srcToOut = (pieces: Piece[], t: number, fps: number): number | null => {
  for (const p of pieces) {
    if (t >= p.clip.start - 1e-3 && t < p.clip.end + 1e-3) return p.from + Math.round(t * fps) - p.srcFrom;
  }
  return null;
};

export type TimedWord = Word & { o0: number; o1: number; i: number };
export type Page = { o0: number; o1: number; words: TimedWord[] };

const breaksAfter = (w: string) => /[.!?…]$/.test(w);
const softBreak = (w: string) => /[,:;—–]$/.test(w);

// Words that survive the cuts, grouped into caption pages.
export const buildPages = (words: Word[], pieces: Piece[], fps: number, style: Pick<CaptionStyle, 'maxWords' | 'maxChars'>): Page[] => {
  const timed: TimedWord[] = [];
  words.forEach((w, i) => {
    const mid = (w.start + w.end) / 2;
    const o0 = srcToOut(pieces, Math.max(w.start, mid - 0.25), fps);
    if (o0 === null || srcToOut(pieces, mid, fps) === null) return;
    const o1 = srcToOut(pieces, Math.min(w.end, mid + 0.6), fps) ?? o0 + Math.round(0.2 * fps);
    timed.push({ ...w, o0, o1: Math.max(o1, o0 + 2), i });
  });
  const pages: Page[] = [];
  let cur: TimedWord[] = [];
  const flush = () => {
    if (cur.length) pages.push({ o0: cur[0].o0, o1: cur[cur.length - 1].o1, words: cur });
    cur = [];
  };
  for (const w of timed) {
    if (cur.length) {
      const prev = cur[cur.length - 1];
      const chars = cur.map((x) => x.text).join(' ').length + 1 + w.text.length;
      const gap = w.o0 - prev.o1 > 0.35 * fps;
      const jump = w.o0 < prev.o0; // crossed a cut backwards (should not happen) – be safe
      if (cur.length >= style.maxWords || chars > style.maxChars || gap || jump || breaksAfter(prev.text) || (softBreak(prev.text) && cur.length > 1)) flush();
    }
    cur.push(w);
  }
  flush();
  // pages hold until the next one starts (max +0.4 s) so text does not flicker
  for (let k = 0; k < pages.length; k++) {
    const next = pages[k + 1];
    const hold = pages[k].o1 + Math.round(0.4 * fps);
    pages[k].o1 = next ? Math.min(next.o0, hold) : hold;
  }
  return pages;
};
