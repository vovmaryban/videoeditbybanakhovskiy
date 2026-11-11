// Colour grading, independent from the editing style (looks never touch it).
// Works like CapCut: one filter with a strength slider + separate adjustments on top.
// All adjustments are 0 = unchanged; most run -1..+1.

export type ColorAdjust = {
  exposure: number;
  brightness: number;
  contrast: number;
  highlights: number;
  shadows: number;
  saturation: number;
  temperature: number; // -1 cool .. +1 warm
  tint: number; // -1 green .. +1 magenta
  fade: number; // 0..1 lifted blacks
  vignette: number; // 0..1
  grain: number; // 0..1
};

export type ColorStyle = ColorAdjust & {
  filter: string; // id from COLOR_FILTERS
  intensity: number; // 0..1 filter strength
};

export const ADJUST_KEYS: (keyof ColorAdjust)[] = ['exposure', 'brightness', 'contrast', 'highlights', 'shadows', 'saturation', 'temperature', 'tint', 'fade', 'vignette', 'grain'];
export const ZERO_ADJUST: ColorAdjust = { exposure: 0, brightness: 0, contrast: 0, highlights: 0, shadows: 0, saturation: 0, temperature: 0, tint: 0, fade: 0, vignette: 0, grain: 0 };

type Split = { shadow: string; highlight: string; amount: number };
export type ColorFilter = { id: string; name: string; adjust: Partial<ColorAdjust>; split?: Split };

export const COLOR_FILTERS: ColorFilter[] = [
  { id: 'none', name: 'Без фільтра', adjust: {} },
  { id: 'warm', name: 'Тепле', adjust: { contrast: 0.12, saturation: 0.05, temperature: 0.35, vignette: 0.25, brightness: 0.03 } },
  { id: 'punchy', name: 'Соковите', adjust: { contrast: 0.22, saturation: 0.28, temperature: 0.12, vignette: 0.2, shadows: -0.1 } },
  { id: 'clean', name: 'Чисте світле', adjust: { exposure: 0.12, brightness: 0.06, contrast: 0.03, saturation: 0.05, temperature: 0.08, fade: 0.04, shadows: 0.15 } },
  { id: 'cinema', name: 'Кіно', adjust: { contrast: 0.18, saturation: -0.12, temperature: 0.12, vignette: 0.45, fade: 0.05, highlights: -0.15 }, split: { shadow: '#0E5A6E', highlight: '#FFB070', amount: 0.35 } },
  { id: 'moody', name: 'Темне', adjust: { exposure: -0.15, contrast: 0.28, saturation: -0.22, temperature: 0.06, vignette: 0.6, highlights: -0.25 } },
  { id: 'film', name: 'Плівка', adjust: { contrast: -0.06, saturation: -0.15, temperature: 0.4, fade: 0.14, grain: 0.35, vignette: 0.3 }, split: { shadow: '#2F4A3A', highlight: '#FFD9A0', amount: 0.25 } },
  { id: 'cool', name: 'Холодне', adjust: { contrast: 0.1, saturation: -0.05, temperature: -0.45, vignette: 0.2 } },
  { id: 'bw', name: 'Ч/Б', adjust: { contrast: 0.3, saturation: -1, vignette: 0.35, grain: 0.2 } },
  { id: 'creator', name: 'Креатор (рефи)', adjust: { exposure: 0.06, contrast: 0.14, saturation: 0.12, highlights: -0.2, shadows: 0.18, temperature: 0.1 } },
  { id: 'night-blue', name: 'Нічний синій', adjust: { exposure: -0.1, contrast: 0.2, saturation: -0.1, temperature: -0.3, vignette: 0.5 }, split: { shadow: '#0B2A66', highlight: '#9FD4FF', amount: 0.4 } },
  { id: 'golden', name: 'Золота година', adjust: { contrast: 0.08, saturation: 0.12, temperature: 0.6, tint: 0.1, highlights: -0.1 }, split: { shadow: '#5A2E10', highlight: '#FFC46B', amount: 0.3 } },
  { id: 'matte', name: 'Матовий', adjust: { contrast: -0.1, saturation: -0.2, fade: 0.22, shadows: 0.1 } },
  { id: 'vivid-pink', name: 'Рожевий поп', adjust: { contrast: 0.12, saturation: 0.2, tint: 0.35, temperature: 0.1 }, split: { shadow: '#3A1446', highlight: '#FFB3D9', amount: 0.3 } },
];

