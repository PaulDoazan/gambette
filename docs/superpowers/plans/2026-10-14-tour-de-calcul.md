# Tour de calcul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter à Gambette le jeu « Tour de calcul » (`tower-math`) : le Tower Slice de lehibou-games où la photo + 3 noms sont remplacés par un calcul + 5 résultats réglés via `math-sdk`, jouable en plein écran et quittable.

**Architecture:** Nouveau package `packages/game-tower-math` qui porte `engine.ts`/`motion.ts`/`scene.ts` de `lehibou-games/packages/game-tower` et remplace le quiz collaborateurs par un flux de questions `math-sdk`. Le `game-sdk` gagne une option `fullscreen: 'always'` sur `createExitButton`. Le shell `apps/web` enregistre le jeu.

**Tech Stack:** TypeScript, three.js 0.162, cannon-es 0.20, Vite 8, Vitest 4 (jsdom), pnpm 10 + Turborepo, Nuxt 4 (shell).

**Spec:** `docs/superpowers/specs/2026-10-14-tour-de-calcul-design.md`

## Global Constraints

- Clé du jeu `tower-math`, nom affiché « Tour de calcul », package `@gambette/game-tower-math`.
- 5 résultats par question (`choicesCount: 5`), difficulté `'medium'`.
- Clés `localStorage` : `gambette.tower-math.calcs` (via `createCalcsStore('tower-math')`), `gambette.tower-math.record`.
- Mauvaise réponse ou pavé hors chevauchement = fin de partie ; écran de fin après 900 ms.
- Bouton quitter du SDK avec `{ fullscreen: 'always' }` ; le plein écran cible `document.documentElement`.
- Après `unmount()`, `el` est vide ; aucun écouteur `resize` restant ; aucun timer ni RAF actif.
- Versions : `three ^0.162.0`, `@types/three ^0.162.0`, `cannon-es ^0.20.0` ; outillage aligné sur `game-rabbit-math` (`typescript ^6.0.3`, `vite ^8.0.10`, `vitest ^4.1.5`, `jsdom ^29.0.2`).
- Textes, commentaires et messages de commit en français ; commits conventionnels (`feat(game-tower-math): …`), terminés par `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm format:check` passent à la racine en fin de plan.

## Review Focus

- Démontage pendant le délai de fin de partie (900 ms) : `onGameOver` ne doit jamais être appelé, aucun DOM réinjecté → test dans Task 5.
- Démontage pendant que le sélecteur de calculs est ouvert, puis résolution tardive : aucun redémarrage, aucune exception, `el` reste vide → test dans Task 5.
- Soustraction à résultat négatif (ex. `3 − 9`) : 5 choix distincts contenant la réponse → test dans Task 3.
- `localStorage` qui lève (navigation privée) : record à 0, jeu jouable, aucune exception → test dans Task 3.
- Double clic rapide sur l'engrenage : un seul sélecteur ouvert → test dans Task 5.

## Prérequis (avant Task 1)

Le worktree n'a pas de `node_modules` et le hook bloque `pnpm install` lancé par l'agent. L'utilisateur lance une fois, dans le prompt :

```
! pnpm install
```

Les dépendances `three`/`cannon-es` ajoutées en Task 2 nécessitent un second `pnpm install` (même méthode) — signalé dans la tâche.

---

### Task 1: `game-sdk` — option `fullscreen: 'always'`

**Files:**

- Modify: `packages/game-sdk/src/exit-button.ts`
- Test: `packages/game-sdk/test/exit-button.test.ts`
- Format: `docs/superpowers/specs/2026-10-14-tour-de-calcul-design.md` (fixup du commit de spec)

**Interfaces:**

- Produces: `createExitButton(parent: HTMLElement, onExit: () => void, opts?: { fullscreen?: boolean | 'always' }): ExitButton`. `true` (défaut) = mobile seulement, `'always'` = tout appareil où l'API existe, `false` = jamais.

- [ ] **Step 1: Formater la spec et l'absorber dans son commit**

Spec et plan ont été commités sans Prettier (dépendances absentes à ce moment-là). Chaque correction de formatage est absorbée dans son propre commit (le formatage peut ne rien changer : sauter alors le commit correspondant) :

```bash
pnpm exec prettier --write docs/superpowers/specs/2026-10-14-tour-de-calcul-design.md docs/superpowers/plans/2026-10-14-tour-de-calcul.md
git add docs/superpowers/specs/2026-10-14-tour-de-calcul-design.md
git commit --fixup=$(git log --format=%H -1 --grep='docs(spec): design du jeu Tour de calcul')
git add docs/superpowers/plans/2026-10-14-tour-de-calcul.md
git commit --fixup=$(git log --format=%H -1 --grep="docs(plan): plan d'implémentation de Tour de calcul")
```

- [ ] **Step 2: Écrire les tests qui échouent**

Ajouter dans le `describe('createExitButton — bouton plein écran', …)` de `packages/game-sdk/test/exit-button.test.ts`, après le test `fullscreen: false` :

```ts
it("affiche le bouton sur desktop quand fullscreen: 'always'", () => {
  setPointer(false);
  setFullscreenApi(true);
  createExitButton(root, vi.fn(), { fullscreen: 'always' });
  expect(root.querySelector(fsSelector)).not.toBeNull();
});

it("n'affiche pas le bouton avec fullscreen: 'always' si l'API est absente", () => {
  setPointer(false);
  setFullscreenApi(false);
  createExitButton(root, vi.fn(), { fullscreen: 'always' });
  expect(root.querySelector(fsSelector)).toBeNull();
});
```

- [ ] **Step 3: Lancer les tests — échec attendu**

Run: `pnpm --filter @gambette/game-sdk test`
Expected: FAIL sur « affiche le bouton sur desktop quand fullscreen: 'always' » (bouton null) ; `typecheck` signalerait aussi `'always'` non assignable à `boolean`.

- [ ] **Step 4: Implémenter**

Dans `packages/game-sdk/src/exit-button.ts` :

Remplacer la fin du commentaire de doc :

```ts
 * confirmation. Sur mobile (et si l'API Fullscreen est disponible), un bouton
 * plein écran apparaît juste à côté et bascule l'affichage du jeu.
 * `opts.fullscreen: false` désactive ce bouton (jeu qui fournit le sien).
 */
```

par :

```ts
 * confirmation. Si l'API Fullscreen est disponible, un bouton plein écran
 * apparaît juste à côté et bascule l'affichage du jeu : sur mobile seulement
 * par défaut, sur tout appareil avec `opts.fullscreen: 'always'`.
 * `opts.fullscreen: false` désactive ce bouton (jeu qui fournit le sien).
 */
```

Changer la signature :

```ts
  opts: { fullscreen?: boolean | 'always' } = {},
```

Remplacer :

```ts
// Bouton plein écran : mobile uniquement, et seulement si l'API est dispo.
```

et la condition `if ((opts.fullscreen ?? true) && isMobile() && fullscreenAvailable(target)) {` par :

```ts
// Bouton plein écran : mobile uniquement par défaut (partout avec 'always'),
// et seulement si l'API est dispo.
```

```ts
  const mode = opts.fullscreen ?? true;
  const wanted = mode === 'always' || (mode === true && isMobile());
  if (wanted && fullscreenAvailable(target)) {
```

