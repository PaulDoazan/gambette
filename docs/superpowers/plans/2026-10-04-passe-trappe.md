# Passe-trappe — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ranger les jeux dans `games/`, migrer rabbit-math de matter-js vers planck.js sans changer sa sensation, puis créer le jeu 2 joueurs « passe-trappe » (vue de dessus, multitouch) jouable dans Gambette et en standalone.

**Architecture:** Les jeux deviennent des packages `games/<jeu>/` (noms npm inchangés). `game-sdk` gagne le verrou d'orientation (déplacé de rabbit-math) et un placement latéral du bouton quitter. Rabbit-math garde une API physique **en pixels** au-dessus de planck (vitesses en « px par frame à 60 fps » comme sous matter-js) ; un test de trajectoires de référence enregistré sous matter-js garantit l'équivalence. Le passe-trappe sépare un domaine pur (élastique, règles, routage des doigts) d'une couche planck/Pixi ; la physique est testée avec un vrai monde planck sous Node.

**Tech Stack:** pnpm 10, Turborepo 2, TypeScript, Vitest 4 + jsdom (jeux), Pixi.js 8, planck 1.5 (Box2D), Vite 8, Nuxt 4.

**Spec:** `docs/superpowers/specs/2026-10-04-passe-trappe-design.md`

## Global Constraints

- Jeux sous `games/<jeu>/` ; `packages/` ne contient que `game-sdk` et `math-sdk`. Noms npm : `@gambette/game-rabbit-math`, `@gambette/game-passe-trappe`.
- Une seule bibliothèque physique : `planck` `^1.5.0`. `matter-js` et `@types/matter-js` absents du dépôt à la fin.
- Ports dev standalone fixes, `strictPort: true` : rabbit-math **5101**, passe-trappe **5102**. Scripts racine `dev:rabbit-math`, `dev:passe-trappe`.
- Passe-trappe : résolution logique **720 × 1280** ; 5 palets par camp ; palet rayon 28 px ; trou ≈ 1,6 × diamètre ; victoire = camp vide **1 s d'affilée** ; un palet tenu par joueur ; un toucher appartient à la moitié d'écran où il commence.
- Clé du jeu : `'passe-trappe'`. Joueurs : `'A'` (bas) et `'B'` (haut).
- Rabbit-math : non-régression des trajectoires ≤ **4 px** par échantillon.
- Langue du code, des commentaires et des tests : **français** (accents conservés).
- Style Prettier racine (`singleQuote`, `printWidth: 100`, `trailingComma: all`).
- Commits : un par tâche (ou par changement logique), messages conventionnels en français, terminés par :
  `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01PwD249iHE7SXS5EkecJV6c`
- Travail sur la branche `feat/passe-trappe` ; ne pas pousser.

## Review Focus

1. **Palet tiré si vite qu'il traverse la cloison ou un mur** → jamais : CCD (`bullet`). Test : Task 6 (« palet très rapide contre la cloison »).
2. **Deux doigts du même joueur, ou un doigt qui glisse dans l'autre moitié** → un seul palet tenu ; le palet reste dans son camp (clamp). Tests : Task 5 (`touchRouting`, `clampToCamp`) + Task 7 (`DragController`).
3. **Palet qui traverse puis revient par rebond** → pas de victoire prématurée (délai 1 s remis à zéro). Test : Task 5 (`rules`).
4. **Palet poussé derrière l'élastique par un autre palet / palet tiré qui repart en avant** → l'élastique bloque les palets non tenus, et ne bloque pas le palet qu'on vient de lancer. Test : Task 7 (`GameScene` : palet libre bloqué par l'élastique ; palet lancé franchit la ligne).
5. **Rejouer puis rejouer encore / quitter pendant la partie** → palets et détecteur réinitialisés, aucune fuite (joints, écouteurs, canvas). Tests : Task 8 (`mount.spec.ts` double cycle, `GameScene.reset`).

---

## File Structure

```
games/rabbit-math/                       (déplacé depuis packages/game-rabbit-math)
  src/core/PhysicsWorld.ts               planck + conversion px (réécrit Task 4)
  src/entities/Carrot.ts                 corps créé par le monde (Task 4)
  src/systems/TrajectoryPreview.ts       simulation via PhysicsWorld jetable (Task 4)
  src/scenes/gameRound.ts, gameRoundCleanup.ts   API PxBody (Task 4)
  tests/core/trajectory.golden.spec.ts + tests/fixtures/trajectories.golden.json (Task 3)
packages/game-sdk/src/orientation-lock.ts (Task 2) ; exit-button.ts placement (Task 2)
games/passe-trappe/
  package.json, tsconfig.json, vite.config.ts (5102), vitest.config.ts, index.html
  src/index.ts, mount.ts, standalone-entry.ts
  src/config/{dimensions,physics,theme}.ts
  src/core/{App,PhysicsWorld}.ts
  src/domain/{types,elastic,rules,touchRouting}.ts
  src/entities/{Board,Puck,Elastic}.ts
  src/input/DragController.ts
  src/scenes/{GameScene,VictoryScene}.ts
  tests/{setup.ts, domain/*.spec.ts, physics/*.spec.ts, input/*.spec.ts, scenes/*.spec.ts, mount.spec.ts}
apps/web/games.ts, lib/gameCosmetics.ts, test/games.test.ts (Task 9)
```

---

### Task 1: Ranger rabbit-math dans `games/` + dev standalone sur port fixe

**Files:**

- Move: `packages/game-rabbit-math/` → `games/rabbit-math/`
- Modify: `pnpm-workspace.yaml`, `package.json` (racine), `games/rabbit-math/vite.config.ts`

**Interfaces:**

- Produces: package `@gambette/game-rabbit-math` à `games/rabbit-math` (exports inchangés) ; script racine `dev:rabbit-math`.

- [ ] **Step 1: Branche**

```bash
cd /Users/pauldoazan/orca/gambette && git switch -c feat/passe-trappe
```

- [ ] **Step 2: Déplacer**

```bash
mkdir -p games && git mv packages/game-rabbit-math games/rabbit-math
```

`pnpm-workspace.yaml` :

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'games/*'
```

Dans `package.json` racine, ajouter aux `scripts` :

```json
"dev:rabbit-math": "pnpm --filter @gambette/game-rabbit-math dev",
"dev:passe-trappe": "pnpm --filter @gambette/game-passe-trappe dev"
```

`games/rabbit-math/vite.config.ts` :

```ts
import { defineConfig } from 'vite';

// Build standalone (jouer hors plateforme). La plateforme consomme src/ directement.
export default defineConfig({
  base: './',
  resolve: { alias: { '@': '/src' } },
  server: { port: 5101, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true },
});
```

- [ ] **Step 3: Réinstaller et vérifier**

```bash
pnpm install && grep -rn "packages/game-rabbit-math" --exclude-dir=node_modules --exclude-dir=.git --exclude=pnpm-lock.yaml . ; pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Expected: le `grep` ne renvoie que des lignes de `docs/` (historique, à laisser) ; tout le reste passe.

- [ ] **Step 4: Vérifier le dev standalone**

```bash
(pnpm dev:rabbit-math > /tmp/rm-dev.log 2>&1 &) ; for i in $(seq 1 30); do curl -s -o /dev/null -w "%{http_code}" http://localhost:5101/ | grep -q 200 && break; sleep 1; done; curl -s http://localhost:5101/ | grep -o "<title>[^<]*</title>"; pkill -f "vite.*5101" || pkill -f "game-rabbit-math.*vite" || true
```

