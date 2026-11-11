import { useEffect, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import type { FontEntry } from './types';

// Built-in fonts (all with Ukrainian glyphs), files live in public/fonts.
export const BUILTIN_FONTS: FontEntry[] = [
  { id: 'Unbounded', label: 'Unbounded', file: '/fonts/Unbounded.ttf', weights: [200, 900], kind: 'display' },
  { id: 'Montserrat', label: 'Montserrat', file: '/fonts/Montserrat.ttf', weights: [100, 900], italic: '/fonts/Montserrat-Italic.ttf', kind: 'sans' },
  { id: 'Inter Tight', label: 'Inter Tight', file: '/fonts/InterTight.ttf', weights: [100, 900], kind: 'sans' },
  { id: 'Rubik', label: 'Rubik', file: '/fonts/Rubik.ttf', weights: [300, 900], kind: 'sans' },
  { id: 'Manrope', label: 'Manrope', file: '/fonts/Manrope.ttf', weights: [200, 800], kind: 'sans' },
  { id: 'Onest', label: 'Onest', file: '/fonts/Onest.ttf', weights: [100, 900], kind: 'sans' },
  { id: 'Golos Text', label: 'Golos Text', file: '/fonts/GolosText.ttf', weights: [400, 900], kind: 'sans' },
  { id: 'Exo 2', label: 'Exo 2', file: '/fonts/Exo2.ttf', weights: [100, 900], italic: '/fonts/Exo2-Italic.ttf', kind: 'sans' },
  { id: 'Oswald', label: 'Oswald', file: '/fonts/Oswald.ttf', weights: [200, 700], kind: 'display' },
  { id: 'Alumni Sans', label: 'Alumni Sans (вузький)', file: '/fonts/AlumniSans.ttf', weights: [100, 900], italic: '/fonts/AlumniSans-Italic.ttf', kind: 'display' },
  { id: 'Roboto Condensed', label: 'Roboto Condensed', file: '/fonts/RobotoCondensed.ttf', weights: [100, 900], kind: 'sans' },
  { id: 'Playfair Display', label: 'Playfair Display', file: '/fonts/PlayfairDisplay.ttf', weights: [400, 900], italic: '/fonts/PlayfairDisplay-Italic.ttf', kind: 'serif' },
  { id: 'Lora', label: 'Lora', file: '/fonts/Lora.ttf', weights: [400, 700], kind: 'serif' },
  { id: 'Old Standard', label: 'Old Standard (журнальний)', file: '/fonts/OldStandard.ttf', weights: [400, 400], italic: '/fonts/OldStandard-Italic.ttf', kind: 'serif' },
  { id: 'Cormorant', label: 'Cormorant (люкс)', file: '/fonts/Cormorant.ttf', weights: [300, 700], italic: '/fonts/Cormorant-Italic.ttf', kind: 'serif' },
  { id: 'Yeseva One', label: 'Yeseva One', file: '/fonts/YesevaOne.ttf', weights: [400, 400], kind: 'serif' },
  { id: 'Tenor Sans', label: 'Tenor Sans', file: '/fonts/TenorSans.ttf', weights: [400, 400], kind: 'sans' },
  { id: 'Raleway', label: 'Raleway', file: '/fonts/Raleway.ttf', weights: [100, 900], kind: 'sans' },
  { id: 'Nunito', label: 'Nunito', file: '/fonts/Nunito.ttf', weights: [200, 1000], kind: 'sans' },
  { id: 'Comfortaa', label: 'Comfortaa', file: '/fonts/Comfortaa.ttf', weights: [300, 700], kind: 'sans' },
  { id: 'IBM Plex Sans', label: 'IBM Plex Sans', file: '/fonts/IBMPlexSans.ttf', weights: [100, 700], kind: 'sans' },
  { id: 'JetBrains Mono', label: 'JetBrains Mono', file: '/fonts/JetBrainsMono.ttf', weights: [100, 800], kind: 'mono' },
  { id: 'PT Mono', label: 'PT Mono (машинка)', file: '/fonts/PTMono.ttf', weights: [400, 400], kind: 'mono' },
  { id: 'Press Start 2P', label: 'Press Start (піксельний)', file: '/fonts/PressStart2P.ttf', weights: [400, 400], kind: 'display' },
  { id: 'Russo One', label: 'Russo One', file: '/fonts/RussoOne.ttf', weights: [400, 400], kind: 'display' },
  { id: 'Dela Gothic One', label: 'Dela Gothic One', file: '/fonts/DelaGothicOne.ttf', weights: [400, 400], kind: 'display' },
  { id: 'Caveat', label: 'Caveat (рукописний)', file: '/fonts/Caveat.ttf', weights: [400, 700], kind: 'script' },
  { id: 'Neucha', label: 'Neucha (маркер)', file: '/fonts/Neucha.ttf', weights: [400, 400], kind: 'script' },
  { id: 'Amatic SC', label: 'Amatic SC (від руки)', file: '/fonts/AmaticSC.ttf', weights: [700, 700], kind: 'script' },
  { id: 'Bad Script', label: 'Bad Script (каліграфія)', file: '/fonts/BadScript.ttf', weights: [400, 400], kind: 'script' },
  { id: 'Marck Script', label: 'Marck Script (каліграфія)', file: '/fonts/MarckScript.ttf', weights: [400, 400], kind: 'script' },
  { id: 'Pacifico', label: 'Pacifico (пензель)', file: '/fonts/Pacifico.ttf', weights: [400, 400], kind: 'script' },
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

export type FontNeed = { family: string | null | undefined; italic?: boolean };

// Loads the families a frame needs (captions, accent font, headline) before the frame is captured.
export const useFonts = (fonts: FontEntry[], needs: FontNeed[]) => {
  const [ready, setReady] = useState(false);
  const key = needs.map((n) => `${n.family}|${n.italic ? 1 : 0}`).join(',');
  useEffect(() => {
    const jobs: Promise<void>[] = [];
    for (const n of needs) {
      if (!n.family) continue;
      const f = fonts.find((x) => x.id === n.family);
      if (!f) continue;
      jobs.push(load(f.id, f.file, f.weights, 'normal'));
      if (n.italic && f.italic) jobs.push(load(f.id, f.italic, f.weights, 'italic'));
    }
    if (!jobs.length) { setReady(true); return; }
    const handle = delayRender(`fonts ${key}`, { timeoutInMilliseconds: 60000 });
    Promise.all(jobs).then(() => { setReady(true); continueRender(handle); });
  }, [fonts, key]);
  return ready;
};

// kept for older imports
export const useFont = (fonts: FontEntry[], family: string, italic: boolean) => useFonts(fonts, [{ family, italic }]);
