// Shared data model: used by the UI, the Remotion composition and the server.

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

export type CaptionAnimation = 'none' | 'fade' | 'pop' | 'slide-up' | 'blur' | 'drop';
export type WordMode = 'static' | 'reveal' | 'highlight' | 'box' | 'karaoke' | 'pop-active' | 'underline' | 'marker';
export type CaptionBg = 'none' | 'plate' | 'line-plates' | 'glass';

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
  boxColor: string; // box / marker background behind the active word
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
};

export type ColorStyle = {
  preset: string;
  brightness: number; // 1 = unchanged
  contrast: number;
  saturation: number;
  warmth: number; // -1 cool .. +1 warm
  fade: number; // 0..1 lifted blacks
  vignette: number; // 0..1
  grain: number; // 0..1
  tint: string | null; // overlay colour (soft-light)
  tintAmount: number;
};

export type CameraStyle = {
  mode: 'none' | 'alternate' | 'push' | 'punch';
  amount: number; // extra scale, e.g. 0.1 = 110%
  focusY: number; // 0..1 vertical point zooms keep in place (face height)
};

export type MusicStyle = {
  file: string | null; // file name inside the project folder
  volume: number; // 0..1
  duck: number; // 0..1 volume multiplier while someone speaks
};

export type ProjectStyle = {
  captions: CaptionStyle;
  color: ColorStyle;
  camera: CameraStyle;
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
};

export type ReelProps = {
  src: string; // video url (preview proxy in the browser, full proxy when rendering)
  project: Pick<Project, 'words' | 'clips' | 'fps' | 'style'>;
  fonts: FontEntry[];
  musicSrc: string | null;
  showSafeZones?: boolean;
};