Expected: `<title>Bunny Academy</title>` (titre de l'`index.html` standalone). Arrêter le serveur ensuite (vérifier avec `lsof -nP -iTCP:5101 -sTCP:LISTEN` qu'il n'écoute plus).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "refactor(games): range rabbit-math dans games/ avec un port de dev fixe

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PwD249iHE7SXS5EkecJV6c"
```

---

### Task 2: `game-sdk` — verrou d'orientation partagé + bouton quitter latéral

**Files:**

- Create: `packages/game-sdk/src/orientation-lock.ts`, `packages/game-sdk/test/orientation-lock.test.ts`
- Modify: `packages/game-sdk/src/exit-button.ts`, `packages/game-sdk/src/index.ts`, `packages/game-sdk/test/exit-button.test.ts`
- Modify: `games/rabbit-math/src/mount.ts`
- Delete: `games/rabbit-math/src/ui/OrientationLock.ts`, `games/rabbit-math/tests/ui/OrientationLock.spec.ts`

**Interfaces:**

- Produces (`@gambette/game-sdk`) :
  - `type Orientation = 'landscape' | 'portrait'`
  - `installOrientationLock(parent: HTMLElement, required: Orientation): () => void`
  - `createExitButton(parent, onExit, opts?: { fullscreen?: boolean; placement?: 'top' | 'side' })`

- [ ] **Step 1: Tests (échouent)**

`packages/game-sdk/test/orientation-lock.test.ts` :

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { installOrientationLock } from '../src/orientation-lock';

const setViewport = (w: number, h: number): void => {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true });
};

afterEach(() => vi.restoreAllMocks());

describe('installOrientationLock', () => {
  it('paysage requis : overlay visible en portrait, masqué en paysage', () => {
    const parent = document.createElement('div');
    setViewport(400, 800);
    const dispose = installOrientationLock(parent, 'landscape');
    const overlay = parent.firstElementChild as HTMLElement;
    expect(overlay.style.display).toBe('flex');
    setViewport(800, 400);
    window.dispatchEvent(new Event('resize'));
    expect(overlay.style.display).toBe('none');
    dispose();
  });

  it('portrait requis : overlay visible en paysage, masqué en portrait', () => {
    const parent = document.createElement('div');
    setViewport(800, 400);
    const dispose = installOrientationLock(parent, 'portrait');
    const overlay = parent.firstElementChild as HTMLElement;
    expect(overlay.style.display).toBe('flex');
    expect(overlay.textContent).toContain('verticale');
    setViewport(400, 800);
    window.dispatchEvent(new Event('orientationchange'));
    expect(overlay.style.display).toBe('none');
    dispose();
  });

  it('dispose retire l’overlay et ses écouteurs', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const parent = document.createElement('div');
    const dispose = installOrientationLock(parent, 'landscape');
    dispose();
    expect(parent.children).toHaveLength(0);
    for (const type of ['resize', 'orientationchange']) {
      const handler = add.mock.calls.find((c) => c[0] === type)![1];
      expect(remove).toHaveBeenCalledWith(type, handler);
    }
  });
});
```

Ajouter à `packages/game-sdk/test/exit-button.test.ts` :

```ts
describe('createExitButton — placement', () => {
  it('top par défaut : centré en haut', () => {
    const parent = document.createElement('div');
    const btn = createExitButton(parent, () => {});
    const wrap = parent.firstElementChild as HTMLElement;
    expect(wrap.style.top).toBe('12px');
    expect(wrap.style.left).toBe('50%');
    btn.dispose();
  });

  it('side : bord gauche, centré verticalement', () => {
    const parent = document.createElement('div');
    const btn = createExitButton(parent, () => {}, { placement: 'side' });
    const wrap = parent.firstElementChild as HTMLElement;
    expect(wrap.style.left).toBe('12px');
    expect(wrap.style.top).toBe('50%');
    expect(wrap.style.transform).toBe('translateY(-50%)');
    btn.dispose();
  });
});
```

Run: `pnpm --filter @gambette/game-sdk test`
Expected: FAIL (`../src/orientation-lock` introuvable ; placement `side` ignoré).

- [ ] **Step 2: Implémenter**

`packages/game-sdk/src/orientation-lock.ts` :

```ts
export type Orientation = 'landscape' | 'portrait';

const MESSAGES: Record<Orientation, string> = {
  landscape: 'Tourne ton téléphone pour jouer 🔄',
  portrait: 'Tourne ton téléphone à la verticale pour jouer 🔄',
};

const OVERLAY_CSS = `
  position: fixed; inset: 0; background: #111; color: #fff8e5;
  display: none; align-items: center; justify-content: center;
  font-family: ui-rounded, system-ui, sans-serif; font-size: 22px;
  z-index: 9999; text-align: center; padding: 24px;
`;

/**
 * Overlay plein écran demandant de tourner le téléphone quand l'orientation
 * courante ne convient pas au jeu. Retourne une fonction qui retire l'overlay
 * et ses écouteurs.
 */
export function installOrientationLock(parent: HTMLElement, required: Orientation): () => void {
  const overlay = document.createElement('div');
  overlay.style.cssText = OVERLAY_CSS;
  overlay.textContent = MESSAGES[required];
  parent.appendChild(overlay);

  const update = (): void => {
    const portrait = window.innerHeight > window.innerWidth;
    const wrong = required === 'landscape' ? portrait : !portrait;
    overlay.style.display = wrong ? 'flex' : 'none';
  };
  update();
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
  return () => {
    window.removeEventListener('resize', update);
    window.removeEventListener('orientationchange', update);
    overlay.remove();
  };
}
```

`packages/game-sdk/src/index.ts` : ajouter `export * from './orientation-lock';`.

Dans `packages/game-sdk/src/exit-button.ts` :

- signature : `opts: { fullscreen?: boolean; placement?: 'top' | 'side' } = {}` ;
- remplacer l'affectation de `wrap.style.cssText` par :

```ts
const position =
  (opts.placement ?? 'top') === 'side'
    ? 'position:absolute;left:12px;top:50%;transform:translateY(-50%);'
    : 'position:absolute;top:12px;left:50%;transform:translateX(-50%);';
wrap.style.cssText = position + 'z-index:6;display:flex;align-items:center;gap:8px;';
```

- JSDoc : ajouter « `opts.placement: 'side'` place le bouton sur le bord gauche, centré verticalement (jeux dont le haut d'écran est une zone de jeu). »

- [ ] **Step 3: Adopter dans rabbit-math**

```bash
git rm -q games/rabbit-math/src/ui/OrientationLock.ts games/rabbit-math/tests/ui/OrientationLock.spec.ts
```

Dans `games/rabbit-math/src/mount.ts` : supprimer l'import `./ui/OrientationLock`, importer `installOrientationLock` depuis `@gambette/game-sdk` (même ligne que `createExitButton`), et remplacer `installOrientationLock(el)` par `installOrientationLock(el, 'landscape')`.

- [ ] **Step 4: Vérifier**

```bash
pnpm --filter @gambette/game-sdk test && pnpm --filter @gambette/game-sdk build && pnpm --filter @gambette/game-rabbit-math test && pnpm lint && pnpm typecheck
```

Expected: PASS (le `mount.spec.ts` de rabbit-math couvre toujours l'absence d'écouteurs résiduels).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(game-sdk): verrou d'orientation partagé et bouton quitter latéral

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PwD249iHE7SXS5EkecJV6c"
```

---

### Task 3: Rabbit-math — trajectoires de référence (sous matter-js)

**Files:**

- Create: `games/rabbit-math/tests/core/trajectory.golden.spec.ts`, `games/rabbit-math/tests/fixtures/trajectories.golden.json`

**Interfaces:**

- Consumes: `computeTrajectoryPoints(start: Vec, velocity: Vec): Vec[]` (`src/systems/TrajectoryPreview.ts`, inchangé dans cette tâche) — un point par pas de 1/60 s, arrêt au sol.
- Produces: fixture JSON `{ shots: Array<{ name: string; start: Vec; velocity: Vec; samples: Vec[]; steps: number }> }` (échantillon tous les 6 pas = 100 ms).

- [ ] **Step 1: Écrire le test enregistreur/comparateur**

`games/rabbit-math/tests/core/trajectory.golden.spec.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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
  { name: 'faible', start: { x: 200, y: 520 }, velocity: { x: 6, y: -6 } },
  { name: 'moyen', start: { x: 200, y: 520 }, velocity: { x: 11, y: -11 } },
  { name: 'fort', start: { x: 200, y: 520 }, velocity: { x: 17, y: -12 } },
];
const SAMPLE_EVERY = 6; // 100 ms
const MAX_STEPS = 120; // 2 s
const TOLERANCE_PX = 4;
const FIXTURE = fileURLToPath(new URL('../fixtures/trajectories.golden.json', import.meta.url));

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
```

- [ ] **Step 2: Enregistrer sous matter-js**

```bash
mkdir -p games/rabbit-math/tests/fixtures
RECORD_GOLDEN=1 pnpm --filter @gambette/game-rabbit-math exec vitest run tests/core/trajectory.golden.spec.ts
pnpm --filter @gambette/game-rabbit-math exec vitest run tests/core/trajectory.golden.spec.ts
```

Expected: le premier run écrit la fixture (3 tirs, chacun ≥ 10 échantillons) ; le second PASS (comparaison avec soi-même). Vérifier que chaque tir a `steps` > 30 (la carotte vole vraiment) ; sinon ajuster `start`/`velocity` des tirs et réenregistrer.

- [ ] **Step 3: Commit**

```bash
pnpm exec prettier --write games/rabbit-math/tests
git add -A && git commit -m "test(game-rabbit-math): fige les trajectoires de référence de la carotte (matter-js)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PwD249iHE7SXS5EkecJV6c"
```

---

### Task 4: Rabbit-math — migration vers planck.js

**Files:**

- Rewrite: `games/rabbit-math/src/core/PhysicsWorld.ts`, `games/rabbit-math/tests/core/PhysicsWorld.spec.ts`
- Modify: `src/config/physics.ts`, `src/entities/Carrot.ts`, `src/systems/TrajectoryPreview.ts`, `src/scenes/gameRound.ts`, `src/scenes/gameRoundCleanup.ts`, `tests/entities/Carrot.spec.ts` (si l'API change), `package.json`
- Test: `tests/core/trajectory.golden.spec.ts` (inchangé, doit passer), `tests/core/flight-consistency.spec.ts` (nouveau)

**Interfaces:**

- Produces (`src/core/PhysicsWorld.ts`) — tout en **pixels** ; vitesses en **px par frame à 60 fps** (unité matter-js conservée pour ne toucher ni `SLINGSHOT_POWER` ni les rebonds codés en dur) :

```ts
export interface Vec {
  x: number;
  y: number;
}
export interface CircleOptions {
  density: number;
  friction: number;
  restitution: number;
}
export interface PxBody {
  position(): Vec;
  velocity(): Vec; // px / frame (60 fps)
  angle(): number; // radians
  setPosition(p: Vec): void;
  setVelocity(v: Vec): void; // px / frame
  setAngularVelocity(w: number): void; // rad / frame
  setStatic(isStatic: boolean): void;
}
export interface PhysicsWorld {
  createCircle(at: Vec, radius: number, opts: CircleOptions): PxBody; // créé statique
  removeBody(b: PxBody): void;
  bodyCount(): number;
  gravityY(): number; // px / frame²
  step(deltaMs: number): void;
  destroy(): void;
}
export function createPhysicsWorld(): PhysicsWorld;
```

- `createCarrot(at: Vec, physics: PhysicsWorld): Carrot` — `Carrot.body: PxBody`.

- [ ] **Step 1: Tests du nouveau PhysicsWorld et de cohérence vol/aperçu (échouent)**

`games/rabbit-math/tests/core/PhysicsWorld.spec.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { createPhysicsWorld } from '../../src/core/PhysicsWorld';

const OPTS = { density: 1, friction: 0.05, restitution: 0.2 };

describe('PhysicsWorld', () => {
  it('gravité vers le bas', () => {
    const w = createPhysicsWorld();
    expect(w.gravityY()).toBeGreaterThan(0);
    w.destroy();
  });

  it('createCircle / removeBody gèrent le contenu du monde', () => {
    const w = createPhysicsWorld();
    const b = w.createCircle({ x: 100, y: 100 }, 5, OPTS);
    expect(w.bodyCount()).toBe(1);
    expect(b.position()).toEqual({ x: 100, y: 100 });
    w.removeBody(b);
    expect(w.bodyCount()).toBe(0);
    w.destroy();
  });

  it('un corps créé est statique : il ne tombe pas', () => {
    const w = createPhysicsWorld();
    const b = w.createCircle({ x: 100, y: 100 }, 5, OPTS);
    for (let i = 0; i < 30; i++) w.step(1000 / 60);
    expect(b.position().y).toBeCloseTo(100, 5);
    w.destroy();
  });

  it('dynamique : step fait tomber le corps ; setVelocity en px/frame', () => {
    const w = createPhysicsWorld();
    const b = w.createCircle({ x: 100, y: 100 }, 5, OPTS);
    b.setStatic(false);
    b.setVelocity({ x: 6, y: 0 });
    w.step(1000 / 60);
    expect(b.position().x).toBeGreaterThan(105);
    expect(b.position().x).toBeLessThan(107);
    for (let i = 0; i < 30; i++) w.step(1000 / 60);
    expect(b.position().y).toBeGreaterThan(100);
    w.destroy();
  });
});
```

`games/rabbit-math/tests/core/flight-consistency.spec.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { createPhysicsWorld } from '../../src/core/PhysicsWorld';
import { createCarrot } from '../../src/entities/Carrot';
import { computeTrajectoryPoints } from '../../src/systems/TrajectoryPreview';

describe('cohérence aperçu / vol réel', () => {
  it('une carotte lancée suit les points de l’aperçu à 1 px près', () => {
    const start = { x: 200, y: 520 };
    const v = { x: 11, y: -11 };
    const preview = computeTrajectoryPoints(start, v);
    const physics = createPhysicsWorld();
    const carrot = createCarrot(start, physics);
    carrot.launch(v);
    for (let i = 1; i < Math.min(preview.length, 60); i++) {
      physics.step(1000 / 60);
      const p = carrot.body.position();
      expect(Math.hypot(p.x - preview[i]!.x, p.y - preview[i]!.y)).toBeLessThanOrEqual(1);
    }
    physics.destroy();
  });
});
```

Run: `pnpm --filter @gambette/game-rabbit-math exec vitest run tests/core`
Expected: FAIL (API `createCircle`, `createCarrot(at, physics)` inexistantes).

- [ ] **Step 2: Dépendances**

```bash
pnpm --filter @gambette/game-rabbit-math add planck@^1.5.0
pnpm --filter @gambette/game-rabbit-math remove matter-js @types/matter-js
```

- [ ] **Step 3: Constantes physiques**

Dans `src/config/physics.ts`, remplacer `GRAVITY_Y = 0.7` par les constantes planck (le reste inchangé) :

```ts
/** Échelle planck : pixels par mètre. */
export const PX_PER_M = 50;
/** Pas de référence (unité des vitesses « px par frame »). */
export const FRAME_S = 1 / 60;
/**
 * Gravité en m/s². Équivalent de l'ancien `gravity.y = 0.7` de matter-js
 * (0,7 × 0,001 px/ms² = 700 px/s² = 14 m/s à 50 px/m). Calibré par
 * tests/core/trajectory.golden.spec.ts.
 */
export const GRAVITY_M_S2 = 14;
/**
 * Amortissement linéaire planck équivalent au `frictionAir` 0,01 par défaut de
 * matter-js (v ← v × 0,99 par frame ⇒ 1 / (1 + d/60) = 0,99 ⇒ d ≈ 0,606).
 * Calibré par tests/core/trajectory.golden.spec.ts.
 */
export const CARROT_LINEAR_DAMPING = 0.606;
```

- [ ] **Step 4: `PhysicsWorld.ts` (planck, API en pixels)**

```ts
import { Circle, Vec2, World, type Body } from 'planck';
import { CARROT_LINEAR_DAMPING, FRAME_S, GRAVITY_M_S2, PX_PER_M } from '../config/physics';

export interface Vec {
  x: number;
  y: number;
}
export interface CircleOptions {
  density: number;
  friction: number;
  restitution: number;
}

/** Corps vu en pixels ; vitesses en px par frame à 60 fps (unité historique matter-js). */
export interface PxBody {
  position(): Vec;
  velocity(): Vec;
  angle(): number;
  setPosition(p: Vec): void;
  setVelocity(v: Vec): void;
  setAngularVelocity(w: number): void;
  setStatic(isStatic: boolean): void;
}

export interface PhysicsWorld {
  createCircle(at: Vec, radius: number, opts: CircleOptions): PxBody;
  removeBody(b: PxBody): void;
  bodyCount(): number;
  gravityY(): number;
  step(deltaMs: number): void;
  destroy(): void;
}

const toM = (px: number): number => px / PX_PER_M;
const toPx = (m: number): number => m * PX_PER_M;
/** px/frame → m/s */
const vToMs = (pxPerFrame: number): number => toM(pxPerFrame) / FRAME_S;
/** m/s → px/frame */
const vToPx = (ms: number): number => toPx(ms) * FRAME_S;

const wrap = (body: Body): PxBody => ({
  position: () => {
    const p = body.getPosition();
    return { x: toPx(p.x), y: toPx(p.y) };
  },
  velocity: () => {
    const v = body.getLinearVelocity();
    return { x: vToPx(v.x), y: vToPx(v.y) };
  },
  angle: () => body.getAngle(),
  setPosition: (p) => body.setPosition(Vec2(toM(p.x), toM(p.y))),
  setVelocity: (v) => body.setLinearVelocity(Vec2(vToMs(v.x), vToMs(v.y))),
  setAngularVelocity: (w) => body.setAngularVelocity(w / FRAME_S),
  setStatic: (isStatic) => {
    if (isStatic) body.setStatic();
    else {
      body.setDynamic();
      body.setAwake(true);
    }
  },
});

export function createPhysicsWorld(): PhysicsWorld {
  const world = new World({ gravity: Vec2(0, GRAVITY_M_S2) });
  const bodies = new Map<PxBody, Body>();
  return {
    createCircle: (at, radius, opts) => {
      const body = world.createBody({
        type: 'static',
        position: Vec2(toM(at.x), toM(at.y)),
        linearDamping: CARROT_LINEAR_DAMPING,
      });
      body.createFixture({ shape: new Circle(toM(radius)), ...opts });
      const px = wrap(body);
      bodies.set(px, body);
      return px;
    },
    removeBody: (b) => {
      const body = bodies.get(b);
      if (!body) return;
      world.destroyBody(body);
      bodies.delete(b);
    },
    bodyCount: () => bodies.size,
    gravityY: () => vToPx(GRAVITY_M_S2 * FRAME_S),
    step: (deltaMs) => world.step(deltaMs / 1000),
    destroy: () => {
      for (const body of bodies.values()) world.destroyBody(body);
      bodies.clear();
    },
  };
}
```

Note : `density` est passé tel quel (`CARROT_DENSITY`) ; seule la masse relative compte (un seul corps dynamique, pas de collision moteur), elle n'influe pas sur la trajectoire.

- [ ] **Step 5: `Carrot.ts`**

Remplacer l'import `matter-js` par `import type { PhysicsWorld, PxBody, Vec } from '../core/PhysicsWorld';` (supprimer l'interface `Vec` locale et la réexporter : `export type { Vec };`), puis :

```ts
export interface Carrot {
  readonly view: Container;
  readonly body: PxBody;
  isLaunched(): boolean;
  launch(velocity: Vec): void;
  restAtGround(at: Vec): void;
  syncView(): void;
}

interface State {
  view: Container;
  body: PxBody;
  launched: boolean;
}

const buildApi = (state: State): Carrot => ({
  view: state.view,
  body: state.body,
  isLaunched: () => state.launched,
  launch: (v) => {
    state.launched = true;
    state.body.setStatic(false);
    state.body.setVelocity(v);
    state.body.setAngularVelocity(0.35);
  },
  restAtGround: (pos) => {
    state.body.setVelocity({ x: 0, y: 0 });
    state.body.setPosition(pos);
    state.body.setStatic(true);
  },
  syncView: () => {
    const p = state.body.position();
    state.view.position.set(p.x, p.y);
    state.view.rotation = state.body.angle();
  },
});

export function createCarrot(at: Vec, physics: PhysicsWorld): Carrot {
  const view = new Container();
  view.addChild(createCarrotSprite());
  view.position.set(at.x, at.y);
  const body = physics.createCircle(at, CARROT_RADIUS, {
    density: CARROT_DENSITY,
    friction: CARROT_FRICTION,
    restitution: CARROT_RESTITUTION,
  });
  return buildApi({ view, body, launched: false });
}
```

(Supprimer `makeBody`.) Mettre à jour `tests/entities/Carrot.spec.ts` pour créer un `createPhysicsWorld()` et appeler `createCarrot(at, physics)` ; remplacer les lectures `body.position.x` par `body.position().x` (et `isStatic` par l'observation du mouvement si le test le vérifiait).

- [ ] **Step 6: `TrajectoryPreview.ts`**

Remplacer `makeBody`, `computeTrajectoryPoints` et `simulate` par :

```ts
import { createPhysicsWorld, type PxBody, type PhysicsWorld } from '../core/PhysicsWorld';

export function computeTrajectoryPoints(start: Vec, velocity: Vec): Vec[] {
  const world = createPhysicsWorld();
  const body = world.createCircle(start, CARROT_RADIUS, {
    density: CARROT_DENSITY,
    friction: CARROT_FRICTION,
    restitution: CARROT_RESTITUTION,
  });
  body.setStatic(false);
  body.setVelocity(velocity);
  const points = simulate(world, body);
  world.destroy();
  return points;
}

const simulate = (world: PhysicsWorld, body: PxBody): Vec[] => {
  const out: Vec[] = [body.position()];
  for (let i = 0; i < MAX_SIM_STEPS; i++) {
    world.step(SIM_DT_MS);
    const p = body.position();
    out.push(p);
    if (p.y >= CARROT_GROUND_Y && body.velocity().y > 0) break;
  }
  return out;
};
```

(Supprimer l'import `matter-js` et `GRAVITY_Y`.)

- [ ] **Step 7: `gameRound.ts` et `gameRoundCleanup.ts`**

`gameRoundCleanup.ts` : remplacer `import type Matter from 'matter-js'` par `import type { PxBody } from '../core/PhysicsWorld'` et `Set<Matter.Body>` par `Set<PxBody>` (2 occurrences).

`gameRound.ts` :

- supprimer `import Matter from 'matter-js'` ; importer `type PxBody` depuis `../core/PhysicsWorld` ;
- `owned: Set<PxBody>` ;
- `setBodyAt` : `c.body.setPosition(p);` ;
- `loadCarrot` : `const c = createCarrot(d.slingshot.carrotPosition(), d.physics);` et **supprimer** `d.physics.addBody(c.body);` (le monde crée le corps) ;
- `bounceCarrotOff` :

```ts
const bounceCarrotOff = (l: Live, _rabbitPos: Vec): void => {
  const b = l.carrot.body;
  const v = b.velocity();
  b.setVelocity({ x: -v.x * 0.5, y: -Math.abs(v.y) * 0.4 - 3 });
  l.bouncing = true;
};
```

- `checkBounceLanding` : `const p = b.position(); const v = b.velocity();` ;
- `aimContext.carrotBodyPos` : `() => l.carrot.body.position()` ;
- toute autre lecture `.body.position.x` / `.body.velocity` → méthodes `position()` / `velocity()`.

Vérifier : `grep -rn "matter\|Matter" games/rabbit-math/src games/rabbit-math/tests` → aucune ligne (hors la fixture JSON et les commentaires de `config/physics.ts` qui citent matter-js comme origine des valeurs).

- [ ] **Step 8: Calibrer jusqu'au vert**

Run: `pnpm --filter @gambette/game-rabbit-math exec vitest run tests/core`
Expected: PASS. Si `trajectory.golden.spec.ts` échoue, ajuster **uniquement** `GRAVITY_M_S2` et `CARROT_LINEAR_DAMPING` (la forme de la courbe dépend de ces deux valeurs) jusqu'à un écart ≤ 4 px ; ne pas modifier la fixture ni la tolérance. Si l'écart minimal atteignable reste > 4 px, s'arrêter et rapporter l'écart obtenu (DONE_WITH_CONCERNS).

- [ ] **Step 9: Suite complète**

```bash
pnpm --filter @gambette/game-rabbit-math test && pnpm --filter @gambette/game-rabbit-math typecheck && pnpm --filter @gambette/game-rabbit-math lint && pnpm --filter @gambette/web test
grep -rn "matter-js" --include=package.json . | grep -v node_modules
```

Expected: tout PASS ; le `grep` ne renvoie rien.

- [ ] **Step 10: Commit**

```bash
pnpm exec prettier --write games/rabbit-math
git add -A && git commit -m "refactor(game-rabbit-math): remplace matter-js par planck.js à trajectoires constantes

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PwD249iHE7SXS5EkecJV6c"
```

---

### Task 5: Passe-trappe — package et domaine pur

**Files:**

- Create: `games/passe-trappe/{package.json,tsconfig.json,vite.config.ts,vitest.config.ts,index.html}`, `games/passe-trappe/tests/setup.ts`
- Create: `games/passe-trappe/src/config/dimensions.ts`, `src/domain/{types,elastic,rules,touchRouting}.ts`
- Test: `games/passe-trappe/tests/domain/{elastic,rules,touchRouting}.spec.ts`

**Interfaces:**

- Produces :
  - `type Player = 'A' | 'B'` ; `interface Vec { x: number; y: number }` ; `interface ElasticLine { y: number; left: Vec; right: Vec }`
  - `elasticLine(player: Player): ElasticLine`
  - `stretchOf(puck: Vec, line: ElasticLine, player: Player): number`
  - `launchVelocity(puck: Vec, line: ElasticLine, player: Player): Vec | null` (px/s)
  - `campOf(y: number): Player`
  - `clampToCamp(p: Vec, player: Player): Vec`
  - `createWinDetector(holdMs?: number): { update(counts: Record<Player, number>, dtMs: number): Player | null; reset(): void }`
  - `createTouchRouter(): { begin(pointerId: number, y: number): Player | null; owner(pointerId: number): Player | null; end(pointerId: number): void; reset(): void }`
  - Constantes de `config/dimensions.ts` (ci-dessous).

- [ ] **Step 1: Package**

`games/passe-trappe/package.json` :

```json
{
  "name": "@gambette/game-passe-trappe",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "lint": "eslint src tests"
  },
  "dependencies": {
    "@gambette/game-sdk": "workspace:*",
    "pixi.js": "^8.18.1",
    "planck": "^1.5.0"
  },
  "devDependencies": {
    "jsdom": "^29.0.2",
    "typescript": "^6.0.3",
    "vite": "^8.0.10",
    "vitest": "^4.1.5"
  }
}
```

Copier depuis rabbit-math : `tsconfig.json`, `vitest.config.ts`, `tests/setup.ts` (identiques).

```bash
cp games/rabbit-math/{tsconfig.json,vitest.config.ts} games/passe-trappe/
mkdir -p games/passe-trappe/tests games/passe-trappe/src && cp games/rabbit-math/tests/setup.ts games/passe-trappe/tests/
```

`games/passe-trappe/vite.config.ts` :

```ts
import { defineConfig } from 'vite';

