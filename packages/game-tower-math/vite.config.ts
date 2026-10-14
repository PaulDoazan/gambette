import { defineConfig } from 'vite';

// Build standalone (jouer hors plateforme). La plateforme consomme src/ directement.
export default defineConfig({
  base: './',
  server: { port: 5175 },
  build: { outDir: 'dist', emptyOutDir: true },
});
