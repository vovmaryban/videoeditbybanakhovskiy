import React from 'react';
import { interpolate, random, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Page, TimedWord } from './timeline';
import type { CaptionStyle } from './types';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const hexA = (hex: string, a: number) => {
  if (!hex.startsWith('#')) return hex;
  const h = hex.length === 4 ? hex.slice(1).split('').map((x) => x + x).join('') : hex.slice(1, 7);
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const letters = (t: string) => t.replace(/[^\p{L}\p{N}]/gu, '');

// Which word of a page is the accent: ★ words, otherwise one automatic pick (longest / last).
export const accentIndexes = (page: Page, s: Pick<CaptionStyle, 'autoAccent'>): Set<number> => {
  const set = new Set<number>();
  page.words.forEach((w, j) => { if (w.accent) set.add(j); });
  if (set.size || s.autoAccent === 'off' || page.words.length < 2) return set;
  if (s.autoAccent === 'last') {
    for (let j = page.words.length - 1; j >= 0; j--) if (letters(page.words[j].text).length >= 2) { set.add(j); break; }
  } else {
    let best = -1;
    let len = 3;
    page.words.forEach((w, j) => { const l = letters(w.text).length; if (l > len) { len = l; best = j; } });
    if (best >= 0) set.add(best);
  }
  return set;
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
    case 'zoom-out': {
      const z = spring({ frame: local, fps, config: { damping: 18, stiffness: 140 } });
      return { opacity: interpolate(local, [0, 3], [0, 1], clamp), transform: `scale(${1.55 - 0.55 * z})`, filter: `blur(${(1 - z) * 6}px)` };
    }
    case 'wipe': {
      const k = interpolate(local, [0, 7], [100, 0], { ...clamp, easing: (t) => 1 - (1 - t) ** 3 });
      return { clipPath: `inset(-20% ${k}% -20% -5%)` };
    }
    case 'stamp': {
      const z = spring({ frame: local, fps, config: { damping: 11, stiffness: 320, mass: 0.5 } });
      return { opacity: interpolate(local, [0, 1], [0, 1], clamp), transform: `scale(${2 - z}) rotate(${(1 - z) * -6}deg)` };
    }
    case 'glitch': {
      if (local > 7) return {};
      const r = (k: number) => (random(`g${local}-${k}`) - 0.5) * 2;
      const amp = interpolate(local, [0, 7], [1, 0], clamp);
      return {
        opacity: local < 1 ? 0.6 : 1,
        transform: `translateX(${r(1) * 26 * amp}px) skewX(${r(2) * 10 * amp}deg)`,
        clipPath: local % 2 ? `inset(${Math.abs(r(3)) * 30}% 0 ${Math.abs(r(4)) * 30}% 0)` : undefined,
      };
    }
    default: return {};
  }
};

type WordState = 'future' | 'active' | 'past';

// A hand-painted brush band (SVG) behind the caption block
const Brush: React.FC<{ color: string; opacity: number }> = ({ color, opacity }) => (
  <svg viewBox="0 0 400 60" preserveAspectRatio="none" style={{ position: 'absolute', left: '-8%', right: '-8%', top: '-8%', bottom: '-8%', width: '116%', height: '116%', zIndex: -1, opacity }}>
    <path fill={color} d="M6 18 C40 6 90 12 140 9 C200 5 260 10 320 7 C350 6 380 9 396 14 C390 22 398 30 392 38 C396 46 384 52 360 51 C300 55 240 50 180 54 C120 57 60 52 18 55 C8 50 12 44 4 40 C10 33 2 26 6 18 Z" />
    <path fill={color} opacity={0.55} d="M2 30 C30 26 50 33 80 29 L84 33 C50 36 26 34 1 36 Z M330 44 C360 41 380 46 399 43 L398 47 C374 50 352 47 328 49 Z" />
  </svg>
);