// Build standalone (jouer hors plateforme). La plateforme consomme src/ directement.
export default defineConfig({
  base: './',
  server: { port: 5102, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true },
});
```

`games/passe-trappe/index.html` :

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover"
    />
    <title>Passe-trappe</title>
    <style>
      html,
      body {
        margin: 0;
        height: 100%;
        background: #111;
        overflow: hidden;
        touch-action: none;
        overscroll-behavior: none;
      }
      #game-root {
        position: relative;
        width: 100vw;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    </style>
  </head>
  <body>
    <div id="game-root"></div>
    <script type="module" src="/src/standalone-entry.ts"></script>
  </body>
</html>
```

```bash
pnpm install
```

- [ ] **Step 2: Dimensions et types**

`src/config/dimensions.ts` :

```ts
export const DESIGN_WIDTH = 720;
export const DESIGN_HEIGHT = 1280;
/** Ligne médiane : sépare le camp B (haut) du camp A (bas). */
export const MID_Y = DESIGN_HEIGHT / 2;
export const PUCK_RADIUS = 28;
export const PUCKS_PER_PLAYER = 5;
/** Largeur du trou de la cloison : ≈ 1,6 × diamètre d'un palet. */
export const GAP_WIDTH = Math.round(PUCK_RADIUS * 2 * 1.6);
export const DIVIDER_THICKNESS = 20;
/** Distance entre l'élastique et le bord du joueur. */
export const ELASTIC_INSET = 150;
/** Étirement maximal de l'élastique (px). */
export const MAX_STRETCH = 110;
```

`src/domain/types.ts` :

```ts
export type Player = 'A' | 'B';

export interface Vec {
  x: number;
  y: number;
}

/** Élastique tendu d'un mur latéral à l'autre, horizontal au repos. */
export interface ElasticLine {
  y: number;
  left: Vec;
  right: Vec;
}

export const PLAYERS: readonly Player[] = ['A', 'B'];
```

- [ ] **Step 3: Tests du domaine (échouent)**

