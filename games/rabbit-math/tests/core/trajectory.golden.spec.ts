import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { computeTrajectoryPoints } from '../../src/systems/TrajectoryPreview';

interface Vec {
  x: number;
  y: number;
}
interface Shot {
  name: string;
  start: Vec;
  velocity: Vec;
  samples: Vec[];
  steps: number;
}

// Tirs de référence : vitesses en px par frame à 60 fps (unité historique de matter-js).
const SHOTS: Array<Pick<Shot, 'name' | 'start' | 'velocity'>> = [
  { name: 'faible', start: { x: 200, y: 520 }, velocity: { x: 7, y: -10.5 } },
  { name: 'moyen', start: { x: 200, y: 520 }, velocity: { x: 11, y: -11 } },
  { name: 'fort', start: { x: 200, y: 520 }, velocity: { x: 17, y: -12 } },
];
const SAMPLE_EVERY = 6; // 100 ms
const MAX_STEPS = 120; // 2 s
const TOLERANCE_PX = 4;
const FIXTURE = resolve(import.meta.dirname, '../fixtures/trajectories.golden.json');

const record = (s: (typeof SHOTS)[number]): Shot => {
  const pts = computeTrajectoryPoints(s.start, s.velocity).slice(0, MAX_STEPS + 1);
  const samples = pts.filter((_, i) => i % SAMPLE_EVERY === 0);
  return { ...s, samples, steps: pts.length - 1 };
};

describe('trajectoires de référence de la carotte', () => {
  if (process.env.RECORD_GOLDEN === '1') {
    it('enregistre les trajectoires de référence', () => {
      writeFileSync(FIXTURE, JSON.stringify({ shots: SHOTS.map(record) }, null, 2) + '\n');
      expect(existsSync(FIXTURE)).toBe(true);
    });
    return;
  }

  const golden = JSON.parse(readFileSync(FIXTURE, 'utf8')) as { shots: Shot[] };

  for (const ref of golden.shots) {
    it(`tir ${ref.name} : même trajectoire à ${TOLERANCE_PX} px près`, () => {
      const now = record(ref);
      expect(Math.abs(now.steps - ref.steps)).toBeLessThanOrEqual(2);
      const n = Math.min(now.samples.length, ref.samples.length);
      for (let i = 0; i < n; i++) {
        const a = now.samples[i]!;
        const b = ref.samples[i]!;
        expect(Math.hypot(a.x - b.x, a.y - b.y), `échantillon ${i}`).toBeLessThanOrEqual(
          TOLERANCE_PX,
        );
      }
    });
  }
});
