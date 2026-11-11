import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, interpolate, OffthreadVideo, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { Captions } from './Captions';
import { useFont } from './fonts';
import { buildPages, buildTimeline, type Piece } from './timeline';
import type { CameraStyle, ColorStyle, ReelProps } from './types';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const cameraScale = (cam: CameraStyle, piece: Piece, local: number) => {
  const a = cam.amount;
  switch (cam.mode) {
    case 'alternate': return piece.index % 2 ? 1 + a : 1;
    case 'push': return 1 + a * (local / Math.max(1, piece.frames));
    case 'punch': return piece.index % 2 ? 1 + a * interpolate(local, [0, 4], [0, 1], clamp) : 1;
    default: return 1;
  }
};

const PieceView: React.FC<{ piece: Piece; src: string; cam: CameraStyle; volume: number }> = ({ piece, src, cam, volume }) => {
  const frame = useCurrentFrame();
  const scale = cameraScale(cam, piece, frame);
  return (
    <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: `50% ${cam.focusY * 100}%` }}>
      <OffthreadVideo
        src={src}
        trimBefore={piece.srcFrom}
        pauseWhenBuffering
        volume={(f) => (f < 1 || f > piece.frames - 2 ? volume * 0.5 : volume)}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </AbsoluteFill>
  );
};

const NOISE = (seed: number) =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='${seed}' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`)}")`;

const ColorLayers: React.FC<{ color: ColorStyle }> = ({ color: c }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {c.warmth !== 0 && <AbsoluteFill style={{ background: c.warmth > 0 ? '#FF8A2B' : '#2B7BFF', opacity: Math.abs(c.warmth) * 0.32, mixBlendMode: 'soft-light' }} />}
      {c.tint && c.tintAmount > 0 && <AbsoluteFill style={{ background: c.tint, opacity: c.tintAmount, mixBlendMode: 'soft-light' }} />}
      {c.fade > 0 && <AbsoluteFill style={{ background: `rgb(${Math.round(c.fade * 160)},${Math.round(c.fade * 150)},${Math.round(c.fade * 145)})`, mixBlendMode: 'lighten' }} />}
      {c.vignette > 0 && <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 60% at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,${0.85 * c.vignette}) 100%)` }} />}
      {c.grain > 0 && <AbsoluteFill style={{ backgroundImage: NOISE(frame % 8), backgroundSize: '300px 300px', opacity: c.grain * 0.22, mixBlendMode: 'overlay' }} />}
    </>
  );
};

const SafeZones: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: 'none' }}>
    {[
      { top: 0, left: 0, right: 0, height: 400 },
      { bottom: 0, left: 0, right: 0, height: 450 },
      { top: 1000, right: 0, width: 159, bottom: 450 },
    ].map((z, i) => (
      <div key={i} style={{ position: 'absolute', ...z, background: 'rgba(255,40,40,0.16)', border: '3px dashed rgba(255,60,60,0.8)' }} />
    ))}
  </AbsoluteFill>
);

export const Reel: React.FC<ReelProps> = ({ src, project, fonts, musicSrc, showSafeZones }) => {
  const { fps } = useVideoConfig();
  const { style } = project;
  const { pieces, durationInFrames } = useMemo(() => buildTimeline(project.clips, fps), [project.clips, fps]);
  const pages = useMemo(
    () => buildPages(project.words, pieces, fps, style.captions),
    [project.words, pieces, fps, style.captions.maxWords, style.captions.maxChars],
  );
  useFont(fonts, style.captions.font, style.captions.italic);

  // music: duck under speech with ~0.2 s ramps
  const musicVol = useMemo(() => {
    const speak = new Float32Array(durationInFrames);
    for (const p of pages) for (const w of p.words) for (let f = Math.max(0, w.o0 - 3); f < Math.min(durationInFrames, w.o1 + 3); f++) speak[f] = 1;
    const out = new Float32Array(durationInFrames);
    let v = 0;
    for (let f = 0; f < durationInFrames; f++) { v += (speak[f] - v) * 0.18; out[f] = v; }
    return out;
  }, [pages, durationInFrames]);
  const m = style.music;
  const c = style.color;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <AbsoluteFill style={{ filter: `brightness(${c.brightness}) contrast(${c.contrast}) saturate(${c.saturation})`, overflow: 'hidden' }}>
        {pieces.map((p) => (
          <Sequence key={p.clip.id} from={p.from} durationInFrames={p.frames} premountFor={Math.round(fps * 1.5)}>
            <PieceView piece={p} src={src} cam={style.camera} volume={style.voiceVolume} />
          </Sequence>
        ))}
        <ColorLayers color={c} />
      </AbsoluteFill>
      <Captions pages={pages} style={style.captions} />
      {musicSrc && m.volume > 0 && (
        <Audio src={musicSrc} loop volume={(f) => m.volume * (1 - (1 - m.duck) * (musicVol[f] ?? 0)) * interpolate(f, [0, 10, durationInFrames - 25, durationInFrames], [0, 1, 1, 0], clamp)} />
      )}
      {showSafeZones && <SafeZones />}
    </AbsoluteFill>
  );
};

export const reelDuration = (project: ReelProps['project']) => buildTimeline(project.clips, project.fps).durationInFrames;
