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
import { createGearButton } from './entities/GearButton';
import { loadSettings, saveSettings, settingsChanged } from './services/Settings';
import { createVictoryScene, type VictoryScene } from './scenes/VictoryScene';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from './config/dimensions';

export async function mountPasseTrappe(el: HTMLElement, ctx: GameContext): Promise<GameInstance> {
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

    let settings = loadSettings();
    let game: GameScene | null = null;
    const startGame = (): void => {
      game = createGameScene({
        physics,
        pucksPerPlayer: settings.pucksPerPlayer,
        pairs: settings.selectedPairs,
        onWin: (winner) => {
          // L'écran de victoire a son propre « Quitter » : celui du SDK le chevaucherait.
          exit.setHidden(true);
          victory = createVictoryScene({
            winner,
            onReplay: () => {
              closeVictory();
              exit.setHidden(false);
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
      exit.setHidden(true);
      game.drag.reset();
      panel = createSettingsScene({
        initial: settings,
        onOpenCalcsPicker: (current) => openCalcsPicker({ initial: current, container: el }),
        onClose: (next) => {
          closePanel();
          exit.setHidden(false);
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
    const gear = createGearButton(openSettings);
    app.stage.addChild(gear.view);
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
    const exit = createExitButton(el, () => ctx.onExit(), { placement: 'side' });
    cleanups.push(() => exit.dispose());

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
