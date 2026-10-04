export interface ExitButton {
  dispose(): void;
}

// Préfixes WebKit (Safari) pour l'API Fullscreen, absents des types DOM standard.
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type FsDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};

const ICON_ENTER =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"/></svg>';
const ICON_EXIT =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3m13-5h-3a2 2 0 0 0-2 2v3"/></svg>';

/** Mobile = pointeur grossier (tactile) ; fallback sur la présence du tactile. */
function isMobile(): boolean {
  return window.matchMedia?.('(pointer: coarse)')?.matches ?? 'ontouchstart' in window;
}

/** L'API Fullscreen est-elle réellement utilisable sur cet élément ? (faux sur iPhone/Safari). */
function fullscreenAvailable(el: FsElement): boolean {
  return (
    typeof el.requestFullscreen === 'function' || typeof el.webkitRequestFullscreen === 'function'
  );
}

/**
 * Bouton « ✕ Quitter » commun aux jeux (tout en haut, centré) : un clic le
 * remplace par une confirmation (« Quitter la partie ? » + Annuler / Quitter)
 * pour éviter les sorties accidentelles. `onExit` n'est appelé qu'à la
 * confirmation. Sur mobile (et si l'API Fullscreen est disponible), un bouton
 * plein écran apparaît juste à côté et bascule l'affichage du jeu.
 * `opts.fullscreen: false` désactive ce bouton (jeu qui fournit le sien).
 * `opts.placement: 'side'` place le bouton sur le bord gauche, centré
 * verticalement (jeux dont le haut d'écran est une zone de jeu).
 */
export function createExitButton(
  parent: HTMLElement,
  onExit: () => void,
  opts: { fullscreen?: boolean; placement?: 'top' | 'side' } = {},
): ExitButton {
  const wrap = document.createElement('div');
  const position =
    (opts.placement ?? 'top') === 'side'
      ? 'position:absolute;left:12px;top:50%;transform:translateY(-50%);'
      : 'position:absolute;top:12px;left:50%;transform:translateX(-50%);';
  wrap.style.cssText = position + 'z-index:6;display:flex;align-items:center;gap:8px;';

  const exit = document.createElement('button');
  exit.dataset.test = 'game-exit';
  exit.textContent = '✕ Quitter';
  exit.style.cssText =
    'padding:6px 16px;border:1px solid rgba(255,255,255,0.4);border-radius:999px;' +
    'cursor:pointer;font:600 13px system-ui,sans-serif;background:rgba(255,255,255,0.12);color:#fff;';

  // Phrase au-dessus, les deux sous-boutons en dessous.
  const confirm = document.createElement('div');
  confirm.dataset.test = 'game-exit-confirm-panel';
  confirm.style.cssText =
    'display:none;flex-direction:column;align-items:center;gap:8px;padding:10px 16px;' +
    'border-radius:16px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.4);' +
    'font:600 13px system-ui,sans-serif;color:#fff;';
  const question = document.createElement('span');
  question.textContent = 'Quitter la partie ?';
  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;align-items:center;gap:8px;';
  const smallBtnCss =
    'padding:4px 12px;border:none;border-radius:999px;cursor:pointer;' +
    'font:600 12px system-ui,sans-serif;';
  const cancel = document.createElement('button');
  cancel.dataset.test = 'game-exit-cancel';
  cancel.textContent = 'Annuler';
  cancel.style.cssText = smallBtnCss + 'background:rgba(255,255,255,0.25);color:#fff;';
  const go = document.createElement('button');
  go.dataset.test = 'game-exit-go';
  go.textContent = 'Quitter';
  go.style.cssText = smallBtnCss + 'background:#FF7D6D;color:#00274B;';
  actions.append(cancel, go);
  confirm.append(question, actions);
  wrap.append(exit, confirm);

  const setConfirm = (visible: boolean): void => {
    exit.style.display = visible ? 'none' : '';
    confirm.style.display = visible ? 'flex' : 'none';
  };
  exit.addEventListener('click', () => setConfirm(true));
  cancel.addEventListener('click', () => setConfirm(false));
  go.addEventListener('click', () => onExit());

  // Bouton plein écran : mobile uniquement, et seulement si l'API est dispo.
  // On cible la racine du document (et non le conteneur du jeu) : ainsi le plein
  // écran PERSISTE quand le jeu est démonté (retour au briefing et
  // aux autres écrans de l'app), au lieu d'être annulé avec son élément.
  let detachFullscreen: (() => void) | null = null;
  const target = document.documentElement as FsElement;
  if ((opts.fullscreen ?? true) && isMobile() && fullscreenAvailable(target)) {
    const doc = document as FsDocument;
    const fsBtn = document.createElement('button');
    fsBtn.dataset.test = 'game-fullscreen';
    fsBtn.type = 'button';
    fsBtn.style.cssText =
      'display:flex;align-items:center;justify-content:center;width:34px;height:34px;padding:0;' +
      'border:1px solid rgba(255,255,255,0.4);border-radius:999px;cursor:pointer;' +
      'background:rgba(255,255,255,0.12);color:#fff;';

    const isFullscreen = (): boolean =>
      (doc.fullscreenElement ?? doc.webkitFullscreenElement) != null;
    const sync = (): void => {
      const active = isFullscreen();
      fsBtn.innerHTML = active ? ICON_EXIT : ICON_ENTER;
      fsBtn.setAttribute('aria-label', active ? 'Quitter le plein écran' : 'Plein écran');
      fsBtn.title = active ? 'Quitter le plein écran' : 'Plein écran';
    };
    sync();

    fsBtn.addEventListener('click', () => {
      const op = isFullscreen()
        ? (doc.exitFullscreen ?? doc.webkitExitFullscreen)?.call(doc)
        : (target.requestFullscreen ?? target.webkitRequestFullscreen)?.call(target);
      // Une promesse rejetée (geste utilisateur refusé, etc.) ne doit pas remonter.
      if (op && typeof (op as Promise<void>).then === 'function')
        (op as Promise<void>).catch(() => {});
    });

    doc.addEventListener('fullscreenchange', sync);
    doc.addEventListener('webkitfullscreenchange', sync);
    detachFullscreen = (): void => {
      doc.removeEventListener('fullscreenchange', sync);
      doc.removeEventListener('webkitfullscreenchange', sync);
    };

    // Juste à côté du bouton quitter.
    wrap.insertBefore(fsBtn, confirm);
  }

  parent.appendChild(wrap);

  return {
    dispose(): void {
      detachFullscreen?.();
      wrap.remove();
    },
  };
}
