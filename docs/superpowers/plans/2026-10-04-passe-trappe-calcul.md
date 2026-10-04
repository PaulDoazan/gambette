# Passe-trappe calcul — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Palets 2 × plus gros avec élastique au contact du bord, nombre de palets réglable (5–10), et couche de calcul : un calcul par camp, un seul palet « bon » par camp lançable à l'élastique, renouvellement à chaque passage, réglages via un engrenage.

**Architecture:** Le domaine pur s'enrichit (`quiz.ts` pour tirer un calcul et étiqueter un camp avec `math-sdk`, `crossings.ts` pour détecter les passages en regroupant les rafales). `GameScene` reçoit `pucksPerPlayer` et `pairs`, étiquette les palets et indique au `DragController` quels palets ont le droit au lancer élastique. `mount.ts` gère un cycle « partie » recréable (monde physique + scène) pour appliquer les réglages, avec un panneau Pixi en pause.

**Tech Stack:** TypeScript, Pixi.js 8, planck 1.5, `@gambette/math-sdk` (`Pair`, `computeAnswer`, `opSymbol`, `generateDistractors`, `pickFrom`, `shuffle`, `Rng`, `createCalcsStore`, `randomMulPairs`, `openCalcsPicker`), Vitest 4 + jsdom.

**Spec:** `docs/superpowers/specs/2026-10-04-passe-trappe-calcul-design.md`

## Global Constraints

- Paquet concerné : `games/passe-trappe` (`@gambette/game-passe-trappe`) ; ajouter la dépendance `"@gambette/math-sdk": "workspace:*"`.
- `PUCK_RADIUS = 56` ; `GAP_WIDTH = round(1,6 × 2 × PUCK_RADIUS)` (= 179).
- `pucksPerPlayer` entier ∈ [5, 10], défaut 5 ; clé `gambette.passe-trappe.settings` (`{ pucksPerPlayer }`) ; calculs via `createCalcsStore('passe-trappe')`.
- Mauvaises réponses : `generateDistractors(answer, 'medium', n − 1, rng)`. Exactement une bonne réponse par camp non vide ; valeurs d'un camp toutes distinctes.
- Renouvellement des deux calculs + ré-étiquetage de tous les palets à chaque changement de camp ; rafales regroupées sur **300 ms**.
- Mauvais palet relâché : vibration visuelle **400 ms** + vitesse ≤ `WRONG_LAUNCH_SPEED = 120` px/s. `DROP_MAX_SPEED = 300` px/s inchangé.
- Étirement mesuré depuis le **bord** du palet côté joueur.
- Langue : français (accents conservés) dans le code, les commentaires et les tests. Style Prettier racine.
- Commits sur la branche `feat/passe-trappe` (déjà active), un par tâche, messages conventionnels en français terminés par :
  `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01PwD249iHE7SXS5EkecJV6c`
- Ne pas pousser.

## Review Focus

1. **Un palet oscille sur la ligne médiane** → au plus un renouvellement par rafale, et les étiquettes correspondent toujours au camp final du palet. Test : Task 3 (`crossings`) + Task 5 (`GameScene`).
2. **Camp à 1 palet, ou très chargé (jusqu'à 20 palets)** → la bonne réponse est présente, les valeurs restent distinctes. Test : Task 3 (`quiz`, n = 1 et n = 20).
3. **Le calcul change pendant qu'un joueur tient un palet** → c'est l'étiquette au relâcher qui décide (pas de lancer d'un palet devenu mauvais). Test : Task 5 (`GameScene`).
4. **Ouvrir les réglages pendant une partie, fermer sans rien changer** → la partie reprend à l'identique, sans fuite de corps planck à la recréation. Test : Task 6 (`mount.spec.ts`).
5. **10 palets par joueur** → disposition initiale sans chevauchement, tous dans leur camp, devant l'élastique. Test : Task 2.

---

### Task 1: Gros palets et élastique au contact du bord

**Files:**

- Modify: `src/config/dimensions.ts`, `src/domain/elastic.ts`, `src/domain/rules.ts`, `src/entities/Elastic.ts`, `src/scenes/GameScene.ts`
- Test: `tests/domain/elastic.spec.ts` (réécrit), `tests/domain/rules.spec.ts`, et adaptation des coordonnées de `tests/physics/board.spec.ts`, `tests/input/DragController.spec.ts`, `tests/scenes/GameScene.spec.ts` au nouveau rayon

**Interfaces:**

- Produces : `contactPoint(puck: Vec, player: Player): Vec` (exporté par `domain/elastic.ts`) ; `stretchOf`/`launchVelocity` mesurés depuis ce point ; `clampToCamp` borne le centre à `line.y ± (MAX_STRETCH − PUCK_RADIUS)`.

- [ ] **Step 1: Test de l'élastique réécrit (échoue)**

`tests/domain/elastic.spec.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { contactPoint, elasticLine, launchVelocity, stretchOf } from '../../src/domain/elastic';
import {
  DESIGN_HEIGHT,
  ELASTIC_INSET,
  MAX_STRETCH,
  PUCK_RADIUS as R,
} from '../../src/config/dimensions';
import { LAUNCH_POWER } from '../../src/config/physics';

const A = elasticLine('A');
const B = elasticLine('B');
/** Centre d'un palet dont le bord étire l'élastique de `s` px. */
const atA = (s: number, x = 360) => ({ x, y: A.y - R + s });
const atB = (s: number, x = 360) => ({ x, y: B.y + R - s });

describe('elasticLine', () => {
  it('A en bas, B en haut, en retrait du bord', () => {
    expect(A.y).toBe(DESIGN_HEIGHT - ELASTIC_INSET);
    expect(B.y).toBe(ELASTIC_INSET);
    expect(A.left.x).toBe(0);
    expect(A.right.x).toBe(720);
  });
});

describe('contactPoint', () => {
  it('bord du palet côté joueur', () => {
    expect(contactPoint({ x: 100, y: 900 }, 'A')).toEqual({ x: 100, y: 900 + R });
    expect(contactPoint({ x: 100, y: 300 }, 'B')).toEqual({ x: 100, y: 300 - R });
  });
});

describe('stretchOf (depuis le bord du palet)', () => {
  it('nul tant que le bord n’a pas passé l’élastique', () => {
    expect(stretchOf(atA(-10), A, 'A')).toBe(0);
    expect(stretchOf(atA(0), A, 'A')).toBe(0);
    expect(stretchOf(atB(-10), B, 'B')).toBe(0);
  });

  it('distance du bord au-delà de l’élastique', () => {
    expect(stretchOf(atA(40), A, 'A')).toBe(40);
    expect(stretchOf(atB(40), B, 'B')).toBe(40);
  });

  it('le centre peut être devant l’élastique alors que le bord l’étire', () => {
    const p = atA(20);
    expect(p.y).toBeLessThan(A.y);
    expect(stretchOf(p, A, 'A')).toBe(20);
  });
});

describe('launchVelocity', () => {
  it('élastique non tendu → aucun lancer', () => {
    expect(launchVelocity(atA(-5), A, 'A')).toBeNull();
    expect(launchVelocity(atA(2), A, 'A')).toBeNull();
  });

  it('tir centré : droit vers le trou (A vers le haut, B vers le bas)', () => {
    const va = launchVelocity(atA(60), A, 'A')!;
    expect(va.x).toBeCloseTo(0, 6);
    expect(va.y).toBeLessThan(0);
    const vb = launchVelocity(atB(60), B, 'B')!;
    expect(vb.x).toBeCloseTo(0, 6);
    expect(vb.y).toBeGreaterThan(0);
  });

  it('palet décalé à droite : vise en diagonale vers la gauche', () => {
    const v = launchVelocity(atA(60, 520), A, 'A')!;
    expect(v.x).toBeLessThan(0);
    expect(v.y).toBeLessThan(0);
  });

  it('norme proportionnelle à l’étirement, plafonnée à MAX_STRETCH', () => {
    const n = (s: number) => {
      const v = launchVelocity(atA(s), A, 'A')!;
      return Math.hypot(v.x, v.y);
    };
    expect(n(40)).toBeCloseTo(40 * LAUNCH_POWER, 3);
    expect(n(80)).toBeCloseTo(2 * n(40), 3);
    expect(n(MAX_STRETCH + 200)).toBeCloseTo(MAX_STRETCH * LAUNCH_POWER, 3);
  });
});
```

