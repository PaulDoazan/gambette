import type { FederatedPointerEvent, Ticker } from 'pixi.js';
import { Rectangle } from 'pixi.js';
import {
  createExitButton,
  installOrientationLock,
  type GameContext,
  type GameInstance,
} from '@gambette/game-sdk';
import { openCalcsPicker, pairsOf } from '@gambette/math-sdk';
import { createApp } from './core/App';
import { createPhysicsWorld } from './core/PhysicsWorld';
import { createGameScene, type GameScene } from './scenes/GameScene';
import { createSettingsScene, type SettingsScene } from './scenes/SettingsScene';
import { loadSettings, saveSettings, settingsChanged } from './services/Settings';
import { createVictoryScene, type VictoryScene } from './scenes/VictoryScene';
import { DESIGN_HEIGHT, DESIGN_WIDTH, boardHeightFor, configureBoard } from './config/dimensions';

/**
 * Délai avant de réafficher les boutons du SDK (quitter, plein écran) quand un écran en
 * surimpression se ferme : le « click » que le navigateur émet après le tap sur « Rejouer » ou
 * « Fermer » ne doit pas tomber sur ces boutons, qui réapparaissent au même endroit.
 */
export const EXIT_REVEAL_DELAY_MS = 400;

/**
 * Engrenage au trait fin (Lucide « settings »), dans le style de l'icône plein écran du SDK :
 * dessin centré dans son cadre, donc centré verticalement sur la cloison.
 */
const GEAR_ICON =
  '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08' +
  'a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74' +
  'l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 ' +
  '1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08' +
  'a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74' +
  'l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25' +
  'a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>';

