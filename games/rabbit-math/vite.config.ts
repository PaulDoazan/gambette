import { defineConfig } from 'vite';

// Build standalone (jouer hors plateforme). La plateforme consomme src/ directement.
export default defineConfig({
  base: './',
  resolve: { alias: { '@': '/src' } },
  server: { port: 5101, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true },
});