(la déclaration `const target = …` reste juste au-dessus, inchangée).

- [ ] **Step 5: Lancer tests + typecheck + lint — succès attendu**

Run: `pnpm --filter @gambette/game-sdk test && pnpm --filter @gambette/game-sdk typecheck && pnpm --filter @gambette/game-sdk lint`
Expected: PASS (tous les tests, dont les 2 nouveaux ; rabbit-math, qui passe `false`, n'est pas impacté).

- [ ] **Step 6: Commit**

```bash
git add packages/game-sdk
git commit -m "feat(game-sdk): option fullscreen 'always' du bouton quitter (plein écran sur tout appareil)"
```

---

### Task 2: Socle `game-tower-math` + moteur porté

**Files:**

- Create: `packages/game-tower-math/package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`
- Create (copie verbatim de game-tower) : `src/engine.ts`, `src/motion.ts`, `test/engine.test.ts`, `test/motion.test.ts`

**Interfaces:**

- Produces: `createTowerEngine(opts?: { boxSize?: number }): TowerEngine` avec `start(): { foundation: Layer; first: Layer }`, `current(): Layer`, `slice(position: number): SliceResult`, `fail(): void`, `score: number`, `status: 'idle' | 'playing' | 'lost'` ; types `Layer`, `SliceCut`, `SliceResult` ; `stepBounce(pos, forward, speed, bound, dt): BounceState`.

- [ ] **Step 1: Créer `packages/game-tower-math/package.json`**

```json
{
  "name": "@gambette/game-tower-math",
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
    "lint": "eslint src test"
  },
  "dependencies": {
    "@gambette/game-sdk": "workspace:*",
    "@gambette/math-sdk": "workspace:*",
    "cannon-es": "^0.20.0",
    "three": "^0.162.0"
  },
  "devDependencies": {
    "@types/three": "^0.162.0",
    "jsdom": "^29.0.2",
    "typescript": "^6.0.3",
    "vite": "^8.0.10",
    "vitest": "^4.1.5"
  }
}
```

- [ ] **Step 2: Créer `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`**

`packages/game-tower-math/tsconfig.json` :

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "noEmit": true
  },
  "include": ["src", "test", "vite.config.ts", "vitest.config.ts"]
}
```

`packages/game-tower-math/vite.config.ts` :

```ts
import { defineConfig } from 'vite';

// Build standalone (jouer hors plateforme). La plateforme consomme src/ directement.
export default defineConfig({
  base: './',
  server: { port: 5175 },
  build: { outDir: 'dist', emptyOutDir: true },
});
```

`packages/game-tower-math/vitest.config.ts` :

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Copier moteur, mouvement et leurs tests depuis lehibou-games (branche `develop`)**

```bash
mkdir -p packages/game-tower-math/src packages/game-tower-math/test
for f in src/engine.ts src/motion.ts test/engine.test.ts test/motion.test.ts; do
  gh api "repos/PaulDoazan/lehibou-games/contents/packages/game-tower/$f?ref=develop" \
    -H 'Accept: application/vnd.github.raw' > "packages/game-tower-math/$f"
done
```

Ces fichiers n'importent que `vitest` et des modules locaux : aucune adaptation.

- [ ] **Step 4: Installer les nouvelles dépendances**

Demander à l'utilisateur de lancer `! pnpm install` (le hook bloque l'agent). Vérifier ensuite : `ls packages/game-tower-math/node_modules/three/package.json`.

- [ ] **Step 5: Lancer tests, typecheck, lint**

Run: `pnpm --filter @gambette/game-tower-math test && pnpm --filter @gambette/game-tower-math typecheck && pnpm --filter @gambette/game-tower-math lint`
Expected: PASS — tests `engine` et `motion` repris tels quels, au vert. (Le `build` n'est vérifié qu'en Task 5, quand `index.html` existe.)

- [ ] **Step 6: Formater et commiter**

```bash
pnpm exec prettier --write packages/game-tower-math pnpm-lock.yaml
git add packages/game-tower-math pnpm-lock.yaml
git commit -m "feat(game-tower-math): socle du package et moteur d'empilement porté de game-tower"
```

---

### Task 3: Flux de questions et record local

**Files:**

- Create: `packages/game-tower-math/src/questionFeed.ts`, `packages/game-tower-math/src/record.ts`
- Test: `packages/game-tower-math/test/questionFeed.test.ts`, `packages/game-tower-math/test/record.test.ts`

**Interfaces:**

- Consumes: `generateQuestions`, `opSymbol`, `Pair`, `Question` de `@gambette/math-sdk`.
- Produces:
  - `CHOICES_COUNT = 5`
  - `createQuestionFeed(pairs: readonly Pair[], seed?: number): QuestionFeed` avec `QuestionFeed.next(): Question`
  - `formatCalc(q: Pick<Question, 'a' | 'b' | 'op'>): string` → `"6 × 7"`
  - `formatSolved(q: Pick<Question, 'a' | 'b' | 'op' | 'answer'>): string` → `"6 × 7 = 42"`
  - `RECORD_KEY = 'gambette.tower-math.record'`, `loadRecord(): number`, `saveRecord(n: number): void`

- [ ] **Step 1: Écrire les tests qui échouent**

`packages/game-tower-math/test/questionFeed.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import type { Pair } from '@gambette/math-sdk';
import { CHOICES_COUNT, createQuestionFeed, formatCalc, formatSolved } from '../src/questionFeed';

const PAIRS: Pair[] = [
  { a: 6, b: 7, op: 'mul' },
  { a: 3, b: 4, op: 'add' },
  { a: 9, b: 4, op: 'sub' },
];

describe('createQuestionFeed', () => {
  it('chaque question a 5 choix distincts dont la bonne réponse', () => {
    const feed = createQuestionFeed(PAIRS, 1);
    for (let i = 0; i < 20; i++) {
      const q = feed.next();
      expect(q.choices).toHaveLength(CHOICES_COUNT);
      expect(new Set(q.choices).size).toBe(CHOICES_COUNT);
      expect(q.choices).toContain(q.answer);
    }
  });

  it("ne pioche que dans les paires fournies, au-delà d'un lot (pas d'épuisement)", () => {
    const feed = createQuestionFeed(PAIRS, 2);
    const keys = new Set(PAIRS.map((p) => `${p.a}${p.op}${p.b}`));
    for (let i = 0; i < 130; i++) {
      const q = feed.next();
      expect(keys.has(`${q.a}${q.op}${q.b}`)).toBe(true);
    }
  });

  it('est déterministe pour une même graine', () => {
    const a = createQuestionFeed(PAIRS, 42);
    const b = createQuestionFeed(PAIRS, 42);
    for (let i = 0; i < 60; i++) expect(a.next()).toEqual(b.next());
  });

  it('soustraction à résultat négatif : 5 choix distincts contenant la réponse', () => {
    const feed = createQuestionFeed([{ a: 3, b: 9, op: 'sub' }], 3);
    const q = feed.next();
    expect(q.answer).toBe(-6);
    expect(new Set(q.choices).size).toBe(CHOICES_COUNT);
    expect(q.choices).toContain(-6);
  });
});

