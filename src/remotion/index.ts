// Entry for server-side rendering (bundled by @remotion/bundler).
import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { Reel, reelDuration } from './Reel';
import { DEFAULT_STYLE } from './presets';
import type { ReelProps } from './types';

const defaults: ReelProps = {
  src: '',
  project: { words: [], clips: [{ id: 'a', start: 0, end: 1, enabled: true }], fps: 30, style: DEFAULT_STYLE },
  fonts: [],
  musicSrc: null,
};

const Root: React.FC = () =>
  React.createElement(Composition<any, ReelProps>, {
    id: 'Reel',
    component: Reel,
    width: 1080,
    height: 1920,
    fps: 30,
    durationInFrames: 30,
    defaultProps: defaults,
    calculateMetadata: ({ props }) => ({ durationInFrames: reelDuration(props.project), fps: props.project.fps }),
  });

registerRoot(Root);