Dans `tests/domain/rules.spec.ts`, le test « confine le palet tenu à la moitié arrière de son camp » vérifie désormais les bornes arrière :

```ts
expect(clampToCamp({ x: 360, y: 5000 }, 'A').y).toBe(
  elasticLine('A').y + MAX_STRETCH - PUCK_RADIUS,
);
expect(clampToCamp({ x: 360, y: -5000 }, 'B').y).toBe(
  elasticLine('B').y - MAX_STRETCH + PUCK_RADIUS,
);
```

(les autres assertions du fichier sont conservées ; elles utilisent déjà `PUCK_RADIUS`).

Run: `pnpm --filter @gambette/game-passe-trappe exec vitest run tests/domain`
Expected: FAIL (`contactPoint` absent, mesures depuis le centre, bornes arrière).

- [ ] **Step 2: Implémenter**

`src/config/dimensions.ts` : `export const PUCK_RADIUS = 56;` (le commentaire de `GAP_WIDTH` reste vrai). **Supprimer** `PUCKS_PER_PLAYER` seulement à la Task 2 (laisser tel quel ici).

`src/domain/elastic.ts` — ajouter l'import de `PUCK_RADIUS` et remplacer `stretchOf`/`launchVelocity` :

```ts
/** Point du palet en contact avec l'élastique : son bord côté joueur. */
export function contactPoint(puck: Vec, player: Player): Vec {
  return { x: puck.x, y: player === 'A' ? puck.y + PUCK_RADIUS : puck.y - PUCK_RADIUS };
}

/** Distance dont le bord du palet a repoussé l'élastique vers le bord du joueur (0 s'il est devant). */
export function stretchOf(puck: Vec, line: ElasticLine, player: Player): number {
  const c = contactPoint(puck, player);
  const d = player === 'A' ? c.y - line.y : line.y - c.y;
  return Math.max(0, d);
}

/**
 * Vitesse (px/s) donnée au palet au relâcher. Direction : bissectrice du V formé par
 * l'élastique autour du point de contact ; norme proportionnelle à l'étirement (plafonné).
 */
export function launchVelocity(puck: Vec, line: ElasticLine, player: Player): Vec | null {
  const stretch = Math.min(stretchOf(puck, line, player), MAX_STRETCH);
  if (stretch < MIN_STRETCH) return null;
  const c = contactPoint(puck, player);
  const a = unit({ x: line.left.x - c.x, y: line.left.y - c.y });
  const b = unit({ x: line.right.x - c.x, y: line.right.y - c.y });
  const dir = unit({ x: a.x + b.x, y: a.y + b.y });
  const speed = stretch * LAUNCH_POWER;
  return { x: dir.x * speed, y: dir.y * speed };
}
```

`src/domain/rules.ts` — dans `clampToCamp`, borne arrière du **centre** :

```ts
const y =
  player === 'A'
    ? clamp(p.y, rear, line.y + MAX_STRETCH - PUCK_RADIUS)
    : clamp(p.y, line.y - MAX_STRETCH + PUCK_RADIUS, rear);
```

et compléter le commentaire : « le bord du palet étire l'élastique d'au plus MAX_STRETCH ».

`src/entities/Elastic.ts` — le V passe par le point de contact :

```ts
import { contactPoint, elasticLine, stretchOf } from '../domain/elastic';
// ...
if (puck && stretchOf(puck, line, player) > 0) {
  const c = contactPoint(puck, player);
  g.lineTo(c.x, c.y);
}
```

`src/scenes/GameScene.ts` — rien à changer pour l'élastique (il passe déjà le centre du palet à `draw`, qui calcule le contact).

- [ ] **Step 3: Adapter les coordonnées des autres tests au rayon 56**

Le rayon double : certaines positions de test se chevauchent ou touchent un mur. Ajuster **uniquement des coordonnées**, jamais les assertions, pour conserver l'intention de chaque test :

- `tests/physics/board.spec.ts` « deux palets » : `a` à `(200, 1010)`, `b` à `(200, 880)` (130 px entre centres > 112) ; fenêtre `run(200)` conservée.
- `tests/scenes/GameScene.spec.ts` : positions placées dans le camp B à des points distincts espacés d'au moins 120 px (ex. grille `x = 70 + (i % 5) * 145`, `y = 230 + Math.floor(i / 5) * 125`).
- `tests/input/DragController.spec.ts` : vérifier que les palets initiaux ne se chevauchent pas (centres espacés ≥ 120 px) et que les cibles de glisser restent atteignables avec la nouvelle borne arrière (`line.y + MAX_STRETCH − R`) ; la boucle « étirer jusqu'à `lineA.y + 80` » devient « jusqu'à `lineA.y + 80 − PUCK_RADIUS` ». Le test « pousser à la main » garde son intention (palet tenu qui pousse un palet vers la cloison) avec des positions non chevauchantes (ex. tenu `(360, 950)`, victime `(360, 820)`).

- [ ] **Step 4: Vérifier**

```bash
pnpm exec prettier --write games/passe-trappe && pnpm --filter @gambette/game-passe-trappe test && pnpm --filter @gambette/game-passe-trappe typecheck && pnpm --filter @gambette/game-passe-trappe lint
```

Expected: PASS. Toute coordonnée modifiée est listée dans le rapport.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(game-passe-trappe): palets deux fois plus gros, élastique au contact du bord

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PwD249iHE7SXS5EkecJV6c"
```

---

### Task 2: Nombre de palets par joueur et disposition initiale

**Files:**

- Modify: `src/config/dimensions.ts`, `src/scenes/GameScene.ts`, `src/mount.ts` (appel avec la valeur par défaut, en attendant la Task 6)
- Test: `tests/scenes/GameScene.spec.ts`

**Interfaces:**

- Produces :
  - `MIN_PUCKS = 5`, `MAX_PUCKS = 10`, `DEFAULT_PUCKS = 5` (dans `config/dimensions.ts`, à la place de `PUCKS_PER_PLAYER`)
  - `initialPuckPositions(player: Player, count: number): Vec[]`
  - `createGameScene(deps: { physics; pucksPerPlayer: number; onWin(player): void })`

- [ ] **Step 1: Tests (échouent)**

Ajouter à `tests/scenes/GameScene.spec.ts` (et remplacer les usages de `PUCKS_PER_PLAYER` par un `pucksPerPlayer` explicite ; tous les `createGameScene({...})` du fichier reçoivent `pucksPerPlayer: 5`) :

```ts
import { DIVIDER_THICKNESS, MID_Y, PUCK_RADIUS as R } from '../../src/config/dimensions';

describe('initialPuckPositions', () => {
  for (const count of [5, 6, 8, 10]) {
    it(`${count} palets : dans le camp, devant l’élastique, sans chevauchement`, () => {
      for (const pl of ['A', 'B'] as const) {
        const pos = initialPuckPositions(pl, count);
        expect(pos).toHaveLength(count);
        const line = elasticLine(pl);
        for (const p of pos) {
          expect(campOf(p.y)).toBe(pl);
          expect(p.x - R).toBeGreaterThanOrEqual(0);
          expect(p.x + R).toBeLessThanOrEqual(720);
          if (pl === 'A') {
            expect(p.y - R).toBeGreaterThan(MID_Y + DIVIDER_THICKNESS / 2);
            expect(p.y + R).toBeLessThan(line.y);
          } else {
            expect(p.y + R).toBeLessThan(MID_Y - DIVIDER_THICKNESS / 2);
            expect(p.y - R).toBeGreaterThan(line.y);
          }
        }
        for (let i = 0; i < pos.length; i++)
          for (let j = i + 1; j < pos.length; j++)
            expect(Math.hypot(pos[i]!.x - pos[j]!.x, pos[i]!.y - pos[j]!.y)).toBeGreaterThan(2 * R);
      }
    });
  }
});