describe('formatCalc / formatSolved', () => {
  it('formate le calcul avec le symbole de l’opération', () => {
    expect(formatCalc({ a: 6, b: 7, op: 'mul' })).toBe('6 × 7');
    expect(formatCalc({ a: 3, b: 4, op: 'add' })).toBe('3 + 4');
    expect(formatSolved({ a: 9, b: 4, op: 'sub', answer: 5 })).toBe('9 − 4 = 5');
  });
});
```

`packages/game-tower-math/test/record.test.ts` :

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RECORD_KEY, loadRecord, saveRecord } from '../src/record';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('record local', () => {
  it('vaut 0 sans donnée', () => {
    expect(loadRecord()).toBe(0);
  });

  it('aller-retour', () => {
    saveRecord(12);
    expect(localStorage.getItem(RECORD_KEY)).toBe('12');
    expect(loadRecord()).toBe(12);
  });

  it('donnée invalide → 0', () => {
    for (const raw of ['abc', '-3', '2.5', '']) {
      localStorage.setItem(RECORD_KEY, raw);
      expect(loadRecord()).toBe(0);
    }
  });

  it('localStorage qui lève → 0 en lecture, écriture ignorée sans erreur', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(loadRecord()).toBe(0);
    expect(() => saveRecord(5)).not.toThrow();
  });
});
```

- [ ] **Step 2: Lancer — échec attendu**

Run: `pnpm --filter @gambette/game-tower-math test`
Expected: FAIL — `Cannot find module '../src/questionFeed'` / `'../src/record'`.

- [ ] **Step 3: Implémenter**

`packages/game-tower-math/src/questionFeed.ts` :

```ts
import { generateQuestions, opSymbol, type Pair, type Question } from '@gambette/math-sdk';

export const CHOICES_COUNT = 5;
const BATCH_SIZE = 50;

export interface QuestionFeed {
  next(): Question;
}

/**
 * Flux infini de questions (la tour n'a pas de fin) : génère des lots via
 * math-sdk et en relance un, graine suivante, dès que le précédent est épuisé.
 */
export function createQuestionFeed(
  pairs: readonly Pair[],
  seed: number = Date.now(),
): QuestionFeed {
  let batch: Question[] = [];
  let index = 0;
  let batches = 0;
  return {
    next(): Question {
      if (index >= batch.length) {
        batch = generateQuestions({
          pairs,
          difficulty: 'medium',
          count: BATCH_SIZE,
          choicesCount: CHOICES_COUNT,
          seed: seed + batches++,
        });
        index = 0;
      }
      return batch[index++] as Question;
    },
  };
}

export const formatCalc = (q: Pick<Question, 'a' | 'b' | 'op'>): string =>
  `${q.a} ${opSymbol(q.op)} ${q.b}`;

export const formatSolved = (q: Pick<Question, 'a' | 'b' | 'op' | 'answer'>): string =>
  `${formatCalc(q)} = ${q.answer}`;
```

`packages/game-tower-math/src/record.ts` :

```ts
export const RECORD_KEY = 'gambette.tower-math.record';

/** Meilleur score sur cet appareil ; absent, invalide ou stockage indisponible → 0. */
export function loadRecord(): number {
  try {
    const n = Number(localStorage.getItem(RECORD_KEY));
    return Number.isInteger(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function saveRecord(n: number): void {
  try {
    localStorage.setItem(RECORD_KEY, String(n));
  } catch {
    // Stockage indisponible (navigation privée, quota) : le record vit le temps de la session.
  }
}
```

- [ ] **Step 4: Lancer — succès attendu**

Run: `pnpm --filter @gambette/game-tower-math test && pnpm --filter @gambette/game-tower-math typecheck && pnpm --filter @gambette/game-tower-math lint`
Expected: PASS. Si le test « soustraction négative » échoue (moins de 5 choix), c'est un défaut de `generateDistractors` dans `math-sdk` : s'arrêter et le signaler, ne pas affaiblir le test.

- [ ] **Step 5: Commit**

```bash
pnpm exec prettier --write packages/game-tower-math
git add packages/game-tower-math
git commit -m "feat(game-tower-math): flux de questions à 5 choix et record local"
```

---

### Task 4: Texture « calcul résolu » et scène adaptée

**Files:**

- Create: `packages/game-tower-math/src/calcTexture.ts`
- Create (copie adaptée de game-tower) : `packages/game-tower-math/src/scene.ts`
- Test: `packages/game-tower-math/test/calcTexture.test.ts`

**Interfaces:**

- Consumes: `Layer`, `SliceCut` (Task 2), `stepBounce` (Task 2).
- Produces:
  - `drawCalcLabel(ctx: CanvasRenderingContext2D, label: string): void`
  - `createCalcTexture(label: string): THREE.CanvasTexture`
  - `createLabelCache<T extends { dispose(): void }>(create: (label: string) => T): { get(label: string): T; dispose(): void }`
  - `createScene(canvas: HTMLCanvasElement): TowerScene` avec `reset(foundation, first)`, `currentPositionOnAxis(): number`, `texturePlacedTop(label: string): void`, `applyCut(cut)`, `dropCurrent()`, `tick()`, `resize(w, h)`, `dispose()` — **plus de `preloadPhoto`**.

- [ ] **Step 1: Écrire le test qui échoue**

`packages/game-tower-math/test/calcTexture.test.ts` :

```ts
import { describe, it, expect, vi } from 'vitest';
import { createCalcTexture, createLabelCache, drawCalcLabel } from '../src/calcTexture';

// Contexte 2D factice : la largeur mesurée est proportionnelle à la taille de police.
function fakeCtx() {
  let fontPx = 0;
  return {
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn((s: string) => ({ width: s.length * fontPx * 0.6 })),
    set font(v: string) {
      fontPx = Number(/(\d+)px/.exec(v)?.[1] ?? 0);
    },
    get font() {
      return `${fontPx}px`;
    },
    fillStyle: '',
    textAlign: '',
    textBaseline: '',
    fontPx: () => fontPx,
  };
}

describe('drawCalcLabel', () => {
  it('dessine le libellé centré', () => {
    const ctx = fakeCtx();
    drawCalcLabel(ctx as unknown as CanvasRenderingContext2D, '6 × 7 = 42');
    expect(ctx.fillText).toHaveBeenCalledWith('6 × 7 = 42', 128, 128);
  });

  it('réduit la police pour un libellé long (reste dans la face)', () => {
    const short = fakeCtx();
    drawCalcLabel(short as unknown as CanvasRenderingContext2D, '2 + 3 = 5');
    const long = fakeCtx();
    drawCalcLabel(long as unknown as CanvasRenderingContext2D, '10 × 10 = 100');
    expect(long.fontPx()).toBeLessThan(short.fontPx());
    expect(long.measureText('10 × 10 = 100').width).toBeLessThanOrEqual(256 * 0.9);
  });
});

describe('createCalcTexture', () => {
  it('produit une texture redressée pour la caméra iso (45°)', () => {
    const tex = createCalcTexture('6 × 7 = 42');
    expect(tex.rotation).toBeCloseTo(Math.PI / 4);
    expect(tex.center.x).toBe(0.5);
    tex.dispose();
  });
});

describe('createLabelCache', () => {
  it('renvoie la même instance par libellé et libère tout au dispose', () => {
    const create = vi.fn(() => ({ dispose: vi.fn() }));
    const cache = createLabelCache(create);
    const a = cache.get('6 × 7 = 42');
    expect(cache.get('6 × 7 = 42')).toBe(a);
    cache.get('3 + 4 = 7');
    expect(create).toHaveBeenCalledTimes(2);
    cache.dispose();
    expect(a.dispose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Lancer — échec attendu**

Run: `pnpm --filter @gambette/game-tower-math test`
Expected: FAIL — `Cannot find module '../src/calcTexture'`.

- [ ] **Step 3: Implémenter `calcTexture.ts`**

```ts
import * as THREE from 'three';

