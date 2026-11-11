import { COLOR_FILTERS, DEFAULT_COLOR, normalizeColor } from './color';
import type { CameraStyle, CaptionStyle, FxStyle, HeadlineStyle, ProjectStyle } from './types';

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
  align: 'center',
  x: 0.5,
  rotate: 0,
  accentStyle: 'color',
  autoAccent: 'off',
  accentFont: null,
  accentItalic: false,
  accentWeight: 800,
  accentScale: 1,
  accentUpper: 'same',
  accentInk: '#111111',
  tiers: false,
};

const c = (p: Partial<CaptionStyle>): CaptionStyle => ({ ...BASE_CAPTIONS, ...p });

export type Preset<T> = { id: string; name: string; tag?: string; group?: string; value: T };

// Classic set (stage 1)
const CLASSIC: Preset<CaptionStyle>[] = [
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

// From the user's references (stage 4). Tag = where the technique was seen.
const FROM_REFS: Preset<CaptionStyle>[] = [
  { id: 'ref-blur-in', name: 'Блюр-поява', tag: 'tenfoldmarc', value: c({ font: 'Inter Tight', weight: 800, uppercase: false, size: 64, letterSpacing: -0.03, shadow: 12, shadowColor: 'rgba(0,0,0,0.5)', wordMode: 'blur-in', animation: 'none', maxWords: 3, maxChars: 20, accent: '#F6E05E', autoAccent: 'off', y: 0.62 }) },
  { id: 'ref-two-tier', name: 'Два яруси', tag: 'маленьке + ВЕЛИКЕ', value: c({ font: 'Inter Tight', weight: 700, uppercase: false, size: 40, shadow: 14, wordMode: 'blur-in', animation: 'none', maxWords: 4, maxChars: 26, tiers: true, autoAccent: 'last', accentStyle: 'big', accentFont: 'Montserrat', accentWeight: 900, accentScale: 2, accentUpper: 'upper', accent: '#E9E9E9', letterSpacing: -0.01, y: 0.64 }) },
  { id: 'ref-cream-box', name: 'Кремова плашка', tag: 'ключове слово в боксі', value: c({ font: 'Inter Tight', weight: 800, uppercase: false, size: 50, letterSpacing: -0.02, shadow: 14, wordMode: 'static', animation: 'pop', maxWords: 4, maxChars: 24, tiers: true, autoAccent: 'longest', accentStyle: 'box', boxColor: '#F1EBDD', accentInk: '#141414', accentUpper: 'upper', accentFont: 'Montserrat', accentWeight: 900, accentScale: 1.1, radius: 6 }) },
  { id: 'ref-seam-tag', name: 'Тег на шві', tag: 'одне слово в боксі', value: c({ font: 'Inter Tight', weight: 700, size: 40, uppercase: true, letterSpacing: 0.02, shadow: 0, bg: 'word-tags', bgColor: '#2E2E2E', bgOpacity: 0.95, radius: 8, wordMode: 'static', animation: 'pop', maxWords: 1, maxChars: 14, y: 0.5 }) },
  { id: 'ref-top-caps', name: 'Капси зверху', tag: 'над головою', value: c({ font: 'Montserrat', weight: 800, size: 56, shadow: 16, shadowColor: 'rgba(0,0,0,0.45)', wordMode: 'static', animation: 'fade', maxWords: 4, maxChars: 22, y: 0.245 }) },
  { id: 'ref-editorial-green', name: 'Журнальний зелений', tag: 'серіф + караоке', value: c({ font: 'Lora', weight: 400, uppercase: false, size: 44, shadow: 0, bg: 'line-plates', bgColor: '#1E3A2A', bgOpacity: 1, radius: 2, wordMode: 'karaoke', color: '#FFFFFF', activeColor: '#FFFFFF', futureColor: '#9DC7A0', accent: '#FFFFFF', animation: 'none', maxWords: 4, maxChars: 24, y: 0.7 }) },
  { id: 'ref-mini', name: 'Мінімальні речення', tag: 'дрібно, спокійно', value: c({ font: 'Inter Tight', weight: 400, uppercase: false, size: 34, shadow: 10, shadowColor: 'rgba(0,0,0,0.5)', wordMode: 'static', animation: 'fade', maxWords: 6, maxChars: 32, y: 0.72 }) },
  { id: 'ref-yellow-tech', name: 'Жовтий техно', tag: 'курсив капс', value: c({ font: 'Montserrat', weight: 900, italic: true, size: 54, color: '#FFD21F', activeColor: '#FFFFFF', accent: '#FFFFFF', shadow: 14, shadowColor: 'rgba(0,0,0,0.6)', wordMode: 'highlight', animation: 'slide-up', maxWords: 2, maxChars: 16, y: 0.71 }) },
  { id: 'ref-script-mix', name: 'Скрипт-мікс', tag: 'жирний + каліграфія', value: c({ font: 'Montserrat', weight: 800, uppercase: false, size: 50, shadow: 12, wordMode: 'static', animation: 'slide-up', maxWords: 3, maxChars: 20, tiers: true, autoAccent: 'longest', accentStyle: 'font', accentFont: 'Marck Script', accentScale: 1.35, accentUpper: 'lower', accent: '#F3E58A', y: 0.66 }) },
  { id: 'ref-bebas-hand', name: 'Капс + рукопис', tag: 'вузький + від руки', value: c({ font: 'Oswald', weight: 700, size: 92, lineHeight: 0.95, letterSpacing: -0.01, color: '#F6EEC6', shadow: 16, shadowColor: 'rgba(0,0,0,0.35)', wordMode: 'static', animation: 'blur', maxWords: 3, maxChars: 16, tiers: true, autoAccent: 'last', accentStyle: 'font', accentFont: 'Bad Script', accentScale: 0.62, accentUpper: 'lower', accent: '#FFFFFF', y: 0.27 }) },
  { id: 'ref-red-brush', name: 'Червоний пензель', tag: 'мазок під текстом', value: c({ font: 'Montserrat', weight: 700, size: 38, shadow: 0, bg: 'brush', bgColor: '#D7262E', bgOpacity: 1, wordMode: 'static', animation: 'wipe', maxWords: 3, maxChars: 22, y: 0.72 }) },
  { id: 'ref-notebook', name: 'Блокнот', tag: 'машинка', value: c({ font: 'PT Mono', weight: 400, uppercase: false, size: 44, color: '#151515', accent: '#E0533F', shadow: 0, wordMode: 'typewriter', animation: 'none', maxWords: 4, maxChars: 24, autoAccent: 'longest', y: 0.26 }) },
  { id: 'ref-arch-black', name: 'Чорний на білому', tag: 'для арки', value: c({ font: 'Inter Tight', weight: 700, uppercase: false, size: 54, letterSpacing: -0.03, color: '#111111', activeColor: '#111111', futureColor: 'rgba(17,17,17,0.28)', shadow: 0, wordMode: 'karaoke', animation: 'none', maxWords: 4, maxChars: 22, y: 0.27 }) },
  { id: 'ref-lime', name: 'Лайм-виділення', tag: 'широкий капс', value: c({ font: 'Unbounded', weight: 800, size: 44, shadow: 12, wordMode: 'reveal', animation: 'none', maxWords: 4, maxChars: 22, autoAccent: 'longest', accentStyle: 'box', boxColor: '#D8F53C', accentInk: '#111111', radius: 4, y: 0.66 }) },
  { id: 'ref-orange-glow', name: 'Помаранчевий неон', tag: 'вузький зі світінням', value: c({ font: 'Oswald', weight: 700, size: 96, lineHeight: 0.95, color: '#FF8A1E', accent: '#FF8A1E', activeColor: '#FFFFFF', glow: 30, shadow: 0, wordMode: 'static', animation: 'zoom-out', maxWords: 2, maxChars: 14, y: 0.69 }) },
  { id: 'ref-pastel', name: 'Пастельний вузький', tag: 'тонкий капс', value: c({ font: 'Alumni Sans', weight: 300, size: 118, lineHeight: 0.88, color: '#FBE3EE', accent: '#B9F5C4', glow: 12, shadow: 0, wordMode: 'static', animation: 'blur', maxWords: 3, maxChars: 16, autoAccent: 'longest', accentStyle: 'color', y: 0.3 }) },
  { id: 'ref-luxe', name: 'Люкс серіф', tag: 'Cormorant', value: c({ font: 'Cormorant', weight: 500, size: 60, letterSpacing: 0.08, color: '#EDE6DA', shadow: 18, wordMode: 'static', animation: 'blur', maxWords: 3, maxChars: 20, y: 0.7 }) },
  { id: 'ref-glitch', name: 'Глітч', tag: 'RGB-зсув', value: c({ font: 'Oswald', weight: 700, size: 78, shadow: 0, stroke: 0, wordMode: 'static', animation: 'glitch', maxWords: 1, maxChars: 14, y: 0.56 }) },
  { id: 'ref-pixel', name: 'Піксельний 8-біт', tag: 'ретро-гра', value: c({ font: 'Press Start 2P', weight: 400, size: 34, lineHeight: 1.5, stroke: 4, strokeColor: '#000000', shadow: 0, wordMode: 'typewriter', animation: 'none', maxWords: 3, maxChars: 16, accent: '#F06B57', autoAccent: 'longest' }) },
  { id: 'ref-serif-italic-mix', name: 'Сірий + серіф', tag: 'акцент курсивом', value: c({ font: 'Inter Tight', weight: 500, uppercase: false, size: 52, color: 'rgba(255,255,255,0.72)', shadow: 14, wordMode: 'static', animation: 'blur', maxWords: 3, maxChars: 22, autoAccent: 'longest', accentStyle: 'font', accentFont: 'Old Standard', accentItalic: true, accentScale: 1.18, accent: '#FFFFFF', y: 0.64 }) },
  { id: 'ref-blue-pill', name: 'Блакитна пігулка', tag: 'тихі субтитри', value: c({ font: 'Inter Tight', weight: 500, uppercase: false, size: 34, color: '#14223F', accent: '#14223F', shadow: 0, bg: 'plate', bgColor: '#CFE3FF', bgOpacity: 1, radius: 12, wordMode: 'static', animation: 'fade', maxWords: 5, maxChars: 30, y: 0.72 }) },
  { id: 'ref-burgundy-pill', name: 'Бордова пігулка', tag: 'тихі субтитри', value: c({ font: 'Inter Tight', weight: 500, uppercase: false, size: 32, color: '#FFFFFF', shadow: 0, bg: 'plate', bgColor: '#5B0F1A', bgOpacity: 1, radius: 12, wordMode: 'static', animation: 'fade', maxWords: 5, maxChars: 30, y: 0.72 }) },
  { id: 'ref-deep-shadow', name: 'Глибока тінь', tag: 'одне-два слова', value: c({ font: 'Inter Tight', weight: 800, uppercase: false, size: 58, letterSpacing: -0.02, shadow: 34, shadowColor: 'rgba(0,0,0,0.85)', wordMode: 'static', animation: 'pop', maxWords: 2, maxChars: 14, y: 0.55 }) },
  { id: 'ref-serif-yellow', name: 'Жовтий серіф', tag: 'речення по словах', value: c({ font: 'Playfair Display', weight: 400, uppercase: false, size: 72, lineHeight: 1.05, color: '#F7E46B', accent: '#FFFFFF', shadow: 16, wordMode: 'rise', animation: 'none', maxWords: 6, maxChars: 22, y: 0.66 }) },
  { id: 'ref-kicker-yellow', name: 'Кікер + жовтий', tag: 'маленьке + вузьке', value: c({ font: 'Inter Tight', weight: 400, uppercase: false, size: 40, shadow: 12, wordMode: 'static', animation: 'pop', maxWords: 3, maxChars: 22, tiers: true, autoAccent: 'last', accentStyle: 'big', accentFont: 'Oswald', accentWeight: 700, accentScale: 2.6, accentUpper: 'upper', accent: '#F2E52A', y: 0.27 }) },
  { id: 'ref-marker-hand', name: 'Маркер від руки', tag: 'Neucha', value: c({ font: 'Neucha', weight: 400, size: 66, shadow: 12, wordMode: 'static', animation: 'pop', maxWords: 3, maxChars: 18, rotate: -3 }) },
  { id: 'ref-lightboard', name: 'Світлова дошка', tag: 'пише від руки', value: c({ font: 'Bad Script', weight: 400, uppercase: false, size: 58, glow: 8, accent: '#FFFFFF', shadow: 0, wordMode: 'typewriter', animation: 'none', maxWords: 4, maxChars: 24 }) },
  { id: 'ref-dark-red-top', name: 'Темно-червоні зверху', tag: 'для світлих стін', value: c({ font: 'Montserrat', weight: 800, size: 46, color: '#8E1B1B', shadow: 0, wordMode: 'static', animation: 'fade', maxWords: 4, maxChars: 22, y: 0.24 }) },
];

export const CAPTION_PRESETS: Preset<CaptionStyle>[] = [
  ...FROM_REFS.map((p) => ({ ...p, group: 'refs' })),
  ...CLASSIC.map((p) => ({ ...p, group: 'classic' })),
];

export const CAMERA_PRESETS: Preset<CameraStyle>[] = [
  { id: 'none', name: 'Статика', value: { mode: 'none', amount: 0, focusY: 0.35, accentPunch: 0 } },
  { id: 'alternate', name: 'Крупність на склейках', value: { mode: 'alternate', amount: 0.1, focusY: 0.35, accentPunch: 0 } },
  { id: 'push', name: 'Повільний наїзд', value: { mode: 'push', amount: 0.07, focusY: 0.35, accentPunch: 0 } },
  { id: 'punch', name: 'Різкий удар', value: { mode: 'punch', amount: 0.14, focusY: 0.35, accentPunch: 0 } },
  { id: 'accent', name: 'Наїзд на ключові слова', value: { mode: 'none', amount: 0, focusY: 0.35, accentPunch: 0.09 } },
  { id: 'alternate-accent', name: 'Склейки + ключові слова', value: { mode: 'alternate', amount: 0.08, focusY: 0.35, accentPunch: 0.07 } },
];

export const DEFAULT_FX: FxStyle = { cut: 'none', cutStrength: 0.6, frame: 'full', frameBg: '#F3F1F4', frameBg2: '#E2DFE6', framePattern: 'plain', frameBorder: null, letterbox: 0, shakeOnAccent: false };
const fx = (p: Partial<FxStyle>): FxStyle => ({ ...DEFAULT_FX, ...p });

export const CUT_PRESETS: Preset<Partial<FxStyle>>[] = [
  { id: 'none', name: 'Звичайна склейка', value: { cut: 'none' } },
  { id: 'flash', name: 'Спалах', tag: 'білий кадр', value: { cut: 'flash' } },
  { id: 'zoom-blur', name: 'Зум-ривок', tag: 'радіальне розмиття', value: { cut: 'zoom-blur' } },
  { id: 'whip', name: 'Свайп', tag: 'розмиття вбік', value: { cut: 'whip' } },
  { id: 'glitch', name: 'Глітч', tag: 'RGB-зсув', value: { cut: 'glitch' } },
  { id: 'blur', name: 'Розмиття', tag: 'м’яко', value: { cut: 'blur' } },
  { id: 'shake', name: 'Тряска', tag: 'удар', value: { cut: 'shake' } },
  { id: 'dip', name: 'Через чорне', tag: 'кіно', value: { cut: 'dip' } },
];

export const FRAME_PRESETS: Preset<Partial<FxStyle>>[] = [
  { id: 'full', name: 'На весь екран', value: { frame: 'full', letterbox: 0 } },
  { id: 'cinema', name: 'Кіно-смуги', value: { frame: 'full', letterbox: 0.09 } },
  { id: 'card', name: 'Картка на фоні', tag: 'рамка', value: { frame: 'card', frameBg: '#121212', frameBg2: '#2A2A2A', framePattern: 'gradient', frameBorder: 'rgba(255,255,255,0.18)' } },
  { id: 'arch', name: 'Арка', tag: 'білий верх', value: { frame: 'arch', frameBg: '#FFFFFF', frameBg2: '#FFFFFF', framePattern: 'plain', frameBorder: null } },
  { id: 'blob', name: 'Блокнот', tag: 'хвиляста рамка', value: { frame: 'blob', frameBg: '#F3F1F4', frameBg2: '#C9C5CE', framePattern: 'dots', frameBorder: null } },
  { id: 'split-top', name: 'Панель зверху', tag: 'відео знизу', value: { frame: 'split-top', frameBg: '#F1EFEA', frameBg2: '#DEDAD2', framePattern: 'grid', frameBorder: null } },
  { id: 'split-bottom', name: 'Панель знизу', tag: 'відео зверху', value: { frame: 'split-bottom', frameBg: '#4A0710', frameBg2: '#2A0308', framePattern: 'gradient', frameBorder: null } },
  { id: 'olive-grid', name: 'Оливкова сітка', tag: 'панель знизу', value: { frame: 'split-bottom', frameBg: '#6F7B3B', frameBg2: '#8C9858', framePattern: 'grid', frameBorder: null } },
  { id: 'circle', name: 'Коло', tag: 'на темному', value: { frame: 'circle', frameBg: '#0E0E0E', frameBg2: '#1E1E1E', framePattern: 'dots', frameBorder: '#D7262E' } },
];

export const DEFAULT_HEADLINE: HeadlineStyle = { enabled: false, text: '', kicker: '', style: 'top-caps', y: 0.215, until: 0 }; // y = top edge, just below the 400 px blind zone

export const DEFAULT_STYLE: ProjectStyle = {
  look: 'look-tenfold',
  captions: CAPTION_PRESETS.find((p) => p.id === 'ref-blur-in')!.value,
  color: { ...DEFAULT_COLOR },
  camera: CAMERA_PRESETS[1].value,
  fx: { ...DEFAULT_FX },
  headline: { ...DEFAULT_HEADLINE },
  music: { file: null, volume: 0.12, duck: 0.45 },
  voiceVolume: 1,
};

// Older projects: fill in fields that did not exist yet, migrate the old colour model.
export const normalizeStyle = (s: Partial<ProjectStyle> | undefined): ProjectStyle => {
  const st = s ?? {};
  return {
    ...DEFAULT_STYLE,
    ...st,
    captions: { ...BASE_CAPTIONS, ...(st.captions ?? DEFAULT_STYLE.captions) },
    color: normalizeColor(st.color),
    camera: { ...DEFAULT_STYLE.camera, accentPunch: 0, ...(st.camera ?? {}) },
    fx: { ...DEFAULT_FX, ...(st.fx ?? {}) },
    headline: { ...DEFAULT_HEADLINE, ...(st.headline ?? {}) },
    music: { ...DEFAULT_STYLE.music, ...(st.music ?? {}) },
  };
};

// Editing looks: one click sets captions + camera + effects (+ headline look). Never colour:
// colour grading is separate (filter + sliders) and stays as the user set it.
export type Look = {
  id: string;
  name: string;
  tag?: string;
  captions: string;
  captionsPatch?: Partial<CaptionStyle>;
  camera: string;
  fx?: Partial<FxStyle>;
  headline?: HeadlineStyle['style'];
  headlineY?: number; // where the headline sits with this look (top edge)
};
export const LOOKS: Look[] = [
  { id: 'look-tenfold', name: 'Блюр-капшн', tag: 'tenfoldmarc', captions: 'ref-blur-in', camera: 'alternate-accent', fx: { cut: 'zoom-blur', cutStrength: 0.45 }, headline: 'top-caps' },
  { id: 'look-two-tier', name: 'Два яруси', tag: 'маленьке + ВЕЛИКЕ', captions: 'ref-two-tier', camera: 'alternate', fx: { cut: 'blur', cutStrength: 0.5 } },
  { id: 'look-cream', name: 'Кремові бокси', tag: 'ключові слова', captions: 'ref-cream-box', camera: 'accent', fx: { cut: 'flash', cutStrength: 0.35 }, headline: 'kicker-serif' },
  { id: 'look-david', name: 'Тег + панель', tag: 'панель зверху', captions: 'ref-seam-tag', captionsPatch: { y: 0.47 }, camera: 'none', fx: { frame: 'split-top', frameBg: '#F7F7F5', frameBg2: '#E6E6E1', framePattern: 'plain', cut: 'none' }, headline: 'black-plates' },
  { id: 'look-alina', name: 'Шапка + капси', tag: 'простий експерт', captions: 'ref-top-caps', captionsPatch: { y: 0.66, size: 48 }, camera: 'none', fx: { cut: 'none' }, headline: 'top-caps', headlineY: 0.215 },
  { id: 'look-editorial', name: 'Журнальний', tag: 'серіф, зелені плашки', captions: 'ref-editorial-green', camera: 'alternate', fx: { cut: 'dip', cutStrength: 0.3 }, headline: 'kicker-serif' },
  { id: 'look-burgundy', name: 'Бордова панель', tag: 'мінімалізм', captions: 'ref-blue-pill', captionsPatch: { y: 0.72 }, camera: 'push', fx: { frame: 'split-bottom', frameBg: '#4A0710', frameBg2: '#2A0308', framePattern: 'gradient' }, headline: 'label' },
  { id: 'look-olive', name: 'Оливкова сітка', tag: 'нотатки', captions: 'ref-burgundy-pill', captionsPatch: { y: 0.74 }, camera: 'none', fx: { frame: 'split-bottom', frameBg: '#6F7B3B', frameBg2: '#8C9858', framePattern: 'grid' }, headline: 'label' },
  { id: 'look-arch', name: 'Арка', tag: 'білий верх', captions: 'ref-arch-black', captionsPatch: { y: 0.335 }, camera: 'none', fx: { frame: 'arch', frameBg: '#FFFFFF', framePattern: 'plain', cut: 'none' }, headline: 'black-plates', headlineY: 0.215 },
  { id: 'look-notebook', name: 'Блокнот', tag: 'папір у крапку', captions: 'ref-notebook', captionsPatch: { y: 0.325, maxWords: 3 }, camera: 'none', fx: { frame: 'blob', frameBg: '#F3F1F4', frameBg2: '#C9C5CE', framePattern: 'dots', cut: 'none' }, headline: 'pixel' },
  { id: 'look-yellow-tech', name: 'Жовтий техно', tag: 'енергійно', captions: 'ref-yellow-tech', camera: 'alternate-accent', fx: { cut: 'flash', cutStrength: 0.5 }, headline: 'yellow-tech' },
  { id: 'look-red-brush', name: 'Червоний пензель', tag: 'пояснення', captions: 'ref-red-brush', camera: 'alternate', fx: { cut: 'whip', cutStrength: 0.5 }, headline: 'red-brush' },
  { id: 'look-script', name: 'Скрипт-мікс', tag: 'лайфстайл', captions: 'ref-script-mix', camera: 'push', fx: { cut: 'blur', cutStrength: 0.4 } },
  { id: 'look-bebas', name: 'Капс + рукопис', tag: 'вулиця', captions: 'ref-bebas-hand', camera: 'none', fx: { cut: 'blur', cutStrength: 0.35 }, headline: 'condensed-script', headlineY: 0.55 },
  { id: 'look-neon-orange', name: 'Помаранчевий неон', tag: 'драма', captions: 'ref-orange-glow', camera: 'accent', fx: { cut: 'flash', cutStrength: 0.4, letterbox: 0 }, headline: 'neon-glow' },
  { id: 'look-glitch', name: 'Глітч', tag: 'тех', captions: 'ref-glitch', camera: 'punch', fx: { cut: 'glitch', cutStrength: 0.7 } },
  { id: 'look-dynamic', name: 'Динамічний', tag: 'нерухомість', captions: 'ref-deep-shadow', camera: 'punch', fx: { cut: 'zoom-blur', cutStrength: 0.9 } },
  { id: 'look-luxe', name: 'Люкс', tag: 'кіно-смуги', captions: 'ref-luxe', camera: 'push', fx: { cut: 'dip', cutStrength: 0.4, letterbox: 0.07 } },
  { id: 'look-swiss', name: 'Швейцарський лайм', tag: 'інфографіка', captions: 'ref-lime', camera: 'none', fx: { frame: 'split-top', frameBg: '#F6F6F2', frameBg2: '#E4E4DC', framePattern: 'grid', cut: 'none' }, headline: 'swiss-lime' },
  { id: 'look-pastel', name: 'Пастель', tag: 'ніжно', captions: 'ref-pastel', camera: 'push', fx: { cut: 'blur', cutStrength: 0.3 } },
  { id: 'look-minimal', name: 'Мінімалізм', captions: 'minimal', camera: 'none' },
  { id: 'look-viral', name: 'Віральний', captions: 'hormozi', camera: 'punch', fx: { cut: 'shake', cutStrength: 0.5 } },
  { id: 'look-expert', name: 'Експерт', captions: 'white-plate', camera: 'alternate' },
  { id: 'look-podcast', name: 'Подкаст', captions: 'karaoke', camera: 'alternate' },
  { id: 'look-brand', name: 'Бренд (чорна плашка)', captions: 'black-plate', camera: 'alternate' },
];

// Applies a look on top of the current style: colour, music, headline text stay untouched.
export const applyLook = (s: ProjectStyle, l: Look): ProjectStyle => ({
  ...s,
  look: l.id,
  captions: { ...CAPTION_PRESETS.find((x) => x.id === l.captions)!.value, ...(l.captionsPatch ?? {}), enabled: true },
  camera: { ...CAMERA_PRESETS.find((x) => x.id === l.camera)!.value, focusY: s.camera.focusY },
  fx: { ...DEFAULT_FX, ...(l.fx ?? {}) },
  headline: { ...s.headline, style: l.headline ?? s.headline.style, y: l.headlineY ?? DEFAULT_HEADLINE.y },
});

export { COLOR_FILTERS };
