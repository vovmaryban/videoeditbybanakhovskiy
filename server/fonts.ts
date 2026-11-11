import fs from 'node:fs';
import path from 'node:path';
import type { FontEntry } from '../src/remotion/types';
import { USER_FONTS } from './paths';

// Fonts the user uploaded: data/fonts/<Family Name>.ttf|otf|woff2
export const userFonts = (): FontEntry[] =>
  fs.readdirSync(USER_FONTS)
    .filter((f) => /\.(ttf|otf|woff2?)$/i.test(f))
    .map((f) => {
      const id = path.parse(f).name;
      return { id, label: `${id} (мій)`, file: `/user-fonts/${encodeURIComponent(f)}`, weights: [100, 900] as [number, number], user: true };
    });