const SIZE = 256; // côté du canvas (px)
const MAX_FONT = 72;
const MIN_FONT = 24;
const MAX_TEXT_WIDTH = SIZE * 0.9;
// Fond blanc : la texture est multipliée par la couleur du pavé (le pavé garde
// sa teinte), le texte sombre ressort par-dessus.
const BG = '#FFFFFF';
const FG = '#00274B'; // Oxford Blue

const fontOf = (px: number): string => `800 ${px}px system-ui, sans-serif`;

/** Dessine le libellé centré, police réduite jusqu'à tenir dans la face. */
export function drawCalcLabel(ctx: CanvasRenderingContext2D, label: string): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, SIZE, SIZE);
  let px = MAX_FONT;
  ctx.font = fontOf(px);
  while (px > MIN_FONT && ctx.measureText(label).width > MAX_TEXT_WIDTH) {
    px -= 4;
    ctx.font = fontOf(px);
  }
  ctx.fillStyle = FG;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, SIZE / 2, SIZE / 2);
}

/** Texture du calcul résolu pour la face du dessus d'un pavé posé. */
export function createCalcTexture(label: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (ctx) drawCalcLabel(ctx, label);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  // Caméra iso : la face du dessus apparaît en losange → texte redressé de 45°.
  tex.center.set(0.5, 0.5);
  tex.rotation = Math.PI / 4;
  return tex;
}

/** Cache par libellé : un même calcul revient sur plusieurs étages. */
export function createLabelCache<T extends { dispose(): void }>(
  create: (label: string) => T,
): { get(label: string): T; dispose(): void } {
  const byLabel = new Map<string, T>();
  return {
    get(label: string): T {
      let item = byLabel.get(label);
      if (!item) {
        item = create(label);
        byLabel.set(label, item);
      }
      return item;
    },
    dispose(): void {
      byLabel.forEach((item) => item.dispose());
      byLabel.clear();
    },
  };
}
```

(jsdom renvoie `null` pour `getContext('2d')` : la texture reste vierge en test, sans erreur.)

- [ ] **Step 4: Lancer le test — succès attendu**

Run: `pnpm --filter @gambette/game-tower-math test -- calcTexture`
Expected: PASS.

- [ ] **Step 5: Copier `scene.ts` puis remplacer la photo par la texture calcul**

```bash
gh api 'repos/PaulDoazan/lehibou-games/contents/packages/game-tower/src/scene.ts?ref=develop' \
  -H 'Accept: application/vnd.github.raw' > packages/game-tower-math/src/scene.ts
```

Modifications exactes dans `packages/game-tower-math/src/scene.ts` :

1. Import : remplacer `import { loadPhoto } from './loadPhoto';` par
   ```ts
   import { createCalcTexture, createLabelCache } from './calcTexture';
   ```
2. Remplacer
   ```ts
   // Faces d'un BoxGeometry : [+x, -x, +y, -y, +z, -z] → photo sur la face du dessus (+y).
   const PHOTO_FACES = [2];
   ```
   par
   ```ts
   // Faces d'un BoxGeometry : [+x, -x, +y, -y, +z, -z] → calcul sur la face du dessus (+y).
   const LABEL_FACES = [2];
   ```
3. Commentaire de `FRUSTUM_SHIFT` : `// Le panneau quiz (calcul + boutons) occupe la droite de l'écran : on décale la`.
4. Interface `TowerScene` : supprimer la ligne `preloadPhoto(url: string): void; …` et remplacer la ligne `texturePlacedTop(url: string): void; …` par
   ```ts
   texturePlacedTop(label: string): void; // calcul résolu sur le dessus du dernier pavé posé
   ```
5. Supprimer tout le bloc `const texByUrl = …` et la fonction `loadPhotoTexture` (commentaire compris), et le remplacer par
   ```ts
   // Textures des calculs résolus, partagées entre étages (même calcul → même texture).
   const textures = createLabelCache(createCalcTexture);
   ```
6. Dans `disposeBox`, remplacer le commentaire sur `texByUrl` par
   ```ts
   // Les textures appartiennent au cache (partagées entre étages) : libérées
   // une seule fois dans dispose(), pas par pavé.
   ```
7. Supprimer la méthode `preloadPhoto(url: string): void { … }`.
8. Remplacer la méthode `texturePlacedTop` entière par
   ```ts
   texturePlacedTop(label: string): void {
     if (disposed) return;
     // Cible le dernier pavé POSÉ (sous le pavé mobile) : le calcul résolu vient
     // « tamponner » l'étage qu'on vient d'empiler. La couleur du pavé est gardée
     // (multipliée par le fond blanc de la texture).
     const placed = stack[stack.length - 2];
     if (!placed) return;
     const tex = textures.get(label);
     LABEL_FACES.forEach((i) => {
       placed.mesh.material[i].map = tex;
       placed.mesh.material[i].needsUpdate = true;
     });
   },
   ```
9. Dans `dropCurrent`, commentaire : `// Divergence délibérée vs original (chute neutre) : le calcul reste sur le pavé qui tombe.`
10. Dans `dispose`, remplacer `texByUrl.forEach((tex) => tex.dispose());` + `texByUrl.clear();` par `textures.dispose();`.

Vérifier qu'il ne reste aucune occurrence : `grep -n "Photo\|photo\|texByUrl" packages/game-tower-math/src/scene.ts` → aucune sortie.

- [ ] **Step 6: Typecheck, lint, tests**

Run: `pnpm --filter @gambette/game-tower-math typecheck && pnpm --filter @gambette/game-tower-math lint && pnpm --filter @gambette/game-tower-math test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
pnpm exec prettier --write packages/game-tower-math
git add packages/game-tower-math
git commit -m "feat(game-tower-math): scène three.js avec le calcul résolu sur les pavés posés"
```

---

### Task 5: Overlay, score, orchestration du jeu, standalone

**Files:**

- Create: `packages/game-tower-math/src/scoreboard.ts`, `src/overlay.ts`, `src/game.ts`, `src/index.ts`, `src/standalone-entry.ts`, `index.html`
- Test: `packages/game-tower-math/test/mount.test.ts`

**Interfaces:**