`tests/domain/elastic.spec.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { elasticLine, launchVelocity, stretchOf } from '../../src/domain/elastic';
import { DESIGN_HEIGHT, ELASTIC_INSET, MAX_STRETCH } from '../../src/config/dimensions';
import { LAUNCH_POWER } from '../../src/config/physics';

const A = elasticLine('A');
const B = elasticLine('B');

describe('elasticLine', () => {
  it('A en bas, B en haut, en retrait du bord', () => {
    expect(A.y).toBe(DESIGN_HEIGHT - ELASTIC_INSET);
    expect(B.y).toBe(ELASTIC_INSET);
    expect(A.left.x).toBe(0);
    expect(A.right.x).toBe(720);
  });
});

describe('stretchOf', () => {
  it('nul tant que le palet est devant l’élastique', () => {
    expect(stretchOf({ x: 360, y: A.y - 10 }, A, 'A')).toBe(0);
    expect(stretchOf({ x: 360, y: B.y + 10 }, B, 'B')).toBe(0);
  });

  it('distance au-delà de l’élastique, vers le bord du joueur', () => {
    expect(stretchOf({ x: 360, y: A.y + 40 }, A, 'A')).toBe(40);
    expect(stretchOf({ x: 360, y: B.y - 40 }, B, 'B')).toBe(40);
  });
});

describe('launchVelocity', () => {
  it('élastique non tendu → aucun lancer', () => {
    expect(launchVelocity({ x: 360, y: A.y - 5 }, A, 'A')).toBeNull();
    expect(launchVelocity({ x: 360, y: A.y + 2 }, A, 'A')).toBeNull();
  });

  it('tir centré : droit vers le trou (A vers le haut, B vers le bas)', () => {
    const va = launchVelocity({ x: 360, y: A.y + 60 }, A, 'A')!;
    expect(va.x).toBeCloseTo(0, 6);
    expect(va.y).toBeLessThan(0);
    const vb = launchVelocity({ x: 360, y: B.y - 60 }, B, 'B')!;
    expect(vb.x).toBeCloseTo(0, 6);
    expect(vb.y).toBeGreaterThan(0);
  });

  it('palet tiré vers la droite : vise en diagonale vers la gauche', () => {
    const v = launchVelocity({ x: 520, y: A.y + 60 }, A, 'A')!;
    expect(v.x).toBeLessThan(0);
    expect(v.y).toBeLessThan(0);
  });

  it('norme proportionnelle à l’étirement', () => {
    const n = (s: number) =>
      Math.hypot(...Object.values(launchVelocity({ x: 360, y: A.y + s }, A, 'A')!));
    expect(n(40)).toBeCloseTo(40 * LAUNCH_POWER, 3);
    expect(n(80)).toBeCloseTo(2 * n(40), 3);
  });

  it('étirement plafonné à MAX_STRETCH', () => {
    const far = launchVelocity({ x: 360, y: A.y + MAX_STRETCH + 200 }, A, 'A')!;
    expect(Math.hypot(far.x, far.y)).toBeCloseTo(MAX_STRETCH * LAUNCH_POWER, 3);
  });
});
```

`tests/domain/rules.spec.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { campOf, clampToCamp, createWinDetector } from '../../src/domain/rules';
import { elasticLine } from '../../src/domain/elastic';
import {
  DESIGN_WIDTH,
  DIVIDER_THICKNESS,
  MAX_STRETCH,
  MID_Y,
  PUCK_RADIUS,
} from '../../src/config/dimensions';

describe('campOf', () => {
  it('sous la ligne médiane → A, au-dessus → B', () => {
    expect(campOf(MID_Y + 1)).toBe('A');
    expect(campOf(MID_Y - 1)).toBe('B');
  });
});

describe('clampToCamp', () => {
  it('garde le palet dans la largeur du plateau', () => {
    expect(clampToCamp({ x: -50, y: 900 }, 'A').x).toBe(PUCK_RADIUS);
    expect(clampToCamp({ x: 900, y: 900 }, 'A').x).toBe(DESIGN_WIDTH - PUCK_RADIUS);
  });

  it('empêche de passer la cloison avec le doigt', () => {
    const minA = MID_Y + DIVIDER_THICKNESS / 2 + PUCK_RADIUS;
    expect(clampToCamp({ x: 360, y: 100 }, 'A').y).toBe(minA);
    const maxB = MID_Y - DIVIDER_THICKNESS / 2 - PUCK_RADIUS;
    expect(clampToCamp({ x: 360, y: 1200 }, 'B').y).toBe(maxB);
  });

  it('autorise l’étirement jusqu’à MAX_STRETCH, pas au-delà', () => {
    expect(clampToCamp({ x: 360, y: 5000 }, 'A').y).toBe(elasticLine('A').y + MAX_STRETCH);
    expect(clampToCamp({ x: 360, y: -5000 }, 'B').y).toBe(elasticLine('B').y - MAX_STRETCH);
  });
});

describe('createWinDetector', () => {
  it('camp vide moins d’1 s → pas de vainqueur', () => {
    const d = createWinDetector();
    expect(d.update({ A: 0, B: 10 }, 600)).toBeNull();
    expect(d.update({ A: 0, B: 10 }, 300)).toBeNull();
  });

  it('camp vide 1 s d’affilée → ce joueur gagne, et reste vainqueur', () => {
    const d = createWinDetector();
    d.update({ A: 0, B: 10 }, 600);
    expect(d.update({ A: 0, B: 10 }, 400)).toBe('A');
    expect(d.update({ A: 3, B: 7 }, 16)).toBe('A');
  });

  it('palet revenu par rebond → le délai repart de zéro', () => {
    const d = createWinDetector();
    d.update({ A: 0, B: 10 }, 900);
    d.update({ A: 1, B: 9 }, 16);
    expect(d.update({ A: 0, B: 10 }, 900)).toBeNull();
    expect(d.update({ A: 0, B: 10 }, 100)).toBe('A');
  });

  it('B peut gagner aussi', () => {
    const d = createWinDetector();
    expect(d.update({ A: 10, B: 0 }, 1000)).toBe('B');
  });

  it('reset efface le vainqueur et les délais (Rejouer)', () => {
    const d = createWinDetector();
    d.update({ A: 0, B: 10 }, 1000);
    d.reset();
    expect(d.update({ A: 5, B: 5 }, 16)).toBeNull();
  });
});
```

`tests/domain/touchRouting.spec.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { createTouchRouter } from '../../src/domain/touchRouting';
import { MID_Y } from '../../src/config/dimensions';

const BOTTOM = MID_Y + 200;
const TOP = MID_Y - 200;

describe('createTouchRouter', () => {
  it('un toucher appartient à la moitié où il commence', () => {
    const r = createTouchRouter();
    expect(r.begin(1, BOTTOM)).toBe('A');
    expect(r.begin(2, TOP)).toBe('B');
    expect(r.owner(1)).toBe('A');
    expect(r.owner(2)).toBe('B');
  });

  it('un second doigt du même joueur est ignoré', () => {
    const r = createTouchRouter();
    r.begin(1, BOTTOM);
    expect(r.begin(2, BOTTOM + 50)).toBeNull();
    expect(r.owner(2)).toBeNull();
  });

  it('relâcher libère le joueur', () => {
    const r = createTouchRouter();
    r.begin(1, BOTTOM);
    r.end(1);
    expect(r.owner(1)).toBeNull();
    expect(r.begin(3, BOTTOM)).toBe('A');
  });

  it('end d’un doigt ignoré ne libère pas le doigt actif', () => {
    const r = createTouchRouter();
    r.begin(1, BOTTOM);
    r.begin(2, BOTTOM);
    r.end(2);
    expect(r.owner(1)).toBe('A');
  });

  it('reset libère tout', () => {
    const r = createTouchRouter();
    r.begin(1, BOTTOM);
    r.begin(2, TOP);
    r.reset();
    expect(r.begin(5, BOTTOM)).toBe('A');
    expect(r.begin(6, TOP)).toBe('B');
  });
});
```

Run: `pnpm --filter @gambette/game-passe-trappe test`
Expected: FAIL (modules du domaine et `config/physics` introuvables).

- [ ] **Step 4: Implémenter**

`src/config/physics.ts` (créé ici car `LAUNCH_POWER` est consommé par le domaine ; complété en Task 6) :

```ts
/** Vitesse de lancement (px/s) par pixel d'étirement de l'élastique. */
export const LAUNCH_POWER = 18;
/** En dessous de cet étirement (px), relâcher ne lance pas le palet. */
export const MIN_STRETCH = 6;
```

`src/domain/elastic.ts` :

```ts
import { DESIGN_HEIGHT, DESIGN_WIDTH, ELASTIC_INSET, MAX_STRETCH } from '../config/dimensions';
import { LAUNCH_POWER, MIN_STRETCH } from '../config/physics';
import type { ElasticLine, Player, Vec } from './types';

export function elasticLine(player: Player): ElasticLine {
  const y = player === 'A' ? DESIGN_HEIGHT - ELASTIC_INSET : ELASTIC_INSET;
  return { y, left: { x: 0, y }, right: { x: DESIGN_WIDTH, y } };
}

/** Distance dont le palet a repoussé l'élastique vers le bord de son joueur (0 s'il est devant). */
export function stretchOf(puck: Vec, line: ElasticLine, player: Player): number {
  const d = player === 'A' ? puck.y - line.y : line.y - puck.y;
  return Math.max(0, d);
}

const unit = (v: Vec): Vec => {
  const n = Math.hypot(v.x, v.y);
  return n === 0 ? { x: 0, y: 0 } : { x: v.x / n, y: v.y / n };
};

/**
 * Vitesse (px/s) donnée au palet au relâcher. Direction : bissectrice du V
 * formé par l'élastique (somme des vecteurs unitaires palet → ancrages) ;
 * norme proportionnelle à l'étirement, plafonné à MAX_STRETCH.
 */
export function launchVelocity(puck: Vec, line: ElasticLine, player: Player): Vec | null {
  const stretch = Math.min(stretchOf(puck, line, player), MAX_STRETCH);
  if (stretch < MIN_STRETCH) return null;
  const a = unit({ x: line.left.x - puck.x, y: line.left.y - puck.y });
  const b = unit({ x: line.right.x - puck.x, y: line.right.y - puck.y });
  const dir = unit({ x: a.x + b.x, y: a.y + b.y });
  const speed = stretch * LAUNCH_POWER;
  return { x: dir.x * speed, y: dir.y * speed };
}
```

`src/domain/rules.ts` :

```ts
import {
  DESIGN_WIDTH,
  DIVIDER_THICKNESS,
  MAX_STRETCH,
  MID_Y,
  PUCK_RADIUS,
} from '../config/dimensions';
import { elasticLine } from './elastic';
import { PLAYERS, type Player, type Vec } from './types';

export function campOf(y: number): Player {
  return y >= MID_Y ? 'A' : 'B';
}

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/** Position autorisée pour un palet tenu par `player` : son camp, élastique étiré au plus de MAX_STRETCH. */
export function clampToCamp(p: Vec, player: Player): Vec {
  const x = clamp(p.x, PUCK_RADIUS, DESIGN_WIDTH - PUCK_RADIUS);
  const nearDivider = DIVIDER_THICKNESS / 2 + PUCK_RADIUS;
  const line = elasticLine(player);
  const y =
    player === 'A'
      ? clamp(p.y, MID_Y + nearDivider, line.y + MAX_STRETCH)
      : clamp(p.y, line.y - MAX_STRETCH, MID_Y - nearDivider);
  return { x, y };
}

export interface WinDetector {
  /** `counts` : palets par camp ; renvoie le vainqueur (définitif jusqu'au reset) ou null. */
  update(counts: Record<Player, number>, dtMs: number): Player | null;
  reset(): void;
}

export function createWinDetector(holdMs = 1000): WinDetector {
  const empty: Record<Player, number> = { A: 0, B: 0 };
  let winner: Player | null = null;
  return {
    update: (counts, dtMs) => {
      if (winner) return winner;
      for (const p of PLAYERS) {
        empty[p] = counts[p] === 0 ? empty[p] + dtMs : 0;
        if (empty[p] >= holdMs) winner = p;
      }
      return winner;
    },
    reset: () => {
      empty.A = 0;
      empty.B = 0;
      winner = null;
    },
  };
}
```

`src/domain/touchRouting.ts` :

```ts
import { campOf } from './rules';
import type { Player } from './types';

export interface TouchRouter {
  /** Attribue le pointeur au joueur de la moitié où il commence ; null si ce joueur tient déjà un doigt. */
  begin(pointerId: number, y: number): Player | null;
  owner(pointerId: number): Player | null;
  end(pointerId: number): void;
  reset(): void;
}

export function createTouchRouter(): TouchRouter {
  const active = new Map<Player, number>();
  const ownerOf = (id: number): Player | null => {
    for (const [p, pid] of active) if (pid === id) return p;
    return null;
  };
  return {
    begin: (id, y) => {
      const player = campOf(y);
      if (active.has(player)) return null;
      active.set(player, id);
      return player;
    },
    owner: ownerOf,
    end: (id) => {
      const p = ownerOf(id);
      if (p) active.delete(p);
    },
    reset: () => active.clear(),
  };
}
```

- [ ] **Step 5: Vérifier**

