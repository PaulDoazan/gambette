import type { FederatedPointerEvent, Ticker } from 'pixi.js';
import { Rectangle } from 'pixi.js';
import {
  createExitButton,
  installOrientationLock,
  type GameContext,
  type GameInstance,
} from '@gambette/game-sdk';
import { openCalcsPicker } from '@gambette/math-sdk';
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

/** Engrenage (Material Design Icons « cog »), cadré sur sa forme pour remplir le bouton. */
const GEAR_ICON =
  '<svg viewBox="2 2 20 20" width="40" height="40" fill="currentColor" aria-hidden="true">' +
  '<path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 ' +
  '12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37' +
  'C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05' +
  'C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42' +
  'L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73' +
  'C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 ' +
  '4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 ' +
  '4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14' +
  'C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95' +
  'C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63' +
  'L19.43,12.97Z"/></svg>';

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
        pairs: settings.selectedPairs,
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
        onOpenCalcsPicker: (current) => openCalcsPicker({ initial: current, container: el }),
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
    // Engrenage : icône seule (ni fond ni contour), à la hauteur de la cloison. SVG plutôt qu'un
    // caractère : centrage vertical exact, quelle que soit la police.
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