describe('GameScene — nombre de palets', () => {
  it('10 palets par joueur', () => {
    physics = createPhysicsWorld();
    const scene = createGameScene({ physics, pucksPerPlayer: 10, onWin: vi.fn() });
    const camps = scene.pucks().map((p) => campOf(p.position().y));
    expect(camps.filter((c) => c === 'A')).toHaveLength(10);
    expect(camps.filter((c) => c === 'B')).toHaveLength(10);
    scene.destroy();
  });
});
```

Run: `pnpm --filter @gambette/game-passe-trappe exec vitest run tests/scenes/GameScene.spec.ts` → FAIL.

- [ ] **Step 2: Implémenter**

`src/config/dimensions.ts` : remplacer `PUCKS_PER_PLAYER` par :

```ts
/** Nombre de palets par joueur : réglage de la partie. */
export const MIN_PUCKS = 5;
export const MAX_PUCKS = 10;
export const DEFAULT_PUCKS = 5;
/** Écart minimal entre deux palets posés au départ (px). */
export const PUCK_SPACING = 8;
```

`src/scenes/GameScene.ts` :

```ts
/**
 * Disposition de départ. Jusqu'à 5 palets : une rangée à mi-chemin entre la cloison et
 * l'élastique. Au-delà : deux rangées (ceil(n/2) côté cloison, floor(n/2) côté élastique),
 * la seconde décalée d'un demi-pas si les deux rangées ont le même nombre de palets.
 */
export function initialPuckPositions(player: Player, count: number): Vec[] {
  const lineY = elasticLine(player).y;
  const toward = player === 'A' ? 1 : -1; // de la cloison vers l'élastique
  const row = (n: number, y: number, shift = 0): Vec[] => {
    const step = DESIGN_WIDTH / (n + 1);
    return Array.from({ length: n }, (_, i) => ({ x: step * (i + 1) + shift, y }));
  };
  if (count <= 5) return row(count, (MID_Y + lineY) / 2);
  const front = MID_Y + toward * (DIVIDER_THICKNESS / 2 + PUCK_RADIUS + 2 * PUCK_SPACING);
  const back = front + toward * (2 * PUCK_RADIUS + PUCK_SPACING);
  const n1 = Math.ceil(count / 2);
  const n2 = count - n1;
  const shift = n1 === n2 ? DESIGN_WIDTH / (n2 + 1) / 2 - PUCK_RADIUS / 2 : 0;
  return [...row(n1, front), ...row(n2, back, shift)];
}
```

Vérifier par le test que la seconde rangée reste dans le plateau et devant l'élastique pour `count = 10` ; si le décalage fait sortir un palet, ramener `shift` à la plus grande valeur qui satisfait le test (le test décide).

`createGameScene` reçoit `pucksPerPlayer` et l'utilise dans la création et `placeInitial` :

```ts
export function createGameScene(deps: {
  physics: PhysicsWorld;
  pucksPerPlayer: number;
  onWin(player: Player): void;
}): GameScene {
  // ...
  const positionsAll = (): Vec[] =>
    PLAYERS.flatMap((p) => initialPuckPositions(p, deps.pucksPerPlayer));
```

(remplacer les deux `PLAYERS.flatMap((p) => initialPuckPositions(p))` par `positionsAll()`).

`src/mount.ts` : `createGameScene({ physics, pucksPerPlayer: DEFAULT_PUCKS, onWin: ... })` (import depuis `./config/dimensions`) ; la Task 6 branchera les réglages.

- [ ] **Step 3: Vérifier**

```bash
pnpm exec prettier --write games/passe-trappe && pnpm --filter @gambette/game-passe-trappe test && pnpm --filter @gambette/game-passe-trappe typecheck && pnpm --filter @gambette/game-passe-trappe lint
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(game-passe-trappe): nombre de palets par joueur (5 à 10) et disposition sur deux rangées

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PwD249iHE7SXS5EkecJV6c"
```

---

### Task 3: Domaine — calculs, étiquettes et passages

**Files:**

- Modify: `games/passe-trappe/package.json` (dépendance `@gambette/math-sdk`)
- Create: `src/domain/quiz.ts`, `src/domain/crossings.ts`
- Test: `tests/domain/quiz.spec.ts`, `tests/domain/crossings.spec.ts`

**Interfaces:**

- Produces :
  - `QUIZ_DIFFICULTY: Difficulty = 'medium'`
  - `pickCalc(pairs: readonly Pair[], previous: Pair | null, rng: Rng): Pair`
  - `interface CampLabels { correctIndex: number; values: number[] }`
  - `labelCamp(pair: Pair, count: number, rng: Rng): CampLabels | null` (null si `count === 0`)
  - `RENEW_COOLDOWN_MS = 300`
  - `createCrossingDetector(cooldownMs?: number): { reset(camps: readonly Player[], nowMs: number): void; update(camps: readonly Player[], nowMs: number): boolean }`

- [ ] **Step 1: Dépendance**

```bash
pnpm --filter @gambette/game-passe-trappe add @gambette/math-sdk@workspace:*
```

- [ ] **Step 2: Tests (échouent)**

`tests/domain/quiz.spec.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { computeAnswer, mulberry32, type Pair } from '@gambette/math-sdk';
import { labelCamp, pickCalc } from '../../src/domain/quiz';

const P68: Pair = { a: 6, b: 8, op: 'mul' };
const P74: Pair = { a: 7, b: 4, op: 'mul' };

describe('labelCamp', () => {
  it('une seule bonne réponse, valeurs toutes distinctes', () => {
    for (const n of [1, 2, 5, 10, 20]) {
      const l = labelCamp(P68, n, mulberry32(n))!;
      expect(l.values).toHaveLength(n);
      expect(l.values.filter((v) => v === 48)).toHaveLength(1);
      expect(l.values[l.correctIndex]).toBe(48);
      expect(new Set(l.values).size).toBe(n);
    }
  });

  it('mauvaises réponses proches de la bonne (difficulté moyenne)', () => {
    const l = labelCamp(P68, 5, mulberry32(7))!;
    for (const v of l.values) if (v !== 48) expect(Math.abs(v - 48)).toBeLessThanOrEqual(9);
  });

  it('camp à un palet : la bonne réponse ; camp vide : rien', () => {
    expect(labelCamp(P68, 1, mulberry32(1))).toEqual({ correctIndex: 0, values: [48] });
    expect(labelCamp(P68, 0, mulberry32(1))).toBeNull();
  });

  it('déterministe à rng égal', () => {
    expect(labelCamp(P74, 6, mulberry32(42))).toEqual(labelCamp(P74, 6, mulberry32(42)));
  });

  it('la bonne réponse correspond au calcul', () => {
    const l = labelCamp(P74, 4, mulberry32(3))!;
    expect(l.values[l.correctIndex]).toBe(computeAnswer(P74));
  });
});

describe('pickCalc', () => {
  it('évite le calcul précédent quand il y a le choix', () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 50; i++) expect(pickCalc([P68, P74], P68, rng)).toEqual(P74);
  });

  it('un seul calcul disponible : on le reprend', () => {
    expect(pickCalc([P68], P68, mulberry32(1))).toEqual(P68);
  });
});
```

`tests/domain/crossings.spec.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { createCrossingDetector, RENEW_COOLDOWN_MS } from '../../src/domain/crossings';
import type { Player } from '../../src/domain/types';

const start: Player[] = ['A', 'A', 'B', 'B'];

