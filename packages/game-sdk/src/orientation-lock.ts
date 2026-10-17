export type Orientation = 'landscape' | 'portrait';

const MESSAGES: Record<Orientation, string> = {
  landscape: 'Tourne ton téléphone pour jouer 🔄',
  portrait: 'Tourne ton téléphone à la verticale pour jouer 🔄',
};

const OVERLAY_CSS = `
  position: fixed; inset: 0; background: #111; color: #fff8e5;
  display: none; align-items: center; justify-content: center;
  font-family: ui-rounded, system-ui, sans-serif; font-size: 22px;
  z-index: 9999; text-align: center; padding: 24px;
`;

/**
 * Overlay plein écran demandant de tourner le téléphone quand l'orientation
 * courante ne convient pas au jeu. Retourne une fonction qui retire l'overlay
 * et ses écouteurs.
 */
export function installOrientationLock(parent: HTMLElement, required: Orientation): () => void {
  const overlay = document.createElement('div');
  overlay.style.cssText = OVERLAY_CSS;
  overlay.textContent = MESSAGES[required];
  parent.appendChild(overlay);

  const update = (): void => {
    const portrait = window.innerHeight > window.innerWidth;
    const wrong = required === 'landscape' ? portrait : !portrait;
    overlay.style.display = wrong ? 'flex' : 'none';
  };
  update();
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
  return () => {
    window.removeEventListener('resize', update);
    window.removeEventListener('orientationchange', update);
    overlay.remove();
  };
}
