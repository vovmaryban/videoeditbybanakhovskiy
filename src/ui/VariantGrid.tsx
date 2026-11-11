import React, { useRef } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { Reel } from '../remotion/Reel';
import type { ReelProps } from '../remotion/types';

export type Variant = { id: string; name: string; tag?: string; props: ReelProps };

// One live mini-player per variant: still frame, plays a short loop on hover.
const Tile: React.FC<{ v: Variant; on: boolean; frame: number; duration: number; onPick: () => void }> = ({ v, on, frame, duration, onPick }) => {
  const ref = useRef<PlayerRef>(null);
  const out = Math.min(duration - 1, frame + 75);
  return (
    <div
      className={`tile ${on ? 'on' : ''}`}
      onClick={onPick}
      onMouseEnter={() => { ref.current?.seekTo(frame); ref.current?.play(); }}
      onMouseLeave={() => { ref.current?.pause(); ref.current?.seekTo(frame); }}
    >
      <div className="tile-video">
        <Player
          ref={ref}
          component={Reel}
          inputProps={v.props}
          durationInFrames={duration}
          compositionWidth={1080}
          compositionHeight={1920}
          fps={30}
          initialFrame={frame}
          inFrame={Math.max(0, frame - 5)}
          outFrame={out}
          loop
          initiallyMuted
          acknowledgeRemotionLicense
          style={{ width: '100%', aspectRatio: '9 / 16' }}
        />
      </div>
      <div className="tile-name">{v.name}{v.tag && <span>{v.tag}</span>}</div>
    </div>
  );
};

export const VariantGrid: React.FC<{ variants: Variant[]; selected: string | null; frame: number; duration: number; onPick: (id: string) => void }> = ({ variants, selected, frame, duration, onPick }) => (
  <div className="grid">
    {variants.map((v) => <Tile key={v.id} v={v} on={v.id === selected} frame={frame} duration={duration} onPick={() => onPick(v.id)} />)}
  </div>
);