```bash
pnpm exec prettier --write games/passe-trappe && pnpm --filter @gambette/game-passe-trappe test && pnpm --filter @gambette/game-passe-trappe lint
```

Expected: PASS. (`typecheck` et `build` passeront à la Task 8, quand `src/index.ts` et l'entrée standalone existeront.)

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(game-passe-trappe): package et domaine pur (élastique, règles, doigts)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PwD249iHE7SXS5EkecJV6c"
```

---

### Task 6: Passe-trappe — monde physique, plateau et palets

**Files:**

- Modify: `games/passe-trappe/src/config/physics.ts`
- Create: `src/config/theme.ts`, `src/core/PhysicsWorld.ts`, `src/entities/Board.ts`, `src/entities/Puck.ts`
- Test: `games/passe-trappe/tests/physics/board.spec.ts`

**Interfaces:**

- Consumes: constantes de `config/dimensions.ts`, `Vec`, `campOf` (Task 5).
- Produces :
  - `createPhysicsWorld(): PhysicsWorld` avec `world: planck.World`, `ground: planck.Body` (corps statique d'ancrage des MouseJoint), `toM(px)`, `toPx(m)`, `step(deltaMs)` (pas fixe 1/60, ≤ 5 sous-pas), `destroy()`.
  - Catégories de collision : `CATEGORY = { PUCK: 0x1, WALL: 0x2, ELASTIC: 0x4 }`.
  - `createBoard(physics): { view: Container }` — murs extérieurs, cloison à deux segments, deux barrières d'élastique (catégorie `ELASTIC`).
  - `createPuck(physics, at: Vec): Puck` avec `view`, `body`, `position(): Vec` (px), `velocity(): Vec` (px/s), `setVelocity(v px/s)`, `setPosition(p)`, `setIgnoreElastic(on: boolean)`, `syncView()`, `destroy()`.

- [ ] **Step 1: Tests physiques avec planck réel (échouent)**

`tests/physics/board.spec.ts` :

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { createPhysicsWorld, type PhysicsWorld } from '../../src/core/PhysicsWorld';
import { createBoard } from '../../src/entities/Board';
import { createPuck } from '../../src/entities/Puck';
import { campOf } from '../../src/domain/rules';
import { elasticLine } from '../../src/domain/elastic';
import { DESIGN_WIDTH, MID_Y, PUCK_RADIUS } from '../../src/config/dimensions';

let physics: PhysicsWorld;
const run = (ms: number): void => {
  for (let t = 0; t < ms; t += 1000 / 60) physics.step(1000 / 60);
};
const setup = () => {
  physics = createPhysicsWorld();
  createBoard(physics);
};

afterEach(() => physics.destroy());

describe('plateau planck', () => {
  it('palet lancé vers le trou → passe dans l’autre camp', () => {
    setup();
    const p = createPuck(physics, { x: DESIGN_WIDTH / 2, y: 900 });
    p.setVelocity({ x: 0, y: -1500 });
    run(2000);
    expect(campOf(p.position().y)).toBe('B');
  });

  it('palet contre un mur latéral → rebondit', () => {
    setup();
    const p = createPuck(physics, { x: 600, y: 900 });
    p.setVelocity({ x: 1500, y: 0 });
    run(400);
    expect(p.velocity().x).toBeLessThan(0);
    expect(p.position().x).toBeLessThanOrEqual(DESIGN_WIDTH - PUCK_RADIUS + 1);
  });

  it('palet très rapide contre la cloison → ne la traverse pas', () => {
    setup();
    const p = createPuck(physics, { x: 150, y: 760 });
    p.setVelocity({ x: 0, y: -8000 });
    for (let i = 0; i < 120; i++) {
      physics.step(1000 / 60);
      expect(p.position().y).toBeGreaterThan(MID_Y);
    }
  });

  it('deux palets → collision et transfert d’élan', () => {
    setup();
    const a = createPuck(physics, { x: 200, y: 950 });
    const b = createPuck(physics, { x: 200, y: 850 });
    a.setVelocity({ x: 0, y: -800 });
    run(500);
    expect(b.velocity().y).toBeLessThan(0);
  });

  it('le frottement du plateau finit par arrêter le palet', () => {
    setup();
    const p = createPuck(physics, { x: 360, y: 900 });
    p.setVelocity({ x: 300, y: 0 });
    run(5000);
    expect(Math.hypot(p.velocity().x, p.velocity().y)).toBeLessThan(5);
  });

  it('un palet libre est arrêté par l’élastique', () => {
    setup();
    const line = elasticLine('A');
    const p = createPuck(physics, { x: 360, y: line.y - 80 });
    p.setVelocity({ x: 0, y: 1200 });
    run(800);
    expect(p.position().y).toBeLessThan(line.y);
  });

  it('un palet qui ignore l’élastique le traverse', () => {
    setup();
    const line = elasticLine('A');
    const p = createPuck(physics, { x: 360, y: line.y + 60 });
    p.setIgnoreElastic(true);
    p.setVelocity({ x: 0, y: -1200 });
    run(200);
    expect(p.position().y).toBeLessThan(line.y);
  });
});
```

Run: `pnpm --filter @gambette/game-passe-trappe exec vitest run tests/physics`
Expected: FAIL (modules introuvables).

- [ ] **Step 2: Configuration**

Ajouter à `src/config/physics.ts` :

```ts
/** Échelle planck : pixels par mètre. */
export const PX_PER_M = 50;
/** Pas de simulation fixe et nombre maximal de sous-pas par frame. */
export const STEP_S = 1 / 60;
export const MAX_SUBSTEPS = 5;
export const PUCK_DENSITY = 1;
export const PUCK_FRICTION = 0.05;
/** Restitution palet ↔ palet. */
export const PUCK_RESTITUTION = 0.8;
/** Restitution palet ↔ mur / cloison / élastique (imposée au contact, planck prenant sinon le max). */
export const WALL_RESTITUTION = 0.6;
/** Frottement du plateau (amortissement linéaire planck, 1/s). */
export const PUCK_LINEAR_DAMPING = 1.2;
/** Force max du MouseJoint de glisser, par kg de palet. */
export const DRAG_MAX_FORCE_PER_KG = 2000;

export const CATEGORY = { PUCK: 0x1, WALL: 0x2, ELASTIC: 0x4 } as const;
```

`src/config/theme.ts` :

```ts
export const COLORS = {
  table: 0xe8c99a,
  rim: 0x8a5a2c,
  divider: 0x6b4423,
  puck: 0xb5121b,
  puckEdge: 0x5a0a0e,
  elastic: 0x222222,
  overlay: 0x000000,
  text: 0xffffff,
  button: 0xffcc5c,
  buttonText: 0x00274b,
} as const;
```

- [ ] **Step 3: `core/PhysicsWorld.ts`**

```ts
import { Vec2, World, type Body, type Contact } from 'planck';
import { MAX_SUBSTEPS, PX_PER_M, STEP_S, WALL_RESTITUTION } from '../config/physics';

export interface PhysicsWorld {
  readonly world: World;
  /** Corps statique servant d'ancrage aux MouseJoint. */
  readonly ground: Body;
  toM(px: number): number;
  toPx(m: number): number;
  step(deltaMs: number): void;
  destroy(): void;
}

/** Données attachées aux fixtures pour reconnaître les murs dans les contacts. */
export interface FixtureTag {
  kind: 'puck' | 'wall';
}

const isWallContact = (c: Contact): boolean => {
  const a = c.getFixtureA().getUserData() as FixtureTag | null;
  const b = c.getFixtureB().getUserData() as FixtureTag | null;
  return a?.kind === 'wall' || b?.kind === 'wall';
};

export function createPhysicsWorld(): PhysicsWorld {
  const world = new World({ gravity: Vec2(0, 0) });
  const ground = world.createBody();
  // planck combine les restitutions par max : on impose celle des murs au contact.
  world.on('pre-solve', (contact: Contact) => {
    if (isWallContact(contact)) contact.setRestitution(WALL_RESTITUTION);
  });
  let pendingS = 0;
  return {
    world,
    ground,
    toM: (px) => px / PX_PER_M,
    toPx: (m) => m * PX_PER_M,
    step: (deltaMs) => {
      pendingS = Math.min(pendingS + deltaMs / 1000, STEP_S * MAX_SUBSTEPS);
      while (pendingS >= STEP_S - 1e-9) {
        world.step(STEP_S);
        pendingS -= STEP_S;
      }
    },
    destroy: () => {
      for (let b = world.getBodyList(); b;) {
        const next = b.getNext();
        world.destroyBody(b);
        b = next;
      }
    },
  };
}
```

- [ ] **Step 4: `entities/Board.ts`**

```ts
import { Container, Graphics } from 'pixi.js';
import { Box, Edge, Vec2 } from 'planck';
import type { PhysicsWorld, FixtureTag } from '../core/PhysicsWorld';
import {
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  DIVIDER_THICKNESS,
  GAP_WIDTH,
  MID_Y,
} from '../config/dimensions';
import { CATEGORY } from '../config/physics';
import { COLORS } from '../config/theme';
import { elasticLine } from '../domain/elastic';
import { PLAYERS } from '../domain/types';

export interface Board {
  readonly view: Container;
}

const WALL_TAG: FixtureTag = { kind: 'wall' };
const wallFilter = { filterCategoryBits: CATEGORY.WALL, filterMaskBits: CATEGORY.PUCK };

const addEdge = (
  physics: PhysicsWorld,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  category: number,
): void => {
  const m = physics.toM;
  const body = physics.world.createBody();
  body.createFixture({
    shape: new Edge(Vec2(m(x1), m(y1)), Vec2(m(x2), m(y2))),
    filterCategoryBits: category,
    filterMaskBits: CATEGORY.PUCK,
    userData: WALL_TAG,
  });
};

const addBox = (physics: PhysicsWorld, cx: number, cy: number, w: number, h: number): void => {
  const m = physics.toM;
  const body = physics.world.createBody({ position: Vec2(m(cx), m(cy)) });
  body.createFixture({ shape: new Box(m(w / 2), m(h / 2)), ...wallFilter, userData: WALL_TAG });
};

const segmentWidth = (DESIGN_WIDTH - GAP_WIDTH) / 2;

const draw = (g: Graphics): void => {
  g.rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT).fill(COLORS.table);
  g.rect(0, MID_Y - DIVIDER_THICKNESS / 2, segmentWidth, DIVIDER_THICKNESS).fill(COLORS.divider);
  g.rect(
    DESIGN_WIDTH - segmentWidth,
    MID_Y - DIVIDER_THICKNESS / 2,
    segmentWidth,
    DIVIDER_THICKNESS,
  ).fill(COLORS.divider);
  g.rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT).stroke({ width: 8, color: COLORS.rim });
};

export function createBoard(physics: PhysicsWorld): Board {
  const W = DESIGN_WIDTH;
  const H = DESIGN_HEIGHT;
  addEdge(physics, 0, 0, W, 0, CATEGORY.WALL);
  addEdge(physics, W, 0, W, H, CATEGORY.WALL);
  addEdge(physics, W, H, 0, H, CATEGORY.WALL);
  addEdge(physics, 0, H, 0, 0, CATEGORY.WALL);
  addBox(physics, segmentWidth / 2, MID_Y, segmentWidth, DIVIDER_THICKNESS);
  addBox(physics, W - segmentWidth / 2, MID_Y, segmentWidth, DIVIDER_THICKNESS);
  for (const p of PLAYERS) {
    const line = elasticLine(p);
    addEdge(physics, line.left.x, line.y, line.right.x, line.y, CATEGORY.ELASTIC);
  }
  const view = new Container();
  const g = new Graphics();
  draw(g);
  view.addChild(g);
  return { view };
}
```

- [ ] **Step 5: `entities/Puck.ts`**

```ts
import { Container, Graphics } from 'pixi.js';
import { Circle, Vec2, type Body } from 'planck';
import type { PhysicsWorld, FixtureTag } from '../core/PhysicsWorld';
import { PUCK_RADIUS } from '../config/dimensions';
import {
  CATEGORY,
  PUCK_DENSITY,
  PUCK_FRICTION,
  PUCK_LINEAR_DAMPING,
  PUCK_RESTITUTION,
} from '../config/physics';
import { COLORS } from '../config/theme';
import type { Vec } from '../domain/types';

export interface Puck {
  readonly view: Container;
  readonly body: Body;
  position(): Vec;
  /** px/s */
  velocity(): Vec;
  setVelocity(v: Vec): void;
  setPosition(p: Vec): void;
  /** true : le palet traverse l'élastique (palet tenu ou tout juste lancé). */
  setIgnoreElastic(on: boolean): void;
  ignoresElastic(): boolean;
  syncView(): void;
  destroy(): void;
}

const PUCK_TAG: FixtureTag = { kind: 'puck' };
const MASK_ALL = CATEGORY.PUCK | CATEGORY.WALL | CATEGORY.ELASTIC;
const MASK_NO_ELASTIC = CATEGORY.PUCK | CATEGORY.WALL;

const drawPuck = (g: Graphics): void => {
  g.circle(0, 0, PUCK_RADIUS).fill(COLORS.puck).stroke({ width: 4, color: COLORS.puckEdge });
  g.circle(0, 0, PUCK_RADIUS * 0.45).stroke({ width: 2, color: COLORS.puckEdge });
};

export function createPuck(physics: PhysicsWorld, at: Vec): Puck {
  const { toM, toPx } = physics;
  const body = physics.world.createBody({
    type: 'dynamic',
    position: Vec2(toM(at.x), toM(at.y)),
    bullet: true,
    linearDamping: PUCK_LINEAR_DAMPING,
    angularDamping: 2,
  });
  const fixture = body.createFixture({
    shape: new Circle(toM(PUCK_RADIUS)),
    density: PUCK_DENSITY,
    friction: PUCK_FRICTION,
    restitution: PUCK_RESTITUTION,
    filterCategoryBits: CATEGORY.PUCK,
    filterMaskBits: MASK_ALL,
    userData: PUCK_TAG,
  });
  const view = new Container();
  const g = new Graphics();
  drawPuck(g);
  view.addChild(g);
  let ignoring = false;

  const api: Puck = {
    view,
    body,
    position: () => {
      const p = body.getPosition();
      return { x: toPx(p.x), y: toPx(p.y) };
    },
    velocity: () => {
      const v = body.getLinearVelocity();
      return { x: toPx(v.x), y: toPx(v.y) };
    },
    setVelocity: (v) => {
      body.setLinearVelocity(Vec2(toM(v.x), toM(v.y)));
      body.setAwake(true);
    },
    setPosition: (p) => {
      body.setPosition(Vec2(toM(p.x), toM(p.y)));
      body.setAwake(true);
    },
    setIgnoreElastic: (on) => {
      ignoring = on;
      fixture.setFilterData({
        groupIndex: 0,
        categoryBits: CATEGORY.PUCK,
        maskBits: on ? MASK_NO_ELASTIC : MASK_ALL,
      });
    },
    ignoresElastic: () => ignoring,
    syncView: () => {
      const p = api.position();
      view.position.set(p.x, p.y);
      view.rotation = body.getAngle();
    },
    destroy: () => {
      physics.world.destroyBody(body);
      view.destroy({ children: true });
    },
  };
  api.syncView();
  return api;
}
```

- [ ] **Step 6: Vérifier et régler**

Run: `pnpm --filter @gambette/game-passe-trappe exec vitest run tests/physics`
Expected: PASS. Si un test de sensation échoue (arrêt, rebond), ajuster **uniquement** les constantes de `config/physics.ts` et le noter dans le rapport. Le test « très rapide contre la cloison » ne doit jamais être assoupli (il garantit le CCD).

- [ ] **Step 7: Commit**

```bash
pnpm exec prettier --write games/passe-trappe && pnpm --filter @gambette/game-passe-trappe lint
git add -A && git commit -m "feat(game-passe-trappe): monde planck, plateau et palets

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PwD249iHE7SXS5EkecJV6c"
```

---

### Task 7: Passe-trappe — élastiques, contrôle au doigt et scène de jeu

**Files:**

- Create: `src/entities/Elastic.ts`, `src/input/DragController.ts`, `src/scenes/GameScene.ts`
- Test: `tests/input/DragController.spec.ts`, `tests/scenes/GameScene.spec.ts`

**Interfaces:**

- Consumes: Tasks 5–6.
- Produces :
  - `createElastic(player: Player): { view: Container; draw(puck: Vec | null): void }` — droit si `null` ou palet non étiré, en V sinon.
  - `createDragController(deps: { physics: PhysicsWorld; pucks: () => readonly Puck[] }): DragController` avec
    `pointerDown(id: number, p: Vec): void`, `pointerMove(id: number, p: Vec): void`, `pointerUp(id: number): void`, `held(player: Player): Puck | null`, `reset(): void`, `destroy(): void`.
  - `createGameScene(deps: { physics: PhysicsWorld; onWin(player: Player): void }): GameScene` avec
    `view: Container`, `pucks(): readonly Puck[]`, `drag: DragController`, `tick(deltaMs: number): void`, `reset(): void`, `destroy(): void`.
  - `initialPuckPositions(player: Player): Vec[]` (exporté par `GameScene.ts`).

- [ ] **Step 1: Tests (échouent)**

`tests/input/DragController.spec.ts` :

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { createPhysicsWorld, type PhysicsWorld } from '../../src/core/PhysicsWorld';
import { createBoard } from '../../src/entities/Board';
import { createPuck, type Puck } from '../../src/entities/Puck';
import { createDragController } from '../../src/input/DragController';
import { elasticLine } from '../../src/domain/elastic';
import { MID_Y } from '../../src/config/dimensions';

let physics: PhysicsWorld;
const step = (n = 1): void => {
  for (let i = 0; i < n; i++) physics.step(1000 / 60);
};

const setup = (positions: Array<{ x: number; y: number }>) => {
  physics = createPhysicsWorld();
  createBoard(physics);
  const pucks: Puck[] = positions.map((p) => createPuck(physics, p));
  const drag = createDragController({ physics, pucks: () => pucks });
  return { pucks, drag };
};

afterEach(() => physics.destroy());

describe('DragController', () => {
  it('saisir un palet de son camp, l’étirer derrière l’élastique et relâcher → lancé vers la cloison', () => {
    const lineA = elasticLine('A');
    const { pucks, drag } = setup([{ x: 360, y: 900 }]);
    drag.pointerDown(1, { x: 360, y: 900 });
    expect(drag.held('A')).toBe(pucks[0]);
    for (let y = 900; y <= lineA.y + 80; y += 20) {
      drag.pointerMove(1, { x: 360, y });
      step(3);
    }
    drag.pointerUp(1);
    expect(drag.held('A')).toBeNull();
    expect(pucks[0]!.velocity().y).toBeLessThan(-500);
  });

  it('toucher dans le vide de son camp → rien n’est saisi', () => {
    const { drag } = setup([{ x: 360, y: 900 }]);
    drag.pointerDown(1, { x: 100, y: 1000 });
    expect(drag.held('A')).toBeNull();
  });

  it('impossible de saisir un palet du camp adverse', () => {
    const { drag } = setup([{ x: 360, y: 400 }]);
    drag.pointerDown(1, { x: 360, y: MID_Y + 100 });
    expect(drag.held('A')).toBeNull();
    expect(drag.held('B')).toBeNull();
  });

  it('second doigt du même joueur ignoré ; les deux joueurs en même temps', () => {
    const { pucks, drag } = setup([
      { x: 200, y: 900 },
      { x: 500, y: 900 },
      { x: 360, y: 380 },
    ]);
    drag.pointerDown(1, { x: 200, y: 900 });
    drag.pointerDown(2, { x: 500, y: 900 });
    drag.pointerDown(3, { x: 360, y: 380 });
    expect(drag.held('A')).toBe(pucks[0]);
    expect(drag.held('B')).toBe(pucks[2]);
  });

  it('le palet tenu ne franchit pas la cloison même si le doigt la passe', () => {
    const { pucks, drag } = setup([{ x: 150, y: 800 }]);
    drag.pointerDown(1, { x: 150, y: 800 });
    drag.pointerMove(1, { x: 150, y: 200 });
    step(60);
    expect(pucks[0]!.position().y).toBeGreaterThan(MID_Y);
  });

  it('relâcher sans étirer → palet simplement lâché (pas de lancer)', () => {
    const { pucks, drag } = setup([{ x: 360, y: 900 }]);
    drag.pointerDown(1, { x: 360, y: 900 });
    drag.pointerUp(1);
    step(30);
    expect(Math.hypot(pucks[0]!.velocity().x, pucks[0]!.velocity().y)).toBeLessThan(50);
  });

  it('reset et destroy relâchent les palets tenus (aucun joint restant)', () => {
    const { drag } = setup([{ x: 360, y: 900 }]);
    drag.pointerDown(1, { x: 360, y: 900 });
    drag.reset();
    expect(drag.held('A')).toBeNull();
    expect(physics.world.getJointList()).toBeNull();
  });
});
```

`tests/scenes/GameScene.spec.ts` :

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createPhysicsWorld, type PhysicsWorld } from '../../src/core/PhysicsWorld';
import { createGameScene, initialPuckPositions } from '../../src/scenes/GameScene';
import { campOf } from '../../src/domain/rules';
import { elasticLine } from '../../src/domain/elastic';
import { PUCKS_PER_PLAYER } from '../../src/config/dimensions';

let physics: PhysicsWorld;
afterEach(() => physics.destroy());

describe('GameScene', () => {
  it('5 palets par camp au départ', () => {
    physics = createPhysicsWorld();
    const scene = createGameScene({ physics, onWin: vi.fn() });
    const camps = scene.pucks().map((p) => campOf(p.position().y));
    expect(camps.filter((c) => c === 'A')).toHaveLength(PUCKS_PER_PLAYER);
    expect(camps.filter((c) => c === 'B')).toHaveLength(PUCKS_PER_PLAYER);
    expect(initialPuckPositions('A')).toHaveLength(PUCKS_PER_PLAYER);
    scene.destroy();
  });

  it('camp A vidé pendant 1 s → onWin("A") une seule fois', () => {
    physics = createPhysicsWorld();
    const onWin = vi.fn();
    const scene = createGameScene({ physics, onWin });
    scene
      .pucks()
      .forEach((p, i) => p.setPosition({ x: 80 + (i % 5) * 130, y: 200 + Math.floor(i / 5) * 90 }));
    for (let i = 0; i < 70; i++) scene.tick(1000 / 60);
    expect(onWin).toHaveBeenCalledTimes(1);
    expect(onWin).toHaveBeenCalledWith('A');
    scene.destroy();
  });

  it('palet lancé : ignore l’élastique jusqu’à l’avoir repassé, puis le respecte à nouveau', () => {
    physics = createPhysicsWorld();
    const scene = createGameScene({ physics, onWin: vi.fn() });
    const line = elasticLine('A');
    const puck = scene.pucks().find((p) => campOf(p.position().y) === 'A')!;
    const start = puck.position();
    scene.drag.pointerDown(1, start);
    for (let y = start.y; y <= line.y + 80; y += 20) {
      scene.drag.pointerMove(1, { x: start.x, y });
      scene.tick(50);
    }
    expect(puck.ignoresElastic()).toBe(true);
    scene.drag.pointerUp(1);
    for (let i = 0; i < 30; i++) scene.tick(1000 / 60);
    expect(puck.position().y).toBeLessThan(line.y);
    expect(puck.ignoresElastic()).toBe(false);
    scene.destroy();
  });

  it('reset remet les palets en place et réarme la victoire', () => {
    physics = createPhysicsWorld();
    const onWin = vi.fn();
    const scene = createGameScene({ physics, onWin });
    scene.pucks().forEach((p) => p.setPosition({ x: 360, y: 200 }));
    for (let i = 0; i < 70; i++) scene.tick(1000 / 60);
    scene.reset();
    const camps = scene.pucks().map((p) => campOf(p.position().y));
    expect(camps.filter((c) => c === 'A')).toHaveLength(PUCKS_PER_PLAYER);
    onWin.mockClear();
    for (let i = 0; i < 10; i++) scene.tick(1000 / 60);
    expect(onWin).not.toHaveBeenCalled();
    scene.destroy();
  });
});
```

Run: `pnpm --filter @gambette/game-passe-trappe exec vitest run tests/input tests/scenes`
Expected: FAIL (modules introuvables).

- [ ] **Step 2: `entities/Elastic.ts`**

```ts
import { Container, Graphics } from 'pixi.js';
import { COLORS } from '../config/theme';
import { elasticLine, stretchOf } from '../domain/elastic';
import type { Player, Vec } from '../domain/types';

export interface Elastic {
  readonly view: Container;
  /** Dessine l'élastique droit, ou en V autour du palet qui l'étire. */
  draw(puck: Vec | null): void;
}

export function createElastic(player: Player): Elastic {
  const line = elasticLine(player);
  const view = new Container();
  const g = new Graphics();
  view.addChild(g);
  const draw = (puck: Vec | null): void => {
    g.clear();
    g.moveTo(line.left.x, line.y);
    if (puck && stretchOf(puck, line, player) > 0) g.lineTo(puck.x, puck.y);
    g.lineTo(line.right.x, line.y).stroke({ width: 5, color: COLORS.elastic, cap: 'round' });
  };
  draw(null);
  return { view, draw };
}
```

- [ ] **Step 3: `input/DragController.ts`**

```ts
import { MouseJoint, Vec2 } from 'planck';
import type { PhysicsWorld } from '../core/PhysicsWorld';
import type { Puck } from '../entities/Puck';
import { DRAG_MAX_FORCE_PER_KG } from '../config/physics';
import { PUCK_RADIUS } from '../config/dimensions';
import { campOf, clampToCamp } from '../domain/rules';
import { elasticLine, launchVelocity } from '../domain/elastic';
import { createTouchRouter } from '../domain/touchRouting';
import type { Player, Vec } from '../domain/types';

export interface DragController {
  pointerDown(id: number, p: Vec): void;
  pointerMove(id: number, p: Vec): void;
  pointerUp(id: number): void;
  held(player: Player): Puck | null;
  reset(): void;
  destroy(): void;
}

interface Grab {
  puck: Puck;
  joint: MouseJoint;
}

const GRAB_RADIUS = PUCK_RADIUS * 1.3;

export function createDragController(deps: {
  physics: PhysicsWorld;
  pucks: () => readonly Puck[];
}): DragController {
  const { physics } = deps;
  const router = createTouchRouter();
  const grabs = new Map<Player, Grab>();
  const toTarget = (p: Vec) => Vec2(physics.toM(p.x), physics.toM(p.y));

  const pick = (p: Vec, player: Player): Puck | null => {
    let best: Puck | null = null;
    let bestD = GRAB_RADIUS;
    for (const puck of deps.pucks()) {
      const q = puck.position();
      if (campOf(q.y) !== player) continue;
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d <= bestD && ![...grabs.values()].some((g) => g.puck === puck)) {
        best = puck;
        bestD = d;
      }
    }
    return best;
  };

  const release = (player: Player, launch: boolean): void => {
    const grab = grabs.get(player);
    if (!grab) return;
    physics.world.destroyJoint(grab.joint);
    grabs.delete(player);
    const v = launch ? launchVelocity(grab.puck.position(), elasticLine(player), player) : null;
    if (v) grab.puck.setVelocity(v);
    else grab.puck.setIgnoreElastic(false);
  };

  return {
    pointerDown: (id, p) => {
      const player = router.begin(id, p.y);
      if (!player) return;
      const puck = pick(p, player);
      if (!puck) {
        router.end(id);
        return;
      }
      puck.setIgnoreElastic(true);
      const mass = puck.body.getMass();
      const joint = physics.world.createJoint(
        new MouseJoint(
          { maxForce: DRAG_MAX_FORCE_PER_KG * mass, frequencyHz: 8, dampingRatio: 0.9 },
          physics.ground,
          puck.body,
          puck.body.getPosition(),
        ),
      )!;
      joint.setTarget(toTarget(clampToCamp(p, player)));
      grabs.set(player, { puck, joint });
    },
    pointerMove: (id, p) => {
      const player = router.owner(id);
      const grab = player ? grabs.get(player) : undefined;
      if (player && grab) grab.joint.setTarget(toTarget(clampToCamp(p, player)));
    },
    pointerUp: (id) => {
      const player = router.owner(id);
      router.end(id);
      if (player) release(player, true);
    },
    held: (player) => grabs.get(player)?.puck ?? null,
    reset: () => {
      for (const player of [...grabs.keys()]) release(player, false);
      router.reset();
    },
    destroy: () => {
      for (const player of [...grabs.keys()]) release(player, false);
      router.reset();
    },
  };
}
```

Note : un palet relâché **avec** lancer garde `ignoreElastic = true` ; c'est `GameScene.tick` qui le rétablit dès que le palet est repassé devant son élastique (sinon le palet, parti de derrière la ligne, rebondirait contre l'élastique).

