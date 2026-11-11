import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { HeadlineStyle, HeadlineStyleId } from './types';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const HEADLINE_STYLES: { id: HeadlineStyleId; name: string; fonts: { family: string; italic?: boolean }[] }[] = [
  { id: 'top-caps', name: 'Капси + підрядок', fonts: [{ family: 'Montserrat' }] },
  { id: 'black-plates', name: 'Чорні плашки (TikTok)', fonts: [{ family: 'Montserrat' }] },
  { id: 'label', name: '(→) Мітка', fonts: [{ family: 'Inter Tight' }] },
  { id: 'kicker-serif', name: 'Кікер + великий серіф', fonts: [{ family: 'Old Standard' }, { family: 'Inter Tight' }] },
  { id: 'condensed-script', name: 'Вузький капс + рукопис', fonts: [{ family: 'Oswald' }, { family: 'Bad Script' }] },
  { id: 'yellow-tech', name: 'Жовтий номер', fonts: [{ family: 'Montserrat', italic: true }] },
  { id: 'swiss-lime', name: 'Лайм-інфографіка', fonts: [{ family: 'Roboto Condensed' }] },
  { id: 'pixel', name: 'Піксельний', fonts: [{ family: 'Press Start 2P' }] },
  { id: 'red-brush', name: 'Червоний бокс', fonts: [{ family: 'Montserrat' }] },
  { id: 'neon-glow', name: 'Помаранчевий неон', fonts: [{ family: 'Oswald' }] },
];