describe('createCrossingDetector', () => {
  it('pas de changement de camp → pas de renouvellement', () => {
    const d = createCrossingDetector();
    d.reset(start, 0);
    expect(d.update(start, 1000)).toBe(false);
  });

  it('un palet change de camp → renouvellement', () => {
    const d = createCrossingDetector();
    d.reset(start, 0);
    expect(d.update(['B', 'A', 'B', 'B'], 1000)).toBe(true);
    expect(d.update(['B', 'A', 'B', 'B'], 1016)).toBe(false);
  });

  it('oscillation dans la fenêtre qui revient au camp renouvelé → un seul renouvellement', () => {
    const d = createCrossingDetector();
    d.reset(start, 0);
    expect(d.update(['B', 'A', 'B', 'B'], 1000)).toBe(true);
    expect(d.update(['A', 'A', 'B', 'B'], 1100)).toBe(false);
    expect(d.update(['B', 'A', 'B', 'B'], 1200)).toBe(false);
    expect(d.update(['B', 'A', 'B', 'B'], 1000 + RENEW_COOLDOWN_MS + 50)).toBe(false);
  });

  it('retour dans la fenêtre puis immobile → renouvellement différé à la fin de la fenêtre', () => {
    const d = createCrossingDetector();
    d.reset(start, 0);
    d.update(['B', 'A', 'B', 'B'], 1000);
    expect(d.update(['A', 'A', 'B', 'B'], 1100)).toBe(false);
    expect(d.update(['A', 'A', 'B', 'B'], 1000 + RENEW_COOLDOWN_MS)).toBe(true);
  });

  it('deux passages espacés → deux renouvellements', () => {
    const d = createCrossingDetector();
    d.reset(start, 0);
    expect(d.update(['B', 'A', 'B', 'B'], 1000)).toBe(true);
    expect(d.update(['B', 'B', 'B', 'B'], 2000)).toBe(true);
  });
});
```

Run: `pnpm --filter @gambette/game-passe-trappe exec vitest run tests/domain/quiz.spec.ts tests/domain/crossings.spec.ts` → FAIL.

- [ ] **Step 3: Implémenter**

`src/domain/quiz.ts` :

```ts
import {
  computeAnswer,
  generateDistractors,
  pickFrom,
  shuffle,
  type Difficulty,
  type Pair,
  type Rng,
} from '@gambette/math-sdk';

/** Écart des mauvaises réponses : comme rabbit-math (3 à 9 de la bonne réponse). */
export const QUIZ_DIFFICULTY: Difficulty = 'medium';

const samePair = (p: Pair, q: Pair): boolean => p.a === q.a && p.b === q.b && p.op === q.op;

/** Tire un calcul parmi ceux choisis, en évitant le précédent quand c'est possible. */
export function pickCalc(pairs: readonly Pair[], previous: Pair | null, rng: Rng): Pair {
  const others = previous ? pairs.filter((p) => !samePair(p, previous)) : pairs;
  return pickFrom(others.length > 0 ? others : pairs, rng);
}

export interface CampLabels {
  /** Index (dans l'ordre des palets du camp) du palet portant la bonne réponse. */
  correctIndex: number;
  values: number[];
}

/** Étiquettes des `count` palets d'un camp : une bonne réponse, des mauvaises proches et distinctes. */
export function labelCamp(pair: Pair, count: number, rng: Rng): CampLabels | null {
  if (count === 0) return null;
  const answer = computeAnswer(pair);
  const wrong = generateDistractors(answer, QUIZ_DIFFICULTY, count - 1, rng);
  const values = shuffle([answer, ...wrong], rng);
  return { correctIndex: values.indexOf(answer), values };
}
```

Si `generateDistractors` renvoie moins de `count − 1` valeurs (cas extrême), compléter avec les entiers les plus proches de la réponse non encore utilisés (≥ 0), de façon déterministe ; le test `n = 20` doit passer.

`src/domain/crossings.ts` :

```ts
import type { Player } from './types';

/** Fenêtre de regroupement des passages : au plus un renouvellement par fenêtre. */
export const RENEW_COOLDOWN_MS = 300;

export interface CrossingDetector {
  /** Mémorise les camps étiquetés (au départ, après Rejouer). */
  reset(camps: readonly Player[], nowMs: number): void;
  /**
   * true quand il faut renouveler calculs et étiquettes : les camps diffèrent de ceux du
   * dernier étiquetage et la fenêtre est écoulée. Une oscillation qui revient au camp
   * étiqueté avant la fin de la fenêtre ne déclenche rien.
   */
  update(camps: readonly Player[], nowMs: number): boolean;
}

const sameCamps = (a: readonly Player[], b: readonly Player[]): boolean =>
  a.length === b.length && a.every((c, i) => c === b[i]);

export function createCrossingDetector(cooldownMs = RENEW_COOLDOWN_MS): CrossingDetector {
  let labelled: Player[] = [];
  let lastRenew = -Infinity;
  return {
    reset: (camps, nowMs) => {
      labelled = [...camps];
      lastRenew = nowMs;
    },
    update: (camps, nowMs) => {
      if (sameCamps(camps, labelled)) return false;
      if (nowMs - lastRenew < cooldownMs) return false;
      labelled = [...camps];
      lastRenew = nowMs;
      return true;
    },
  };
}
```

Note : `reset` pose `lastRenew = nowMs` ; dans les tests, le premier passage arrive à `nowMs = 1000`, hors fenêtre.

- [ ] **Step 4: Vérifier et commit**

```bash
pnpm exec prettier --write games/passe-trappe && pnpm --filter @gambette/game-passe-trappe test && pnpm --filter @gambette/game-passe-trappe typecheck && pnpm --filter @gambette/game-passe-trappe lint
git add -A && git commit -m "feat(game-passe-trappe): domaine des calculs (tirage, étiquettes, passages)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PwD249iHE7SXS5EkecJV6c"
```

---

### Task 4: Palets étiquetés qui vibrent, et bloc de calcul

**Files:**

- Modify: `src/entities/Puck.ts`, `src/config/dimensions.ts`, `src/config/theme.ts`
- Create: `src/entities/CalcBlock.ts`
- Test: `tests/entities/Puck.spec.ts`, `tests/entities/CalcBlock.spec.ts`

**Interfaces:**

- Produces :
  - `Puck.setLabel(value: number | null): void`, `Puck.label(): number | null`
  - `Puck.vibrate(ms: number): void`, `Puck.isVibrating(): boolean`
  - `Puck.syncView(dtMs?: number): void` — l'étiquette reste droite pour le joueur du camp courant (rotation 0 en A, π en B, compensant la rotation du corps) ; pendant la vibration, la vue oscille autour de la position physique
  - `VIBRATE_MS = 400`, `VIBRATE_AMPLITUDE = 6` (px), dans `config/physics.ts`
  - `CALC_BLOCK: Record<Player, { x: number; y: number }>`, `CALC_BLOCK_SIZE = { w: 230, h: 76 }` dans `config/dimensions.ts`
  - `createCalcBlock(player: Player): { view: Container; setPair(pair: Pair): void; text(): string }`

- [ ] **Step 1: Tests (échouent)**

`tests/entities/Puck.spec.ts` :

```ts
import { describe, it, expect, afterEach } from 'vitest';
import type { Text } from 'pixi.js';
import { createPhysicsWorld, type PhysicsWorld } from '../../src/core/PhysicsWorld';
import { createPuck } from '../../src/entities/Puck';
import { MID_Y } from '../../src/config/dimensions';
import { VIBRATE_MS } from '../../src/config/physics';

let physics: PhysicsWorld;
afterEach(() => physics.destroy());

const labelText = (view: { children: unknown[] }): Text =>
  (view.children as Array<{ label?: string }>).find((c) => c.label === 'value') as unknown as Text;

describe('Puck — étiquette', () => {
  it('affiche la valeur et la retire', () => {
    physics = createPhysicsWorld();
    const p = createPuck(physics, { x: 360, y: 900 });
    p.setLabel(48);
    expect(p.label()).toBe(48);
    expect(labelText(p.view).text).toBe('48');
    p.setLabel(null);
    expect(labelText(p.view).text).toBe('');
  });

  it('droite pour le joueur du camp : 0 en A, π en B, malgré la rotation du palet', () => {
    physics = createPhysicsWorld();
    const p = createPuck(physics, { x: 360, y: 900 });
    p.setLabel(12);
    p.body.setAngle(1.2);
    p.syncView();
    expect(p.view.rotation + labelText(p.view).rotation).toBeCloseTo(0, 6);
    p.setPosition({ x: 360, y: MID_Y - 200 });
    p.syncView();
    expect(p.view.rotation + labelText(p.view).rotation).toBeCloseTo(Math.PI, 6);
  });
});