- [ ] **Step 4: `scenes/GameScene.ts`**

```ts
import { Container } from 'pixi.js';
import type { PhysicsWorld } from '../core/PhysicsWorld';
import { createBoard } from '../entities/Board';
import { createElastic, type Elastic } from '../entities/Elastic';
import { createPuck, type Puck } from '../entities/Puck';
import { createDragController, type DragController } from '../input/DragController';
import { DESIGN_WIDTH, MID_Y, PUCK_RADIUS, PUCKS_PER_PLAYER } from '../config/dimensions';
import { elasticLine, stretchOf } from '../domain/elastic';
import { campOf, createWinDetector } from '../domain/rules';
import { PLAYERS, type Player, type Vec } from '../domain/types';

export interface GameScene {
  readonly view: Container;
  readonly drag: DragController;
  pucks(): readonly Puck[];
  tick(deltaMs: number): void;
  reset(): void;
  destroy(): void;
}

/** Palets en ligne, à mi-chemin entre la cloison et l'élastique du joueur. */
export function initialPuckPositions(player: Player): Vec[] {
  const lineY = elasticLine(player).y;
  const y = (MID_Y + lineY) / 2;
  const step = DESIGN_WIDTH / (PUCKS_PER_PLAYER + 1);
  return Array.from({ length: PUCKS_PER_PLAYER }, (_, i) => ({ x: step * (i + 1), y }));
}

/** Le palet lancé est-il repassé devant son élastique (de toute sa taille) ? */
const backInFront = (puck: Puck): boolean => {
  const p = puck.position();
  return PLAYERS.every((pl) => {
    const line = elasticLine(pl);
    return pl === 'A'
      ? p.y < line.y - PUCK_RADIUS || p.y < MID_Y
      : p.y > line.y + PUCK_RADIUS || p.y > MID_Y;
  });
};

export function createGameScene(deps: {
  physics: PhysicsWorld;
  onWin(player: Player): void;
}): GameScene {
  const { physics } = deps;
  const view = new Container();
  const board = createBoard(physics);
  view.addChild(board.view);
  const elastics: Record<Player, Elastic> = { A: createElastic('A'), B: createElastic('B') };
  for (const p of PLAYERS) view.addChild(elastics[p].view);

  const pucks: Puck[] = PLAYERS.flatMap((p) => initialPuckPositions(p)).map((pos) => {
    const puck = createPuck(physics, pos);
    view.addChild(puck.view);
    return puck;
  });
  const drag = createDragController({ physics, pucks: () => pucks });
  const detector = createWinDetector();
  let won = false;

  const placeInitial = (): void => {
    const positions = PLAYERS.flatMap((p) => initialPuckPositions(p));
    pucks.forEach((puck, i) => {
      puck.setVelocity({ x: 0, y: 0 });
      puck.setPosition(positions[i]!);
      puck.setIgnoreElastic(false);
      puck.syncView();
    });
  };

  return {
    view,
    drag,
    pucks: () => pucks,
    tick: (deltaMs) => {
      physics.step(deltaMs);
      const counts: Record<Player, number> = { A: 0, B: 0 };
      for (const puck of pucks) {
        puck.syncView();
        counts[campOf(puck.position().y)] += 1;
        const heldNow = PLAYERS.some((pl) => drag.held(pl) === puck);
        if (!heldNow && puck.ignoresElastic() && backInFront(puck)) puck.setIgnoreElastic(false);
      }
      for (const pl of PLAYERS) {
        const held = drag.held(pl);
        const pos = held ? held.position() : null;
        elastics[pl].draw(pos && stretchOf(pos, elasticLine(pl), pl) > 0 ? pos : null);
      }
      const winner = detector.update(counts, deltaMs);
      if (winner && !won) {
        won = true;
        drag.reset();
        deps.onWin(winner);
      }
    },
    reset: () => {
      drag.reset();
      placeInitial();
      detector.reset();
      won = false;
    },
    destroy: () => {
      drag.destroy();
      view.destroy({ children: true });
    },
  };
}
```