- Consumes: `createTowerEngine` (Task 2) ; `createQuestionFeed`, `formatCalc`, `formatSolved`, `CHOICES_COUNT`, `loadRecord`, `saveRecord`, `RECORD_KEY` (Task 3) ; `createScene` / `TowerScene` (Task 4) ; `createExitButton(…, { fullscreen: 'always' })` (Task 1) ; `createCalcsStore`, `openCalcsPicker`, `Pair`, `Question` (`math-sdk`).
- Produces: `mountTowerMath(el: HTMLElement, ctx: GameContext): GameInstance` ; `towerMath: GameModule` (clé `tower-math`) exporté par `src/index.ts`.
- `data-test` : `tower-root`, `tower-quiz`, `tower-calc`, `tower-choice`, `tower-settings`, `tower-score`, `tower-record`, `tower-replay`, `tower-replay-btn`, `tower-rotate` ; bouton quitter du SDK : `game-exit`, `game-exit-confirm-panel`, `game-exit-cancel`, `game-exit-go`.

- [ ] **Step 1: Écrire le test qui échoue**

`packages/game-tower-math/test/mount.test.ts` :

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { GameContext } from '@gambette/game-sdk';
import type { Pair } from '@gambette/math-sdk';

const sceneMock = {
  reset: vi.fn(),
  currentPositionOnAxis: vi.fn(() => 0),
  texturePlacedTop: vi.fn(),
  applyCut: vi.fn(),
  dropCurrent: vi.fn(),
  tick: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
};
vi.mock('../src/scene', () => ({ createScene: vi.fn(() => sceneMock) }));

// Sélecteur de calculs piloté par le test : la promesse se résout à la main.
const picker = vi.hoisted(() => ({ resolve: null as null | ((p: Pair[]) => void) }));
vi.mock('@gambette/math-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@gambette/math-sdk')>();
  return {
    ...actual,
    openCalcsPicker: vi.fn(
      () =>
        new Promise<Pair[]>((resolve) => {
          picker.resolve = resolve;
        }),
    ),
  };
});

import { openCalcsPicker } from '@gambette/math-sdk';
import { mountTowerMath } from '../src/game';
import { RECORD_KEY } from '../src/record';

const CALCS_KEY = 'gambette.tower-math.calcs';

function makeCtx(over: Partial<GameContext> = {}): GameContext {
  return { locale: 'fr', onScore: vi.fn(), onGameOver: vi.fn(), onExit: vi.fn(), ...over };
}
const q = <T extends HTMLElement>(el: HTMLElement, test: string): T =>
  el.querySelector<T>(`[data-test="${test}"]`)!;
const buttons = (el: HTMLElement): HTMLButtonElement[] => [
  ...el.querySelectorAll<HTMLButtonElement>('[data-test="tower-choice"]'),
];
// Sélection réduite à 6 × 7 : la bonne réponse est toujours 42.
const good = (el: HTMLElement): HTMLButtonElement =>
  buttons(el).find((b) => b.textContent === '42')!;
const wrong = (el: HTMLElement): HTMLButtonElement =>
  buttons(el).find((b) => b.textContent !== '42')!;
const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  localStorage.clear();
  localStorage.setItem(CALCS_KEY, JSON.stringify([{ a: 6, b: 7, op: 'mul' }]));
  sceneMock.currentPositionOnAxis.mockReturnValue(0);
  picker.resolve = null;
});
afterEach(() => vi.useRealTimers());

describe('mountTowerMath', () => {
  it('affiche le calcul, 5 résultats distincts dont le bon, le score et les boutons', () => {
    const el = document.createElement('div');
    const inst = mountTowerMath(el, makeCtx());
    expect(q(el, 'tower-root')).not.toBeNull();
    expect(el.querySelector('canvas')).not.toBeNull();
    expect(q(el, 'tower-calc').textContent).toBe('6 × 7');
    const labels = buttons(el).map((b) => b.textContent);
    expect(labels).toHaveLength(5);
    expect(new Set(labels).size).toBe(5);
    expect(labels).toContain('42');
    expect(q(el, 'tower-score').textContent).toBe('Score : 0');
    expect(q(el, 'game-exit')).not.toBeNull();
    expect(q(el, 'tower-settings')).not.toBeNull();
    expect(sceneMock.reset).toHaveBeenCalledTimes(1);
    inst.unmount();
  });

  it('bon résultat → découpe, calcul résolu sur le pavé, onScore(1), nouveau quiz', () => {
    const el = document.createElement('div');
    const ctx = makeCtx();
    const inst = mountTowerMath(el, ctx);
    good(el).click();
    expect(sceneMock.applyCut).toHaveBeenCalledTimes(1);
    expect(sceneMock.texturePlacedTop).toHaveBeenCalledWith('6 × 7 = 42');
    expect(ctx.onScore).toHaveBeenCalledWith(1);
    expect(q(el, 'tower-score').textContent).toBe('Score : 1');
    expect(buttons(el).map((b) => b.textContent)).toContain('42');
    inst.unmount();
  });

  it('mauvais résultat → chute, onGameOver({score}) après le délai, écran Rejouer', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    const ctx = makeCtx();
    const inst = mountTowerMath(el, ctx);
    wrong(el).click();
    expect(sceneMock.dropCurrent).toHaveBeenCalledTimes(1);
    expect(ctx.onGameOver).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(ctx.onGameOver).toHaveBeenCalledWith({ score: 0 });
    expect(q(el, 'tower-replay').style.display).toBe('flex');
    inst.unmount();
  });

  it('bon résultat mais pavé hors chevauchement (timing raté) → onGameOver', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    const ctx = makeCtx();
    const inst = mountTowerMath(el, ctx);
    sceneMock.currentPositionOnAxis.mockReturnValue(99);
    good(el).click();
    expect(sceneMock.dropCurrent).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(ctx.onGameOver).toHaveBeenCalledWith({ score: 0 });
    inst.unmount();
  });

  it('Rejouer relance une partie propre', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    const inst = mountTowerMath(el, makeCtx());
    wrong(el).click();
    vi.advanceTimersByTime(1000);
    q<HTMLButtonElement>(el, 'tower-replay-btn').click();
    expect(sceneMock.reset).toHaveBeenCalledTimes(2);
    expect(q(el, 'tower-replay').style.display).toBe('none');
    expect(q(el, 'tower-score').textContent).toBe('Score : 0');
    inst.unmount();
  });

  it('clics ignorés pendant la transition de fin de partie', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    const ctx = makeCtx();
    const inst = mountTowerMath(el, ctx);
    wrong(el).click();
    buttons(el).forEach((b) => b.click());
    vi.advanceTimersByTime(1000);
    expect(ctx.onGameOver).toHaveBeenCalledTimes(1);
    expect(sceneMock.applyCut).not.toHaveBeenCalled();
    inst.unmount();
  });

  it('record battu → sauvegardé et affiché à la partie suivante', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    const inst = mountTowerMath(el, makeCtx());
    good(el).click();
    wrong(el).click();
    vi.advanceTimersByTime(1000);
    expect(localStorage.getItem(RECORD_KEY)).toBe('1');
    inst.unmount();
    const el2 = document.createElement('div');
    const inst2 = mountTowerMath(el2, makeCtx());
    expect(q(el2, 'tower-record').textContent).toBe('Record : 1');
    inst2.unmount();
  });

  it('Quitter → confirmation puis ctx.onExit', () => {
    const el = document.createElement('div');
    const ctx = makeCtx();
    const inst = mountTowerMath(el, ctx);
    q<HTMLButtonElement>(el, 'game-exit').click();
    expect(ctx.onExit).not.toHaveBeenCalled();
    q<HTMLButtonElement>(el, 'game-exit-go').click();
    expect(ctx.onExit).toHaveBeenCalledTimes(1);
    inst.unmount();
  });

  it('engrenage → sélecteur dans la racine, jeu en pause, puis nouvelle tour avec la sélection sauvegardée', async () => {
    vi.useFakeTimers({
      toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout'],
    });
    const el = document.createElement('div');
    const inst = mountTowerMath(el, makeCtx());
    q<HTMLButtonElement>(el, 'tower-settings').click();
    q<HTMLButtonElement>(el, 'tower-settings').click(); // double clic : un seul sélecteur
    expect(openCalcsPicker).toHaveBeenCalledTimes(1);
    expect(openCalcsPicker).toHaveBeenCalledWith({
      initial: [{ a: 6, b: 7, op: 'mul' }],
      container: q(el, 'tower-root'),
    });

    // En pause : le pavé ne bouge plus et les réponses sont ignorées.
    sceneMock.tick.mockClear();
    vi.advanceTimersByTime(200);
    expect(sceneMock.tick).not.toHaveBeenCalled();
    good(el).click();
    expect(sceneMock.applyCut).not.toHaveBeenCalled();

    picker.resolve!([{ a: 3, b: 4, op: 'add' }]);
    await flush();
    expect(JSON.parse(localStorage.getItem(CALCS_KEY)!)).toEqual([{ a: 3, b: 4, op: 'add' }]);
    expect(sceneMock.reset).toHaveBeenCalledTimes(2);
    expect(q(el, 'tower-calc').textContent).toBe('3 + 4');
    vi.advanceTimersByTime(200);
    expect(sceneMock.tick).toHaveBeenCalled();
    inst.unmount();
  });

  it('unmount vide el, dispose la scène et retire l’écouteur resize', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const el = document.createElement('div');
    const inst = mountTowerMath(el, makeCtx());
    inst.unmount();
    expect(el.innerHTML).toBe('');
    expect(sceneMock.dispose).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    removeSpy.mockRestore();
  });

  it('unmount pendant le délai de fin de partie → onGameOver jamais appelé', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    const ctx = makeCtx();
    const inst = mountTowerMath(el, ctx);
    wrong(el).click();
    inst.unmount();
    vi.advanceTimersByTime(1000);
    expect(ctx.onGameOver).not.toHaveBeenCalled();
    expect(el.innerHTML).toBe('');
  });

  it('unmount avec le sélecteur ouvert, puis résolution tardive → sans effet', async () => {
    const el = document.createElement('div');
    const inst = mountTowerMath(el, makeCtx());
    q<HTMLButtonElement>(el, 'tower-settings').click();
    inst.unmount();
    picker.resolve!([{ a: 3, b: 4, op: 'add' }]);
    await flush();
    expect(sceneMock.reset).toHaveBeenCalledTimes(1);
    expect(el.innerHTML).toBe('');
  });
});
```

- [ ] **Step 2: Lancer — échec attendu**

Run: `pnpm --filter @gambette/game-tower-math test -- mount`
Expected: FAIL — `Cannot find module '../src/game'`.

- [ ] **Step 3: Implémenter `scoreboard.ts`**

```ts
export interface Scoreboard {
  /** Score courant ; le record affiché suit `max(record, score)` en direct. */
  setScore(n: number): void;
  setRecord(n: number): void;
  dispose(): void;
}

