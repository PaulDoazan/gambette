import { describe, it, expect, beforeEach } from 'vitest';
import { Container } from 'pixi.js';
import { createSceneManager } from '../../src/core/SceneManager';
import type { Scene } from '../../src/core/Scene';

const fakeScene = (id: string): Scene & { calls: string[] } => {
  const calls: string[] = [];
  const view = new Container();
  return {
    id,
    view,
    calls,
    onEnter: () => calls.push('enter'),
    onExit: () => calls.push('exit'),
    onTick: () => calls.push('tick'),
    pause: () => calls.push('pause'),
    resume: () => calls.push('resume'),
    destroy: () => calls.push('destroy'),
  };
};

let stage: Container;
beforeEach(() => {
  stage = new Container();
});

describe('SceneManager goTo', () => {
  it('enters the new scene and adds its view to the stage', () => {
    const m = createSceneManager(stage);
    const s = fakeScene('game');
    m.goTo(s);
    expect(s.calls).toContain('enter');
    expect(stage.children).toContain(s.view);
  });

  it('replaces the previous scene (exit + destroy)', () => {
    const m = createSceneManager(stage);
    const a = fakeScene('a');
    const b = fakeScene('b');
    m.goTo(a);
    m.goTo(b);
    expect(a.calls).toContain('exit');
    expect(a.calls).toContain('destroy');
    expect(stage.children).not.toContain(a.view);
    expect(stage.children).toContain(b.view);
  });
});

describe('SceneManager openOverlay', () => {
  it('pauses the current scene and adds the overlay above', () => {
    const m = createSceneManager(stage);
    const game = fakeScene('game');
    const settings = fakeScene('settings');
    m.goTo(game);
    m.openOverlay(settings);
    expect(game.calls).toContain('pause');
    expect(settings.calls).toContain('enter');
    expect(stage.children).toContain(settings.view);
    expect(stage.children).toContain(game.view);
  });
});

describe('SceneManager closeOverlay', () => {
  it('resumes the underlying scene and removes overlay view', () => {
    const m = createSceneManager(stage);
    const game = fakeScene('game');
    const settings = fakeScene('settings');
    m.goTo(game);
    m.openOverlay(settings);
    m.closeOverlay();
    expect(settings.calls).toContain('exit');
    expect(game.calls).toContain('resume');
    expect(stage.children).not.toContain(settings.view);
  });
});

describe('SceneManager tick', () => {
  it('forwards tick to the active scene (and the overlay if present)', () => {
    const m = createSceneManager(stage);
    const game = fakeScene('game');
    const settings = fakeScene('settings');
    m.goTo(game);
    m.tick(16);
    expect(game.calls.filter((c) => c === 'tick')).toHaveLength(1);
    m.openOverlay(settings);
    m.tick(16);
    expect(settings.calls.filter((c) => c === 'tick')).toHaveLength(1);
  });
});