Note : `backInFront` vérifie, pour chaque joueur, que le palet n'est plus dans la zone derrière l'élastique correspondant ; un palet au milieu du plateau satisfait les deux conditions.

- [ ] **Step 5: Vérifier**

```bash
pnpm exec prettier --write games/passe-trappe && pnpm --filter @gambette/game-passe-trappe test && pnpm --filter @gambette/game-passe-trappe lint
```

Expected: PASS. Si le lancer du test DragController est trop faible (`> -500` px/s), ajuster `LAUNCH_POWER`/`DRAG_MAX_FORCE_PER_KG` sans assouplir le test, et le noter.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(game-passe-trappe): élastiques, tir au doigt multitouch et scène de jeu

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PwD249iHE7SXS5EkecJV6c"
```

---

### Task 8: Passe-trappe — victoire, montage et standalone

**Files:**

- Create: `src/scenes/VictoryScene.ts`, `src/core/App.ts`, `src/mount.ts`, `src/index.ts`, `src/standalone-entry.ts`
- Test: `tests/scenes/VictoryScene.spec.ts`, `tests/mount.spec.ts`

**Interfaces:**

- Consumes: `createExitButton(parent, onExit, { placement: 'side' })`, `installOrientationLock(el, 'portrait')`, `runStandalone`, `GameModule` (game-sdk) ; `createGameScene`, `createPhysicsWorld`.
- Produces : `export const passeTrappe: GameModule` (`meta.key === 'passe-trappe'`) ; `createVictoryScene(deps: { winner: Player; onReplay(): void; onQuit(): void }): { view: Container; destroy(): void }`.

- [ ] **Step 1: Tests (échouent)**

`tests/scenes/VictoryScene.spec.ts` :

```ts
import { describe, it, expect, vi } from 'vitest';
import type { Container, FederatedPointerEvent, Text } from 'pixi.js';
import { createVictoryScene } from '../../src/scenes/VictoryScene';

const texts = (c: Container): Text[] =>
  c.children.flatMap((ch) => ('text' in ch ? [ch as Text] : texts(ch as Container)));
const byLabel = (c: Container, label: string): Container =>
  c.getChildByLabel(label, true) as Container;

describe('VictoryScene', () => {
  it('annonce le vainqueur deux fois, dont une retournée pour le joueur d’en haut', () => {
    const s = createVictoryScene({ winner: 'A', onReplay: vi.fn(), onQuit: vi.fn() });
    const msgs = texts(s.view).filter((t) => t.text.includes('gagne'));
    expect(msgs).toHaveLength(2);
    expect(msgs.every((t) => t.text === 'Joueur du bas gagne !')).toBe(true);
    expect(msgs.some((t) => Math.abs(t.rotation - Math.PI) < 1e-6)).toBe(true);
    s.destroy();
  });

  it('Rejouer et Quitter appellent leurs callbacks', () => {
    const onReplay = vi.fn();
    const onQuit = vi.fn();
    const s = createVictoryScene({ winner: 'B', onReplay, onQuit });
    expect(texts(s.view).some((t) => t.text === 'Joueur du haut gagne !')).toBe(true);
    byLabel(s.view, 'replay').emit('pointertap', {} as FederatedPointerEvent);
    byLabel(s.view, 'quit').emit('pointertap', {} as FederatedPointerEvent);
    expect(onReplay).toHaveBeenCalledTimes(1);
    expect(onQuit).toHaveBeenCalledTimes(1);
    s.destroy();
  });
});
```

`tests/mount.spec.ts` (même approche que rabbit-math : Pixi `Application` simulée) :

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Container } from 'pixi.js';
import type { GameContext } from '@gambette/game-sdk';

interface FakeApp {
  destroy: ReturnType<typeof vi.fn>;
  ticker: { add: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
  canvas: HTMLCanvasElement;
}
const { fakeApps } = vi.hoisted(() => ({ fakeApps: [] as FakeApp[] }));
vi.mock('../src/core/App', () => ({
  createApp: vi.fn(async (parent: HTMLElement) => {
    const canvas = document.createElement('canvas');
    parent.appendChild(canvas);
    const app = {
      stage: new Container(),
      canvas,
      ticker: { add: vi.fn(), remove: vi.fn() },
      destroy: vi.fn(() => canvas.remove()),
    };
    fakeApps.push(app);
    return app;
  }),
}));

const { passeTrappe } = await import('../src/index');
const ctx = (): GameContext => ({ locale: 'fr', onExit: vi.fn() });

beforeEach(() => {
  fakeApps.length = 0;
  document.body.innerHTML = '';
});

describe('passeTrappe.mount / unmount', () => {
  it('meta passe-trappe avec consigne', () => {
    expect(passeTrappe.meta.key).toBe('passe-trappe');
    expect(passeTrappe.meta.instructions).not.toBe('');
  });

  it('monte canvas + bouton quitter latéral ; unmount vide el', async () => {
    const el = document.createElement('div');
    const instance = await passeTrappe.mount(el, ctx());
    expect(el.querySelector('canvas')).not.toBeNull();
    const exit = el.querySelector('[data-test="game-exit"]')!.parentElement as HTMLElement;
    expect(exit.style.left).toBe('12px');
    instance.unmount();
    expect(el.children).toHaveLength(0);
    const app = fakeApps[0]!;
    expect(app.destroy).toHaveBeenCalled();
    expect(app.ticker.remove).toHaveBeenCalledWith(app.ticker.add.mock.calls[0]![0]);
  });

  it('Quitter (après confirmation) appelle ctx.onExit', async () => {
    const el = document.createElement('div');
    const c = ctx();
    const instance = await passeTrappe.mount(el, c);
    el.querySelector<HTMLButtonElement>('[data-test="game-exit"]')!.click();
    el.querySelector<HTMLButtonElement>('[data-test="game-exit-go"]')!.click();
    expect(c.onExit).toHaveBeenCalledTimes(1);
    instance.unmount();
  });

  it('deux cycles mount/unmount sans écouteur window résiduel', async () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const el = document.createElement('div');
    for (let i = 0; i < 2; i++) (await passeTrappe.mount(el, ctx())).unmount();
    const added = add.mock.calls.filter((c) =>
      ['resize', 'orientationchange'].includes(c[0] as string),
    );
    for (const [type, handler] of added) expect(remove).toHaveBeenCalledWith(type, handler);
    expect(el.children).toHaveLength(0);
    add.mockRestore();
    remove.mockRestore();
  });
});
```