/**
 * Pastille Score + Record ancrée en bas à gauche (portée du scoreboard de
 * lehibou-games). Le record affiché vaut toujours `max(record, score)`.
 */
export function createScoreboard(parent: HTMLElement, opts: { record?: number } = {}): Scoreboard {
  let record = opts.record ?? 0;
  let score = 0;

  const box = document.createElement('div');
  box.style.cssText =
    'position:absolute;bottom:16px;left:16px;z-index:5;' +
    'display:flex;flex-direction:column;gap:2px;' +
    'color:#fff;background:rgba(0,39,75,0.7);padding:8px 20px;border-radius:20px;';

  const scoreLine = document.createElement('div');
  scoreLine.dataset.test = 'tower-score';
  scoreLine.style.cssText = 'font:700 20px system-ui,sans-serif;line-height:1.1;';

  const recordLine = document.createElement('div');
  recordLine.dataset.test = 'tower-record';
  recordLine.style.cssText = 'font:600 13px system-ui,sans-serif;opacity:0.85;';

  box.append(scoreLine, recordLine);
  parent.appendChild(box);

  const render = (): void => {
    scoreLine.textContent = `Score : ${score}`;
    recordLine.textContent = `Record : ${Math.max(record, score)}`;
  };
  render();

  return {
    setScore(n: number): void {
      score = n;
      render();
    },
    setRecord(n: number): void {
      record = n;
      render();
    },
    dispose(): void {
      box.remove();
    },
  };
}
```

- [ ] **Step 4: Implémenter `overlay.ts`**

```ts
import { createExitButton } from '@gambette/game-sdk';
import { CHOICES_COUNT } from './questionFeed';
import { createScoreboard } from './scoreboard';

export interface TowerOverlay {
  setScore(n: number): void; // pastille Score+Record bas-gauche
  setRecord(n: number): void;
  setCalc(text: string): void; // calcul à résoudre, au-dessus des boutons
  setChoices(labels: readonly string[]): void; // 5 boutons haut-droite
  showGameOver(score: number): void;
  hideGameOver(): void;
  dispose(): void;
}

export interface OverlayHandlers {
  onChoice(slot: number): void; // slot 0..4
  onReplay(): void;
  onSettings(): void; // engrenage : choix des calculs
  onExit(): void; // bouton quitter (tout en haut)
}

export interface OverlayOptions {
  record?: number;
}

