import type { CameraStyle, CaptionStyle, ColorStyle, ProjectStyle } from './types';

export const BASE_CAPTIONS: CaptionStyle = {
  enabled: true,
  font: 'Montserrat',
  weight: 800,
  italic: false,
  size: 64,
  uppercase: true,
  letterSpacing: 0,
  lineHeight: 1.15,
  color: '#FFFFFF',
  accent: '#FFD60A',
  activeColor: '#FFD60A',
  futureColor: 'rgba(255,255,255,0.45)',
  boxColor: '#7C3AED',
  bg: 'none',
  bgColor: '#000000',
  bgOpacity: 0.85,
  radius: 18,
  stroke: 0,
  strokeColor: '#000000',
  shadow: 18,
  shadowColor: 'rgba(0,0,0,0.65)',
  glow: 0,
  gradient: null,
  y: 0.66,
  maxWords: 3,
  maxChars: 18,
  animation: 'pop',
  wordMode: 'highlight',
};

const c = (p: Partial<CaptionStyle>): CaptionStyle => ({ ...BASE_CAPTIONS, ...p });

export type Preset<T> = { id: string; name: string; tag?: string; value: T };

export const CAPTION_PRESETS: Preset<CaptionStyle>[] = [
  { id: 'minimal', name: 'Мінімалізм', tag: 'чисто', value: c({ font: 'Inter Tight', weight: 600, uppercase: false, size: 54, shadow: 14, wordMode: 'static', animation: 'fade', maxWords: 5, maxChars: 26 }) },
  { id: 'reels-classic', name: 'Класика Reels', tag: 'жовтий акцент', value: c({ font: 'Montserrat', weight: 900, size: 68, stroke: 7, shadow: 0, wordMode: 'highlight', animation: 'pop' }) },
  { id: 'hormozi', name: 'Хормозі', tag: 'слово за словом', value: c({ font: 'Montserrat', weight: 900, size: 78, stroke: 8, shadow: 10, wordMode: 'pop-active', activeColor: '#3EE07A', accent: '#3EE07A', animation: 'none', maxWords: 2, maxChars: 14 }) },
  { id: 'box', name: 'Плашка на слові', tag: 'Submagic', value: c({ font: 'Rubik', weight: 800, size: 66, shadow: 12, wordMode: 'box', boxColor: '#7C3AED', activeColor: '#FFFFFF', animation: 'pop' }) },
  { id: 'karaoke', name: 'Караоке', tag: 'проявлення', value: c({ font: 'Manrope', weight: 800, size: 62, uppercase: false, wordMode: 'karaoke', futureColor: 'rgba(255,255,255,0.35)', activeColor: '#FFFFFF', animation: 'fade', maxWords: 4, maxChars: 24 }) },
  { id: 'typewriter', name: 'Друкарська машинка', tag: 'поява слів', value: c({ font: 'JetBrains Mono', weight: 700, size: 52, uppercase: false, shadow: 0, bg: 'line-plates', bgColor: '#0B0B0B', bgOpacity: 0.9, radius: 6, wordMode: 'reveal', animation: 'none', maxWords: 4, maxChars: 22, accent: '#39FF88' }) },
  { id: 'black-plate', name: 'Чорна плашка', tag: 'Unbounded', value: c({ font: 'Unbounded', weight: 700, size: 46, shadow: 0, bg: 'line-plates', bgColor: '#000000', bgOpacity: 0.92, radius: 14, wordMode: 'static', accent: '#E8202A', animation: 'pop', y: 0.64 }) },
  { id: 'white-plate', name: 'Біла плашка', tag: 'контраст', value: c({ font: 'Golos Text', weight: 800, size: 54, shadow: 0, color: '#111111', bg: 'line-plates', bgColor: '#FFFFFF', bgOpacity: 0.96, radius: 16, wordMode: 'highlight', activeColor: '#E8202A', accent: '#E8202A', animation: 'slide-up' }) },
  { id: 'glass', name: 'Скло', tag: 'розмита плашка', value: c({ font: 'Onest', weight: 700, size: 54, uppercase: false, shadow: 0, bg: 'glass', bgColor: '#FFFFFF', bgOpacity: 0.16, radius: 28, wordMode: 'highlight', activeColor: '#FFFFFF', color: 'rgba(255,255,255,0.75)', animation: 'blur', maxWords: 4, maxChars: 24 }) },
  { id: 'marker', name: 'Маркер', tag: 'виділення', value: c({ font: 'Rubik', weight: 900, size: 66, shadow: 10, wordMode: 'marker', boxColor: '#FFE14D', activeColor: '#111111', animation: 'pop' }) },
  { id: 'underline', name: 'Підкреслення', tag: 'стрічка', value: c({ font: 'Raleway', weight: 800, size: 60, uppercase: false, shadow: 16, wordMode: 'underline', boxColor: '#FF3B30', animation: 'slide-up', maxWords: 4, maxChars: 22 }) },
  { id: 'neon', name: 'Неон', tag: 'світіння', value: c({ font: 'Exo 2', weight: 800, italic: true, size: 64, shadow: 0, glow: 26, color: '#E6FEFF', accent: '#00E5FF', activeColor: '#00E5FF', wordMode: 'highlight', animation: 'blur' }) },
  { id: 'serif', name: 'Елегантний', tag: 'серіф', value: c({ font: 'Playfair Display', weight: 700, italic: true, size: 62, uppercase: false, shadow: 22, wordMode: 'highlight', activeColor: '#F2C46D', accent: '#F2C46D', animation: 'fade', maxWords: 4, maxChars: 24 }) },
  { id: 'one-word', name: 'Одне слово', tag: 'великий шрифт', value: c({ font: 'Oswald', weight: 700, size: 120, letterSpacing: 0.01, stroke: 0, shadow: 24, wordMode: 'static', animation: 'pop', maxWords: 1, maxChars: 12, y: 0.62 }) },
  { id: 'gradient', name: 'Градієнт', tag: 'заливка', value: c({ font: 'Unbounded', weight: 900, size: 58, shadow: 0, gradient: 'linear-gradient(180deg,#FFFFFF 10%,#FFB36B 100%)', stroke: 0, wordMode: 'static', animation: 'drop', glow: 0 }) },
  { id: 'heavy-stroke', name: 'Жирний контур', tag: 'мем-стиль', value: c({ font: 'Russo One', weight: 400, size: 70, stroke: 10, strokeColor: '#000000', shadow: 0, wordMode: 'highlight', activeColor: '#FF4D4D', accent: '#FF4D4D', animation: 'pop' }) },
  { id: 'dela', name: 'Постер', tag: 'Dela Gothic', value: c({ font: 'Dela Gothic One', weight: 400, size: 60, shadow: 0, stroke: 0, color: '#FFFFFF', bg: 'plate', bgColor: '#E8202A', bgOpacity: 1, radius: 0, wordMode: 'static', animation: 'drop', maxWords: 3, maxChars: 16 }) },
  { id: 'handwritten', name: 'Рукописний', tag: 'Caveat', value: c({ font: 'Caveat', weight: 700, size: 84, uppercase: false, shadow: 14, wordMode: 'reveal', animation: 'none', maxWords: 4, maxChars: 24, accent: '#FFD60A' }) },
];

