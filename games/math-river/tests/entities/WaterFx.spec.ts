import { describe, it, expect } from 'vitest';
import { Container } from 'pixi.js';
import { createWaterFx } from '../../src/entities/WaterFx';

describe('WaterFx', () => {
  it('l’eau ondule en permanence ; pas d’onde de choc au repos', () => {
    const water = new Container();
    const world = new Container();
    createWaterFx(water, world);
    expect(water.filters).toHaveLength(1);
    expect(world.filters ?? []).toHaveLength(0);
  });

  it('une onde de choc par impact, sur tout le décor, qui s’éteint après ≈ 4,4 s', () => {
    const water = new Container();
    const world = new Container();
    const fx = createWaterFx(water, world);
    fx.splash({ x: 360, y: 640 });
    fx.splash({ x: 300, y: 600 });
    expect(world.filters).toHaveLength(2);
    fx.update(4000);
    expect(world.filters).toHaveLength(2);
    fx.update(600);
    expect(world.filters ?? []).toHaveLength(0);
  });

  it('au plus 10 ondes à la fois, comme pixijs-elementals', () => {
    const world = new Container();
    const fx = createWaterFx(new Container(), world);
    for (let i = 0; i < 15; i++) fx.splash({ x: 360, y: 640 });
    expect(world.filters).toHaveLength(10);
  });
});
