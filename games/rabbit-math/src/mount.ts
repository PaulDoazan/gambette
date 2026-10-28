import type { Ticker } from 'pixi.js';
import {
  ROUND_BUTTON_CSS,
  createExitButton,
  installOrientationLock,
  type GameContext,
  type GameInstance,
} from '@gambette/game-sdk';
import { openCalcsPicker } from '@gambette/math-sdk';
import { createApp } from './core/App';
import { createPhysicsWorld, type PhysicsWorld } from './core/PhysicsWorld';
import { createSceneManager, type SceneManager } from './core/SceneManager';
import { createGameScene } from './scenes/GameScene';
import { createSettingsScene } from './scenes/SettingsScene';
import { loadSettings, saveSettings, settingsChanged, type Settings } from './services/Settings';
import { tickTweens, tweenGroup } from './entities/animations/Tween';
import { preloadAssets } from './assets';

/**
 * Délai avant de réafficher les boutons quand les réglages se ferment : le « click » que le
 * navigateur émet après le tap sur « Fermer » ne doit pas tomber sur ces boutons.
 */
export const BUTTONS_REVEAL_DELAY_MS = 400;

/** Engrenage au trait fin (Lucide « settings »), comme passe-trappe et math-river. */
const GEAR_ICON =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08' +
  'a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74' +
  'l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 ' +
  '1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08' +
  'a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74' +
  'l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25' +
  'a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>';

interface Runtime {
  el: HTMLElement;
  sm: SceneManager;
  physics: PhysicsWorld;
  settings: { current: Settings };
  hideButtons(): void;
  revealButtonsSoon(): void;
}

const openSettings = (rt: Runtime): void => {
  rt.hideButtons();
  const scene = createSettingsScene({
    initial: rt.settings.current,
    onOpenCalcsPicker: (current) => openCalcsPicker({ initial: current, container: rt.el }),
    onClose: (next) => {
      rt.sm.closeOverlay();
      rt.revealButtonsSoon();
      if (!settingsChanged(rt.settings.current, next)) return;
      rt.settings.current = next;
      saveSettings(next);
      startGame(rt);
    },
  });
  rt.sm.openOverlay(scene);
};

const startGame = (rt: Runtime): void => {
  rt.sm.goTo(
    createGameScene({
      settings: rt.settings.current,
      physics: rt.physics,
      onSessionRestart: () => startGame(rt),
    }),
  );
};

/**
 * Colonne de boutons ronds en haut à gauche (le lance-pierre occupe le bas), sur un bandeau
 * navy comme math-river : la croix Quitter (SDK), puis plein écran et engrenage.
 */
const installButtons = (
  el: HTMLElement,
  onExit: () => void,
  onSettings: () => void,
): { setHidden(hidden: boolean): void; dispose(): void } => {
  const band = document.createElement('div');
  band.dataset.test = 'rabbit-math-buttons';
  band.style.cssText =
    'position:absolute;left:0;top:12px;z-index:6;' +
    'display:flex;flex-direction:column;align-items:center;gap:12px;padding:12px;' +
    'background:#00274b;border-radius:0 20px 20px 0;';
  const below = document.createElement('div');
  below.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:12px;';
  el.append(band);
  const exit = createExitButton(band, onExit, {
    placement: 'inline',
    iconOnly: true,
    fullscreenParent: below,
  });
  const gear = document.createElement('button');
  gear.dataset.test = 'rabbit-math-settings';
  gear.type = 'button';
  gear.innerHTML = GEAR_ICON;
  gear.setAttribute('aria-label', 'Choisir les réglages');
  gear.title = 'Choisir les réglages';
  // Même bouton rond que la croix et le plein écran du SDK.
  gear.style.cssText = ROUND_BUTTON_CSS;
  gear.addEventListener('click', onSettings);
  band.appendChild(below);
  below.appendChild(gear);
  // La confirmation « Quitter la partie ? » est plus haute que le bouton : elle recouvrirait les
  // boutons du dessous, masqués le temps de la confirmation.
  const onExitUi = (e: Event): void => {
    const t = (e.target as HTMLElement | null)?.closest('[data-test]')?.getAttribute('data-test');
    if (t === 'game-exit') below.style.visibility = 'hidden';
    if (t === 'game-exit-cancel') below.style.visibility = '';
  };
  el.addEventListener('click', onExitUi);
  return {
    setHidden: (hidden) => {
      exit.setHidden(hidden);
      band.style.display = hidden ? 'none' : 'flex';
      below.style.display = hidden ? 'none' : 'flex';
      below.style.visibility = '';
    },
    dispose: () => {
      el.removeEventListener('click', onExitUi);
      exit.dispose();
      band.remove();
    },
  };
};

export async function mountRabbitMath(el: HTMLElement, ctx: GameContext): Promise<GameInstance> {
  await preloadAssets();
  const app = await createApp(el);
  // Tout ce qui est installé après createApp : libéré dans l'ordre inverse, au unmount comme sur échec.
  const cleanups: Array<() => void> = [() => app.destroy()];
  const teardown = (): void => {
    while (cleanups.length > 0) cleanups.pop()!();
    // Sélecteur de calculs éventuellement ouvert (sa promesse ne résoudra jamais : sans effet).
    el.querySelectorAll('.cp-overlay').forEach((n) => n.remove());
  };

  try {
    const physics = createPhysicsWorld();
    cleanups.push(() => physics.destroy());
    const sm = createSceneManager(app.stage);
    cleanups.push(() => sm.destroy());
    const settings = { current: loadSettings() };
    saveSettings(settings.current);

    const disposeOrientation = installOrientationLock(el, 'landscape');
    cleanups.push(disposeOrientation);
    const buttons = installButtons(
      el,
      () => ctx.onExit(),
      () => openSettings(rt),
    );
    let revealTimer: ReturnType<typeof setTimeout> | undefined;
    cleanups.push(() => {
      clearTimeout(revealTimer);
      buttons.dispose();
    });
    const rt: Runtime = {
      el,
      sm,
      physics,
      settings,
      hideButtons: () => {
        clearTimeout(revealTimer);
        buttons.setHidden(true);
      },
      revealButtonsSoon: () => {
        clearTimeout(revealTimer);
        revealTimer = setTimeout(() => buttons.setHidden(false), BUTTONS_REVEAL_DELAY_MS);
      },
    };
    const onTick = (t: Ticker): void => {
      physics.step(t.deltaMS);
      sm.tick(t.deltaMS);
      tickTweens(performance.now());
    };
    app.ticker.add(onTick);
    cleanups.push(() => {
      app.ticker.remove(onTick);
      tweenGroup.removeAll();
    });
    startGame(rt);
  } catch (e) {
    teardown();
    throw e;
  }

  return { unmount: teardown };
}
