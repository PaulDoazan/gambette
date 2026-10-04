import type { Ticker } from 'pixi.js';
import { createExitButton, type GameContext, type GameInstance } from '@gambette/game-sdk';
import { openCalcsPicker } from '@gambette/math-sdk';
import { createApp } from './core/App';
import { createPhysicsWorld, type PhysicsWorld } from './core/PhysicsWorld';
import { createSceneManager, type SceneManager } from './core/SceneManager';
import { createGameScene } from './scenes/GameScene';
import { createSettingsScene } from './scenes/SettingsScene';
import { loadSettings, saveSettings, type Settings } from './services/Settings';
import { installOrientationLock } from './ui/OrientationLock';
import { tickTweens, tweenGroup } from './entities/animations/Tween';
import { preloadAssets } from './assets';

interface Runtime {
  el: HTMLElement;
  sm: SceneManager;
  physics: PhysicsWorld;
  settings: { current: Settings };
}

// Même cible que le shell (useFullscreen) : l'état plein écran persiste hors du jeu.
const toggleFullscreen = (): void => {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen();
};

const openSettings = (rt: Runtime): void => {
  const scene = createSettingsScene({
    initial: rt.settings.current,
    onChange: (next) => {
      rt.settings.current = next;
      saveSettings(next);
    },
    onClose: (next, restart) => {
      rt.settings.current = next;
      saveSettings(next);
      rt.sm.closeOverlay();
      if (restart) startGame(rt);
    },
    onOpenCalcsPicker: (current) => openCalcsPicker({ initial: current, container: rt.el }),
  });
  rt.sm.openOverlay(scene);
};

const startGame = (rt: Runtime): void => {
  rt.sm.goTo(
    createGameScene({
      settings: rt.settings.current,
      physics: rt.physics,
      onOpenSettings: () => openSettings(rt),
      onSessionRestart: () => startGame(rt),
      onToggleFullscreen: toggleFullscreen,
    }),
  );
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
    const rt: Runtime = { el, sm, physics, settings };

    const disposeOrientation = installOrientationLock(el);
    cleanups.push(disposeOrientation);
    const exit = createExitButton(el, () => ctx.onExit(), { fullscreen: false });
    cleanups.push(() => exit.dispose());
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
