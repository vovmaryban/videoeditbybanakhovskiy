import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Page, TimedWord } from './timeline';
import type { CaptionStyle } from './types';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const hexA = (hex: string, a: number) => {
  if (!hex.startsWith('#')) return hex;
  const h = hex.length === 4 ? hex.slice(1).split('').map((x) => x + x).join('') : hex.slice(1, 7);
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const pageEnter = (s: CaptionStyle, local: number, fps: number): React.CSSProperties => {
  const sp = spring({ frame: local, fps, config: { damping: 14, stiffness: 180, mass: 0.6 } });
  const lin = interpolate(local, [0, 5], [0, 1], clamp);
  switch (s.animation) {
    case 'fade': return { opacity: lin };
    case 'pop': return { opacity: interpolate(local, [0, 2], [0, 1], clamp), transform: `scale(${0.72 + 0.28 * sp})` };
    case 'slide-up': return { opacity: lin, transform: `translateY(${(1 - sp) * 44}px)` };
    case 'blur': return { opacity: lin, filter: `blur(${(1 - lin) * 14}px)` };
    case 'drop': return { opacity: interpolate(local, [0, 3], [0, 1], clamp), transform: `translateY(${(1 - spring({ frame: local, fps, config: { damping: 9, stiffness: 160 } })) * -70}px)` };
    default: return {};
  }
};

type WordState = 'future' | 'active' | 'past';

export const Captions: React.FC<{ pages: Page[]; style: CaptionStyle }> = ({ pages, style: s }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  if (!s.enabled) return null;
  const page = pages.find((p) => frame >= p.o0 && frame < p.o1);
  if (!page) return null;
  const local = frame - page.o0;

  const stateOf = (w: TimedWord, j: number): WordState => {
    const next = page.words[j + 1];
    if (frame < w.o0) return 'future';
    if (next ? frame < next.o0 : frame < w.o1) return 'active';
    return 'past';
  };

  const shadows: string[] = [];
  if (s.shadow > 0) shadows.push(`0 ${Math.round(s.shadow / 4)}px ${s.shadow}px ${s.shadowColor}`);
  if (s.glow > 0) shadows.push(`0 0 ${s.glow}px ${hexA(s.accent, 0.9)}`, `0 0 ${s.glow * 2}px ${hexA(s.accent, 0.5)}`);

  const textBase: React.CSSProperties = {
    fontFamily: `"${s.font}", sans-serif`,
    fontWeight: s.weight,
    fontStyle: s.italic ? 'italic' : 'normal',
    fontSize: s.size,
    lineHeight: s.lineHeight,
    letterSpacing: `${s.letterSpacing}em`,
    textTransform: s.uppercase ? 'uppercase' : 'none',
    textShadow: shadows.join(', ') || undefined,
    WebkitTextStroke: s.stroke > 0 ? `${s.stroke * 2}px ${s.strokeColor}` : undefined,
    paintOrder: 'stroke fill',
  };

  const linePlates = s.bg === 'line-plates';
  const words = page.words.map((w, j) => {
    const st = stateOf(w, j);
    const wl = frame - w.o0;
    const base = w.accent ? s.accent : s.color;
    let color = base;
    const css: React.CSSProperties = { display: 'inline-block', position: 'relative', margin: `0 ${s.size * 0.17}px`, transition: 'none' };
    let fill: React.CSSProperties = {};
    const hidden = (s.wordMode === 'reveal' || s.wordMode === 'pop-active') && st === 'future';

    switch (s.wordMode) {
      case 'highlight': if (st === 'active') color = s.activeColor; break;
      case 'karaoke': color = st === 'future' ? s.futureColor : w.accent ? s.accent : st === 'active' ? s.activeColor : s.color; break;
      case 'reveal': if (st !== 'future') css.opacity = interpolate(wl, [0, 3], [0, 1], clamp); break;
      case 'pop-active':
        if (st === 'active') {
          color = s.activeColor;
          css.transform = `scale(${1 + 0.14 * spring({ frame: wl, fps, config: { damping: 10, stiffness: 220 } })})`;
        }
        break;
      case 'box':
      case 'marker':
        if (st === 'active') color = s.activeColor;
        break;
      default: break;
    }
    if (s.gradient && !(s.wordMode === 'box' && st === 'active')) {
      fill = { backgroundImage: s.gradient, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' };
    }

    let deco: React.ReactNode = null;
    if (st === 'active' && (s.wordMode === 'box' || s.wordMode === 'marker')) {
      const sp = spring({ frame: wl, fps, config: { damping: 15, stiffness: 260 } });
      deco = (
        <span style={{
          position: 'absolute', left: -s.size * 0.14, right: -s.size * 0.14, top: s.wordMode === 'marker' ? '18%' : '-4%', bottom: s.wordMode === 'marker' ? '6%' : '-4%',
          background: s.boxColor, borderRadius: s.wordMode === 'marker' ? 4 : s.radius * 0.7, zIndex: -1,
          transform: s.wordMode === 'marker' ? `skewX(-8deg) scaleX(${sp})` : `scale(${0.8 + 0.2 * sp})`, transformOrigin: 'left center',
        }} />
      );
    }
    if (st === 'active' && s.wordMode === 'underline') {
      const sp = interpolate(wl, [0, 5], [0, 1], clamp);
      deco = <span style={{ position: 'absolute', left: 0, bottom: '-2%', height: Math.max(6, s.size * 0.1), width: `${sp * 100}%`, background: s.boxColor, borderRadius: 99 }} />;
    }
    return (
      <span key={w.i} style={{ ...css, opacity: hidden ? 0 : css.opacity, zIndex: 1 }}>
        {deco}
        <span style={{ ...textBase, color, ...fill, position: 'relative' }}>{w.text}</span>
      </span>
    );
  });

  const enter = pageEnter(s, local, fps);
  const pad = s.size * 0.32;
  const block: React.CSSProperties = {
    position: 'absolute', left: width * 0.07, right: width * 0.07, top: s.y * height, transform: 'translateY(-50%)',
    display: 'flex', justifyContent: 'center', textAlign: 'center',
  };
  let inner: React.CSSProperties = { display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', isolation: 'isolate', ...enter };
  if (s.bg === 'plate' || s.bg === 'glass') {
    inner = { ...inner, background: hexA(s.bgColor, s.bgOpacity), borderRadius: s.radius, padding: `${pad * 0.7}px ${pad}px` };
    if (s.bg === 'glass') inner = { ...inner, backdropFilter: 'blur(18px)', border: '1.5px solid rgba(255,255,255,0.25)' };
  }

  if (linePlates) {
    return (
      <div style={block}>
        <div style={{ ...enter, maxWidth: '100%' }}>
          <span style={{
            background: hexA(s.bgColor, s.bgOpacity), borderRadius: s.radius, padding: `${pad * 0.35}px ${pad * 0.6}px`,
            boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone', lineHeight: `${s.lineHeight * 1.45}`, fontSize: s.size,
          }}>
            {words.map((wd, j) => <React.Fragment key={j}>{wd}{j < words.length - 1 ? ' ' : ''}</React.Fragment>)}
          </span>
        </div>
      </div>
    );
  }
  return (
    <div style={block}>
      <div style={inner}>{words}</div>
    </div>
  );
};
