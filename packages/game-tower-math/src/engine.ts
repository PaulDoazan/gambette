export type Direction = 'x' | 'z';

export interface Layer {
  index: number; // 0 = fondation
  x: number;
  z: number; // position nominale au spawn
  width: number;
  depth: number;
  direction: Direction; // axe de déplacement du pavé mobile
}

// Description pure de la découpe à appliquer côté scene/cannon.
export interface SliceCut {
  newWidth: number;
  newDepth: number; // dimensions du pavé tranché
  shift: number; // recentrage du pavé sur son axe (à ajouter à sa position live)
  overhang: { x: number; z: number; width: number; depth: number };
  next: Layer; // prochain pavé mobile (axe alterné)
}
export type SliceResult = { type: 'sliced'; cut: SliceCut } | { type: 'missed' };

export type TowerStatus = 'idle' | 'playing' | 'lost';

export interface TowerEngine {
  start(): { foundation: Layer; first: Layer };
  current(): Layer; // pavé mobile courant (axe + dims)
  slice(position: number): SliceResult; // position live du pavé sur son axe → découpe ou raté
  fail(): void; // mauvais bouton → game over forcé
  readonly score: number; // = nombre d'étages posés
  readonly status: TowerStatus;
}

// Constantes portées de threejs-tower-slice.
const FIRST_SPAWN = -7.5; // 1er pavé mobile (bord caméra)
const NEXT_SPAWN = -5; // pavés suivants

export function createTowerEngine(opts: { boxSize?: number } = {}): TowerEngine {
  const boxSize = opts.boxSize ?? 3;
  let placed: Layer[] = []; // étages posés (positions finales), [0] = fondation
  let mobile: Layer | null = null; // pavé mobile (position nominale au spawn)
  let score = 0;
  let status: TowerStatus = 'idle';

  return {
    start() {
      const foundation: Layer = {
        index: 0,
        x: 0,
        z: 0,
        width: boxSize,
        depth: boxSize,
        direction: 'x',
      };
      const first: Layer = {
        index: 1,
        x: FIRST_SPAWN,
        z: 0,
        width: boxSize,
        depth: boxSize,
        direction: 'x',
      };
      placed = [foundation];
      mobile = first;
      score = 0;
      status = 'playing';
      return { foundation, first };
    },
    current(): Layer {
      if (!mobile) throw new Error('TowerEngine: start() non appelé');
      return mobile;
    },
    slice(position: number): SliceResult {
      if (status !== 'playing' || !mobile) return { type: 'missed' };
      const direction = mobile.direction;
      const prev = placed[placed.length - 1] as Layer; // fondation toujours présente après start()
      const prevPos = direction === 'x' ? prev.x : prev.z;
      // Maths d'origine : delta / overhangSize / overlap.
      const delta = position - prevPos;
      const overhangSize = Math.abs(delta);
      const size = direction === 'x' ? mobile.width : mobile.depth;
      const overlap = size - overhangSize;

      if (overlap <= 0) {
        status = 'lost';
        return { type: 'missed' };
      }

      const newWidth = direction === 'x' ? overlap : mobile.width;
      const newDepth = direction === 'z' ? overlap : mobile.depth;
      const shift = -delta / 2; // cutBox d'origine : position -= delta/2
      const placedX = direction === 'x' ? position + shift : mobile.x;
      const placedZ = direction === 'z' ? position + shift : mobile.z;

      const overhangShift = (overlap / 2 + overhangSize / 2) * Math.sign(delta);
      const overhang = {
        x: direction === 'x' ? placedX + overhangShift : placedX,
        z: direction === 'z' ? placedZ + overhangShift : placedZ,
        width: direction === 'x' ? overhangSize : newWidth,
        depth: direction === 'z' ? overhangSize : newDepth,
      };

      const nextDirection: Direction = direction === 'x' ? 'z' : 'x';
      const next: Layer = {
        index: mobile.index + 1,
        x: nextDirection === 'z' ? placedX : NEXT_SPAWN,
        z: nextDirection === 'x' ? placedZ : NEXT_SPAWN,
        width: newWidth,
        depth: newDepth,
        direction: nextDirection,
      };

      placed = [...placed, { ...mobile, x: placedX, z: placedZ, width: newWidth, depth: newDepth }];
      mobile = next;
      score++;
      return { type: 'sliced', cut: { newWidth, newDepth, shift, overhang, next } };
    },
    fail(): void {
      if (status === 'playing') status = 'lost';
    },
    get score(): number {
      return score;
    },
    get status(): TowerStatus {
      return status;
    },
  };
}