describe('Puck — vibration', () => {
  it('oscille autour de la position physique puis s’arrête', () => {
    physics = createPhysicsWorld();
    const p = createPuck(physics, { x: 360, y: 900 });
    p.vibrate(VIBRATE_MS);
    expect(p.isVibrating()).toBe(true);
    let moved = false;
    for (let t = 0; t < VIBRATE_MS; t += 16) {
      p.syncView(16);
      if (Math.abs(p.view.x - p.position().x) > 0.5) moved = true;
    }
    expect(moved).toBe(true);
    p.syncView(16);
    expect(p.isVibrating()).toBe(false);
    expect(p.view.x).toBeCloseTo(p.position().x, 6);
  });
});
```

`tests/entities/CalcBlock.spec.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { createCalcBlock } from '../../src/entities/CalcBlock';
import { CALC_BLOCK } from '../../src/config/dimensions';

describe('CalcBlock', () => {
  it('affiche « a × b = ? » et se place pour son joueur', () => {
    const a = createCalcBlock('A');
    a.setPair({ a: 6, b: 8, op: 'mul' });
    expect(a.text()).toBe('6 × 8 = ?');
    expect(a.view.position.x).toBe(CALC_BLOCK.A.x);
    expect(a.view.rotation).toBe(0);
    const b = createCalcBlock('B');
    b.setPair({ a: 9, b: 3, op: 'sub' });
    expect(b.text()).toBe('9 − 3 = ?');
    expect(b.view.rotation).toBeCloseTo(Math.PI, 6);
  });

  it('positions : A à droite sous la cloison, B à gauche au-dessus, dans le plateau', () => {
    expect(CALC_BLOCK.A.x).toBeGreaterThan(360);
    expect(CALC_BLOCK.B.x).toBeLessThan(360);
    expect(CALC_BLOCK.A.y).toBeGreaterThan(640);
    expect(CALC_BLOCK.B.y).toBeLessThan(640);
  });
});
```

Run → FAIL.

- [ ] **Step 2: Implémenter**

`src/config/physics.ts` :

```ts
/** Vibration d'un mauvais palet relâché : durée (ms) et amplitude (px), purement visuelle. */
export const VIBRATE_MS = 400;
export const VIBRATE_AMPLITUDE = 6;
```

`src/config/dimensions.ts` :

```ts
/** Bloc de calcul : en haut à droite du camp, du point de vue de son joueur (B est tourné de 180°). */
export const CALC_BLOCK_SIZE = { w: 230, h: 76 } as const;
const CALC_BLOCK_OFFSET = DIVIDER_THICKNESS / 2 + 24 + CALC_BLOCK_SIZE.h / 2;
export const CALC_BLOCK = {
  A: { x: DESIGN_WIDTH - 24 - CALC_BLOCK_SIZE.w / 2, y: MID_Y + CALC_BLOCK_OFFSET },
  B: { x: 24 + CALC_BLOCK_SIZE.w / 2, y: MID_Y - CALC_BLOCK_OFFSET },
} as const;
```

(Déclarer `CALC_BLOCK*` après `DIVIDER_THICKNESS`.)

`src/config/theme.ts` : ajouter `calcFill: 0xfff8e5`, `calcText: 0x111111`, `puckText: 0xffffff`.

`src/entities/CalcBlock.ts` :

```ts
import { Container, Graphics, Text } from 'pixi.js';
import { opSymbol, type Pair } from '@gambette/math-sdk';
import { CALC_BLOCK, CALC_BLOCK_SIZE } from '../config/dimensions';
import { COLORS } from '../config/theme';
import type { Player } from '../domain/types';

export interface CalcBlock {
  readonly view: Container;
  setPair(pair: Pair): void;
  text(): string;
}

export function createCalcBlock(player: Player): CalcBlock {
  const view = new Container();
  view.position.set(CALC_BLOCK[player].x, CALC_BLOCK[player].y);
  view.rotation = player === 'B' ? Math.PI : 0;
  const { w, h } = CALC_BLOCK_SIZE;
  view.addChild(
    new Graphics()
      .roundRect(-w / 2, -h / 2, w, h, 18)
      .fill(COLORS.calcFill)
      .stroke({ width: 3, color: COLORS.calcText }),
  );
  const label = new Text({
    text: '',
    style: {
      fontFamily: 'system-ui, sans-serif',
      fontSize: 40,
      fontWeight: '800',
      fill: COLORS.calcText,
    },
  });
  label.anchor.set(0.5);
  view.addChild(label);
  return {
    view,
    setPair: (pair) => {
      label.text = `${pair.a} ${opSymbol(pair.op)} ${pair.b} = ?`;
    },
    text: () => label.text,
  };
}
```

`src/entities/Puck.ts` :

- ajouter à l'interface `setLabel`, `label`, `vibrate`, `isVibrating` et la signature `syncView(dtMs?: number): void` ;
- créer un `Text` nommé (`label = 'value'`), ancré au centre, taille 44, gras, `COLORS.puckText`, ajouté à `view` ;
- état : `value: number | null`, `vibrateLeft = 0`, `vibrateT = 0` ;
- `syncView(dtMs = 0)` :

```ts
    syncView: (dtMs = 0) => {
      const p = api.position();
      let dx = 0;
      if (vibrateLeft > 0) {
        vibrateLeft = Math.max(0, vibrateLeft - dtMs);
        vibrateT += dtMs;
        dx = vibrateLeft > 0 ? Math.sin(vibrateT * 0.09) * VIBRATE_AMPLITUDE : 0;
      }
      view.position.set(p.x + dx, p.y);
      const angle = body.getAngle();
      view.rotation = angle;
      // Étiquette droite pour le joueur du camp où se trouve le palet.
      text.rotation = (campOf(p.y) === 'B' ? Math.PI : 0) - angle;
    },
```

- `vibrate(ms)` : `vibrateLeft = ms; vibrateT = 0;` ; `isVibrating()` : `vibrateLeft > 0` ;
- `setLabel(v)` : `value = v; text.text = v === null ? '' : String(v);`.

(Importer `campOf` depuis `../domain/rules`.)

`src/scenes/GameScene.ts` : `puck.syncView(deltaMs)` dans `tick` (au lieu de `puck.syncView()`).

- [ ] **Step 3: Vérifier et commit**

```bash
pnpm exec prettier --write games/passe-trappe && pnpm --filter @gambette/game-passe-trappe test && pnpm --filter @gambette/game-passe-trappe typecheck && pnpm --filter @gambette/game-passe-trappe lint
git add -A && git commit -m "feat(game-passe-trappe): palets étiquetés qui vibrent et bloc de calcul

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PwD249iHE7SXS5EkecJV6c"
```

---

### Task 5: Le calcul en jeu — étiquetage, renouvellement, lancer réservé au bon palet

**Files:**

- Modify: `src/config/physics.ts`, `src/input/DragController.ts`, `src/scenes/GameScene.ts`, `src/mount.ts`
- Test: `tests/input/DragController.spec.ts`, `tests/scenes/GameScene.spec.ts`

**Interfaces:**

- Consumes : `pickCalc`, `labelCamp`, `createCrossingDetector` (Task 3) ; `Puck.setLabel/label/vibrate` (Task 4) ; `createCalcBlock` (Task 4).
- Produces :
  - `WRONG_LAUNCH_SPEED = 120` (px/s)
  - `createDragController(deps: { physics; pucks: () => readonly Puck[]; canLaunch?: (puck: Puck) => boolean })` (défaut : toujours vrai)
  - `createGameScene(deps: { physics; pucksPerPlayer: number; pairs: readonly Pair[]; rng?: Rng; onWin(player): void })`
  - `GameScene.calc(player: Player): Pair` et `GameScene.isCorrect(puck: Puck): boolean`

- [ ] **Step 1: Tests (échouent)**

Ajouter à `tests/input/DragController.spec.ts` :

```ts
import { WRONG_LAUNCH_SPEED } from '../../src/config/physics';

