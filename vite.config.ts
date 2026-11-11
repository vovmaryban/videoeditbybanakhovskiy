import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API = `http://localhost:${process.env.STUDIO_PORT ?? 4610}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // user data, whisper binaries and renders change while the studio runs: watching them crashes Vite on Windows (EBUSY)
    watch: { ignored: ['**/data/**', '**/tools/**', '**/dist/**'] },
    proxy: {
      '/api': API,
      '/media': API,
      '/user-fonts': API,
    },
  },
  build: { outDir: 'dist', chunkSizeWarningLimit: 4000 },
});
