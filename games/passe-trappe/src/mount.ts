import type { FederatedPointerEvent, Ticker } from 'pixi.js';
import { Rectangle } from 'pixi.js';
import {
  createExitButton,
  installOrientationLock,
  type GameContext,
  type GameInstance,
} from '@gambette/game-sdk';
import { createApp } from './core/App';
import { createPhysicsWorld } from './core/PhysicsWorld';
import { DEFAULT_PUCKS } from './config/dimensions';
import { createGameScene } from './scenes/GameScene';
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

    const scene = createGameScene({
      physics,
      pucksPerPlayer: DEFAULT_PUCKS,
      onWin: (winner) => {
        // L'écran de victoire a son propre « Quitter » : celui du SDK le chevaucherait.
        exit.setHidden(true);
        victory = createVictoryScene({
          winner,
          onReplay: () => {
            closeVictory();
            exit.setHidden(false);
            scene.reset();
          },
          onQuit: () => ctx.onExit(),
        });
        app.stage.addChild(victory.view);
      },
    });
    app.stage.addChild(scene.view);
    cleanups.push(() => scene.destroy());

    // Entrée multitouch : chaque pointeur (doigt) est routé par son pointerId.
    app.stage.eventMode = 'static';
    app.stage.hitArea = new Rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    const pos = (e: FederatedPointerEvent) => e.getLocalPosition(app.stage);
    // Pendant l'écran de victoire, les touchers n'atteignent pas le tir ; le relâchement reste
    // transmis pour libérer proprement un doigt encore posé.
    const down = (e: FederatedPointerEvent): void => {
      if (victory) return;
      scene.drag.pointerDown(e.pointerId, pos(e));
    };
    const move = (e: FederatedPointerEvent): void => {
      if (victory) return;
      scene.drag.pointerMove(e.pointerId, pos(e));
    };
    const up = (e: FederatedPointerEvent): void => scene.drag.pointerUp(e.pointerId);
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
      if (!victory) scene.tick(t.deltaMS);
    };
    app.ticker.add(onTick);
    cleanups.push(() => app.ticker.remove(onTick));
  } catch (e) {
    teardown();
    throw e;
  }

  return { unmount: teardown };
}