export function createOverlay(
  parent: HTMLElement,
  handlers: OverlayHandlers,
  options: OverlayOptions = {},
): TowerOverlay {
  // Bouton quitter avec confirmation + plein écran sur tout appareil : SDK.
  const exitButton = createExitButton(parent, () => handlers.onExit(), { fullscreen: 'always' });
  const scoreboard = createScoreboard(parent, { record: options.record ?? 0 });

  // Engrenage en haut à gauche : ouvre le sélecteur de calculs.
  const settings = document.createElement('button');
  settings.dataset.test = 'tower-settings';
  settings.type = 'button';
  settings.textContent = '⚙';
  settings.setAttribute('aria-label', 'Choisir les calculs');
  settings.title = 'Choisir les calculs';
  settings.style.cssText =
    'position:absolute;top:12px;left:16px;z-index:6;width:40px;height:40px;padding:0;' +
    'border:1px solid rgba(255,255,255,0.4);border-radius:999px;cursor:pointer;' +
    'font:400 22px system-ui,sans-serif;background:rgba(255,255,255,0.12);color:#fff;';
  settings.addEventListener('click', () => handlers.onSettings());

  // Panneau quiz (haut-droite) : le calcul, puis les 5 résultats dessous.
  const quizPanel = document.createElement('div');
  quizPanel.dataset.test = 'tower-quiz';
  quizPanel.style.cssText =
    'position:absolute;top:16px;right:16px;z-index:5;display:flex;' +
    'flex-direction:column;gap:6px;align-items:stretch;width:min(220px,40vw);';

  const calc = document.createElement('div');
  calc.dataset.test = 'tower-calc';
  calc.style.cssText =
    'padding:10px 8px;border-radius:12px;text-align:center;' +
    'font:800 30px system-ui,sans-serif;color:#fff;' +
    'background:rgba(255,255,255,0.12);border:2px solid rgba(255,255,255,0.5);';

  // Boutons compacts : 5 doivent tenir en paysage sur téléphone (~360 px de haut).
  const buttons: HTMLButtonElement[] = [];
  for (let slot = 0; slot < CHOICES_COUNT; slot++) {
    const btn = document.createElement('button');
    btn.dataset.test = 'tower-choice';
    btn.type = 'button';
    btn.style.cssText =
      'padding:6px 18px;border:none;border-radius:8px;cursor:pointer;' +
      'font:700 17px system-ui,sans-serif;background:rgba(255,255,255,0.92);color:#1a1a2e;';
    btn.addEventListener('click', () => handlers.onChoice(slot));
    buttons.push(btn);
  }
  quizPanel.append(calc, ...buttons);

  const gameOver = document.createElement('div');
  gameOver.dataset.test = 'tower-replay';
  gameOver.style.cssText =
    'position:absolute;inset:0;z-index:10;display:none;flex-direction:column;' +
    'align-items:center;justify-content:center;gap:16px;background:rgba(10,10,26,0.85);' +
    'color:#fff;font-family:system-ui,sans-serif;text-align:center;';
  const finalScore = document.createElement('div');
  finalScore.style.cssText = 'font-size:2rem;font-weight:700;';
  const replayBtn = document.createElement('button');
  replayBtn.dataset.test = 'tower-replay-btn';
  replayBtn.type = 'button';
  replayBtn.textContent = 'Rejouer';
  replayBtn.style.cssText =
    'padding:12px 32px;border:none;border-radius:8px;cursor:pointer;' +
    'font:700 18px system-ui,sans-serif;background:#fff;color:#1a1a2e;';
  replayBtn.addEventListener('click', () => handlers.onReplay());
  gameOver.append(finalScore, replayBtn);

  // Portrait mobile : on bloque le jeu et on demande le mode paysage.
  const rotate = document.createElement('div');
  rotate.dataset.test = 'tower-rotate';
  rotate.style.cssText =
    'position:absolute;inset:0;z-index:20;display:none;flex-direction:column;' +
    'align-items:center;justify-content:center;gap:12px;padding:24px;background:#00274B;' +
    'color:#fff;font:600 18px system-ui,sans-serif;text-align:center;';
  rotate.innerHTML = '<div style="font-size:3rem">📱↻</div>';
  const rotateText = document.createElement('div');
  rotateText.textContent = 'Tourne ton téléphone en horizontal pour jouer.';
  rotate.appendChild(rotateText);

  const portraitQuery =
    typeof window.matchMedia === 'function' ? window.matchMedia('(orientation: portrait)') : null;
  const syncOrientation = (): void => {
    rotate.style.display = portraitQuery?.matches ? 'flex' : 'none';
  };
  portraitQuery?.addEventListener('change', syncOrientation);
  syncOrientation();

  parent.append(settings, quizPanel, gameOver, rotate);

  return {
    setScore: (n) => scoreboard.setScore(n),
    setRecord: (n) => scoreboard.setRecord(n),
    setCalc(text: string): void {
      calc.textContent = text;
    },
    setChoices(labels: readonly string[]): void {
      buttons.forEach((btn, i) => {
        btn.textContent = labels[i] ?? '';
      });
    },
    showGameOver(scoreValue: number): void {
      finalScore.textContent = `Score : ${scoreValue}`;
      gameOver.style.display = 'flex';
    },
    hideGameOver(): void {
      gameOver.style.display = 'none';
    },
    dispose(): void {
      portraitQuery?.removeEventListener('change', syncOrientation);
      exitButton.dispose();
      scoreboard.dispose();
      settings.remove();
      quizPanel.remove();
      gameOver.remove();
      rotate.remove();
    },
  };
}
```

- [ ] **Step 5: Implémenter `game.ts`**

```ts
import type { GameContext, GameInstance } from '@gambette/game-sdk';
import { createCalcsStore, openCalcsPicker, type Pair, type Question } from '@gambette/math-sdk';
import { createTowerEngine } from './engine';
import { createQuestionFeed, formatCalc, formatSolved } from './questionFeed';
import { loadRecord, saveRecord } from './record';
import { createScene } from './scene';
import { createOverlay } from './overlay';

export const GAME_KEY = 'tower-math';
const GAMEOVER_DELAY_MS = 900; // laisse voir la chute avant l'écran de fin

/**
 * Tour de calcul : moteur d'empilement/découpe porté de Tower Slice
 * (lehibou-games), quiz remplacé par un calcul + 5 résultats (math-sdk).
 * Cliquer le bon résultat découpe à la position courante du pavé (le timing
 * compte) et le calcul résolu tamponne le dessus du pavé posé ; un mauvais
 * résultat termine la partie. L'engrenage ouvre le sélecteur de calculs (jeu
 * en pause) puis relance une tour.
 */