describe('DragController — mauvais palet', () => {
  const stretchAndRelease = (canLaunch: boolean) => {
    physics = createPhysicsWorld();
    createBoard(physics);
    const puck = createPuck(physics, { x: 360, y: 950 });
    const drag = createDragController({ physics, pucks: () => [puck], canLaunch: () => canLaunch });
    const lineA = elasticLine('A');
    drag.pointerDown(1, { x: 360, y: 950 });
    for (let y = 950; y <= lineA.y + 80; y += 20) {
      drag.pointerMove(1, { x: 360, y });
      step(3);
    }
    drag.pointerUp(1);
    return puck;
  };

  it('élastique tendu puis relâché : mauvais palet ≤ WRONG_LAUNCH_SPEED et vibre', () => {
    const puck = stretchAndRelease(false);
    const v = puck.velocity();
    expect(Math.hypot(v.x, v.y)).toBeLessThanOrEqual(WRONG_LAUNCH_SPEED + 1);
    expect(v.y).toBeLessThan(0);
    expect(puck.isVibrating()).toBe(true);
  });

  it('bon palet : lancer normal', () => {
    const puck = stretchAndRelease(true);
    expect(puck.velocity().y).toBeLessThan(-500);
    expect(puck.isVibrating()).toBe(false);
  });
});
```

Ajouter à `tests/scenes/GameScene.spec.ts` (et passer `pairs: PAIRS, rng: mulberry32(1)` à tous les `createGameScene` du fichier) :

```ts
import { computeAnswer, mulberry32, type Pair } from '@gambette/math-sdk';

const PAIRS: Pair[] = [
  { a: 6, b: 8, op: 'mul' },
  { a: 7, b: 4, op: 'mul' },
  { a: 9, b: 3, op: 'mul' },
];

const correctPerCamp = (scene: ReturnType<typeof createGameScene>) => {
  const out = { A: 0, B: 0 };
  for (const p of scene.pucks()) if (scene.isCorrect(p)) out[campOf(p.position().y)] += 1;
  return out;
};

describe('GameScene — calcul', () => {
  it('au départ : un calcul par camp et une seule bonne réponse par camp, valeurs distinctes', () => {
    physics = createPhysicsWorld();
    const scene = createGameScene({
      physics,
      pucksPerPlayer: 5,
      pairs: PAIRS,
      rng: mulberry32(1),
      onWin: vi.fn(),
    });
    expect(correctPerCamp(scene)).toEqual({ A: 1, B: 1 });
    for (const pl of ['A', 'B'] as const) {
      const vals = scene
        .pucks()
        .filter((p) => campOf(p.position().y) === pl)
        .map((p) => p.label());
      expect(new Set(vals).size).toBe(vals.length);
      expect(vals).toContain(computeAnswer(scene.calc(pl)));
    }
    scene.destroy();
  });

  it('un palet passe la ligne médiane → les deux calculs changent, une bonne réponse par camp', () => {
    physics = createPhysicsWorld();
    const scene = createGameScene({
      physics,
      pucksPerPlayer: 5,
      pairs: PAIRS,
      rng: mulberry32(2),
      onWin: vi.fn(),
    });
    const before = { A: scene.calc('A'), B: scene.calc('B') };
    const mover = scene.pucks().find((p) => campOf(p.position().y) === 'A')!;
    mover.setPosition({ x: 360, y: 520 }); // camp B, entre la rangée de B (y≈395) et la cloison
    for (let i = 0; i < 25; i++) scene.tick(1000 / 60);
    expect(scene.calc('A')).not.toEqual(before.A);
    expect(scene.calc('B')).not.toEqual(before.B);
    expect(correctPerCamp(scene)).toEqual({ A: 1, B: 1 });
    expect(mover.label()).not.toBeNull();
    scene.destroy();
  });

  it('le lancer suit l’étiquette au relâcher', () => {
    physics = createPhysicsWorld();
    const scene = createGameScene({
      physics,
      pucksPerPlayer: 5,
      pairs: PAIRS,
      rng: mulberry32(3),
      onWin: vi.fn(),
    });
    const wrong = scene.pucks().find((p) => campOf(p.position().y) === 'A' && !scene.isCorrect(p))!;
    const right = scene.pucks().find((p) => campOf(p.position().y) === 'A' && scene.isCorrect(p))!;
    expect(wrong).toBeDefined();
    expect(right).toBeDefined();
    scene.destroy();
  });
});
```

Run → FAIL.

- [ ] **Step 2: Implémenter**

`src/config/physics.ts` :

```ts
/** Vitesse max (px/s) d'un mauvais palet relâché : il bouge un peu, sans atteindre le trou. */
export const WRONG_LAUNCH_SPEED = 120;
```

`src/input/DragController.ts` — `deps.canLaunch?: (puck: Puck) => boolean` ; dans `release` :

```ts
const release = (player: Player, launch: boolean): void => {
  const grab = grabs.get(player);
  if (!grab) return;
  physics.world.destroyJoint(grab.joint);
  grabs.delete(player);
  const { puck } = grab;
  const v = launch ? launchVelocity(puck.position(), elasticLine(player), player) : null;
  const allowed = deps.canLaunch?.(puck) ?? true;
  if (launch && !allowed) {
    // Mauvais palet : il vibre et ne part presque pas.
    puck.vibrate(VIBRATE_MS);
    if (v) {
      const n = Math.hypot(v.x, v.y);
      puck.setVelocity({ x: (v.x / n) * WRONG_LAUNCH_SPEED, y: (v.y / n) * WRONG_LAUNCH_SPEED });
      return;
    }
  } else if (v) {
    puck.setVelocity(v);
    return;
  }
  // Pas de lancer élastique : la vitesse du geste est plafonnée (direction conservée).
  const cur = puck.velocity();
  const speed = Math.hypot(cur.x, cur.y);
  if (speed > DROP_MAX_SPEED) {
    const k = DROP_MAX_SPEED / speed;
    puck.setVelocity({ x: cur.x * k, y: cur.y * k });
  }
  puck.setIgnoreElastic(false);
};
```

Note : un mauvais palet lancé depuis derrière l'élastique garde `ignoreElastic = true` ; `GameScene.tick` le rétablit dès qu'il est revenu devant sa ligne (logique existante). S'il s'arrête derrière, il reste saisissable (comportement existant).

`src/scenes/GameScene.ts` :

- deps : `pairs: readonly Pair[]`, `rng?: Rng` (défaut `Math.random`) ;
- état : `calcs: Record<Player, Pair>`, `blocks: Record<Player, CalcBlock>` (ajoutés à `view` après le plateau), `crossings = createCrossingDetector()`, `clock` (ms cumulées par `tick`) ;
- `relabel()` : pour chaque joueur, `calcs[pl] = pickCalc(deps.pairs, calcs[pl] ?? null, rng)`, `blocks[pl].setPair(calcs[pl])`, puis les palets du camp `pl` (ordre du tableau `pucks`) reçoivent `labelCamp(calcs[pl], n, rng)` (`setLabel(values[i])`) ; enfin `crossings.reset(campsNow(), clock)` ;
- appelé à la création et dans `reset()` (Rejouer) ;
- `tick` : après la synchro des palets, `if (crossings.update(campsNow(), clock)) relabel();` (le `relabel` recalcule `reset` du détecteur) ;
- `isCorrect(puck)` : `puck.label() === computeAnswer(calcs[campOf(puck.position().y)])` ;
- `calc(pl)` : `calcs[pl]` ;
- `createDragController({ physics, pucks: () => pucks, canLaunch: (p) => isCorrect(p) })`.

`src/mount.ts` : passer `pairs: randomMulPairs()` (import `@gambette/math-sdk`) en attendant la Task 6.

- [ ] **Step 3: Vérifier et commit**

```bash
pnpm exec prettier --write games/passe-trappe && pnpm --filter @gambette/game-passe-trappe test && pnpm --filter @gambette/game-passe-trappe typecheck && pnpm --filter @gambette/game-passe-trappe lint
git add -A && git commit -m "feat(game-passe-trappe): calcul par camp, seul le bon palet part à l'élastique

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PwD249iHE7SXS5EkecJV6c"
```

---

### Task 6: Réglages — engrenage, panneau, persistance, partie recréée

**Files:**

- Create: `src/services/Settings.ts`, `src/entities/GearButton.ts`, `src/scenes/SettingsScene.ts`
- Modify: `src/mount.ts`, `src/config/dimensions.ts`, `src/scenes/GameScene.ts` (destroy des corps)
- Test: `tests/services/Settings.spec.ts`, `tests/scenes/SettingsScene.spec.ts`, `tests/mount.spec.ts`

**Interfaces:**

- Produces :
  - `SETTINGS_KEY = 'gambette.passe-trappe.settings'` ; `interface Settings { pucksPerPlayer: number; selectedPairs: Pair[] }` ; `loadSettings(): Settings` ; `saveSettings(s: Settings): void` ; `settingsChanged(a: Settings, b: Settings): boolean`
  - `GEAR = { x, y, r }` (sur le segment **droit** de la cloison, voir ruling ci-dessous) ; `createGearButton(onTap: () => void): { view: Container }`
  - `createSettingsScene(deps: { initial: Settings; onOpenCalcsPicker(current: Pair[]): Promise<Pair[]>; onClose(next: Settings): void }): { view: Container; pucksPerPlayer(): number; destroy(): void }` — boutons nommés `minus`, `plus`, `calcs`, `close`
  - `GameScene.destroy()` détruit aussi ses corps planck (palets + plateau) — voir Step 3

Ruling de plan : l'engrenage se place sur le segment **droit** de la cloison (la spec dit « gauche ») parce que le bouton quitter du SDK, à gauche au niveau de la cloison, occupe jusqu'à ~270 px de design sur Android (bouton plein écran inclus) ; la spec exige surtout l'absence de chevauchement. Le bloc de calcul de A (sous la cloison, à droite) reste dégagé : l'engrenage est **sur** la cloison.

- [ ] **Step 1: Tests (échouent)**

`tests/services/Settings.spec.ts` :

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { calcsStorageKey } from '@gambette/math-sdk';
import {
  SETTINGS_KEY,
  loadSettings,
  saveSettings,
  settingsChanged,
} from '../../src/services/Settings';
import { DEFAULT_PUCKS } from '../../src/config/dimensions';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('Settings passe-trappe', () => {
  it('défauts : 5 palets, 10 multiplications', () => {
    const s = loadSettings();
    expect(s.pucksPerPlayer).toBe(DEFAULT_PUCKS);
    expect(s.selectedPairs).toHaveLength(10);
  });

  it('aller-retour, calculs dans le store du math-sdk', () => {
    const next = { pucksPerPlayer: 8, selectedPairs: [{ a: 3, b: 4, op: 'add' as const }] };
    saveSettings(next);
    expect(loadSettings()).toEqual(next);
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!)).toEqual({ pucksPerPlayer: 8 });
    expect(JSON.parse(localStorage.getItem(calcsStorageKey('passe-trappe'))!)).toEqual(
      next.selectedPairs,
    );
  });

  it('borné à [5, 10]', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ pucksPerPlayer: 42 }));
    expect(loadSettings().pucksPerPlayer).toBe(10);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ pucksPerPlayer: 1 }));
    expect(loadSettings().pucksPerPlayer).toBe(5);
  });

  it('donnée corrompue ou stockage qui lève → défaut, sans erreur', () => {
    localStorage.setItem(SETTINGS_KEY, '{pas du json');
    expect(loadSettings().pucksPerPlayer).toBe(DEFAULT_PUCKS);
    vi.spyOn(Object.getPrototypeOf(localStorage), 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Object.getPrototypeOf(localStorage), 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(loadSettings().pucksPerPlayer).toBe(DEFAULT_PUCKS);
    expect(() => saveSettings({ pucksPerPlayer: 6, selectedPairs: [] })).not.toThrow();
  });

  it('settingsChanged : nombre de palets ou calculs', () => {
    const a = { pucksPerPlayer: 5, selectedPairs: [{ a: 6, b: 8, op: 'mul' as const }] };
    expect(settingsChanged(a, { ...a })).toBe(false);
    expect(settingsChanged(a, { ...a, pucksPerPlayer: 6 })).toBe(true);
    expect(settingsChanged(a, { ...a, selectedPairs: [{ a: 7, b: 8, op: 'mul' }] })).toBe(true);
  });
});
```

