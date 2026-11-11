import { useEffect, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import type { FontEntry } from './types';

// Built-in fonts (all with Ukrainian glyphs), files live in public/fonts.
export const BUILTIN_FONTS: FontEntry[] = [
  { id: 'Unbounded', label: 'Unbounded', file: '/fonts/Unbounded.ttf', weights: [200, 900] },
  { id: 'Montserrat', label: 'Montserrat', file: '/fonts/Montserrat.ttf', weights: [100, 900], italic: '/fonts/Montserrat-Italic.ttf' },
  { id: 'Inter Tight', label: 'Inter Tight', file: '/fonts/InterTight.ttf', weights: [100, 900] },
  { id: 'Rubik', label: 'Rubik', file: '/fonts/Rubik.ttf', weights: [300, 900] },
  { id: 'Manrope', label: 'Manrope', file: '/fonts/Manrope.ttf', weights: [200, 800] },
  { id: 'Onest', label: 'Onest', file: '/fonts/Onest.ttf', weights: [100, 900] },
  { id: 'Golos Text', label: 'Golos Text', file: '/fonts/GolosText.ttf', weights: [400, 900] },
  { id: 'Exo 2', label: 'Exo 2', file: '/fonts/Exo2.ttf', weights: [100, 900], italic: '/fonts/Exo2-Italic.ttf' },
  { id: 'Oswald', label: 'Oswald', file: '/fonts/Oswald.ttf', weights: [200, 700] },
  { id: 'Roboto Condensed', label: 'Roboto Condensed', file: '/fonts/RobotoCondensed.ttf', weights: [100, 900] },
  { id: 'Playfair Display', label: 'Playfair Display', file: '/fonts/PlayfairDisplay.ttf', weights: [400, 900], italic: '/fonts/PlayfairDisplay-Italic.ttf' },
  { id: 'Lora', label: 'Lora', file: '/fonts/Lora.ttf', weights: [400, 700] },
  { id: 'Raleway', label: 'Raleway', file: '/fonts/Raleway.ttf', weights: [100, 900] },
  { id: 'Nunito', label: 'Nunito', file: '/fonts/Nunito.ttf', weights: [200, 1000] },
  { id: 'Comfortaa', label: 'Comfortaa', file: '/fonts/Comfortaa.ttf', weights: [300, 700] },
  { id: 'IBM Plex Sans', label: 'IBM Plex Sans', file: '/fonts/IBMPlexSans.ttf', weights: [100, 700] },
  { id: 'JetBrains Mono', label: 'JetBrains Mono', file: '/fonts/JetBrainsMono.ttf', weights: [100, 800] },
  { id: 'Russo One', label: 'Russo One', file: '/fonts/RussoOne.ttf', weights: [400, 400] },
  { id: 'Dela Gothic One', label: 'Dela Gothic One', file: '/fonts/DelaGothicOne.ttf', weights: [400, 400] },
  { id: 'Caveat', label: 'Caveat (рукописний)', file: '/fonts/Caveat.ttf', weights: [400, 700] },
];

const loaded = new Map<string, Promise<void>>();

const load = (family: string, url: string, weights: [number, number], style: 'normal' | 'italic') => {
  const key = `${family}|${style}|${url}`;
  if (!loaded.has(key)) {
    const face = new FontFace(family, `url("${url}")`, { weight: `${weights[0]} ${weights[1]}`, style });
    loaded.set(key, face.load().then((f) => { document.fonts.add(f); }).catch((e) => { console.warn('font failed', url, e); }));
  }
  return loaded.get(key)!;
};

// Loads one family (and its italic) before the frame is captured.
export const useFont = (fonts: FontEntry[], family: string, italic: boolean) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const f = fonts.find((x) => x.id === family) ?? fonts[0];
    if (!f) { setReady(true); return; }
    const handle = delayRender(`font ${family}`, { timeoutInMilliseconds: 60000 });
    const jobs = [load(f.id, f.file, f.weights, 'normal')];
    if (italic && f.italic) jobs.push(load(f.id, f.italic, f.weights, 'italic'));
    Promise.all(jobs).then(() => { setReady(true); continueRender(handle); });
  }, [fonts, family, italic]);
  return ready;
};