Run: `pnpm --filter @gambette/game-passe-trappe exec vitest run tests/scenes/VictoryScene.spec.ts tests/mount.spec.ts`
Expected: FAIL (modules introuvables).

- [ ] **Step 2: `scenes/VictoryScene.ts`**

```ts
import { Container, Graphics, Text } from 'pixi.js';
import { DESIGN_HEIGHT, DESIGN_WIDTH, MID_Y } from '../config/dimensions';
import { COLORS } from '../config/theme';
import type { Player } from '../domain/types';

export interface VictoryScene {
  readonly view: Container;
  destroy(): void;
}

const MESSAGE: Record<Player, string> = {
  A: 'Joueur du bas gagne !',
  B: 'Joueur du haut gagne !',
};

const makeText = (text: string, size: number, color: number): Text => {
  const t = new Text({
    text,
    style: { fontFamily: 'system-ui, sans-serif', fontSize: size, fontWeight: '800', fill: color },
  });
  t.anchor.set(0.5);
  return t;
};

const makeButton = (label: string, name: string, x: number, onTap: () => void): Container => {
  const btn = new Container();
  btn.label = name;
  btn.position.set(x, MID_Y);
  btn.eventMode = 'static';
  btn.cursor = 'pointer';
  const bg = new Graphics().roundRect(-120, -40, 240, 80, 40).fill(COLORS.button);
  btn.addChild(bg, makeText(label, 34, COLORS.buttonText));
  btn.on('pointertap', onTap);
  return btn;
};

export function createVictoryScene(deps: {
  winner: Player;
  onReplay(): void;
  onQuit(): void;
}): VictoryScene {
  const view = new Container();
  view.eventMode = 'static';
  view.addChild(
    new Graphics()
      .rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT)
      .fill({ color: COLORS.overlay, alpha: 0.7 }),
  );
  const bottom = makeText(MESSAGE[deps.winner], 52, COLORS.text);
  bottom.position.set(DESIGN_WIDTH / 2, MID_Y + 200);
  const top = makeText(MESSAGE[deps.winner], 52, COLORS.text);
  top.position.set(DESIGN_WIDTH / 2, MID_Y - 200);
  top.rotation = Math.PI;
  view.addChild(
    bottom,
    top,
    makeButton('↻ Rejouer', 'replay', DESIGN_WIDTH / 2 - 140, deps.onReplay),
    makeButton('✕ Quitter', 'quit', DESIGN_WIDTH / 2 + 140, deps.onQuit),
  );
  return { view, destroy: () => view.destroy({ children: true }) };
}
```

- [ ] **Step 3: `core/App.ts`**

Copier `games/rabbit-math/src/core/App.ts` vers `games/passe-trappe/src/core/App.ts` puis remplacer `COLORS.sky` par `COLORS.table`. Les imports `../config/dimensions` et `../config/theme` se résolvent vers les fichiers du passe-trappe (`DESIGN_WIDTH`/`DESIGN_HEIGHT` 720 × 1280).

- [ ] **Step 4: `mount.ts`, `index.ts`, standalone**

`src/mount.ts` :

```ts
import type { FederatedPointerEvent, Ticker } from 'pixi.js';
import { Rectangle } from 'pixi.js';
import {
  createExitButton,
  installOrientationLock,
  type GameContext,
  type GameInstance,
} from '@gambette/game-sdk';
import { createApp } from './core/App';
import { createPhysicsWorld } from './core/PhysicsWorld';
import { createGameScene } from './scenes/GameScene';
import { createVictoryScene, type VictoryScene } from './scenes/VictoryScene';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from './config/dimensions';

export async function mountPasseTrappe(el: HTMLElement, ctx: GameContext): Promise<GameInstance> {
  const app = await createApp(el);
  // Tout ce qui est installé après createApp : libéré dans l'ordre inverse, au unmount comme sur échec.
  const cleanups: Array<() => void> = [() => app.destroy()];
  const teardown = (): void => {
    while (cleanups.length > 0) cleanups.pop()!();
  };

  try {
    const physics = createPhysicsWorld();
    cleanups.push(() => physics.destroy());
    let victory: VictoryScene | null = null;
    const closeVictory = (): void => {
      victory?.destroy();
      victory = null;
    };
    cleanups.push(closeVictory);

    const scene = createGameScene({
      physics,
      onWin: (winner) => {
        victory = createVictoryScene({
          winner,
          onReplay: () => {
            closeVictory();
            scene.reset();
          },
          onQuit: () => ctx.onExit(),
        });
        app.stage.addChild(victory.view);
      },
    });
    app.stage.addChild(scene.view);
    cleanups.push(() => scene.destroy());

    // Entrée multitouch : chaque pointeur (doigt) est routé par son pointerId.
    app.stage.eventMode = 'static';
    app.stage.hitArea = new Rectangle(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    const pos = (e: FederatedPointerEvent) => e.getLocalPosition(app.stage);
    const down = (e: FederatedPointerEvent): void => scene.drag.pointerDown(e.pointerId, pos(e));
    const move = (e: FederatedPointerEvent): void => scene.drag.pointerMove(e.pointerId, pos(e));
    const up = (e: FederatedPointerEvent): void => scene.drag.pointerUp(e.pointerId);
    app.stage.on('pointerdown', down);
    app.stage.on('globalpointermove', move);
    app.stage.on('pointerup', up);
    app.stage.on('pointerupoutside', up);
    app.stage.on('pointercancel', up);
    cleanups.push(() => app.stage.removeAllListeners());

    cleanups.push(installOrientationLock(el, 'portrait'));
    const exit = createExitButton(el, () => ctx.onExit(), { placement: 'side' });
    cleanups.push(() => exit.dispose());

    const onTick = (t: Ticker): void => {
      if (!victory) scene.tick(t.deltaMS);
    };
    app.ticker.add(onTick);
    cleanups.push(() => app.ticker.remove(onTick));
  } catch (e) {
    teardown();
    throw e;
  }

  return { unmount: teardown };
}
```

Note : `app.stage` est le conteneur racine renvoyé par `createApp` (même forme que rabbit-math). Si `getLocalPosition` n'existe pas sur le faux `stage` du test (`Container` réel → il existe), aucun ajustement n'est nécessaire.

`src/index.ts` :

```ts
import type { GameModule } from '@gambette/game-sdk';
import { mountPasseTrappe } from './mount';

export const passeTrappe: GameModule = {
  meta: {
    key: 'passe-trappe',
    name: 'Passe-trappe',
    description: 'Le jeu d’adresse en bois, à deux sur le même téléphone.',
    instructions:
      'Posez le téléphone entre vous, chacun face à son camp. Plaquez un palet contre ' +
      'votre élastique, tirez puis relâchez pour le faire passer par le trou. ' +
      'Le premier qui n’a plus aucun palet dans son camp a gagné !',
  },
  mount: mountPasseTrappe,
};
```

`src/standalone-entry.ts` :

```ts
import { runStandalone } from '@gambette/game-sdk';
import { passeTrappe } from './index';

const root = document.getElementById('game-root');
if (!root) throw new Error('Missing #game-root');
void runStandalone(passeTrappe, { container: root });
```

- [ ] **Step 5: Vérifier**

```bash
pnpm exec prettier --write games/passe-trappe
pnpm --filter @gambette/game-passe-trappe test && pnpm --filter @gambette/game-passe-trappe typecheck && pnpm --filter @gambette/game-passe-trappe lint && pnpm --filter @gambette/game-passe-trappe build
```

Expected: PASS ; `games/passe-trappe/dist/index.html` généré.

- [ ] **Step 6: Dev standalone**

```bash
(pnpm dev:passe-trappe > /tmp/pt-dev.log 2>&1 &) ; for i in $(seq 1 30); do curl -s -o /dev/null -w "%{http_code}" http://localhost:5102/ | grep -q 200 && break; sleep 1; done; curl -s http://localhost:5102/ | grep -o "<title>[^<]*</title>"; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5102/src/standalone-entry.ts
```

Expected: `<title>Passe-trappe</title>` puis `200`. Arrêter le serveur ensuite (`lsof -nP -iTCP:5102 -sTCP:LISTEN` vide).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(game-passe-trappe): écran de victoire, montage et dev standalone

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PwD249iHE7SXS5EkecJV6c"
```

---

### Task 9: Intégration au shell et vérification globale

**Files:**

- Modify: `apps/web/package.json`, `apps/web/games.ts`, `apps/web/lib/gameCosmetics.ts`, `apps/web/test/games.test.ts`

**Interfaces:**

- Consumes: `passeTrappe` (Task 8).

- [ ] **Step 1: Test (échoue)**

Ajouter à `apps/web/test/games.test.ts` :

```ts
describe('registre de jeux — passe-trappe', () => {
  it('contient passe-trappe avec une consigne, après rabbit-math', () => {
    const keys = registry.list().map((m) => m.meta.key);
    expect(keys).toEqual(['rabbit-math', 'passe-trappe']);
    expect(registry.get('passe-trappe')!.meta.instructions.length).toBeGreaterThan(0);
  });
});
```

Run: `pnpm --filter @gambette/web test` → FAIL.

- [ ] **Step 2: Implémenter**

```bash
pnpm --filter @gambette/web add @gambette/game-passe-trappe@workspace:*
```

`apps/web/games.ts` :

```ts
import { createGameRegistry } from '@gambette/game-sdk';
import { rabbitMath } from '@gambette/game-rabbit-math';
import { passeTrappe } from '@gambette/game-passe-trappe';

export const registry = createGameRegistry([rabbitMath, passeTrappe]);
```

`apps/web/lib/gameCosmetics.ts`, dans `BY_KEY` :

```ts
  'passe-trappe': {
    color: 'tertiary',
    icon: 'mdi-swap-vertical',
    traits: ['adresse', '2 joueurs'],
  },
```

- [ ] **Step 3: Pipeline complet dans un clone frais**

```bash
git add -A && git commit -m "feat(web): ajoute le passe-trappe au menu des jeux

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PwD249iHE7SXS5EkecJV6c"
C=/private/tmp/claude-501/-Users-pauldoazan-orca-gambette/913b3e6d-d8aa-45f1-a8a2-f03e8f199146/scratchpad/gambette-pt-ci-$(date +%s)
git clone -q --branch feat/passe-trappe /Users/pauldoazan/orca/gambette "$C"
cd "$C" && pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm format:check
```

Expected: tout passe.

- [ ] **Step 4: Frontières**

```bash
cd /Users/pauldoazan/orca/gambette
ls packages games
grep -rn "matter" --include=*.ts --include=*.json games packages apps | grep -v node_modules | grep -v "trajectories.golden.json"
```

Expected: `packages` = `game-sdk math-sdk` ; `games` = `passe-trappe rabbit-math` ; le `grep` ne renvoie que les commentaires de `games/rabbit-math/src/config/physics.ts` citant matter-js comme origine des valeurs.

- [ ] **Step 5: Commit (si des corrections ont été nécessaires)**

```bash
git add -A && git commit -m "chore: corrections de la vérification globale

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PwD249iHE7SXS5EkecJV6c"
```

Ne pas pousser.
