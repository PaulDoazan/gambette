import { computeTrajectoryPoints } from './TrajectoryPreview';

export interface Vec {
  x: number;
  y: number;
}

export function computeVelocityForTarget(
  start: Vec,
  target: Vec,
  gravity: number,
  timeOfFlight: number,
): Vec {
  const dx = target.x - start.x;
  const dy = target.y - start.y;
  return {
    x: dx / timeOfFlight,
    y: (dy - 0.5 * gravity * timeOfFlight * timeOfFlight) / timeOfFlight,
  };
}

// Gravité par pas de 1/60 s dans l'unité historique (0,7 × 0,001 px/ms²), cf. GRAVITY_M_S2.
const STEP_GRAVITY = 0.001 * 0.7;
const SEARCH_MIN_STEPS = 60;
const SEARCH_MAX_STEPS = 140;
const SEARCH_STEP_INC = 4;
const REFINE_PASSES = 6;
const REFINE_SHRINK = 1.6;
const MIN_PEAK_LIFT = 90;

const closestDistance = (points: readonly Vec[], target: Vec): number => {
  let best = Infinity;
  for (const p of points) {
    const d = Math.hypot(p.x - target.x, p.y - target.y);
    if (d < best) best = d;
  }
  return best;
};

const velocityForSteps = (start: Vec, target: Vec, steps: number): Vec => ({
  x: (target.x - start.x) / steps,
  y: (target.y - start.y - 0.5 * STEP_GRAVITY * steps * steps) / steps,
});

interface SearchResult {
  v: Vec;
  cost: number;
}

const peakLift = (start: Vec, points: readonly Vec[]): number => {
  let minY = start.y;
  for (const p of points) if (p.y < minY) minY = p.y;
  return start.y - minY;
};

const trajectoryCost = (start: Vec, target: Vec, v: Vec): number => {
  const points = computeTrajectoryPoints(start, v);
  const dist = closestDistance(points, target);
  const liftDeficit = Math.max(0, MIN_PEAK_LIFT - peakLift(start, points));
  return dist + liftDeficit * 0.6;
};

const coarseSearch = (start: Vec, target: Vec): SearchResult => {
  let bestV = velocityForSteps(start, target, 80);
  let bestCost = Infinity;
  for (let steps = SEARCH_MIN_STEPS; steps <= SEARCH_MAX_STEPS; steps += SEARCH_STEP_INC) {
    const v = velocityForSteps(start, target, steps);
    const cost = trajectoryCost(start, target, v);
    if (cost < bestCost) {
      bestCost = cost;
      bestV = v;
    }
  }
  return { v: bestV, cost: bestCost };
};

const refineStep = (start: Vec, target: Vec, current: SearchResult, step: number): SearchResult => {
  let best = current;
  for (const dx of [-step, 0, step]) {
    for (const dy of [-step, 0, step]) {
      if (dx === 0 && dy === 0) continue;
      const v = { x: best.v.x + dx, y: best.v.y + dy };
      const cost = trajectoryCost(start, target, v);
      if (cost < best.cost) best = { v, cost };
    }
  }
  return best;
};

export const findTapVelocity = (start: Vec, target: Vec): Vec => {
  let result = coarseSearch(start, target);
  let step = 0.4;
  for (let i = 0; i < REFINE_PASSES; i++) {
    const next = refineStep(start, target, result, step);
    if (next.cost >= result.cost) step /= REFINE_SHRINK;
    result = next;
  }
  return result.v;
};