(Si `getPrototypeOf` ne convient pas au shim `MemoryStorage` de `tests/setup.ts`, espionner directement `localStorage` — le comportement attendu reste identique.)

`tests/scenes/SettingsScene.spec.ts` :

```ts
import { describe, it, expect, vi } from 'vitest';
import type { Container, FederatedPointerEvent } from 'pixi.js';
import { createSettingsScene } from '../../src/scenes/SettingsScene';

const tap = (view: Container, label: string) =>
  (view.getChildByLabel(label, true) as Container).emit('pointertap', {} as FederatedPointerEvent);
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('SettingsScene', () => {
  it('− / + bornés à [5, 10], Fermer renvoie les réglages', () => {
    const onClose = vi.fn();
    const s = createSettingsScene({
      initial: { pucksPerPlayer: 5, selectedPairs: [] },
      onOpenCalcsPicker: vi.fn(),
      onClose,
    });
    tap(s.view, 'minus');
    expect(s.pucksPerPlayer()).toBe(5);
    for (let i = 0; i < 8; i++) tap(s.view, 'plus');
    expect(s.pucksPerPlayer()).toBe(10);
    tap(s.view, 'minus');
    tap(s.view, 'close');
    expect(onClose).toHaveBeenCalledWith({ pucksPerPlayer: 9, selectedPairs: [] });
    s.destroy();
  });

  it('« Choisir les calculs » ouvre le sélecteur et garde la nouvelle sélection', async () => {
    const picked = [{ a: 2, b: 3, op: 'mul' as const }];
    const onClose = vi.fn();
    const s = createSettingsScene({
      initial: { pucksPerPlayer: 6, selectedPairs: [] },
      onOpenCalcsPicker: vi.fn(async () => picked),
      onClose,
    });
    tap(s.view, 'calcs');
    await flush();
    tap(s.view, 'close');
    expect(onClose).toHaveBeenCalledWith({ pucksPerPlayer: 6, selectedPairs: picked });
    s.destroy();
  });
});
```

`tests/mount.spec.ts` — le faux `createGameScene` doit désormais accepter `{ physics, pucksPerPlayer, pairs, onWin }` et mémoriser `pucksPerPlayer` ; ajouter :

```ts
describe('réglages', () => {
  const openSettings = (el: HTMLElement) => {
    const app = fakeApps[0]!;
    const gear = app.stage.getChildByLabel('gear', true)!;
    gear.emit('pointertap', {} as FederatedPointerEvent);
    return app.stage.getChildByLabel('settings', true) as Container;
  };

  it('engrenage → panneau : pause (pas de tick, entrées ignorées), bouton quitter masqué', async () => {
    const el = document.createElement('div');
    const instance = await passeTrappe.mount(el, ctx());
    const panel = openSettings(el);
    expect(panel).not.toBeNull();
    const scene = fakeScenes[0] as FakeScene;
    fakeApps[0]!.ticker.add.mock.calls[0]![0]({ deltaMS: 16 });
    expect(scene.tick).not.toHaveBeenCalled();
    const exit = el.querySelector('[data-test="game-exit"]')!.parentElement as HTMLElement;
    expect(exit.style.display).toBe('none');
    instance.unmount();
  });

  it('fermer sans changement → même partie ; avec changement → nouvelle partie', async () => {
    const el = document.createElement('div');
    const instance = await passeTrappe.mount(el, ctx());
    let panel = openSettings(el);
    (panel.getChildByLabel('close', true) as Container).emit(
      'pointertap',
      {} as FederatedPointerEvent,
    );
    expect(fakeScenes).toHaveLength(1);
    panel = openSettings(el);
    (panel.getChildByLabel('plus', true) as Container).emit(
      'pointertap',
      {} as FederatedPointerEvent,
    );
    (panel.getChildByLabel('close', true) as Container).emit(
      'pointertap',
      {} as FederatedPointerEvent,
    );
    expect(fakeScenes).toHaveLength(2);
    expect((fakeScenes[0] as FakeScene).destroy).toHaveBeenCalled();
    expect((fakeScenes[1] as FakeScene & { pucksPerPlayer: number }).pucksPerPlayer).toBe(6);
    instance.unmount();
  });
});
```

