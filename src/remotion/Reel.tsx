import React, { useId, useMemo } from 'react';
import { AbsoluteFill, Audio, interpolate, OffthreadVideo, random, Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { accentIndexes, Captions } from './Captions';
import { effective, isNeutral, toneTables } from './color';
import { useFonts } from './fonts';
import { Headline, HEADLINE_STYLES } from './Headline';
import { normalizeStyle } from './presets';
import { buildPages, buildTimeline, type Piece } from './timeline';
import type { CameraStyle, ColorStyle, FxStyle, ReelProps } from './types';

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
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `50% ${cam.focusY * 100}%` }}
      />
    </AbsoluteFill>
  );
};

const NOISE = (seed: number) =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='${seed}' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`)}")`;

// Colour grading: real per-pixel tone curves + saturation (SVG filter), then vignette and grain.
const ColorFilterDefs: React.FC<{ id: string; color: ColorStyle }> = ({ id, color }) => {
  const a = effective(color);
  const [r, g, b] = toneTables(a);
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <filter id={id} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
          <feComponentTransfer>
            <feFuncR type="table" tableValues={r} />
            <feFuncG type="table" tableValues={g} />
            <feFuncB type="table" tableValues={b} />
          </feComponentTransfer>
          <feColorMatrix type="saturate" values={String(Math.max(0, 1 + a.saturation))} />
        </filter>
      </defs>
    </svg>
  );
};