export const Captions: React.FC<{ pages: Page[]; style: CaptionStyle }> = ({ pages, style: s }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  if (!s.enabled) return null;
  const page = pages.find((p) => frame >= p.o0 && frame < p.o1);
  if (!page) return null;
  const local = frame - page.o0;
  const accents = accentIndexes(page, s);

  const stateOf = (w: TimedWord, j: number): WordState => {
    const next = page.words[j + 1];
    if (frame < w.o0) return 'future';
    if (next ? frame < next.o0 : frame < w.o1) return 'active';
    return 'past';
  };

  const shadowsFor = (glowColor: string) => {
    const sh: string[] = [];
    if (s.shadow > 0) sh.push(`0 ${Math.round(s.shadow / 4)}px ${s.shadow}px ${s.shadowColor}`);
    if (s.glow > 0) sh.push(`0 0 ${s.glow}px ${hexA(glowColor, 0.9)}`, `0 0 ${s.glow * 2}px ${hexA(glowColor, 0.5)}`);
    return sh;
  };

  const textBase: React.CSSProperties = {
    fontFamily: `"${s.font}", sans-serif`,
    fontWeight: s.weight,
    fontStyle: s.italic ? 'italic' : 'normal',
    fontSize: s.size,
    lineHeight: s.lineHeight,
    letterSpacing: `${s.letterSpacing}em`,
    textTransform: s.uppercase ? 'uppercase' : 'none',
    textShadow: shadowsFor(s.accent).join(', ') || undefined,
    WebkitTextStroke: s.stroke > 0 ? `${s.stroke * 2}px ${s.strokeColor}` : undefined,
    paintOrder: 'stroke fill',
    whiteSpace: 'pre',
  };

  const wordEls = page.words.map((w, j) => {
    const st = stateOf(w, j);
    const wl = frame - w.o0;
    const isAcc = accents.has(j);
    let color = isAcc && s.accentStyle !== 'box' && s.accentStyle !== 'marker' ? s.accent : s.color;
    const css: React.CSSProperties = { display: 'inline-block', position: 'relative', margin: `0 ${s.size * 0.17}px`, verticalAlign: 'baseline' };
    let fill: React.CSSProperties = {};
    let text = w.text;
    const t: React.CSSProperties = { ...textBase };
    const hidden = (s.wordMode === 'reveal' || s.wordMode === 'pop-active' || s.wordMode === 'typewriter' || s.wordMode === 'rise') && st === 'future';

    // accent look
    if (isAcc) {
      if (s.accentFont && (s.accentStyle === 'font' || s.accentStyle === 'big' || s.accentStyle === 'box')) {
        t.fontFamily = `"${s.accentFont}", "${s.font}", sans-serif`;
        t.fontWeight = s.accentWeight;
        t.fontStyle = s.accentItalic ? 'italic' : 'normal';
        t.WebkitTextStroke = undefined;
      } else if (s.accentItalic) t.fontStyle = 'italic';
      if (s.accentStyle === 'font' || s.accentStyle === 'big') t.fontSize = s.size * s.accentScale;
      if (s.accentStyle === 'box') t.fontSize = s.size * s.accentScale;
      if (s.accentUpper === 'upper') t.textTransform = 'uppercase';
      if (s.accentUpper === 'lower') t.textTransform = 'none';
      if (s.accentUpper === 'lower') text = text.toLowerCase();
      if (s.accentStyle === 'font' || s.accentStyle === 'big') t.lineHeight = 1.0;
      if (s.accentStyle === 'glow') t.textShadow = [...shadowsFor(s.accent), `0 0 ${s.size * 0.35}px ${hexA(s.accent, 0.9)}`].join(', ');
      if (s.accentStyle === 'box' || s.accentStyle === 'marker') { color = s.accentInk; t.textShadow = undefined; t.WebkitTextStroke = undefined; }
    }

    switch (s.wordMode) {
      case 'highlight': if (st === 'active' && !(isAcc && (s.accentStyle === 'box' || s.accentStyle === 'marker'))) color = s.activeColor; break;
      case 'karaoke': if (st === 'future') color = s.futureColor; else if (!isAcc) color = st === 'active' ? s.activeColor : s.color; break;
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
      case 'blur-in': {
        const k = st === 'future' ? 0 : interpolate(wl, [0, 4], [0, 1], clamp);
        css.opacity = 0.32 + 0.68 * k;
        css.filter = k < 1 ? `blur(${(1 - k) * 7}px)` : undefined;
        css.transform = `scale(${1.06 - 0.06 * k})`;
        break;
      }
      case 'typewriter': {
        if (st === 'future') break;
        const dur = Math.max(3, Math.min(w.o1 - w.o0, Math.round(fps * 0.45)));
        const n = Math.ceil(interpolate(wl, [0, dur], [0, text.length], clamp));
        const cursorOn = st === 'active' && Math.floor(frame / 8) % 2 === 0;
        return (
          <span key={w.i} style={{ ...css, zIndex: 1 }}>
            <span style={{ ...t, color, position: 'relative' }}>{text.slice(0, n)}<span style={{ opacity: 0 }}>{text.slice(n)}</span>
              {cursorOn && n >= text.length && <span style={{ position: 'absolute', right: -s.size * 0.12, top: '8%', bottom: '8%', width: Math.max(3, s.size * 0.06), background: color }} />}
            </span>
          </span>
        );
      }
      case 'rise': {
        if (st === 'future') break;
        const k = spring({ frame: wl, fps, config: { damping: 16, stiffness: 220 } });
        return (
          <span key={w.i} style={{ ...css, overflow: 'hidden', paddingBottom: s.size * 0.12, marginBottom: -s.size * 0.12, zIndex: 1 }}>
            <span style={{ ...t, color, display: 'inline-block', transform: `translateY(${(1 - k) * 105}%)` }}>{text}</span>
          </span>
        );
      }
      default: break;
    }
    if (s.gradient && !isAcc && !(s.wordMode === 'box' && st === 'active')) {
      fill = { backgroundImage: s.gradient, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' };
    }

    let deco: React.ReactNode = null;
    const accentDeco = isAcc && (s.accentStyle === 'box' || s.accentStyle === 'marker');
    if (accentDeco || (st === 'active' && (s.wordMode === 'box' || s.wordMode === 'marker'))) {
      const isMarker = accentDeco ? s.accentStyle === 'marker' : s.wordMode === 'marker';
      const startF = accentDeco ? Math.max(0, local) : wl;
      const sp = spring({ frame: startF, fps, config: { damping: 15, stiffness: 260 } });
      const fs = (t.fontSize as number) ?? s.size;
      deco = (
        <span style={{
          position: 'absolute', left: -fs * 0.16, right: -fs * 0.16, top: isMarker ? '20%' : '-2%', bottom: isMarker ? '4%' : '-4%',
          background: s.boxColor, borderRadius: isMarker ? 3 : Math.min(s.radius, fs * 0.3) * 0.7, zIndex: -1,
          transform: isMarker ? `skewX(-8deg) scaleX(${sp})` : `scale(${0.85 + 0.15 * sp})`, transformOrigin: 'left center',
        }} />
      );
    }
    if (st === 'active' && s.wordMode === 'underline') {
      const sp = interpolate(wl, [0, 5], [0, 1], clamp);
      deco = <span style={{ position: 'absolute', left: 0, bottom: '-2%', height: Math.max(6, s.size * 0.1), width: `${sp * 100}%`, background: s.boxColor, borderRadius: 99 }} />;
    }
    // word tags: each word on its own small plate
    const tag: React.CSSProperties = s.bg === 'word-tags'
      ? { background: hexA(s.bgColor, s.bgOpacity), borderRadius: s.radius, padding: `${s.size * 0.16}px ${s.size * 0.32}px`, margin: `${s.size * 0.08}px ${s.size * 0.1}px` }
      : {};
    return (
      <span key={w.i} style={{ ...css, ...tag, opacity: hidden ? 0 : css.opacity, zIndex: 1 }}>
        {deco}
        <span style={{ ...t, color, ...fill, position: 'relative' }}>{text}</span>
      </span>
    );
  });

  // two-tier layout: [words before accent] / ACCENT / [words after]
  const accIdx = [...accents][0];
  const tiered = s.tiers && accIdx !== undefined && page.words.length > 1;
  const lines: React.ReactNode[][] = tiered
    ? [wordEls.slice(0, accIdx), [wordEls[accIdx]], wordEls.slice(accIdx + 1)].filter((l) => l.length)
    : [wordEls];

  const enter = pageEnter(s, local, fps);
  const glitchShadow = s.animation === 'glitch' && local <= 7
    ? { filter: `drop-shadow(${6 - local}px 0 0 rgba(255,0,64,0.85)) drop-shadow(${-(6 - local)}px 0 0 rgba(0,229,255,0.85))` }
    : {};
  const pad = s.size * 0.32;
  const side = width * 0.07;
  const justify = s.align === 'left' ? 'flex-start' : s.align === 'right' ? 'flex-end' : 'center';
  const block: React.CSSProperties = {
    position: 'absolute',
    top: s.y * height,
    transform: `translateY(-50%) rotate(${s.rotate}deg)`,
    display: 'flex',
    justifyContent: justify,
    textAlign: s.align,
    ...(s.align === 'left'
      ? { left: Math.max(side * 0.5, s.x * width), right: side }
      : s.align === 'right'
        ? { right: Math.max(side * 0.5, (1 - s.x) * width), left: side }
        : { left: side + (s.x - 0.5) * width, right: side - (s.x - 0.5) * width }),
  };
  let inner: React.CSSProperties = { display: 'inline-flex', flexDirection: 'column', alignItems: justify, position: 'relative', isolation: 'isolate', ...enter, ...glitchShadow };
  if (s.bg === 'plate' || s.bg === 'glass') {
    inner = { ...inner, background: hexA(s.bgColor, s.bgOpacity), borderRadius: s.radius, padding: `${pad * 0.7}px ${pad}px` };
    if (s.bg === 'glass') inner = { ...inner, backdropFilter: 'blur(18px)', border: '1.5px solid rgba(255,255,255,0.25)' };
  }
  if (s.bg === 'brush') inner = { ...inner, padding: `${pad * 0.55}px ${pad * 1.4}px` };

  if (s.bg === 'line-plates') {
    return (
      <div style={block}>
        <div style={{ ...enter, ...glitchShadow, maxWidth: '100%' }}>
          {lines.map((ln, k) => (
            <div key={k}>
              <span style={{
                background: hexA(s.bgColor, s.bgOpacity), borderRadius: s.radius, padding: `${pad * 0.35}px ${pad * 0.6}px`,
                boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone', lineHeight: `${s.lineHeight * 1.45}`, fontSize: s.size,
              }}>
                {ln.map((wd, j) => <React.Fragment key={j}>{wd}{j < ln.length - 1 ? ' ' : ''}</React.Fragment>)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div style={block}>
      <div style={inner}>
        {s.bg === 'brush' && <Brush color={s.bgColor} opacity={s.bgOpacity} />}
        {lines.map((ln, k) => (
          <div key={k} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: justify, alignItems: 'baseline' }}>{ln}</div>
        ))}
      </div>
    </div>
  );
};
