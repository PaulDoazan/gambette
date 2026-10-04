const OVERLAY_CSS = `
  position: fixed; inset: 0; background: #111; color: #fff8e5;
  display: none; align-items: center; justify-content: center;
  font-family: ui-rounded, system-ui, sans-serif; font-size: 22px;
  z-index: 9999; text-align: center;
`;

const createOverlayElement = (): HTMLDivElement => {
  const overlay = document.createElement('div');
  overlay.style.cssText = OVERLAY_CSS;
  overlay.textContent = 'Tourne ton téléphone pour jouer 🔄';
  return overlay;
};

const installResizeWatcher = (overlay: HTMLDivElement): void => {
  const update = (): void => {
    const portrait = window.innerHeight > window.innerWidth;
    overlay.style.display = portrait ? 'flex' : 'none';
  };
  update();
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
};

export function installOrientationLock(parent: HTMLElement): void {
  const overlay = createOverlayElement();
  parent.appendChild(overlay);
  installResizeWatcher(overlay);
}