export const BASE_COLOR: ColorStyle = { preset: 'warm', brightness: 1.02, contrast: 1.1, saturation: 1.05, warmth: 0.35, fade: 0, vignette: 0.25, grain: 0, tint: null, tintAmount: 0 };
const k = (p: Partial<ColorStyle>): ColorStyle => ({ brightness: 1, contrast: 1, saturation: 1, warmth: 0, fade: 0, vignette: 0, grain: 0, tint: null, tintAmount: 0, preset: 'custom', ...p });

export const COLOR_PRESETS: Preset<ColorStyle>[] = [
  { id: 'original', name: 'Оригінал', value: k({ preset: 'original' }) },
  { id: 'warm', name: 'Тепле', value: { ...BASE_COLOR } },
  { id: 'punchy', name: 'Соковите', value: k({ preset: 'punchy', contrast: 1.18, saturation: 1.25, warmth: 0.15, vignette: 0.2 }) },
  { id: 'cinema', name: 'Кіно', value: k({ preset: 'cinema', contrast: 1.15, saturation: 0.9, warmth: 0.2, tint: '#0E5A6E', tintAmount: 0.18, vignette: 0.45, fade: 0.05 }) },
  { id: 'moody', name: 'Темне', value: k({ preset: 'moody', brightness: 0.9, contrast: 1.22, saturation: 0.8, warmth: 0.1, vignette: 0.6 }) },
  { id: 'film', name: 'Плівка', value: k({ preset: 'film', contrast: 0.95, saturation: 0.85, warmth: 0.45, fade: 0.14, grain: 0.35, vignette: 0.3 }) },
  { id: 'cool', name: 'Холодне', value: k({ preset: 'cool', contrast: 1.08, saturation: 0.95, warmth: -0.45, vignette: 0.2 }) },
  { id: 'bw', name: 'Ч/Б', value: k({ preset: 'bw', contrast: 1.25, saturation: 0, vignette: 0.35, grain: 0.2 }) },
  { id: 'clean', name: 'Чисте світле', value: k({ preset: 'clean', brightness: 1.08, contrast: 1.02, saturation: 1.05, warmth: 0.1, fade: 0.04 }) },
];

export const CAMERA_PRESETS: Preset<CameraStyle>[] = [
  { id: 'none', name: 'Статика', value: { mode: 'none', amount: 0, focusY: 0.35 } },
  { id: 'alternate', name: 'Крупність на склейках', value: { mode: 'alternate', amount: 0.1, focusY: 0.35 } },
  { id: 'push', name: 'Повільний наїзд', value: { mode: 'push', amount: 0.07, focusY: 0.35 } },
  { id: 'punch', name: 'Різкий удар', value: { mode: 'punch', amount: 0.14, focusY: 0.35 } },
];

export const DEFAULT_STYLE: ProjectStyle = {
  captions: CAPTION_PRESETS[2].value,
  color: { ...BASE_COLOR },
  camera: CAMERA_PRESETS[1].value,
  music: { file: null, volume: 0.12, duck: 0.45 },
  voiceVolume: 1,
};

// Full looks: one click sets captions + colour + camera together.
export type Look = { id: string; name: string; captions: string; color: string; camera: string };
export const LOOKS: Look[] = [
  { id: 'look-minimal', name: 'Мінімалізм', captions: 'minimal', color: 'clean', camera: 'none' },
  { id: 'look-viral', name: 'Віральний', captions: 'hormozi', color: 'punchy', camera: 'punch' },
  { id: 'look-expert', name: 'Експерт', captions: 'white-plate', color: 'warm', camera: 'alternate' },
  { id: 'look-cinema', name: 'Кіношний', captions: 'serif', color: 'cinema', camera: 'push' },
  { id: 'look-podcast', name: 'Подкаст', captions: 'karaoke', color: 'moody', camera: 'alternate' },
  { id: 'look-poster', name: 'Постер', captions: 'dela', color: 'film', camera: 'punch' },
  { id: 'look-tech', name: 'Тех', captions: 'neon', color: 'cool', camera: 'push' },
  { id: 'look-brand', name: 'Бренд (чорна плашка)', captions: 'black-plate', color: 'warm', camera: 'alternate' },
];
