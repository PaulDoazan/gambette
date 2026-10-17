import { describe, it, expect, vi } from 'vitest';

// jsdom n'a pas WebGL : seul le renderer est simulé, le reste de three est réel.
const renderer = vi.hoisted(() => ({
  setPixelRatio: vi.fn(),
  setSize: vi.fn(),
  render: vi.fn(),
  dispose: vi.fn(),
  forceContextLoss: vi.fn(),
}));
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  return {
    ...actual,
    WebGLRenderer: vi.fn(function () {
      return renderer;
    }),
  };
});

import { createScene } from '../src/scene';

describe('createScene', () => {
  it('dispose libère le contexte WebGL (sinon les cycles jouer/quitter les accumulent)', () => {
    const scene = createScene(document.createElement('canvas'));
    scene.dispose();
    expect(renderer.forceContextLoss).toHaveBeenCalledTimes(1);
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
  });
});