export function mountTowerMath(el: HTMLElement, ctx: GameContext): GameInstance {
  const calcs = createCalcsStore(GAME_KEY);
  let pairs: Pair[] = calcs.load();
  let feed = createQuestionFeed(pairs);
  let record = loadRecord();

  const root = document.createElement('div');
  root.dataset.test = 'tower-root';
  root.style.cssText =
    'position:relative;width:100%;height:100%;overflow:hidden;background:#00274B;';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;display:block;width:100%;height:100%;';
  root.appendChild(canvas);
  el.appendChild(root);

  const engine = createTowerEngine();
  const scene = createScene(canvas);

  let raf = 0;
  let gameOverTimer = 0;
  let transitioning = false;
  let paused = false; // sélecteur de calculs ouvert : pavé figé, réponses ignorées
  let disposed = false;
  let question: Question | null = null;

  function nextQuiz(): void {
    question = feed.next();
    overlay.setCalc(formatCalc(question));
    overlay.setChoices(question.choices.map(String));
  }

  function begin(): void {
    const { foundation, first } = engine.start();
    scene.reset(foundation, first);
    overlay.hideGameOver();
    overlay.setRecord(record);
    overlay.setScore(0);
    nextQuiz();
  }

  // Raté ou mauvais résultat : le pavé courant chute, puis onGameOver + écran rejouer.
  function endGame(): void {
    scene.dropCurrent();
    gameOverTimer = window.setTimeout(() => {
      if (disposed) return;
      const score = engine.score;
      if (score > record) {
        record = score;
        saveRecord(record);
      }
      ctx.onGameOver?.({ score });
      overlay.showGameOver(score);
      transitioning = false;
    }, GAMEOVER_DELAY_MS);
  }

  function onChoice(slot: number): void {
    if (disposed || paused || transitioning || engine.status !== 'playing' || !question) return;
    transitioning = true; // verrou : spawn du pavé suivant

    if (question.choices[slot] !== question.answer) {
      engine.fail(); // mauvais résultat → défaite, même rendu qu'un raté
      endGame();
      return;
    }

    const result = engine.slice(scene.currentPositionOnAxis());
    if (result.type === 'missed') {
      endGame();
      return;
    }

    scene.applyCut(result.cut);
    scene.texturePlacedTop(formatSolved(question)); // le calcul résolu tamponne l'étage posé
    ctx.onScore?.(engine.score);
    overlay.setScore(engine.score);
    nextQuiz();
    transitioning = false;
  }

  function openSettings(): void {
    if (disposed || paused || transitioning) return;
    paused = true;
    // Démonté avant la résolution : la promesse reste sans effet (garde disposed).
    void openCalcsPicker({ initial: pairs, container: root }).then((next) => {
      if (disposed) return;
      pairs = next;
      calcs.save(pairs);
      feed = createQuestionFeed(pairs);
      paused = false;
      begin(); // nouvelle tour avec la nouvelle sélection
    });
  }

  const overlay = createOverlay(
    root,
    {
      onChoice,
      onReplay: (): void => {
        if (!disposed && engine.status === 'lost' && !transitioning) begin();
      },
      onSettings: openSettings,
      onExit: (): void => {
        if (!disposed) ctx.onExit();
      },
    },
    { record },
  );

  function onResize(): void {
    scene.resize(root.clientWidth || window.innerWidth, root.clientHeight || window.innerHeight);
  }

  function loop(): void {
    raf = requestAnimationFrame(loop);
    if (!paused) scene.tick();
  }

  window.addEventListener('resize', onResize);
  begin();
  loop();

  return {
    unmount(): void {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(gameOverTimer);
      window.removeEventListener('resize', onResize);
      overlay.dispose();
      scene.dispose();
      root.remove(); // emporte aussi le sélecteur de calculs s'il est ouvert
    },
  };
}
```

- [ ] **Step 6: Implémenter `index.ts`, `standalone-entry.ts`, `index.html`**

`packages/game-tower-math/src/index.ts` :

```ts
import type { GameModule } from '@gambette/game-sdk';
import { mountTowerMath } from './game';

export const towerMath: GameModule = {
  meta: {
    key: 'tower-math',
    name: 'Tour de calcul',
    description: 'Empile les blocs en trouvant le bon résultat.',
    instructions:
      'Clique le bon résultat parmi les 5, au bon moment, pour poser le bloc. ' +
      'Une mauvaise réponse termine la partie. Le bouton engrenage permet de choisir les calculs.',
  },
  mount: mountTowerMath,
};
```

`packages/game-tower-math/src/standalone-entry.ts` :

```ts
import { runStandalone } from '@gambette/game-sdk';
import { towerMath } from './index';

void runStandalone(towerMath, { container: document.getElementById('app')! });
```

`packages/game-tower-math/index.html` :

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Tour de calcul — standalone</title>
    <style>
      html,
      body,
      #app {
        height: 100%;
        margin: 0;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/standalone-entry.ts"></script>
  </body>
</html>
```

- [ ] **Step 7: Lancer tests, typecheck, lint, build — succès attendu**

Run: `pnpm --filter @gambette/game-tower-math test && pnpm --filter @gambette/game-tower-math typecheck && pnpm --filter @gambette/game-tower-math lint && pnpm --filter @gambette/game-tower-math build`
Expected: PASS (12 tests `mount` + tests des tâches précédentes) ; `vite build` produit `dist/index.html`.

- [ ] **Step 8: Commit**

```bash
pnpm exec prettier --write packages/game-tower-math
git add packages/game-tower-math
git commit -m "feat(game-tower-math): quiz calcul à 5 résultats, engrenage, score/record et GameModule montable"
```

---

### Task 6: Branchement dans le shell + vérification navigateur

**Files:**

- Modify: `apps/web/package.json` (dépendance), `apps/web/games.ts`, `apps/web/lib/gameCosmetics.ts`
- Test: `apps/web/test/games.test.ts`

**Interfaces:**

- Consumes: `towerMath` de `@gambette/game-tower-math` (Task 5).

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans `apps/web/test/games.test.ts`, dans le `describe('registre de jeux', …)` :

```ts
it('contient tower-math avec une consigne', () => {
  const game = registry.get('tower-math');
  expect(game).toBeDefined();
  expect(game!.meta.name).toBe('Tour de calcul');
  expect(game!.meta.instructions.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Lancer — échec attendu**

Run: `pnpm --filter @gambette/web test -- games`
Expected: FAIL — `game` est `undefined`.

- [ ] **Step 3: Implémenter**

`apps/web/package.json`, dans `dependencies` (ordre alphabétique) :

```json
    "@gambette/game-rabbit-math": "workspace:*",
    "@gambette/game-sdk": "workspace:*",
    "@gambette/game-tower-math": "workspace:*",
```

`apps/web/games.ts` :

```ts
import { createGameRegistry } from '@gambette/game-sdk';
import { rabbitMath } from '@gambette/game-rabbit-math';
import { towerMath } from '@gambette/game-tower-math';

export const registry = createGameRegistry([rabbitMath, towerMath]);
```

`apps/web/lib/gameCosmetics.ts`, dans `BY_KEY` après `'rabbit-math'` :

```ts
  'tower-math': {
    color: 'tertiary',
    icon: 'mdi-cube-outline',
    traits: ['calcul', 'réflexes'],
  },
```

Demander à l'utilisateur `! pnpm install` (lien workspace de la nouvelle dépendance).

- [ ] **Step 4: Lancer — succès attendu**

Run: `pnpm --filter @gambette/web test && pnpm --filter @gambette/web lint`
Expected: PASS.

- [ ] **Step 5: Vérification complète à la racine**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm format:check`
Expected: tout PASS. Corriger le formatage éventuel avec `pnpm exec prettier --write <fichiers>` puis `git commit --fixup=<sha du commit concerné>`.

- [ ] **Step 6: Vérifier le parcours dans le navigateur**

Utiliser le skill `lehibou:verify-feature` (ou `run`) : `pnpm --filter @gambette/web dev`, puis vérifier, en viewport desktop **et** mobile paysage (ex. 844×390) :

1. Accueil : carte « Tour de calcul » (emblème cube) → briefing avec la consigne → Jouer.
2. Le calcul et 5 résultats s'affichent en haut à droite, sans débordement en 844×390 ; la tour est à gauche.
3. Bon résultat au bon moment : le pavé est découpé, la face du dessus montre « a × b = r », le score monte.
4. Mauvais résultat : chute, écran « Score : n » + Rejouer ; le record se met à jour.
5. Engrenage : le sélecteur s'ouvre au-dessus du jeu, le pavé est figé ; à la fermeture, nouvelle tour avec les calculs choisis ; recharger la page → sélection conservée.
6. Bouton plein écran visible à côté de « ✕ Quitter » sur desktop ; il bascule le plein écran.
7. Quitter → confirmation → retour au briefing, sans erreur console.
8. Portrait mobile : message « Tourne ton téléphone ».

- [ ] **Step 7: Commit**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "feat(web): ajoute Tour de calcul au menu des jeux"
```
