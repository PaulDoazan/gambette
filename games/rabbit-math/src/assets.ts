import { Assets } from 'pixi.js';

// URLs résolues par Vite (chaînes littérales obligatoires) : les images sont
// embarquées dans le build de la plateforme comme dans le build standalone.
export const ASSET_URLS = {
  sun: new URL('../assets/sun.png', import.meta.url).href,
  cog: new URL('../assets/cog.png', import.meta.url).href,
  carrot: new URL('../assets/carot.png', import.meta.url).href,
  weapon: new URL('../assets/weapon.png', import.meta.url).href,
  tree4: new URL('../assets/tree4branches.png', import.meta.url).href,
  tree5: new URL('../assets/tree5branches.png', import.meta.url).href,
  tree6: new URL('../assets/tree6branches.png', import.meta.url).href,
  tree7: new URL('../assets/tree7branches.png', import.meta.url).href,
} as const;

export function preloadAssets(): Promise<unknown> {
  return Assets.load(Object.values(ASSET_URLS));
}
