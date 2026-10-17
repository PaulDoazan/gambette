import { describe, it, expect } from 'vitest';
import { createElastic } from '../../src/entities/Elastic';
import { elasticLine } from '../../src/domain/elastic';
import { PUCK_RADIUS } from '../../src/config/dimensions';

describe('Elastic — vibration au relâcher', () => {
  it('oscille autour du repos en s’amortissant jusqu’au calme', () => {
    const e = createElastic('A');
    e.twang(80);
    expect(e.isVibrating()).toBe(true);
    expect(e.offset()).toBeCloseTo(80, 6); // part de la position tendue (vers le bord de A)
    const samples: number[] = [];
    for (let t = 0; t < 2000; t += 16) {
      e.update(null, 16);
      samples.push(e.offset());
    }
    expect(samples.some((o) => o < 0)).toBe(true); // dépasse le repos de l'autre côté
    const early = Math.max(...samples.slice(0, 10).map(Math.abs));
    const late = Math.max(...samples.slice(20, 30).map(Math.abs));
    expect(late).toBeLessThan(early);
    expect(e.isVibrating()).toBe(false);
    expect(e.offset()).toBe(0);
  });

  it('côté B, la vibration part vers le bord de B (vers le haut)', () => {
    const e = createElastic('B');
    e.twang(50);
    expect(e.offset()).toBeCloseTo(-50, 6);
  });

  it('un palet qui étire l’élastique interrompt la vibration', () => {
    const e = createElastic('A');
    e.twang(80);
    const line = elasticLine('A');
    e.update({ x: 360, y: line.y - PUCK_RADIUS + 40 }, 16);
    expect(e.isVibrating()).toBe(false);
  });
});