const ColorOverlays: React.FC<{ color: ColorStyle }> = ({ color }) => {
  const frame = useCurrentFrame();
  const a = effective(color);
  return (
    <>
      {a.vignette > 0 && <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 60% at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,${Math.min(1, 0.85 * a.vignette)}) 100%)` }} />}
      {a.grain > 0 && <AbsoluteFill style={{ backgroundImage: NOISE(frame % 8), backgroundSize: '300px 300px', opacity: Math.min(1, a.grain) * 0.22, mixBlendMode: 'overlay' }} />}
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

// Hand-cut wobbly card (952×740) for the notebook look
const BLOB = 'M38 22 C180 4 330 18 480 10 C640 2 790 16 918 8 C944 40 936 120 946 220 C952 330 938 450 948 560 C952 640 944 690 930 724 C780 736 640 724 480 734 C330 742 180 728 30 736 C12 700 20 620 10 520 C2 400 16 290 6 180 C2 110 12 50 38 22 Z';

// Where the video sits on the 9:16 canvas
const frameRect = (fx: FxStyle, W: number, H: number): { rect: React.CSSProperties; framed: boolean } => {
  switch (fx.frame) {
    case 'card': return { framed: true, rect: { left: 70, top: 300, width: W - 140, height: 1320, borderRadius: 44 } };
    case 'arch': return { framed: true, rect: { left: 0, top: H * 0.4, width: W, height: H * 0.6, borderRadius: `${W / 2}px ${W / 2}px 0 0` } };
    case 'blob': return { framed: true, rect: { left: 64, top: H * 0.36, width: W - 128, height: 740, clipPath: `path('${BLOB}')` } };
    case 'split-top': return { framed: true, rect: { left: 0, top: H * 0.42, width: W, height: H * 0.58 } };
    case 'split-bottom': return { framed: true, rect: { left: 0, top: 0, width: W, height: H * 0.58 } };
    case 'circle': return { framed: true, rect: { left: 120, top: H * 0.42 - 420, width: 840, height: 840, borderRadius: '50%' } };
    default: return { framed: false, rect: { left: 0, top: 0, width: W, height: H } };
  }
};

const background = (fx: FxStyle): React.CSSProperties => {
  switch (fx.framePattern) {
    case 'dots': return { backgroundColor: fx.frameBg, backgroundImage: `radial-gradient(${fx.frameBg2} 2.2px, transparent 2.8px)`, backgroundSize: '30px 30px' };
    case 'grid': return { backgroundColor: fx.frameBg, backgroundImage: `linear-gradient(${fx.frameBg2} 2px, transparent 2px), linear-gradient(90deg, ${fx.frameBg2} 2px, transparent 2px)`, backgroundSize: '56px 56px' };
    case 'gradient': return { background: `radial-gradient(ellipse 90% 70% at 50% 35%, ${fx.frameBg}, ${fx.frameBg2})` };
    case 'paper': return { backgroundColor: fx.frameBg };
    default: return { backgroundColor: fx.frameBg };
  }
};

export const Reel: React.FC<ReelProps> = ({ src, project, fonts, musicSrc, showSafeZones, colorBypass }) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const style = useMemo(() => normalizeStyle(project.style), [project.style]);
  const cap = style.captions;
  const fx = style.fx;
  const { pieces, durationInFrames } = useMemo(() => buildTimeline(project.clips, fps), [project.clips, fps]);
  const pages = useMemo(
    () => buildPages(project.words, pieces, fps, cap),
    [project.words, pieces, fps, cap.maxWords, cap.maxChars],
  );
  const hl = HEADLINE_STYLES.find((x) => x.id === style.headline.style);
  useFonts(fonts, [
    { family: cap.font, italic: cap.italic },
    { family: cap.accentFont, italic: cap.accentItalic },
    ...(style.headline.enabled && style.headline.text ? hl?.fonts ?? [] : []),
  ]);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  // music: duck under speech with ~0.2 s ramps
  const musicVol = useMemo(() => {
    const speak = new Float32Array(durationInFrames);
    for (const p of pages) for (const w of p.words) for (let f = Math.max(0, w.o0 - 3); f < Math.min(durationInFrames, w.o1 + 3); f++) speak[f] = 1;
    const out = new Float32Array(durationInFrames);
    let v = 0;
    for (let f = 0; f < durationInFrames; f++) { v += (speak[f] - v) * 0.18; out[f] = v; }
    return out;
  }, [pages, durationInFrames]);

  // accent words (★ or automatic) on the output timeline, for punch-in zooms
  const accentSpans = useMemo(() => {
    const out: [number, number][] = [];
    for (const p of pages) for (const j of accentIndexes(p, cap)) out.push([p.words[j].o0, p.words[j].o1]);
    return out;
  }, [pages, cap.autoAccent]);

  // --- accent punch
  let punch = 1;
  let jitter = { x: 0, y: 0 };
  const ap = style.camera.accentPunch ?? 0;
  if (ap > 0 || fx.shakeOnAccent) {
    const span = accentSpans.find(([a, b]) => frame >= a - 1 && frame < b + 5);
    if (span) {
      const up = spring({ frame: frame - span[0], fps, config: { damping: 14, stiffness: 260 } });
      const down = interpolate(frame, [span[1], span[1] + 5], [1, 0], clamp);
      punch = 1 + ap * up * down;
      if (fx.shakeOnAccent && frame - span[0] < 6) {
        const k = interpolate(frame - span[0], [0, 6], [1, 0], clamp);
        jitter = { x: (random(`ax${frame}`) - 0.5) * 22 * k, y: (random(`ay${frame}`) - 0.5) * 22 * k };
      }
    }
  }

  // --- cut transitions (around every cut between kept phrases)
  const cuts = pieces.slice(1).map((p) => p.from);
  let d = Infinity;
  for (const c of cuts) if (Math.abs(frame - c) < Math.abs(d)) d = frame - c; // signed distance to the nearest cut
  const k = fx.cutStrength;
  const fxStyle: React.CSSProperties = {};
  let flash = 0;
  let dip = 0;
  let whip = 0;
  let glitch = 0;
  const filters: string[] = [];
  if (Math.abs(d) <= 8) {
    switch (fx.cut) {
      case 'flash': flash = d < 0 ? interpolate(d, [-2, 0], [0, 0.85], clamp) : interpolate(d, [0, 6], [0.85, 0], clamp); flash *= k; break;
      case 'dip': dip = d < 0 ? interpolate(d, [-4, 0], [0, 1], clamp) : interpolate(d, [0, 5], [1, 0], clamp); dip *= Math.min(1, k * 1.2); break;
      case 'zoom-blur': {
        const t = d < 0 ? interpolate(d, [-3, 0], [0, 1], clamp) : interpolate(d, [0, 5], [1, 0], clamp);
        fxStyle.transform = `scale(${1 + 0.22 * k * t})`;
        filters.push(`blur(${14 * k * t}px)`);
        break;
      }
      case 'whip': {
        const t = d < 0 ? interpolate(d, [-3, 0], [0, 1], clamp) : interpolate(d, [0, 4], [1, 0], clamp);
        whip = 60 * k * t;
        fxStyle.transform = `translateX(${(d < 0 ? -1 : 1) * 120 * k * t}px)`;
        break;
      }
      case 'blur': {
        const t = d < 0 ? interpolate(d, [-4, 0], [0, 1], clamp) : interpolate(d, [0, 5], [1, 0], clamp);
        filters.push(`blur(${18 * k * t}px)`);
        break;
      }
      case 'glitch': {
        if (d >= 0 && d < 6) {
          glitch = 18 * k * interpolate(d, [0, 6], [1, 0.2], clamp);
          fxStyle.transform = `translateX(${(random(`gx${frame}`) - 0.5) * 50 * k}px)`;
        }
        break;
      }
      case 'shake': {
        if (d >= 0 && d < 8) {
          const t = interpolate(d, [0, 8], [1, 0], clamp);
          fxStyle.transform = `translate(${(random(`sx${frame}`) - 0.5) * 40 * k * t}px, ${(random(`sy${frame}`) - 0.5) * 40 * k * t}px) scale(${1 + 0.05 * k * t})`;
        }
        break;
      }
      default: break;
    }
  }

  const colorOn = !colorBypass && !isNeutral(effective(style.color));
  const cgId = `cg${uid}`;
  const whipId = `wp${uid}`;
  const glId = `gl${uid}`;
  const videoFilter = [colorOn ? `url(#${cgId})` : '', whip > 0.5 ? `url(#${whipId})` : '', glitch > 0.5 ? `url(#${glId})` : '', ...filters].filter(Boolean).join(' ') || undefined;
  const { rect, framed } = frameRect(fx, W, H);
  const m = style.music;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {colorOn && <ColorFilterDefs id={cgId} color={style.color} />}
      {whip > 0.5 && (
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
          <defs><filter id={whipId} x="-10%" y="0" width="120%" height="100%"><feGaussianBlur stdDeviation={`${whip} 0`} /></filter></defs>
        </svg>
      )}
      {glitch > 0.5 && (
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
          <defs>
            <filter id={glId} x="-5%" y="0" width="110%" height="100%" colorInterpolationFilters="sRGB">
              <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
              <feOffset in="r" dx={glitch} result="ro" />
              <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="gb" />
              <feOffset in="gb" dx={-glitch} result="gbo" />
              <feBlend in="ro" in2="gbo" mode="screen" />
            </filter>
          </defs>
        </svg>
      )}
      {framed && <AbsoluteFill style={background(fx)} />}
      {framed && fx.framePattern === 'paper' && <AbsoluteFill style={{ backgroundImage: NOISE(3), backgroundSize: '300px 300px', opacity: 0.08, mixBlendMode: 'multiply' }} />}
      <div style={{
        position: 'absolute', left: rect.left, top: rect.top, width: rect.width, height: rect.height,
        filter: framed && fx.frame !== 'split-top' && fx.frame !== 'split-bottom' ? 'drop-shadow(0 22px 40px rgba(0,0,0,0.3))' : undefined,
      }}>
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: rect.borderRadius, clipPath: rect.clipPath,
        border: framed && fx.frameBorder ? `4px solid ${fx.frameBorder}` : undefined,
      }}>
        <AbsoluteFill style={{ filter: videoFilter, ...fxStyle }}>
          <AbsoluteFill style={{ transform: `translate(${jitter.x}px, ${jitter.y}px) scale(${punch})`, transformOrigin: `50% ${style.camera.focusY * 100}%` }}>
            {pieces.map((p) => (
              <Sequence key={p.clip.id} from={p.from} durationInFrames={p.frames} premountFor={Math.round(fps * 1.5)}>
                <PieceView piece={p} src={src} cam={style.camera} volume={style.voiceVolume} />
              </Sequence>
            ))}
          </AbsoluteFill>
        </AbsoluteFill>
        {!colorBypass && <ColorOverlays color={style.color} />}
      </div>
      </div>
      {fx.letterbox > 0 && (
        <>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: H * fx.letterbox, background: '#000' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: H * fx.letterbox, background: '#000' }} />
        </>
      )}
      {flash > 0 && <AbsoluteFill style={{ background: '#FFFFFF', opacity: flash }} />}
      {dip > 0 && <AbsoluteFill style={{ background: '#000000', opacity: dip }} />}
      <Headline h={style.headline} />
      <Captions pages={pages} style={cap} />
      {musicSrc && m.volume > 0 && (
        <Audio src={musicSrc} loop volume={(f) => m.volume * (1 - (1 - m.duck) * (musicVol[f] ?? 0)) * interpolate(f, [0, 10, durationInFrames - 25, durationInFrames], [0, 1, 1, 0], clamp)} />
      )}
      {showSafeZones && <SafeZones />}
    </AbsoluteFill>
  );
};

export const reelDuration = (project: ReelProps['project']) => buildTimeline(project.clips, project.fps).durationInFrames;
