import type { Container } from 'pixi.js';
import type { Scene } from './Scene';

export interface SceneManager {
  goTo(scene: Scene): void;
  openOverlay(scene: Scene): void;
  closeOverlay(): void;
  tick(deltaMs: number): void;
  destroy(): void;
}

interface State {
  current: Scene | null;
  overlay: Scene | null;
}

function replaceScene(state: State, stage: Container, next: Scene | null): void {
  if (state.current) {
    state.current.onExit();
    stage.removeChild(state.current.view);
    state.current.destroy();
  }
  state.current = next;
  if (next) {
    stage.addChild(next.view);
    next.onEnter();
  }
}

function openOverlay(state: State, stage: Container, scene: Scene): void {
  if (state.overlay) return;
  state.current?.pause();
  state.overlay = scene;
  stage.addChild(scene.view);
  scene.onEnter();
}

function closeOverlay(state: State, stage: Container): void {
  if (!state.overlay) return;
  state.overlay.onExit();
  stage.removeChild(state.overlay.view);
  state.overlay.destroy();
  state.overlay = null;
  state.current?.resume();
}

function tickScenes(state: State, delta: number): void {
  state.current?.onTick(delta);
  state.overlay?.onTick(delta);
}

export function createSceneManager(stage: Container): SceneManager {
  const state: State = { current: null, overlay: null };
  return {
    goTo: (scene) => replaceScene(state, stage, scene),
    openOverlay: (scene) => openOverlay(state, stage, scene),
    closeOverlay: () => closeOverlay(state, stage),
    tick: (delta) => tickScenes(state, delta),
    destroy: () => {
      closeOverlay(state, stage);
      replaceScene(state, stage, null);
    },
  };
}
