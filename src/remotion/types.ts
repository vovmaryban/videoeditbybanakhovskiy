// Shared data model: used by the UI, the Remotion composition and the server.
import type { ColorStyle } from './color';
export type { ColorStyle } from './color';

export type Word = {
  text: string;
  start: number; // source seconds
  end: number;
  accent?: boolean; // highlighted with the accent colour
};

export type Clip = {
  id: string;
  start: number; // source seconds (already padded into the surrounding silence)
  end: number;
  enabled: boolean;
  reason?: 'retake' | 'noise' | 'manual';
};

export type CaptionAnimation = 'none' | 'fade' | 'pop' | 'slide-up' | 'blur' | 'drop' | 'glitch' | 'zoom-out' | 'wipe' | 'stamp';
export type WordMode =
  | 'static' | 'reveal' | 'highlight' | 'box' | 'karaoke' | 'pop-active' | 'underline' | 'marker'
  | 'blur-in' // upcoming words are ghosted + blurred, each sharpens when spoken (tenfoldmarc)
  | 'typewriter' // letters appear one by one, with a cursor
  | 'rise'; // each word slides up from a mask when spoken
export type CaptionBg = 'none' | 'plate' | 'line-plates' | 'glass' | 'word-tags' | 'brush';
// How accent words (★ or automatic) are shown
export type AccentStyle = 'color' | 'box' | 'marker' | 'font' | 'big' | 'glow';

export type CaptionStyle = {
  enabled: boolean;
  font: string; // font family id from the font registry
  weight: number;
  italic: boolean;
  size: number; // px on the 1080x1920 canvas
  uppercase: boolean;
  letterSpacing: number; // em
  lineHeight: number;
  color: string;
  accent: string; // accent words + highlight colour
  activeColor: string; // colour of the spoken word (highlight / karaoke / pop-active)
  futureColor: string; // karaoke: words not yet spoken
  boxColor: string; // box / marker background behind the active or accent word
  bg: CaptionBg;
  bgColor: string;
  bgOpacity: number;
  radius: number;
  stroke: number;
  strokeColor: string;
  shadow: number; // blur radius, 0 = off
  shadowColor: string;
  glow: number;
  gradient: string | null; // css gradient for text fill, null = solid
  y: number; // vertical centre, 0..1 of the frame
  maxWords: number;
  maxChars: number;
  animation: CaptionAnimation;
  wordMode: WordMode;
  // --- added in stage 2 (older projects get defaults) ---
  align: 'center' | 'left' | 'right';
  x: number; // horizontal anchor 0..1 (centre for centre-aligned text)
  rotate: number; // degrees
  accentStyle: AccentStyle;
  autoAccent: 'off' | 'longest' | 'last'; // pick one word per caption automatically
  accentFont: string | null; // second font for accent words (script / serif mix)
  accentItalic: boolean;
  accentWeight: number;
  accentScale: number; // accent word size multiplier
  accentUpper: 'same' | 'upper' | 'lower';
  accentInk: string; // text colour inside an accent box / marker
  tiers: boolean; // two-tier: accent word on its own big line (small lead + BIG keyword)
};

export type CameraStyle = {
  mode: 'none' | 'alternate' | 'push' | 'punch';
  amount: number; // extra scale, e.g. 0.1 = 110%
  focusY: number; // 0..1 vertical point zooms keep in place (face height)
  accentPunch?: number; // quick zoom on accent words, 0 = off
};

// Effects that belong to the editing style (never colour)
export type CutTransition = 'none' | 'flash' | 'zoom-blur' | 'whip' | 'glitch' | 'blur' | 'shake' | 'dip';
export type FrameLayout = 'full' | 'card' | 'arch' | 'blob' | 'split-top' | 'split-bottom' | 'circle';
export type FramePattern = 'plain' | 'dots' | 'grid' | 'gradient' | 'paper';
export type FxStyle = {
  cut: CutTransition;
  cutStrength: number; // 0..1
  frame: FrameLayout; // how the video sits in the 9:16 canvas
  frameBg: string; // background colour around a framed video
  frameBg2: string; // second colour (gradient / grid lines)
  framePattern: FramePattern;
  frameBorder: string | null; // border colour of the video frame
  letterbox: number; // 0..0.2 cinematic bars
  shakeOnAccent: boolean;
};

export type HeadlineStyleId = 'top-caps' | 'black-plates' | 'label' | 'kicker-serif' | 'condensed-script' | 'yellow-tech' | 'swiss-lime' | 'pixel' | 'red-brush' | 'neon-glow';
export type HeadlineStyle = {
  enabled: boolean;
  text: string; // main line(s), \n = new line
  kicker: string; // small line above / script overlay
  style: HeadlineStyleId;
  y: number;
  until: number; // seconds it stays on screen, 0 = whole video
};

export type MusicStyle = {
  file: string | null; // file name inside the project folder
  volume: number; // 0..1
  duck: number; // 0..1 volume multiplier while someone speaks
};

export type ProjectStyle = {
  look?: string; // id of the last applied look (informational)
  captions: CaptionStyle;
  color: ColorStyle;
  camera: CameraStyle;
  fx: FxStyle;
  headline: HeadlineStyle;
  music: MusicStyle;
  voiceVolume: number;
};

export type ProjectStatus = 'uploading' | 'processing' | 'ready' | 'error';

export type Project = {
  id: string;
  name: string;
  createdAt: string;
  status: ProjectStatus;
  step?: string; // human readable progress line
  progress?: number; // 0..1
  error?: string;
  language: string;
  asrMode?: 'fast' | 'precise'; // fast: big windows + re-check of suspicious phrases; precise: every phrase alone
  asrSeconds?: number; // how long the last recognition took
  fps: number;
  width: number;
  height: number;
  duration: number; // source seconds
  words: Word[];
  clips: Clip[];
  style: ProjectStyle;
  exports: { file: string; createdAt: string }[];
};

export type FontEntry = {
  id: string; // family name used in CSS
  label: string;
  file: string; // url
  weights: [number, number];
  italic?: string; // url of the italic file
  user?: boolean;
  kind?: 'sans' | 'serif' | 'script' | 'display' | 'mono';
};

export type ReelProps = {
  src: string; // video url (preview proxy in the browser, full proxy when rendering)
  project: Pick<Project, 'words' | 'clips' | 'fps' | 'style'>;
  fonts: FontEntry[];
  musicSrc: string | null;
  showSafeZones?: boolean;
  colorBypass?: boolean; // "before" view in the colour tab
};