export async function mountPasseTrappe(el: HTMLElement, ctx: GameContext): Promise<GameInstance> {
  // Plateau en pleine hauteur : sa hauteur logique suit les proportions de l'écran, fixée au
  // montage (un redimensionnement ultérieur ne fait que remettre à l'échelle).
  const w = el.clientWidth || window.innerWidth;
  const h = el.clientHeight || window.innerHeight;
  const boardHeight = boardHeightFor(w, h);
  configureBoard(boardHeight, Math.min(w / DESIGN_WIDTH, h / boardHeight));
  const app = await createApp(el);
  // Tout ce qui est installé après createApp : libéré dans l'ordre inverse, au unmount comme sur échec.
  const cleanups: Array<() => void> = [() => app.destroy()];
  const teardown = (): void => {
    while (cleanups.length > 0) cleanups.pop()!();
  };

  try {
    const physics = createPhysicsWorld();
    cleanups.push(() => physics.destroy());
    let victory: VictoryScene | null = null;
    const closeVictory = (): void => {
      victory?.destroy();
      victory = null;
    };
    cleanups.push(closeVictory);

    // Boutons du SDK masqués pendant un écran en surimpression, réaffichés après la fin du geste.
    let revealTimer: ReturnType<typeof setTimeout> | undefined;
    const setButtonsHidden = (hidden: boolean): void => {
      exit.setHidden(hidden);
      rightButtons.style.display = hidden ? 'none' : 'flex';
    };
    const hideExit = (): void => {
      clearTimeout(revealTimer);
      setButtonsHidden(true);
    };
    const revealExitSoon = (): void => {
      clearTimeout(revealTimer);
      revealTimer = setTimeout(() => setButtonsHidden(false), EXIT_REVEAL_DELAY_MS);
    };

    let settings = loadSettings();
    let game: GameScene | null = null;
    const startGame = (): void => {
      game = createGameScene({
        physics,
        pucksPerPlayer: settings.pucksPerPlayer,
        pairs: pairsOf(settings.calcs),
        onWin: (winner) => {
          // L'écran de victoire a son propre « Quitter » : celui du SDK le chevaucherait.
          hideExit();
          victory = createVictoryScene({
            winner,
            onReplay: () => {
              closeVictory();
              revealExitSoon();
              game?.reset();
            },
            onQuit: () => ctx.onExit(),
          });
          app.stage.addChild(victory.view);
        },
      });
      // Sous l'engrenage et les écrans.
      app.stage.addChildAt(game.view, 0);
    };
    const stopGame = (): void => {
      if (!game) return;
      const g = game;
      game = null;
      g.destroy();
      g.view.parent?.removeChild(g.view);
    };
    startGame();
    cleanups.push(stopGame);

    let panel: SettingsScene | null = null;
    const closePanel = (): void => {
      if (!panel) return;
      app.stage.removeChild(panel.view);
      panel.destroy();
      panel = null;
    };
    const openSettings = (): void => {
      if (victory || panel || !game) return;
      hideExit();
      game.drag.reset();
      panel = createSettingsScene({
        initial: settings,
        onOpenCalcsPicker: (current, title) =>
          openCalcsPicker({ initial: current, container: el, title }),
        onClose: (next) => {
          closePanel();
          revealExitSoon();
          if (settingsChanged(settings, next)) {
            saveSettings(next);
            settings = next;
            stopGame();
            startGame();
          }
        },
      });
      app.stage.addChild(panel.view);
    };
    // Groupe de droite sur la cloison (en miroir de « Quitter ») : plein écran puis engrenage.
    const rightButtons = document.createElement('div');
    rightButtons.style.cssText =
      'position:absolute;top:50%;right:12px;transform:translateY(-50%);z-index:6;' +
      'display:flex;align-items:center;gap:8px;';
    // Engrenage : icône au trait fin, sans fond, dans un bouton de la hauteur de la cloison. SVG
    // plutôt que le caractère ⚙ : centrage vertical exact, quelle que soit la police.
    const gear = document.createElement('button');
    gear.dataset.test = 'passe-trappe-settings';
    gear.type = 'button';
    gear.innerHTML = GEAR_ICON;
    gear.setAttribute('aria-label', 'Choisir les réglages');
    gear.title = 'Choisir les réglages';
    gear.style.cssText =
      'display:flex;align-items:center;justify-content:center;width:40px;height:40px;padding:0;' +
      'border:none;border-radius:999px;cursor:pointer;background-color:transparent;color:#fff;';
    gear.addEventListener('click', openSettings);
    rightButtons.appendChild(gear);
    el.appendChild(rightButtons);
    cleanups.push(() => rightButtons.remove());
    cleanups.push(() => {
      closePanel();
      el.querySelector('.cp-overlay')?.remove();
    });

    // Entrée multitouch : chaque pointeur (doigt) est routé par son pointerId.
    app.stage.eventMode = 'static';
    app.stage.hitArea = new Rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    const pos = (e: FederatedPointerEvent) => e.getLocalPosition(app.stage);
    // Pendant l'écran de victoire, les touchers n'atteignent pas le tir ; le relâchement reste
    // transmis pour libérer proprement un doigt encore posé.
    const down = (e: FederatedPointerEvent): void => {
      if (victory || panel) return;
      game?.drag.pointerDown(e.pointerId, pos(e));
    };
    const move = (e: FederatedPointerEvent): void => {
      if (victory || panel) return;
      game?.drag.pointerMove(e.pointerId, pos(e));
    };
    const up = (e: FederatedPointerEvent): void => game?.drag.pointerUp(e.pointerId);
    app.stage.on('pointerdown', down);
    app.stage.on('globalpointermove', move);
    app.stage.on('pointerup', up);
    app.stage.on('pointerupoutside', up);
    app.stage.on('pointercancel', up);
    cleanups.push(() => app.stage.removeAllListeners());

    cleanups.push(installOrientationLock(el, 'portrait'));
    const exit = createExitButton(el, () => ctx.onExit(), {
      placement: 'side',
      fullscreenParent: rightButtons,
    });
    rightButtons.appendChild(gear); // le plein écran (ajouté par le SDK) passe avant l'engrenage
    cleanups.push(() => exit.dispose());
    cleanups.push(() => clearTimeout(revealTimer));

    const onTick = (t: Ticker): void => {
      if (!victory && !panel) game?.tick(t.deltaMS);
    };
    app.ticker.add(onTick);
    cleanups.push(() => app.ticker.remove(onTick));
  } catch (e) {
    teardown();
    throw e;
  }

  return { unmount: teardown };
}