// Persistent hook / title on top of the video ("заголовок").
export const Headline: React.FC<{ h: HeadlineStyle }> = ({ h }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  if (!h.enabled || !h.text.trim()) return null;
  const end = h.until > 0 ? Math.round(h.until * fps) : Infinity;
  if (frame > end + 8) return null;
  const inK = spring({ frame, fps, config: { damping: 16, stiffness: 170 } });
  const outK = end === Infinity ? 1 : interpolate(frame, [end, end + 8], [1, 0], clamp);
  const lines = h.text.split('\n').filter(Boolean);
  const kicker = h.kicker.trim();
  const wrap: React.CSSProperties = {
    // y is the TOP edge: the default 0.215 keeps the whole title below the 400 px blind zone
    position: 'absolute', left: width * 0.07, right: width * 0.07, top: h.y * height, transform: `translateY(${(1 - inK) * 30}px)`,
    opacity: Math.min(inK * 1.4, 1) * outK, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10,
  };
  const word = (st: React.CSSProperties, t: string, k: number) => <div key={k} style={st}>{t}</div>;

  switch (h.style) {
    case 'black-plates':
      return (
        <div style={wrap}>
          {lines.map((l, k) => <span key={k} style={{ background: '#000', color: '#fff', fontFamily: '"Montserrat"', fontWeight: 900, fontSize: 50, textTransform: 'uppercase', padding: '6px 18px', lineHeight: 1.15 }}>{l}</span>)}
          {kicker && <span style={{ color: '#fff', fontFamily: '"Montserrat"', fontWeight: 700, fontSize: 36, textShadow: '0 2px 10px rgba(0,0,0,.6)' }}>{kicker}</span>}
        </div>
      );
    case 'label':
      return (
        <div style={{ ...wrap, alignItems: 'flex-start', textAlign: 'left' }}>
          {kicker && <span style={{ color: '#fff', fontFamily: '"Inter Tight"', fontWeight: 300, fontSize: 32, opacity: 0.9 }}>( {kicker} )</span>}
          {lines.map((l, k) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {k === 0 && <span style={{ color: '#fff', fontFamily: '"Inter Tight"', fontWeight: 300, fontSize: 36 }}>(→)</span>}
              <span style={{ background: k % 2 ? '#CFE3FF' : '#F2E1CF', color: k % 2 ? '#14223F' : '#5B2A1A', fontFamily: '"Inter Tight"', fontWeight: 800, fontSize: 40, textTransform: 'uppercase', padding: '4px 14px', borderRadius: 4 }}>{l}</span>
            </span>
          ))}
        </div>
      );
    case 'kicker-serif':
      return (
        <div style={wrap}>
          {kicker && <span style={{ color: '#EDE6D6', fontFamily: '"Inter Tight"', fontWeight: 600, fontSize: 28, letterSpacing: '0.18em', textTransform: 'uppercase' }}>{kicker}</span>}
          {lines.map((l, k) => word({ color: '#F3ECDC', fontFamily: '"Old Standard"', fontSize: 150, lineHeight: 0.92, textShadow: '0 6px 30px rgba(0,0,0,.35)' }, l, k))}
        </div>
      );
    case 'condensed-script':
      return (
        <div style={wrap}>
          <div style={{ position: 'relative' }}>
            {lines.map((l, k) => word({ color: '#F6EEC6', fontFamily: '"Oswald"', fontWeight: 700, fontSize: 118, lineHeight: 0.92, textTransform: 'uppercase', textShadow: '0 4px 24px rgba(0,0,0,.3)' }, l, k))}
            {kicker && <div style={{ position: 'absolute', left: 0, right: 0, top: '42%', color: '#fff', fontFamily: '"Bad Script"', fontSize: 78, transform: 'rotate(-6deg)', textShadow: '0 3px 14px rgba(0,0,0,.45)' }}>{kicker}</div>}
          </div>
        </div>
      );
    case 'yellow-tech':
      return (
        <div style={{ ...wrap, flexDirection: 'row', justifyContent: 'center', gap: 22 }}>
          {kicker && <span style={{ width: 78, height: 78, borderRadius: 99, background: '#FFD21F', color: '#111', fontFamily: '"Montserrat"', fontWeight: 900, fontSize: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{kicker}</span>}
          <span style={{ color: '#fff', fontFamily: '"Montserrat"', fontStyle: 'italic', fontWeight: 900, fontSize: 64, textAlign: 'left', lineHeight: 1.05 }}>{lines.join(' ')}</span>
        </div>
      );
    case 'swiss-lime':
      return (
        <div style={wrap}>
          {lines.map((l, k) => (
            <span key={k} style={{ background: k === 0 ? 'transparent' : '#DDFC4A', color: k === 0 ? '#111' : '#111', fontFamily: '"Roboto Condensed"', fontWeight: 800, fontSize: k === 0 ? 76 : 58, textTransform: 'uppercase', padding: '0 14px', lineHeight: 1.12, textShadow: k === 0 ? '0 0 1px rgba(255,255,255,.6)' : undefined }}>{l}</span>
          ))}
          {kicker && <span style={{ fontFamily: '"Roboto Condensed"', fontWeight: 700, fontSize: 26, letterSpacing: '0.2em', color: '#111', border: '2px solid #111', padding: '2px 10px' }}>{kicker}</span>}
        </div>
      );
    case 'pixel': {
      const n = 6;
      const cur = Math.min(n - 1, Math.floor(frame / (fps * 4)));
      return (
        <div style={wrap}>
          <div style={{ display: 'flex', gap: 8 }}>{Array.from({ length: n }, (_, k) => <i key={k} style={{ width: 22, height: 22, background: k < cur ? '#F06B57' : k === cur ? '#4AA3F0' : '#D9D6DE' }} />)}</div>
          {kicker && <span style={{ fontFamily: '"Press Start 2P"', fontSize: 22, color: '#8A8A8A', textTransform: 'uppercase' }}>{kicker}</span>}
          {lines.map((l, k) => word({ fontFamily: '"Press Start 2P"', fontSize: 40, color: '#F06B57', textTransform: 'uppercase', lineHeight: 1.4 }, l, k))}
        </div>
      );
    }
    case 'red-brush':
      return (
        <div style={wrap}>
          {lines.map((l, k) => <span key={k} style={{ background: '#D7262E', color: '#fff', fontFamily: '"Montserrat"', fontWeight: 800, fontSize: 46, textTransform: 'uppercase', padding: '8px 22px', borderRadius: 4 }}>{l}</span>)}
          {kicker && <span style={{ color: '#fff', fontFamily: '"Montserrat"', fontWeight: 600, fontSize: 32, textShadow: '0 2px 10px rgba(0,0,0,.6)' }}>{kicker}</span>}
        </div>
      );
    case 'neon-glow':
      return (
        <div style={wrap}>
          {kicker && <span style={{ color: '#fff', fontFamily: '"Oswald"', fontWeight: 500, fontSize: 40, textShadow: '0 2px 12px rgba(0,0,0,.5)' }}>{kicker}</span>}
          {lines.map((l, k) => word({ color: '#FF8A1E', fontFamily: '"Oswald"', fontWeight: 700, fontSize: 128, lineHeight: 0.95, textTransform: 'uppercase', textShadow: '0 0 24px rgba(255,138,30,.9), 0 0 60px rgba(255,138,30,.5)' }, l, k))}
        </div>
      );
    case 'top-caps':
    default:
      return (
        <div style={wrap}>
          {lines.map((l, k) => word({ color: '#fff', fontFamily: '"Montserrat"', fontWeight: 900, fontSize: 60, lineHeight: 1.08, textTransform: 'uppercase', textShadow: '0 4px 22px rgba(0,0,0,.45)' }, l, k))}
          {kicker && <span style={{ color: '#fff', fontFamily: '"Montserrat"', fontWeight: 700, fontSize: 34, textTransform: 'uppercase', textShadow: '0 3px 14px rgba(0,0,0,.45)' }}>{kicker}</span>}
        </div>
      );
  }
};
