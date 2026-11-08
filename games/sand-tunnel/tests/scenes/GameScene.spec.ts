import { describe, it, expect, vi } from 'vitest';
import { computeAnswer, mulberry32, type Pair } from '@gambette/math-sdk';
import { createGameScene, type GameScene } from '../../src/scenes/GameScene';
import { DESIGN_WIDTH, LAST_SCREEN } from '../../src/config/dimensions';
import type { Vec } from '../../src/domain/types';

const PAIRS: Pair[] = [
  { a: 6, b: 8, op: 'mul' },
  { a: 7, b: 4, op: 'mul' },
  { a: 3, b: 9, op: 'add' },
];

const make = (onWin = vi.fn(), onUiHidden = vi.fn()) => ({
  scene: createGameScene({ pairs: PAIRS, rng: mulberry32(3), onWin, onUiHidden }),
  onWin,
  onUiHidden,
});

/** Position à l'écran d'un point du monde. */
const onScreen = (scene: GameScene, p: Vec): Vec => ({ x: p.x - scene.cameraX(), y: p.y });
const nodePos = (scene: GameScene, id: number): Vec =>
  onScreen(scene, scene.network().nodes[id]!.pos);

/** Creuse de la mare à travers les galets `ids`, sans lever le doigt. */
const dig = (scene: GameScene, ids: readonly number[], pointer = 1): void => {
  scene.pointerDown(pointer, onScreen(scene, scene.network().pond));
  for (const id of ids) scene.pointerMove(pointer, nodePos(scene, id));
};
const run = (scene: GameScene, ms: number, step = 50): void => {
  for (let t = 0; t < ms; t += step) scene.tick(step);
};
/** Laisse le jeu tourner jusqu'à revenir au creusage (ou la victoire). */
const settle = (scene: GameScene, max = 15000): void => {
  for (let t = 0; t < max && scene.phase() !== 'play' && scene.phase() !== 'won'; t += 50) {
    scene.tick(50);
  }
};
const solve = (scene: GameScene): void => {
  dig(scene, scene.network().solution);
  scene.pointerUp(1);
  run(scene, 100);
  settle(scene);
};
/** Un chemin complet faux : il en existe toujours un (plusieurs chemins, un seul bon). */
const wrongPath = (scene: GameScene): number[] => {
  const net = scene.network();
  for (const [s, o] of net.links) {
    if (net.nodes[s]!.kind !== 'start') continue;
    for (const [o2, e] of net.links) {
      if (o2 === o && [s, o, e].some((id, i) => id !== net.solution[i])) return [s, o, e];
    }
  }
  throw new Error('aucun mauvais chemin');
};

describe('GameScene', () => {
  it('affiche le résultat à retrouver, et le calcul à mesure qu’on creuse', () => {
    const { scene } = make();
    const net = scene.network();
    expect(scene.resultText()).toBe(`? ? ? = ${computeAnswer(net.pair)}`);
    dig(scene, net.solution.slice(0, 2));
    expect(scene.dug()).toEqual(net.solution.slice(0, 2));
    expect(scene.resultText()).toMatch(/^\d+ [+−×] \? = \d+$/);
  });

  it('bon chemin : l’eau passe, le poisson file vers le réseau suivant, l’interface revient', () => {
    const { scene, onUiHidden } = make();
    const first = scene.network();
    dig(scene, first.solution);
    scene.pointerUp(1);
    expect(scene.phase()).toBe('flow');
    run(scene, 100);
    settle(scene);
    expect(scene.screen()).toBe(1);
    expect(scene.network()).not.toBe(first);
    expect(scene.cameraX()).toBe(DESIGN_WIDTH);
    expect(onUiHidden.mock.calls).toEqual([[true], [false]]);
    expect(scene.uiVisible()).toBe(true);
    expect(scene.resultText()).toBe(`? ? ? = ${scene.network().result}`);
  });

  it('deux réseaux de suite ne demandent pas le même résultat', () => {
    const { scene } = make();
    const before = scene.network().result;
    solve(scene);
    expect(scene.network().result).not.toBe(before);
  });

  it('mauvais chemin : le sable bouche la galerie, on recommence le même réseau', () => {
    const { scene, onUiHidden } = make();
    const net = scene.network();
    dig(scene, wrongPath(scene));
    scene.pointerUp(1);
    run(scene, 100);
    // L'eau avance, puis bute sur le sable.
    for (let t = 0; t < 5000 && scene.phase() === 'flow'; t += 50) scene.tick(50);
    expect(scene.phase()).toBe('blocked');
    settle(scene);
    expect(scene.phase()).toBe('play');
    expect(scene.screen()).toBe(0);
    expect(scene.network()).toBe(net);
    expect(scene.resultText()).toBe(`? ? ? = ${net.result}`);
    expect(onUiHidden).not.toHaveBeenCalled();
    // Et on peut le résoudre ensuite.
    solve(scene);
    expect(scene.screen()).toBe(1);
  });

  it('galerie inachevée au lever du doigt : elle se rebouche, sans vérification', () => {
    const { scene } = make();
    dig(scene, scene.network().solution.slice(0, 2));
    scene.pointerUp(1);
    expect(scene.phase()).toBe('refill');
    settle(scene);
    expect(scene.phase()).toBe('play');
    expect(scene.dug()).toEqual([]);
  });

  it('un seul doigt creuse : un second pointeur est ignoré', () => {
    const { scene } = make();
    const [s, o] = scene.network().solution;
    dig(scene, [s]);
    scene.pointerDown(2, onScreen(scene, scene.network().pond));
    scene.pointerMove(2, nodePos(scene, o));
    expect(scene.dug()).toEqual([s]);
    scene.pointerUp(2);
    expect(scene.phase()).toBe('play');
  });

  it('pas de creusage pendant que l’eau coule', () => {
    const { scene } = make();
    dig(scene, scene.network().solution);
    scene.pointerUp(1);
    dig(scene, [scene.network().solution[0]], 2);
    expect(scene.dug()).toEqual([]);
  });

  it('doigt annulé par le système : la galerie se rebouche', () => {
    const { scene } = make();
    dig(scene, scene.network().solution);
    scene.pointerCancel(1);
    expect(scene.dug()).toEqual([]);
    expect(scene.phase()).toBe('play');
    scene.pointerUp(1);
    expect(scene.phase()).toBe('play');
  });

  it('trois réseaux, puis le poisson rejoint la mer : victoire une seule fois', () => {
    const { scene, onWin } = make();
    for (let k = 0; k <= LAST_SCREEN; k++) solve(scene);
    expect(scene.phase()).toBe('won');
    expect(onWin).toHaveBeenCalledTimes(1);
    run(scene, 2000);
    expect(onWin).toHaveBeenCalledTimes(1);
    expect(scene.uiVisible()).toBe(false);
  });

  it('Rejouer : retour au premier réseau, avec de nouveaux calculs', () => {
    const { scene } = make();
    for (let k = 0; k <= LAST_SCREEN; k++) solve(scene);
    scene.reset();
    expect(scene.screen()).toBe(0);
    expect(scene.cameraX()).toBe(0);
    expect(scene.phase()).toBe('play');
    expect(scene.uiVisible()).toBe(true);
    solve(scene);
    expect(scene.screen()).toBe(1);
  });

  it('releaseAll abandonne le geste en cours', () => {
    const { scene } = make();
    dig(scene, scene.network().solution.slice(0, 1));
    scene.releaseAll();
    expect(scene.dug()).toEqual([]);
    scene.destroy();
  });
});