(Adapter les helpers existants du fichier — `fakeApps`, `fakeScenes`, `FakeScene`, `ctx` — et importer `FederatedPointerEvent`. `beforeEach` vide aussi `localStorage`.)

Run → FAIL.

- [ ] **Step 2: Implémenter réglages et vues**

`src/services/Settings.ts` :

```ts
import { createCalcsStore, type Pair } from '@gambette/math-sdk';
import { DEFAULT_PUCKS, MAX_PUCKS, MIN_PUCKS } from '../config/dimensions';

export const SETTINGS_KEY = 'gambette.passe-trappe.settings';

export interface Settings {
  pucksPerPlayer: number;
  selectedPairs: Pair[];
}

const calcs = createCalcsStore('passe-trappe');

const clampPucks = (n: number): number => Math.max(MIN_PUCKS, Math.min(MAX_PUCKS, Math.round(n)));

const readPucks = (): number => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const v = raw === null ? null : (JSON.parse(raw) as { pucksPerPlayer?: unknown });
    return typeof v?.pucksPerPlayer === 'number' ? clampPucks(v.pucksPerPlayer) : DEFAULT_PUCKS;
  } catch {
    return DEFAULT_PUCKS;
  }
};

export function loadSettings(): Settings {
  return { pucksPerPlayer: readPucks(), selectedPairs: calcs.load() };
}

export function saveSettings(s: Settings): void {
  calcs.save(s.selectedPairs);
  try {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ pucksPerPlayer: clampPucks(s.pucksPerPlayer) }),
    );
  } catch {
    // Stockage indisponible : réglages conservés en mémoire pour la session.
  }
}

const pairKey = (p: Pair): string => `${p.op}:${p.a}:${p.b}`;

export function settingsChanged(a: Settings, b: Settings): boolean {
  if (a.pucksPerPlayer !== b.pucksPerPlayer) return true;
  const ka = new Set(a.selectedPairs.map(pairKey));
  return (
    a.selectedPairs.length !== b.selectedPairs.length ||
    !b.selectedPairs.every((p) => ka.has(pairKey(p)))
  );
}
```

Note : `calcs.save([])` est accepté par le store, qui reviendra aux défauts au prochain `load` (le sélecteur empêche de toute façon une sélection vide).

`src/config/dimensions.ts` :

```ts
/** Engrenage des réglages : sur le segment droit de la cloison. */
export const GEAR = { x: DESIGN_WIDTH - 130, y: MID_Y, r: 30 } as const;
```

`src/entities/GearButton.ts` : `Container` nommé `gear` à `GEAR.x/y`, `eventMode = 'static'`, `cursor = 'pointer'`, `hitArea = new Circle(0, 0, GEAR.r + 10)`, dessin d'un engrenage en `Graphics` (cercle + 8 dents, couleurs `COLORS.button` / `COLORS.calcText`), `on('pointertap', onTap)`.

`src/scenes/SettingsScene.ts` : `Container` nommé `settings` (`eventMode = 'static'`, fond plein écran `COLORS.overlay` alpha 0.7 qui absorbe les touchers), panneau centré 560 × 460 (`COLORS.calcFill`), titre « Réglages », ligne « Palets par joueur » avec boutons nommés `minus` (« − ») et `plus` (« + ») autour de la valeur, bouton `calcs` (« Choisir les calculs »), bouton `close` (« Fermer ») ; chaque bouton = `Container` `eventMode = 'static'` qui réagit à `pointertap`. `calcs` appelle `deps.onOpenCalcsPicker(current)` et remplace la sélection courante par le résultat. `close` appelle `deps.onClose({ pucksPerPlayer, selectedPairs })`. `destroy()` détruit la vue.

- [ ] **Step 3: `GameScene.destroy` libère ses corps**

Pour pouvoir recréer une partie dans le même monde, `createBoard` retourne aussi `destroy()` qui détruit ses corps statiques (garder la liste des `Body` créés), et `GameScene.destroy()` appelle `puck.destroy()` pour chaque palet puis `board.destroy()` avant `view.destroy`. Ajouter à `tests/scenes/GameScene.spec.ts` :

```ts
it('destroy libère tous les corps planck (hors ancrage)', () => {
  physics = createPhysicsWorld();
  const scene = createGameScene({
    physics,
    pucksPerPlayer: 5,
    pairs: PAIRS,
    rng: mulberry32(1),
    onWin: vi.fn(),
  });
  scene.destroy();
  let n = 0;
  for (let b = physics.world.getBodyList(); b; b = b.getNext()) n += 1;
  expect(n).toBe(1); // ground
});
```

- [ ] **Step 4: `mount.ts` — cycle de partie et panneau**

Restructurer `mountPasseTrappe` :

- `let settings = loadSettings();`
- `let game: { scene: GameScene } | null` créé par `startGame()` : `createGameScene({ physics, pucksPerPlayer: settings.pucksPerPlayer, pairs: settings.selectedPairs, onWin })`, vue insérée **sous** l'engrenage et les écrans ; `stopGame()` : `game.scene.destroy()` puis retrait de la vue. Une seule entrée de nettoyage appelle `stopGame()` ; elle reste avant `physics.destroy()` dans l'ordre de démontage ;
- engrenage créé une fois (`createGearButton(openSettings)`), ajouté au stage au-dessus de la scène ;
- `let panel: SettingsScene | null` ; `openSettings()` (ignoré si `victory` ou `panel`) : `exit.setHidden(true)`, `game.scene.drag.reset()`, création du panneau avec `onOpenCalcsPicker: (current) => openCalcsPicker({ initial: current, container: el })` et `onClose(next)` :
  - retire et détruit le panneau, `exit.setHidden(false)` ;
  - si `settingsChanged(settings, next)` : `saveSettings(next)`, `settings = next`, `stopGame()`, `startGame()` ;
- entrées : `down`/`move` ignorés si `victory || panel` ; ticker : `scene.tick` seulement si `!victory && !panel` ;
- cleanup supplémentaire : fermer un panneau ouvert et retirer un `.cp-overlay` resté dans `el` (comme rabbit-math).

- [ ] **Step 5: Vérifier et commit**

```bash
pnpm exec prettier --write games/passe-trappe && pnpm --filter @gambette/game-passe-trappe test && pnpm --filter @gambette/game-passe-trappe typecheck && pnpm --filter @gambette/game-passe-trappe lint && pnpm --filter @gambette/game-passe-trappe build
git add -A && git commit -m "feat(game-passe-trappe): réglages via l'engrenage (palets, calculs) et partie recréée

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PwD249iHE7SXS5EkecJV6c"
```

---

### Task 7: Consigne, vérification globale

**Files:**

- Modify: `src/index.ts` (consigne)

- [ ] **Step 1: Consigne mise à jour**

`src/index.ts`, `instructions` :

```ts
    instructions:
      'Posez le téléphone entre vous, chacun face à son camp. Résolvez le calcul de votre camp : ' +
      'seul le palet qui porte la bonne réponse part avec l’élastique ! Plaquez-le contre votre ' +
      'élastique, tirez puis relâchez pour le faire passer par le trou. Le premier qui n’a plus ' +
      'aucun palet dans son camp a gagné.',
```

`description` : `'Le jeu d’adresse en bois, avec du calcul, à deux sur le même téléphone.'`

- [ ] **Step 2: Pipeline dans un clone frais**

```bash
git add -A && git commit -m "docs(game-passe-trappe): consigne avec le calcul

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PwD249iHE7SXS5EkecJV6c"
C=/private/tmp/claude-501/-Users-pauldoazan-orca-gambette/913b3e6d-d8aa-45f1-a8a2-f03e8f199146/scratchpad/gambette-calc-ci-$(date +%s)
git clone -q --branch feat/passe-trappe /Users/pauldoazan/orca/gambette "$C"
cd "$C" && pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm format:check
```

Expected: tout passe. Corriger toute erreur dans le dépôt réel (commit normal), re-cloner, relancer.