export const DEFAULT_COLOR: ColorStyle = { ...ZERO_ADJUST, filter: 'warm', intensity: 1 };

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// Old projects stored { preset, brightness: 1.02, contrast: 1.1, ... } (1 = neutral).
export const normalizeColor = (c: any): ColorStyle => {
  if (!c || typeof c !== 'object') return { ...DEFAULT_COLOR };
  if ('filter' in c) return { ...DEFAULT_COLOR, ...c };
  const filter = COLOR_FILTERS.some((f) => f.id === c.preset) ? c.preset : c.preset === 'original' ? 'none' : 'none';
  if (filter !== 'none' || c.preset === 'original') return { ...ZERO_ADJUST, filter, intensity: 1 };
  return {
    ...ZERO_ADJUST, filter: 'none', intensity: 1,
    brightness: clamp((c.brightness ?? 1) - 1, -1, 1) * 2, contrast: clamp((c.contrast ?? 1) - 1, -1, 1) * 1.6,
    saturation: clamp((c.saturation ?? 1) - 1, -1, 1), temperature: c.warmth ?? 0, fade: c.fade ?? 0, vignette: c.vignette ?? 0, grain: c.grain ?? 0,
  };
};

// Filter (scaled by intensity) + user adjustments.
export const effective = (c: ColorStyle): ColorAdjust & { split?: Split } => {
  const f = COLOR_FILTERS.find((x) => x.id === c.filter) ?? COLOR_FILTERS[0];
  const out = { ...ZERO_ADJUST } as ColorAdjust & { split?: Split };
  for (const k of ADJUST_KEYS) out[k] = (c[k] ?? 0) + (f.adjust[k] ?? 0) * c.intensity;
  if (f.split) out.split = { ...f.split, amount: f.split.amount * c.intensity };
  return out;
};

const rgb = (hex: string) => { const n = parseInt(hex.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => x / 255); };

// Per-channel tone curves (33 points) for an SVG feComponentTransfer.
export const toneTables = (a: ReturnType<typeof effective>) => {
  const N = 33;
  const gain = [1 + a.temperature * 0.1 + a.tint * 0.04, 1 + a.temperature * 0.015 - a.tint * 0.08, 1 - a.temperature * 0.12 + a.tint * 0.04];
  const sp = a.split ? { s: rgb(a.split.shadow), h: rgb(a.split.highlight), k: a.split.amount } : null;
  const expo = 2 ** (a.exposure * 1.4);
  const gamma = 2 ** (-a.brightness * 0.7);
  const ctr = 1 + a.contrast * (a.contrast > 0 ? 0.9 : 0.7);
  const tables: string[] = [];
  for (let ch = 0; ch < 3; ch++) {
    const pts: string[] = [];
    for (let i = 0; i < N; i++) {
      let y = i / (N - 1);
      y = clamp(y * expo, 0, 1);
      y = y ** gamma;
      // soft s-curve contrast around mid grey
      y = clamp(0.5 + (y - 0.5) * ctr, 0, 1);
      y = y + a.highlights * 0.28 * smooth(0.35, 1, y) * (a.highlights > 0 ? 1 - y : y) * 1.6;
      y = y + a.shadows * 0.32 * smooth(0.75, 0, y) * (a.shadows > 0 ? 1 - y : y) * 1.4;
      y = clamp(y * gain[ch], 0, 1);
      if (sp) {
        const ws = smooth(0.6, 0, y) * sp.k * 0.35;
        const wh = smooth(0.4, 1, y) * sp.k * 0.25;
        y = y + (sp.s[ch] - 0.5) * ws + (sp.h[ch] - 0.5) * wh;
      }
      const f = clamp(a.fade, 0, 1) * 0.3;
      y = f + y * (1 - f * 1.25);
      pts.push(clamp(y, 0, 1).toFixed(4));
    }
    tables.push(pts.join(' '));
  }
  return tables;
};

export const isNeutral = (a: ColorAdjust & { split?: Split }) => ADJUST_KEYS.every((k) => Math.abs(a[k]) < 1e-3) && !(a.split && a.split.amount > 0);
