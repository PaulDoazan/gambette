# Gambette — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Monter la plateforme Gambette (monorepo pnpm/Turbo + shell Nuxt) avec un `game-sdk` épuré, un `math-sdk` partagé extrait de rabbit-math, et rabbit-math branché comme premier jeu.

**Architecture:** Trois packages + une app. `game-sdk` (contrat `mount/unmount`, registre, standalone, bouton quitter) et `math-sdk` (calculs, questions, sélecteur DOM, store localStorage par jeu) sont compilés par `tsc` vers `dist/`. `game-rabbit-math` est consommé **en source** (`exports` → `src/index.ts`) pour que Vite/Nuxt embarquent ses images référencées via `new URL(…, import.meta.url)`. `apps/web` (Nuxt 4 + Vuetify, SPA) monte le jeu choisi en plein écran.

**Tech Stack:** pnpm 10, Turborepo 2, Node ≥ 22, TypeScript, Vitest, ESLint 9 (flat), Prettier, Nuxt 4 + Vuetify 4, Pixi.js 8, matter-js, @tweenjs/tween.js.

**Spec:** `docs/superpowers/specs/2026-10-04-gambette-platform-design.md`

**Sources (lecture seule) :**
- `LHG=/Users/pauldoazan/Projets/lehibou-games` — plateforme d'origine.
- `RM=<scratchpad>/rabbit-math` — clone de `https://github.com/PaulDoazan/rabbit-math` (`git clone https://github.com/PaulDoazan/rabbit-math.git "$RM"` s'il n'existe pas ; commit de référence `9c4a996`).

## Global Constraints

- Scope npm : `@gambette/*`. Racine : `"name": "gambette"`, `"private": true`, `"packageManager": "pnpm@10.33.4"`, `"engines": { "node": ">=22" }`.
- Clé localStorage des calculs : `gambette.<gameKey>.calcs`. Réglages propres à rabbit-math : `gambette.rabbit-math.settings`.
- Clé du jeu : `rabbit-math`. Locale : `'fr'`.
- Opérations couvertes par math-sdk : `mul | add | sub`.
- Style Prettier racine : `semi: true`, `singleQuote: true`, `printWidth: 100`, `trailingComma: "all"` — tout code copié est reformaté.
- Aucune dépendance à une API, à `api-contract`, à Prisma, ni au domaine collaborateurs.
- `math-sdk` et `game-sdk` ne dépendent d'aucun package interne. `apps/web` ne dépend pas de `math-sdk`.
- Pas de déploiement dans ce périmètre. CI = lint, typecheck, test, build.
- Travail sur la branche `feat/platform-bootstrap` ; un commit par tâche ; ne pas pousser sans accord.

## Review Focus

1. **Quitter pendant le chargement** (clic Retour / navigation pendant que `mount()` charge les images) → l'instance est démontée dès qu'elle résout, aucun canvas orphelin. Test : Task 7 (`mountGame.test.ts`, « stop avant résolution »).
2. **`mount()` rejette** (image 404, WebGL indisponible) → message d'erreur + bouton retour, pas d'écran noir. Test : Task 7 (`mountGame.test.ts`, « erreur »).
3. **localStorage corrompu, ancien format, ou qui lève** (Safari navigation privée) → valeurs par défaut, aucun crash. Test : Task 3 (`store.test.ts`).
4. **Jouer → Quitter → Rejouer** → pas de canvas, ticker ou écouteur `resize`/`orientationchange` en double. Test : Task 6 (`mount.spec.ts`, double cycle).
5. **Démontage avec le sélecteur ouvert** → l'overlay `.cp-overlay` disparaît avec le jeu. Test : Task 4 (`picker.test.ts`, conteneur) + Task 6 (`mount.spec.ts`).

---

## File Structure

```
gambette/
├─ package.json, pnpm-workspace.yaml, turbo.json, tsconfig.base.json
├─ eslint.config.mjs, .prettierrc.json, .prettierignore, .gitignore, .npmrc, .nvmrc
├─ .github/workflows/ci.yml
├─ packages/game-sdk/
│  ├─ src/{types,registry,standalone,exit-button,index}.ts
│  └─ test/{types,registry,standalone,exit-button}.test.ts
├─ packages/math-sdk/
│  ├─ src/domain/{calcs,rng,distractors,questions}.ts
│  ├─ src/picker/{index,dom,sections,exclusivity,style}.ts
│  ├─ src/{store,index}.ts
│  └─ test/{setup,calcs,rng,distractors,questions,store,picker}.test.ts (setup.ts sans .test)
├─ packages/game-rabbit-math/
│  ├─ assets/*.png
│  ├─ index.html, vite.config.ts, vitest.config.ts, tsconfig.json
│  ├─ src/{index,mount,assets,standalone-entry}.ts + src/{config,core,entities,scenes,services,systems,ui}/…
│  └─ tests/** (repris) + tests/mount.spec.ts
└─ apps/web/
   ├─ nuxt.config.ts, app.vue, games.ts, package.json, tsconfig.json, vitest.config.ts
   ├─ pages/index.vue, pages/play/[key].vue
   ├─ features/{BriefingPanel,GameHost}.vue
   ├─ components/Atom/{FullscreenToggle,ShapeArcs}.vue
   ├─ components/Molecule/{GameCard,ScreenHeader}.vue, components/Organism/GameGrid.vue
   ├─ composables/{useFullscreen,useGameSession}.ts
   ├─ lib/{gameCosmetics,mountGame}.ts, layouts/default.vue, assets/css/theme.css
   └─ test/{setup,useFullscreen,useGameSession,mountGame,games}.test.ts (setup.ts sans .test)
```

---

### Task 1: Socle monorepo + `game-sdk` épuré

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.gitignore`, `.npmrc`, `.nvmrc`, `.github/workflows/ci.yml`
- Create: `packages/game-sdk/{package.json,tsconfig.json,vitest.config.ts}`
- Create: `packages/game-sdk/src/{types,registry,standalone,exit-button,index}.ts`
- Test: `packages/game-sdk/test/{types,registry,standalone,exit-button}.test.ts`

**Interfaces:**
- Produces (`@gambette/game-sdk`) :
  - `interface GameContext { onScore?(score: number): void; onGameOver?(result: { score: number }): void; onExit(): void; locale: 'fr' }`
  - `interface GameMeta { key: string; name: string; description: string; instructions: string; thumbnail?: string }`
  - `interface GameInstance { unmount(): void }`
  - `interface GameModule { meta: GameMeta; mount(el: HTMLElement, ctx: GameContext): GameInstance | Promise<GameInstance> }`
  - `createGameRegistry(modules: GameModule[]): { list(): GameModule[]; get(key: string): GameModule | undefined }`
  - `runStandalone(module: GameModule, opts?: { container?: HTMLElement }): Promise<GameInstance>`
  - `createExitButton(parent: HTMLElement, onExit: () => void, opts?: { fullscreen?: boolean }): { dispose(): void }`

- [ ] **Step 1: Créer la branche**

```bash
cd /Users/pauldoazan/orca/gambette && git switch -c feat/platform-bootstrap
```

- [ ] **Step 2: Fichiers racine**

Copier tels quels depuis `$LHG` : `tsconfig.base.json`, `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.npmrc`, `.nvmrc`, `pnpm-workspace.yaml`.

```bash
LHG=/Users/pauldoazan/Projets/lehibou-games
cp $LHG/{tsconfig.base.json,eslint.config.mjs,.prettierrc.json,.prettierignore,.npmrc,.nvmrc,pnpm-workspace.yaml} .
```

`package.json` :

```json
{
  "name": "gambette",
  "version": "0.0.0",
  "private": true,
  "packageManager": "pnpm@10.33.4",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "dev": "turbo run dev",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "devDependencies": {
    "@eslint/js": "^9.39.4",
    "eslint": "^9.39.4",
    "prettier": "^3.2.0",
    "turbo": "^2.3.0",
    "typescript": "^5.4.0",
    "typescript-eslint": "^8.61.0"
  }
}
```

`turbo.json` :

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".nuxt/**", ".output/**"] },
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] },
    "lint": {},
    "dev": { "cache": false, "persistent": true }
  }
}
```

`.gitignore` :

```
node_modules/
dist/
.output/
.nuxt/
.turbo/
*.log
.env
.env.*
!.env.example
.worktrees/
```

`.github/workflows/ci.yml` :

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

- [ ] **Step 3: Copier game-sdk (sans mock/scoreboard)**

```bash
mkdir -p packages/game-sdk/src packages/game-sdk/test
cp $LHG/packages/game-sdk/{tsconfig.json,vitest.config.ts} packages/game-sdk/
cp $LHG/packages/game-sdk/src/exit-button.ts packages/game-sdk/src/
cp $LHG/packages/game-sdk/test/exit-button.test.ts packages/game-sdk/test/
sed -i '' 's/tower-exit/game-exit/g' packages/game-sdk/src/exit-button.ts packages/game-sdk/test/exit-button.test.ts
```

`packages/game-sdk/package.json` :

```json
{
  "name": "@gambette/game-sdk",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "lint": "eslint src test"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "jsdom": "^24.0.0",
    "typescript": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 4: Écrire les tests du contrat (échouent)**

`packages/game-sdk/test/types.test.ts` :

```ts
import { describe, it, expect, vi } from 'vitest';
import type { GameModule } from '../src/types';

const sampleModule: GameModule = {
  meta: { key: 'sample', name: 'Sample', description: 'desc', instructions: 'do the thing' },
  mount: () => ({ unmount: vi.fn() }),
};

describe('GameModule contract', () => {
  it('expose une meta avec les champs requis', () => {
    expect(sampleModule.meta.key).toBe('sample');
    expect(typeof sampleModule.mount).toBe('function');
  });
});
```

`packages/game-sdk/test/registry.test.ts` :

```ts
import { describe, it, expect, vi } from 'vitest';
import { createGameRegistry } from '../src/registry';
import type { GameModule } from '../src/types';

function makeModule(key: string): GameModule {
  return {
    meta: { key, name: key, description: '', instructions: '' },
    mount: () => ({ unmount: vi.fn() }),
  };
}

describe('createGameRegistry', () => {
  it("list() renvoie les modules dans l'ordre d'insertion", () => {
    const reg = createGameRegistry([makeModule('a'), makeModule('b')]);
    expect(reg.list().map((m) => m.meta.key)).toEqual(['a', 'b']);
  });

  it('get() renvoie le module par clé, sinon undefined', () => {
    const reg = createGameRegistry([makeModule('a')]);
    expect(reg.get('a')?.meta.key).toBe('a');
    expect(reg.get('zzz')).toBeUndefined();
  });

  it('lève une erreur sur clé dupliquée', () => {
    expect(() => createGameRegistry([makeModule('a'), makeModule('a')])).toThrow(
      /Duplicate game key: a/,
    );
  });
});
```

`packages/game-sdk/test/standalone.test.ts` :

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { runStandalone } from '../src/standalone';
import type { GameModule, GameContext } from '../src/types';

function captureModule(async = false): {
  module: GameModule;
  lastCtx: () => GameContext | null;
  lastEl: () => HTMLElement | null;
} {
  let ctx: GameContext | null = null;
  let el: HTMLElement | null = null;
  const module: GameModule = {
    meta: { key: 'cap', name: 'cap', description: '', instructions: '' },
    mount: (e, c) => {
      ctx = c;
      el = e;
      const instance = { unmount: vi.fn() };
      return async ? Promise.resolve(instance) : instance;
    },
  };
  return { module, lastCtx: () => ctx, lastEl: () => el };
}

describe('runStandalone', () => {
  it('monte avec un contexte fr et des callbacks sûrs', async () => {
    const { module, lastCtx } = captureModule();
    await runStandalone(module);
    const ctx = lastCtx()!;
    expect(ctx.locale).toBe('fr');
    expect(() => ctx.onExit()).not.toThrow();
    expect(() => ctx.onScore?.(1)).not.toThrow();
    expect(() => ctx.onGameOver?.({ score: 1 })).not.toThrow();
  });

  it('monte dans le container fourni (body par défaut)', async () => {
    const a = captureModule();
    await runStandalone(a.module);
    expect(a.lastEl()).toBe(document.body);
    const b = captureModule();
    const el = document.createElement('div');
    await runStandalone(b.module, { container: el });
    expect(b.lastEl()).toBe(el);
  });

  it('résout l’instance pour un mount synchrone ou asynchrone', async () => {
    const sync = await runStandalone(captureModule(false).module);
    const asyncI = await runStandalone(captureModule(true).module);
    expect(typeof sync.unmount).toBe('function');
    expect(typeof asyncI.unmount).toBe('function');
  });
});
```

Ajouter à la fin de `packages/game-sdk/test/exit-button.test.ts` (les helpers `setPointer` et `setFullscreenApi` existent déjà dans ce fichier) :

```ts
describe('createExitButton — option fullscreen', () => {
  it("n'ajoute pas le bouton plein écran quand fullscreen: false, même sur mobile", () => {
    setPointer(true);
    setFullscreenApi(true);
    const parent = document.createElement('div');
    const btn = createExitButton(parent, () => {}, { fullscreen: false });
    expect(parent.querySelector(fsSelector)).toBeNull();
    btn.dispose();
  });
});
```

- [ ] **Step 5: Installer et vérifier l'échec**

```bash
pnpm install && pnpm --filter @gambette/game-sdk test
```

Expected: FAIL — `../src/types`, `../src/registry`, `../src/standalone` introuvables ; le test `fullscreen: false` échoue (bouton présent).

- [ ] **Step 6: Implémenter**

`packages/game-sdk/src/types.ts` :

```ts
export interface GameContext {
  /** Mise à jour live du score (HUD futur côté shell). */
  onScore?(score: number): void;
  onGameOver?(result: { score: number }): void;
  /** Bouton « quitter » in-game : le host sort du jeu (retour briefing). */
  onExit(): void;
  locale: 'fr';
}

export interface GameMeta {
  key: string;
  name: string;
  description: string;
  instructions: string;
  /** Visuel de la carte du menu (URL). */
  thumbnail?: string;
}

export interface GameInstance {
  unmount(): void;
}

export interface GameModule {
  meta: GameMeta;
  /** Peut être asynchrone (chargement d'assets, init du moteur de rendu). */
  mount(el: HTMLElement, ctx: GameContext): GameInstance | Promise<GameInstance>;
}
```

`packages/game-sdk/src/registry.ts` :

```ts
import type { GameModule } from './types';

export interface GameRegistry {
  list(): GameModule[];
  get(key: string): GameModule | undefined;
}

export function createGameRegistry(modules: GameModule[]): GameRegistry {
  const byKey = new Map<string, GameModule>();
  for (const m of modules) {
    if (byKey.has(m.meta.key)) {
      throw new Error(`Duplicate game key: ${m.meta.key}`);
    }
    byKey.set(m.meta.key, m);
  }
  return {
    list: () => [...byKey.values()],
    get: (key) => byKey.get(key),
  };
}
```

`packages/game-sdk/src/standalone.ts` :

```ts
import type { GameContext, GameInstance, GameModule } from './types';

export interface StandaloneOptions {
  container?: HTMLElement;
}

export function runStandalone(
  module: GameModule,
  opts: StandaloneOptions = {},
): Promise<GameInstance> {
  const el = opts.container ?? document.body;
  const ctx: GameContext = {
    locale: 'fr',
    onScore: (score) => console.log('[standalone] score', score),
    onGameOver: (result) => console.log('[standalone] game over', result),
    onExit: () => console.log('[standalone] exit'),
  };
  return Promise.resolve(module.mount(el, ctx));
}
```

`packages/game-sdk/src/index.ts` :

```ts
export * from './types';
export * from './registry';
export * from './standalone';
export * from './exit-button';
```

Dans `packages/game-sdk/src/exit-button.ts` :
- signature : `export function createExitButton(parent: HTMLElement, onExit: () => void, opts: { fullscreen?: boolean } = {}): ExitButton {`
- condition du bouton plein écran : `if ((opts.fullscreen ?? true) && isMobile() && fullscreenAvailable(target)) {`
- dans le commentaire JSDoc, ajouter : « `opts.fullscreen: false` désactive ce bouton (jeu qui fournit le sien). »
- remplacer « (passage à l'écran de classement et aux autres interfaces de l'app) » par « (retour au briefing et aux autres écrans de l'app) ».

- [ ] **Step 7: Vérifier**

```bash
pnpm --filter @gambette/game-sdk test && pnpm --filter @gambette/game-sdk build && pnpm lint && pnpm exec prettier --check .
```

Expected: tous les tests PASS, `dist/` généré, lint et prettier OK (sinon `pnpm format` puis relancer).

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(game-sdk): socle monorepo et contrat de jeu sans collaborateurs

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PwD249iHE7SXS5EkecJV6c"
```

---

### Task 2: `math-sdk` — domaine (calculs, aléatoire, distracteurs, questions)

**Files:**
- Create: `packages/math-sdk/{package.json,tsconfig.json,vitest.config.ts}`
- Create: `packages/math-sdk/src/domain/{calcs,rng,distractors,questions}.ts`, `packages/math-sdk/src/index.ts`
- Test: `packages/math-sdk/test/{setup.ts,calcs.test.ts,rng.test.ts,distractors.test.ts,questions.test.ts}`

**Interfaces:**
- Produces (`@gambette/math-sdk`) :
  - `type Op = 'mul' | 'add' | 'sub'`, `interface Pair { readonly a: number; readonly b: number; readonly op: Op }`
  - `type TableListId`, `interface TableList`, `TABLE_LISTS`, `getTableList(id)`, `allMulPairs()`, `allAddPairs()`, `allSubPairs()`, `allPairs()`, `computeAnswer(p: Pair): number`, `opSymbol(op: Op): string`
  - `randomMulPairs(count?: number, rng?: Rng): Pair[]` (défaut 10, `Math.random`)
  - `type Rng = () => number`, `mulberry32(seed)`, `pickFrom(arr, rng)`, `shuffle(arr, rng)`
  - `type Difficulty = 'easy' | 'medium' | 'hard'`, `generateDistractors(answer, difficulty, count, rng): number[]`
  - `interface Question { readonly a: number; readonly b: number; readonly op: Op; readonly answer: number; readonly choices: readonly number[] }`
  - `interface QuestionRequest { pairs; difficulty; count; choicesCount; seed }`, `generateQuestions(req: QuestionRequest): Question[]`

- [ ] **Step 1: Squelette du package**

```bash
RM=/private/tmp/claude-501/-Users-pauldoazan-orca-gambette/913b3e6d-d8aa-45f1-a8a2-f03e8f199146/scratchpad/rabbit-math
[ -d "$RM" ] || git clone https://github.com/PaulDoazan/rabbit-math.git "$RM"
mkdir -p packages/math-sdk/src/domain packages/math-sdk/test
cp packages/game-sdk/tsconfig.json packages/math-sdk/
cp $RM/tests/setup.ts packages/math-sdk/test/setup.ts
```

`packages/math-sdk/package.json` : identique à celui de `game-sdk` avec `"name": "@gambette/math-sdk"`.

`packages/math-sdk/vitest.config.ts` :

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
  },
});
```

- [ ] **Step 2: Déplacer les tests (échouent)**

```bash
cp $RM/tests/domain/tables.spec.ts packages/math-sdk/test/calcs.test.ts
cp $RM/tests/domain/Rng.spec.ts packages/math-sdk/test/rng.test.ts
cp $RM/tests/domain/DifficultyConfig.spec.ts packages/math-sdk/test/distractors.test.ts
cp $RM/tests/domain/QuestionGenerator.spec.ts packages/math-sdk/test/questions.test.ts
cd packages/math-sdk/test
perl -pi -e 's#"\.\./\.\./src/domain/tables"#"../src/domain/calcs"#g; s#"\.\./\.\./src/domain/Rng"#"../src/domain/rng"#g; s#"\.\./\.\./src/domain/DifficultyConfig"#"../src/domain/distractors"#g; s#"\.\./\.\./src/domain/QuestionGenerator"#"../src/domain/questions"#g; s#"\.\./\.\./src/domain/Question"#"../src/domain/questions"#g; s/\bgenerateSession\b/generateQuestions/g; s/\bSessionRequest\b/QuestionRequest/g' *.test.ts
cd -
```

Ajouter à la fin de `packages/math-sdk/test/calcs.test.ts` :

```ts
import { randomMulPairs } from '../src/domain/calcs';
import { mulberry32 } from '../src/domain/rng';

describe('randomMulPairs', () => {
  it('renvoie 10 multiplications distinctes par défaut', () => {
    const pairs = randomMulPairs();
    expect(pairs).toHaveLength(10);
    expect(pairs.every((p) => p.op === 'mul')).toBe(true);
    expect(new Set(pairs.map((p) => `${p.a}x${p.b}`)).size).toBe(10);
  });

  it('est déterministe avec un rng fourni', () => {
    expect(randomMulPairs(5, mulberry32(42))).toEqual(randomMulPairs(5, mulberry32(42)));
  });
});
```

Run: `pnpm install && pnpm --filter @gambette/math-sdk test`
Expected: FAIL — modules `../src/domain/*` introuvables.

- [ ] **Step 3: Déplacer le code**

```bash
cp $RM/src/domain/tables.ts packages/math-sdk/src/domain/calcs.ts
cp $RM/src/domain/Rng.ts packages/math-sdk/src/domain/rng.ts
cp $RM/src/domain/DifficultyConfig.ts packages/math-sdk/src/domain/distractors.ts
perl -pi -e 's#"\./Rng"#"./rng"#' packages/math-sdk/src/domain/distractors.ts
```

Ajouter à la fin de `packages/math-sdk/src/domain/calcs.ts` :

```ts
import { shuffle, type Rng } from './rng';

/** Tirage de `count` multiplications distinctes (sélection par défaut des jeux). */
export function randomMulPairs(count = 10, rng: Rng = Math.random): Pair[] {
  return shuffle(allMulPairs(), rng).slice(0, count);
}
```

(Remonter l'`import` en tête de fichier.)

`packages/math-sdk/src/domain/questions.ts` — fusion de `Question.ts` et `QuestionGenerator.ts` :

```ts
import { computeAnswer, type Op, type Pair } from './calcs';
import { generateDistractors, type Difficulty } from './distractors';
import { mulberry32, pickFrom, shuffle, type Rng } from './rng';

export interface Question {
  readonly a: number;
  readonly b: number;
  readonly op: Op;
  readonly answer: number;
  readonly choices: readonly number[];
}

export interface QuestionRequest {
  readonly pairs: readonly Pair[];
  readonly difficulty: Difficulty;
  readonly count: number;
  readonly choicesCount: number;
  readonly seed: number;
}

const pickPair = (pool: readonly Pair[], previous: Pair | null, rng: Rng): Pair => {
  if (pool.length <= 1 || !previous) return pickFrom(pool, rng);
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = pickFrom(pool, rng);
    if (candidate.a !== previous.a || candidate.b !== previous.b) return candidate;
  }
  return pickFrom(pool, rng);
};

const buildQuestion = (
  pair: Pair,
  difficulty: Difficulty,
  choicesCount: number,
  rng: Rng,
): Question => {
  const answer = computeAnswer(pair);
  const distractors = generateDistractors(answer, difficulty, choicesCount - 1, rng);
  return {
    a: pair.a,
    b: pair.b,
    op: pair.op,
    answer,
    choices: shuffle([answer, ...distractors], rng),
  };
};

export function generateQuestions(req: QuestionRequest): Question[] {
  const rng = mulberry32(req.seed);
  const out: Question[] = [];
  let previous: Pair | null = null;
  for (let i = 0; i < req.count; i++) {
    const pair = pickPair(req.pairs, previous, rng);
    out.push(buildQuestion(pair, req.difficulty, req.choicesCount, rng));
    previous = pair;
  }
  return out;
}
```

`packages/math-sdk/src/index.ts` :

```ts
export * from './domain/calcs';
export * from './domain/rng';
export * from './domain/distractors';
export * from './domain/questions';
```

- [ ] **Step 4: Vérifier**

```bash
pnpm exec prettier --write packages/math-sdk && pnpm --filter @gambette/math-sdk test && pnpm --filter @gambette/math-sdk build && pnpm --filter @gambette/math-sdk lint
```

Expected: tous les tests PASS (mêmes nombres de tests que dans rabbit-math + 2), build OK, lint OK.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(math-sdk): extrait le domaine des calculs de rabbit-math

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PwD249iHE7SXS5EkecJV6c"
```

---

### Task 3: `math-sdk` — store des calculs par jeu

**Files:**
- Create: `packages/math-sdk/src/store.ts`
- Modify: `packages/math-sdk/src/index.ts`
- Test: `packages/math-sdk/test/store.test.ts`

**Interfaces:**
- Consumes: `Pair`, `Op`, `randomMulPairs` (Task 2).
- Produces: `interface CalcsStore { load(): Pair[]; save(pairs: readonly Pair[]): void }`, `createCalcsStore(gameKey: string, opts?: { defaults?: () => Pair[] }): CalcsStore`, `calcsStorageKey(gameKey: string): string`.

- [ ] **Step 1: Écrire le test (échoue)**

`packages/math-sdk/test/store.test.ts` :

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createCalcsStore, calcsStorageKey } from '../src/store';
import type { Pair } from '../src/domain/calcs';

const P: Pair[] = [
  { a: 7, b: 8, op: 'mul' },
  { a: 3, b: 4, op: 'add' },
];
const DEFAULTS: Pair[] = [{ a: 2, b: 2, op: 'mul' }];
const store = (key = 'game-a') => createCalcsStore(key, { defaults: () => DEFAULTS });

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('createCalcsStore', () => {
  it('utilise la clé gambette.<gameKey>.calcs', () => {
    expect(calcsStorageKey('rabbit-math')).toBe('gambette.rabbit-math.calcs');
  });

  it('renvoie les valeurs par défaut quand rien n’est stocké', () => {
    expect(store().load()).toEqual(DEFAULTS);
  });

  it('défaut sans option : 10 multiplications', () => {
    const pairs = createCalcsStore('game-x').load();
    expect(pairs).toHaveLength(10);
    expect(pairs.every((p) => p.op === 'mul')).toBe(true);
  });

  it('save puis load fait l’aller-retour', () => {
    store().save(P);
    expect(store().load()).toEqual(P);
  });

  it('isole les jeux entre eux', () => {
    store('game-a').save(P);
    expect(store('game-b').load()).toEqual(DEFAULTS);
  });

  it('JSON corrompu → défauts', () => {
    localStorage.setItem(calcsStorageKey('game-a'), '{pas du json');
    expect(store().load()).toEqual(DEFAULTS);
  });

  it('forme invalide ou tableau vide → défauts', () => {
    localStorage.setItem(calcsStorageKey('game-a'), JSON.stringify({ selectedPairs: P }));
    expect(store().load()).toEqual(DEFAULTS);
    localStorage.setItem(calcsStorageKey('game-a'), JSON.stringify([{ a: '7', b: 8 }]));
    expect(store().load()).toEqual(DEFAULTS);
    localStorage.setItem(calcsStorageKey('game-a'), JSON.stringify([]));
    expect(store().load()).toEqual(DEFAULTS);
  });

  it('op absent → normalisé en mul ; op inconnu → défauts', () => {
    localStorage.setItem(calcsStorageKey('game-a'), JSON.stringify([{ a: 6, b: 7 }]));
    expect(store().load()).toEqual([{ a: 6, b: 7, op: 'mul' }]);
    localStorage.setItem(calcsStorageKey('game-a'), JSON.stringify([{ a: 6, b: 7, op: 'div' }]));
    expect(store().load()).toEqual(DEFAULTS);
  });

  it('localStorage qui lève (navigation privée) → défauts, save silencieux', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(store().load()).toEqual(DEFAULTS);
    expect(() => store().save(P)).not.toThrow();
  });
});
```

Run: `pnpm --filter @gambette/math-sdk test`
Expected: FAIL — `../src/store` introuvable.

Note : `test/setup.ts` remplace `localStorage` par un shim `MemoryStorage` ; `vi.spyOn(localStorage, …)` agit sur ce shim. Si `spyOn` refuse (propriété non configurable), remplacer par `vi.spyOn(Object.getPrototypeOf(localStorage), 'getItem')`.

- [ ] **Step 2: Implémenter**

`packages/math-sdk/src/store.ts` :

```ts
import { randomMulPairs, type Op, type Pair } from './domain/calcs';

export interface CalcsStore {
  load(): Pair[];
  save(pairs: readonly Pair[]): void;
}

export interface CalcsStoreOptions {
  /** Sélection utilisée si rien de valide n'est stocké (défaut : 10 multiplications au hasard). */
  defaults?: () => Pair[];
}

export const calcsStorageKey = (gameKey: string): string => `gambette.${gameKey}.calcs`;

const isOp = (v: unknown): v is Op => v === 'mul' || v === 'add' || v === 'sub';

const toPair = (v: unknown): Pair | null => {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.a !== 'number' || typeof o.b !== 'number') return null;
  if (o.op === undefined) return { a: o.a, b: o.b, op: 'mul' };
  return isOp(o.op) ? { a: o.a, b: o.b, op: o.op } : null;
};

const parsePairs = (raw: string | null): Pair[] | null => {
  if (raw === null) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(data) || data.length === 0) return null;
  const pairs = data.map(toPair);
  return pairs.every((p): p is Pair => p !== null) ? pairs : null;
};

const readRaw = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export function createCalcsStore(gameKey: string, opts: CalcsStoreOptions = {}): CalcsStore {
  const key = calcsStorageKey(gameKey);
  const defaults = opts.defaults ?? (() => randomMulPairs());
  return {
    load: () => parsePairs(readRaw(key)) ?? defaults(),
    save: (pairs) => {
      try {
        localStorage.setItem(key, JSON.stringify(pairs));
      } catch {
        // Stockage indisponible (navigation privée, quota) : la sélection vit le temps de la session.
      }
    },
  };
}
```

Ajouter à `packages/math-sdk/src/index.ts` : `export * from './store';`

- [ ] **Step 3: Vérifier**

Run: `pnpm --filter @gambette/math-sdk test && pnpm --filter @gambette/math-sdk lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(math-sdk): store localStorage des calculs choisis par jeu

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PwD249iHE7SXS5EkecJV6c"
```

---

### Task 4: `math-sdk` — sélecteur de calculs

**Files:**
- Create: `packages/math-sdk/src/picker/{index,dom,sections,exclusivity,style}.ts` (depuis `$RM/src/ui/CalcsPicker*.ts`)
- Modify: `packages/math-sdk/src/index.ts`
- Test: `packages/math-sdk/test/picker.test.ts`

**Interfaces:**
- Consumes: `Op`, `Pair` (Task 2).
- Produces: `interface CalcsPickerOptions { initial: readonly Pair[]; container?: HTMLElement }`, `openCalcsPicker(opts: CalcsPickerOptions): Promise<Pair[]>`. DOM : racine `.cp-overlay`, cases `input[type=checkbox][data-a][data-b][data-op]` (et `data-random="true"` pour « au hasard »), boutons `.cp-back` et `.cp-close`, avertissement `.cp-warn`.

- [ ] **Step 1: Écrire le test (échoue)**

`packages/math-sdk/test/picker.test.ts` :

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { openCalcsPicker } from '../src/picker';
import type { Pair } from '../src/domain/calcs';

const INITIAL: Pair[] = [{ a: 7, b: 8, op: 'mul' }];
const box = (root: ParentNode, a: number, b: number, op: string) =>
  root.querySelector<HTMLInputElement>(
    `input[data-a="${a}"][data-b="${b}"][data-op="${op}"]:not([data-random])`,
  )!;
const check = (cb: HTMLInputElement, on: boolean) => {
  cb.checked = on;
  cb.dispatchEvent(new Event('change', { bubbles: true }));
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('openCalcsPicker', () => {
  it('s’ouvre dans document.body avec la sélection initiale cochée', () => {
    void openCalcsPicker({ initial: INITIAL });
    const root = document.body.querySelector('.cp-overlay')!;
    expect(root).not.toBeNull();
    expect(box(root, 7, 8, 'mul').checked).toBe(true);
    expect(box(root, 6, 8, 'mul').checked).toBe(false);
  });

  it('résout la nouvelle sélection au clic Retour et se retire', async () => {
    const p = openCalcsPicker({ initial: INITIAL });
    const root = document.body.querySelector('.cp-overlay')!;
    check(box(root, 6, 8, 'mul'), true);
    root.querySelector<HTMLButtonElement>('.cp-back')!.click();
    const out = await p;
    expect(out).toEqual(expect.arrayContaining([...INITIAL, { a: 6, b: 8, op: 'mul' }]));
    expect(out).toHaveLength(2);
    expect(document.querySelector('.cp-overlay')).toBeNull();
  });

  it('interdit de fermer sans aucun calcul coché', () => {
    void openCalcsPicker({ initial: INITIAL });
    const root = document.body.querySelector('.cp-overlay')!;
    check(box(root, 7, 8, 'mul'), false);
    expect(root.querySelector<HTMLButtonElement>('.cp-back')!.disabled).toBe(true);
    expect(root.querySelector<HTMLButtonElement>('.cp-close')!.disabled).toBe(true);
    expect(root.querySelector('.cp-warn')!.textContent).not.toBe('');
  });

  it('s’attache au container fourni et disparaît avec lui', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    void openCalcsPicker({ initial: INITIAL, container });
    expect(container.querySelector('.cp-overlay')).not.toBeNull();
    container.remove();
    expect(document.querySelector('.cp-overlay')).toBeNull();
  });
});
```

Run: `pnpm --filter @gambette/math-sdk test`
Expected: FAIL — `../src/picker` introuvable.

- [ ] **Step 2: Déplacer le code**

```bash
mkdir -p packages/math-sdk/src/picker
cp $RM/src/ui/CalcsPicker.ts packages/math-sdk/src/picker/index.ts
cp $RM/src/ui/CalcsPickerDom.ts packages/math-sdk/src/picker/dom.ts
cp $RM/src/ui/CalcsPickerSections.ts packages/math-sdk/src/picker/sections.ts
cp $RM/src/ui/CalcsPickerExclusivity.ts packages/math-sdk/src/picker/exclusivity.ts
cp $RM/src/ui/CalcsPickerStyle.ts packages/math-sdk/src/picker/style.ts
cd packages/math-sdk/src/picker
perl -pi -e 's#"\.\./domain/tables"#"../domain/calcs"#g; s#"\./CalcsPickerDom"#"./dom"#g; s#"\./CalcsPickerSections"#"./sections"#g; s#"\./CalcsPickerExclusivity"#"./exclusivity"#g; s#"\./CalcsPickerStyle"#"./style"#g' *.ts
cd -
```

Dans `packages/math-sdk/src/picker/index.ts`, ajouter l'option `container` :

```ts
export interface CalcsPickerOptions {
  initial: readonly Pair[];
  /** Élément hôte de l'overlay (défaut : document.body). Le jeu y passe sa racine. */
  container?: HTMLElement;
}
```

et dans `openCalcsPicker`, remplacer `document.body.appendChild(handles.root);` par :

```ts
(opts.container ?? document.body).appendChild(handles.root);
```

Ajouter à `packages/math-sdk/src/index.ts` : `export * from './picker';`

- [ ] **Step 3: Vérifier**

```bash
pnpm exec prettier --write packages/math-sdk && pnpm --filter @gambette/math-sdk test && pnpm --filter @gambette/math-sdk build && pnpm --filter @gambette/math-sdk lint
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(math-sdk): sélecteur de calculs réutilisable avec conteneur hôte

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PwD249iHE7SXS5EkecJV6c"
```

---

### Task 5: `game-rabbit-math` — import et branchement sur `math-sdk`

**Files:**
- Create: `packages/game-rabbit-math/**` (copie de `$RM/src`, `$RM/tests`, `$RM/index.html`, images)
- Create: `packages/game-rabbit-math/{package.json,vite.config.ts,src/assets.ts}`
- Modify: `src/services/Settings.ts`, `src/entities/{Background,GearButton,HalfCarrot,Slingshot,CarrotCounter,Tree,Carrot}.ts`, `src/scenes/GameScene.ts`, `src/main.ts`, imports de `src/**` et `tests/**`
- Delete (dans la copie) : `src/domain/{tables,Rng,DifficultyConfig,QuestionGenerator,Question}.ts`, `src/ui/CalcsPicker*.ts`, `tests/domain/{tables,Rng,DifficultyConfig,QuestionGenerator}.spec.ts`
- Test: `tests/services/Settings.spec.ts` (réécrit)

**Interfaces:**
- Consumes: tout `@gambette/math-sdk` (Tasks 2–4).
- Produces: `ASSET_URLS` et `preloadAssets(): Promise<unknown>` dans `src/assets.ts` ; `loadSettings()`, `saveSettings(s)`, `DEFAULT_SETTINGS`, `SETTINGS_KEY = 'gambette.rabbit-math.settings'`, `interface Settings { selectedPairs: Pair[]; rabbitsCount: RabbitsCount; tapMode: boolean }`.

- [ ] **Step 1: Copier**

```bash
P=packages/game-rabbit-math
mkdir -p $P/assets
cp -R $RM/src $RM/tests $RM/index.html $RM/vitest.config.ts $RM/tsconfig.json $P/
cp $RM/public/assets/{sun,cog,carot,weapon,tree4branches,tree5branches,tree6branches,tree7branches}.png $P/assets/
rm $P/src/domain/{tables,Rng,DifficultyConfig,QuestionGenerator,Question}.ts $P/src/ui/CalcsPicker*.ts
rm $P/tests/domain/{tables,Rng,DifficultyConfig,QuestionGenerator}.spec.ts
```

(`allTrees.png` n'est référencé nulle part : non copié. `docs/` et `planning/` de rabbit-math ne sont pas repris.)

`packages/game-rabbit-math/package.json` :

```json
{
  "name": "@gambette/game-rabbit-math",
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
    "@gambette/math-sdk": "workspace:*",
    "@tweenjs/tween.js": "^25.0.0",
    "matter-js": "^0.20.0",
    "pixi.js": "^8.18.1"
  },
  "devDependencies": {
    "@types/matter-js": "^0.20.2",
    "jsdom": "^29.0.2",
    "typescript": "^6.0.3",
    "vite": "^8.0.10",
    "vitest": "^4.1.5"
  }
}
```

`packages/game-rabbit-math/vite.config.ts` :

```ts
import { defineConfig } from 'vite';

// Build standalone (jouer hors plateforme). La plateforme consomme src/ directement.
export default defineConfig({
  base: './',
  resolve: { alias: { '@': '/src' } },
  build: { outDir: 'dist', emptyOutDir: true },
});
```

- [ ] **Step 2: Rebrancher les imports sur math-sdk**

```bash
cd packages/game-rabbit-math
perl -pi -e 's#(["\x27])(?:\.\.?/)+(?:src/)?(?:domain/)?(?:tables|Rng|DifficultyConfig|QuestionGenerator|Question)\1#$1\@gambette/math-sdk$1#g; s#(["\x27])\./ui/CalcsPicker\1#$1\@gambette/math-sdk$1#g; s/\bgenerateSession\b/generateQuestions/g' $(grep -rlE "domain/|ui/CalcsPicker|generateSession|\./(Question|DifficultyConfig)\"" src tests)
grep -rnE "domain/(tables|Rng|DifficultyConfig|QuestionGenerator|Question)\b|ui/CalcsPicker" src tests
cd -
```

Expected: le dernier `grep` ne renvoie rien. (`src/domain/Session.ts` et `src/domain/sessionConfig.ts` restent dans le jeu et importent désormais `@gambette/math-sdk`.)

- [ ] **Step 3: Réécrire le test des réglages (échoue)**

`packages/game-rabbit-math/tests/services/Settings.spec.ts` :

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { calcsStorageKey } from '@gambette/math-sdk';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  loadSettings,
  saveSettings,
  validateSettings,
} from '../../src/services/Settings';

beforeEach(() => localStorage.clear());

describe('Settings defaults & round-trip', () => {
  it('loadSettings renvoie les défauts quand rien n’est stocké', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('la sélection par défaut est 10 multiplications', () => {
    expect(DEFAULT_SETTINGS.selectedPairs).toHaveLength(10);
    expect(DEFAULT_SETTINGS.selectedPairs.every((p) => p.op === 'mul')).toBe(true);
  });

  it('rabbitsCount par défaut = 4', () => {
    expect(DEFAULT_SETTINGS.rabbitsCount).toBe(4);
  });

  it('saveSettings puis loadSettings fait l’aller-retour', () => {
    const next = {
      selectedPairs: [{ a: 3, b: 4, op: 'add' as const }],
      rabbitsCount: 6 as const,
      tapMode: true,
    };
    saveSettings(next);
    expect(loadSettings()).toEqual(next);
  });
});

describe('Settings stockage', () => {
  it('les calculs vont dans le store math-sdk, le reste sous SETTINGS_KEY', () => {
    expect(SETTINGS_KEY).toBe('gambette.rabbit-math.settings');
    saveSettings({ ...DEFAULT_SETTINGS, rabbitsCount: 5 });
    expect(JSON.parse(localStorage.getItem(calcsStorageKey('rabbit-math'))!)).toEqual(
      DEFAULT_SETTINGS.selectedPairs,
    );
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!)).toEqual({
      rabbitsCount: 5,
      tapMode: false,
    });
  });

  it('préférences invalides → défauts pour rabbitsCount/tapMode', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ rabbitsCount: 'x', extra: 1 }));
    const s = loadSettings();
    expect(s.rabbitsCount).toBe(DEFAULT_SETTINGS.rabbitsCount);
    expect(s.tapMode).toBe(DEFAULT_SETTINGS.tapMode);
  });
});

describe('Settings validation', () => {
  it('validateSettings borne rabbitsCount dans [4,8]', () => {
    expect(validateSettings({ ...DEFAULT_SETTINGS, rabbitsCount: 2 as 4 }).rabbitsCount).toBe(4);
    expect(validateSettings({ ...DEFAULT_SETTINGS, rabbitsCount: 12 as 4 }).rabbitsCount).toBe(8);
    expect(validateSettings({ ...DEFAULT_SETTINGS, rabbitsCount: 5.7 as 5 }).rabbitsCount).toBe(5);
  });

  it('validateSettings remet 10 multiplications si la sélection est vide', () => {
    const fixed = validateSettings({ ...DEFAULT_SETTINGS, selectedPairs: [] });
    expect(fixed.selectedPairs).toHaveLength(10);
    expect(fixed.selectedPairs.every((p) => p.op === 'mul')).toBe(true);
  });
});
```

Run: `pnpm install && pnpm --filter @gambette/math-sdk build && pnpm --filter @gambette/game-rabbit-math test -- tests/services/Settings.spec.ts`
Expected: FAIL — `SETTINGS_KEY` vaut encore `rabbit-math.settings` et la sélection n'est pas dans le store.

- [ ] **Step 4: Réécrire `Settings.ts`**

`packages/game-rabbit-math/src/services/Settings.ts` :

```ts
import { createCalcsStore, randomMulPairs, type Pair } from '@gambette/math-sdk';
import { readJson, writeJson } from './Storage';

export type RabbitsCount = 4 | 5 | 6 | 7 | 8;

export interface Settings {
  selectedPairs: Pair[];
  rabbitsCount: RabbitsCount;
  tapMode: boolean;
}

/** Réglages propres au jeu (hors calculs, gérés par math-sdk). */
interface Prefs {
  rabbitsCount: RabbitsCount;
  tapMode: boolean;
}

export const SETTINGS_KEY = 'gambette.rabbit-math.settings';

export const DEFAULT_SETTINGS: Settings = {
  selectedPairs: randomMulPairs(),
  rabbitsCount: 4,
  tapMode: false,
};

const calcs = createCalcsStore('rabbit-math', {
  defaults: () => DEFAULT_SETTINGS.selectedPairs,
});

const isRabbitsCount = (v: unknown): v is RabbitsCount =>
  v === 4 || v === 5 || v === 6 || v === 7 || v === 8;

const isPrefs = (v: unknown): v is Prefs => {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  const known = new Set(['rabbitsCount', 'tapMode']);
  if (!Object.keys(o).every((k) => known.has(k))) return false;
  return isRabbitsCount(o.rabbitsCount) && typeof o.tapMode === 'boolean';
};

const clampRabbits = (n: number): RabbitsCount => {
  const i = Math.max(4, Math.min(8, Math.floor(n)));
  return i as RabbitsCount;
};

export function validateSettings(s: Settings): Settings {
  return {
    ...s,
    rabbitsCount: clampRabbits(s.rabbitsCount),
    selectedPairs: s.selectedPairs.length >= 1 ? s.selectedPairs : randomMulPairs(),
  };
}

const readPrefs = (): Prefs => {
  let raw: unknown = null;
  try {
    raw = readJson<unknown>(SETTINGS_KEY);
  } catch {
    // Stockage indisponible : défauts.
  }
  return isPrefs(raw)
    ? raw
    : { rabbitsCount: DEFAULT_SETTINGS.rabbitsCount, tapMode: DEFAULT_SETTINGS.tapMode };
};

export function loadSettings(): Settings {
  return validateSettings({ selectedPairs: calcs.load(), ...readPrefs() });
}

export function saveSettings(s: Settings): void {
  const v = validateSettings(s);
  calcs.save(v.selectedPairs);
  try {
    writeJson(SETTINGS_KEY, { rabbitsCount: v.rabbitsCount, tapMode: v.tapMode });
  } catch {
    // Stockage indisponible : réglages conservés en mémoire pour la session.
  }
}
```

- [ ] **Step 5: Images embarquées via `src/assets.ts`**

`packages/game-rabbit-math/src/assets.ts` :

```ts
import { Assets } from 'pixi.js';

// URLs résolues par Vite (chaînes littérales obligatoires) : les images sont
// embarquées dans le build de la plateforme comme dans le build standalone.
export const ASSET_URLS = {
  sun: new URL('../assets/sun.png', import.meta.url).href,
  cog: new URL('../assets/cog.png', import.meta.url).href,
  carrot: new URL('../assets/carot.png', import.meta.url).href,
  weapon: new URL('../assets/weapon.png', import.meta.url).href,
  tree4: new URL('../assets/tree4branches.png', import.meta.url).href,
  tree5: new URL('../assets/tree5branches.png', import.meta.url).href,
  tree6: new URL('../assets/tree6branches.png', import.meta.url).href,
  tree7: new URL('../assets/tree7branches.png', import.meta.url).href,
} as const;

export function preloadAssets(): Promise<unknown> {
  return Assets.load(Object.values(ASSET_URLS));
}
```

Remplacements dans `src/entities/` (ajouter `import { ASSET_URLS } from '../assets';` en tête de chaque fichier modifié) :

| Fichier            | Avant                                                    | Après                         |
| ------------------ | -------------------------------------------------------- | ----------------------------- |
| `Background.ts`    | `` `${import.meta.env.BASE_URL}assets/sun.png` ``        | `ASSET_URLS.sun`              |
| `GearButton.ts`    | `` `${import.meta.env.BASE_URL}assets/cog.png` ``        | `ASSET_URLS.cog`              |
| `HalfCarrot.ts`, `CarrotCounter.ts`, `Carrot.ts` | `` `${import.meta.env.BASE_URL}assets/carot.png` `` | `ASSET_URLS.carrot` |
| `Slingshot.ts`     | `` `${import.meta.env.BASE_URL}assets/weapon.png` ``     | `ASSET_URLS.weapon`           |
| `Tree.ts` (4..8)   | `` `${import.meta.env.BASE_URL}assets/treeNbranches.png` `` | `ASSET_URLS.tree4` / `tree5` / `tree6` / `tree7` / `tree7` (8 → tree7, comme aujourd'hui) |

Dans `src/main.ts`, remplacer le corps de `preloadAssets` local par l'import `import { preloadAssets } from './assets';` (supprimer la fonction locale et l'import `Assets`, et l'import `TREE_ASSET_URLS` s'il n'est plus utilisé).

Vérifier : `grep -rn "BASE_URL" packages/game-rabbit-math/src` → seul `src/services/Audio.ts` subsiste (audio non branché, cf. spec).

- [ ] **Step 6: Vérifier**

```bash
pnpm exec prettier --write packages/game-rabbit-math
pnpm --filter @gambette/game-rabbit-math test && pnpm --filter @gambette/game-rabbit-math typecheck && pnpm --filter @gambette/game-rabbit-math lint
```

Expected: tous les tests PASS. Si `lint` remonte des erreurs sur le code repris (règles `typescript-eslint` recommandées), les corriger au plus simple (ex. `as unknown as X` au lieu de `any` dans `tests/`), sans changer le comportement. Si `typecheck` signale `exactOptionalPropertyTypes` sur `openCalcsPicker({ initial, container })`, c'est attendu uniquement si `container` vaut `undefined` : ne passer la clé que si l'élément existe.

- [ ] **Step 7: Vérifier le jeu standalone dans le navigateur**

Run: `pnpm --filter @gambette/game-rabbit-math dev` puis ouvrir l'URL affichée.
Expected: le jeu démarre (images visibles), l'engrenage ouvre les réglages puis le sélecteur de calculs, et un rechargement conserve la sélection (clé `gambette.rabbit-math.calcs` visible dans DevTools → Application → Local Storage).

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(game-rabbit-math): importe rabbit-math et le branche sur math-sdk

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PwD249iHE7SXS5EkecJV6c"
```

---

### Task 6: `game-rabbit-math` — `GameModule` montable / démontable

**Files:**
- Create: `packages/game-rabbit-math/src/{mount,index,standalone-entry}.ts`
- Modify: `src/core/App.ts` (exposer `ticker`), `src/ui/OrientationLock.ts` (retourner un `dispose`), `index.html`
- Delete: `src/main.ts`
- Test: `packages/game-rabbit-math/tests/mount.spec.ts`, `tests/ui/OrientationLock.spec.ts`

**Interfaces:**
- Consumes: `GameModule`, `GameContext`, `GameInstance`, `createExitButton(parent, onExit, { fullscreen: false })`, `runStandalone` (Task 1) ; `openCalcsPicker` (Task 4) ; `preloadAssets` (Task 5).
- Produces: `export const rabbitMath: GameModule` (`meta.key === 'rabbit-math'`) depuis `@gambette/game-rabbit-math` ; `installOrientationLock(parent: HTMLElement): () => void`.

- [ ] **Step 1: Test du verrou d'orientation (échoue)**

`packages/game-rabbit-math/tests/ui/OrientationLock.spec.ts` :

```ts
import { describe, it, expect, vi } from 'vitest';
import { installOrientationLock } from '../../src/ui/OrientationLock';

describe('installOrientationLock', () => {
  it('ajoute un overlay puis le retire avec ses écouteurs au dispose', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const parent = document.createElement('div');
    const dispose = installOrientationLock(parent);
    expect(parent.children).toHaveLength(1);
    dispose();
    expect(parent.children).toHaveLength(0);
    for (const type of ['resize', 'orientationchange']) {
      const handler = add.mock.calls.find((c) => c[0] === type)![1];
      expect(remove).toHaveBeenCalledWith(type, handler);
    }
    add.mockRestore();
    remove.mockRestore();
  });
});
```

Run: `pnpm --filter @gambette/game-rabbit-math test -- tests/ui/OrientationLock.spec.ts`
Expected: FAIL — `dispose` n'est pas une fonction.

- [ ] **Step 2: `OrientationLock.ts` retourne un dispose**

Remplacer la fin de `src/ui/OrientationLock.ts` (à partir de `installResizeWatcher`) par :

```ts
const installResizeWatcher = (overlay: HTMLDivElement): (() => void) => {
  const update = (): void => {
    const portrait = window.innerHeight > window.innerWidth;
    overlay.style.display = portrait ? 'flex' : 'none';
  };
  update();
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
  return () => {
    window.removeEventListener('resize', update);
    window.removeEventListener('orientationchange', update);
  };
};

export function installOrientationLock(parent: HTMLElement): () => void {
  const overlay = createOverlayElement();
  parent.appendChild(overlay);
  const detach = installResizeWatcher(overlay);
  return () => {
    detach();
    overlay.remove();
  };
}
```

Run: `pnpm --filter @gambette/game-rabbit-math test -- tests/ui/OrientationLock.spec.ts` → PASS.

- [ ] **Step 3: `App.ts` expose le ticker de l'instance**

Dans `src/core/App.ts` : importer `type Ticker` depuis `pixi.js`, ajouter `readonly ticker: Ticker;` à `AppApi`, et `ticker: app.ticker,` dans l'objet retourné par `createApp`.

- [ ] **Step 4: Test de montage (échoue)**

`packages/game-rabbit-math/tests/mount.spec.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Container } from 'pixi.js';
import type { GameContext } from '@gambette/game-sdk';

// Pixi Application exige WebGL/Canvas, absent de jsdom : on simule l'app et le préchargement.
interface FakeApp {
  destroy: ReturnType<typeof vi.fn>;
  ticker: { add: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
  canvas: HTMLCanvasElement;
}
// vi.hoisted : la factory de vi.mock est remontée en tête de fichier.
const { fakeApps } = vi.hoisted(() => ({ fakeApps: [] as FakeApp[] }));
vi.mock('../src/core/App', () => ({
  createApp: vi.fn(async (parent: HTMLElement) => {
    const canvas = document.createElement('canvas');
    parent.appendChild(canvas);
    const app = {
      stage: new Container(),
      canvas,
      logical: { width: 1, height: 1 },
      ticker: { add: vi.fn(), remove: vi.fn() },
      resize: () => {},
      destroy: vi.fn(() => canvas.remove()),
    };
    fakeApps.push(app);
    return app;
  }),
}));
vi.mock('../src/assets', async (orig) => ({
  ...(await orig<typeof import('../src/assets')>()),
  preloadAssets: vi.fn(async () => {}),
}));

const { rabbitMath } = await import('../src/index');

const ctx = (): GameContext => ({ locale: 'fr', onExit: vi.fn() });

beforeEach(() => {
  fakeApps.length = 0;
  document.body.innerHTML = '';
});

describe('rabbitMath.mount / unmount', () => {
  it('expose la meta rabbit-math', () => {
    expect(rabbitMath.meta.key).toBe('rabbit-math');
    expect(rabbitMath.meta.instructions).not.toBe('');
  });

  it('monte canvas + bouton quitter, unmount laisse el vide', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const instance = await rabbitMath.mount(el, ctx());
    expect(el.querySelector('canvas')).not.toBeNull();
    expect(el.querySelector('[data-test="game-exit"]')).not.toBeNull();
    instance.unmount();
    expect(el.children).toHaveLength(0);
    const app = fakeApps[0]!;
    expect(app.destroy).toHaveBeenCalled();
    expect(app.ticker.remove).toHaveBeenCalledWith(app.ticker.add.mock.calls[0]![0]);
  });

  it('le bouton quitter appelle ctx.onExit après confirmation', async () => {
    const el = document.createElement('div');
    const c = ctx();
    const instance = await rabbitMath.mount(el, c);
    el.querySelector<HTMLButtonElement>('[data-test="game-exit"]')!.click();
    el.querySelector<HTMLButtonElement>('[data-test="game-exit-go"]')!.click();
    expect(c.onExit).toHaveBeenCalledTimes(1);
    instance.unmount();
  });

  it('deux cycles mount/unmount ne laissent aucun écouteur window', async () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const el = document.createElement('div');
    for (let i = 0; i < 2; i++) (await rabbitMath.mount(el, ctx())).unmount();
    const added = add.mock.calls.filter((c) => c[0] === 'resize' || c[0] === 'orientationchange');
    for (const [type, handler] of added) expect(remove).toHaveBeenCalledWith(type, handler);
    expect(el.children).toHaveLength(0);
    add.mockRestore();
    remove.mockRestore();
  });

  it('unmount retire un sélecteur de calculs resté ouvert', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const instance = await rabbitMath.mount(el, ctx());
    const { openCalcsPicker } = await import('@gambette/math-sdk');
    void openCalcsPicker({ initial: [{ a: 2, b: 3, op: 'mul' }], container: el });
    instance.unmount();
    expect(document.querySelector('.cp-overlay')).toBeNull();
  });
});
```

Run: `pnpm --filter @gambette/game-rabbit-math test -- tests/mount.spec.ts`
Expected: FAIL — `../src/index` introuvable.

- [ ] **Step 5: Implémenter `mount.ts`, `index.ts`, standalone**

`packages/game-rabbit-math/src/mount.ts` (reprend la logique de `src/main.ts`, scopée à l'instance) :

```ts
import type { Ticker } from 'pixi.js';
import { createExitButton, type GameContext, type GameInstance } from '@gambette/game-sdk';
import { openCalcsPicker } from '@gambette/math-sdk';
import { createApp } from './core/App';
import { createPhysicsWorld, type PhysicsWorld } from './core/PhysicsWorld';
import { createSceneManager, type SceneManager } from './core/SceneManager';
import { createGameScene } from './scenes/GameScene';
import { createSettingsScene } from './scenes/SettingsScene';
import { loadSettings, saveSettings, type Settings } from './services/Settings';
import { installOrientationLock } from './ui/OrientationLock';
import { tickTweens, tweenGroup } from './entities/animations/Tween';
import { preloadAssets } from './assets';

interface Runtime {
  el: HTMLElement;
  sm: SceneManager;
  physics: PhysicsWorld;
  settings: { current: Settings };
}

// Même cible que le shell (useFullscreen) : l'état plein écran persiste hors du jeu.
const toggleFullscreen = (): void => {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen();
};

const openSettings = (rt: Runtime): void => {
  const scene = createSettingsScene({
    initial: rt.settings.current,
    onChange: (next) => {
      rt.settings.current = next;
      saveSettings(next);
    },
    onClose: (next, restart) => {
      rt.settings.current = next;
      saveSettings(next);
      rt.sm.closeOverlay();
      if (restart) startGame(rt);
    },
    onOpenCalcsPicker: (current) => openCalcsPicker({ initial: current, container: rt.el }),
  });
  rt.sm.openOverlay(scene);
};

const startGame = (rt: Runtime): void => {
  rt.sm.goTo(
    createGameScene({
      settings: rt.settings.current,
      physics: rt.physics,
      onOpenSettings: () => openSettings(rt),
      onSessionRestart: () => startGame(rt),
      onToggleFullscreen: toggleFullscreen,
    }),
  );
};

export async function mountRabbitMath(el: HTMLElement, ctx: GameContext): Promise<GameInstance> {
  await preloadAssets();
  const app = await createApp(el);
  const physics = createPhysicsWorld();
  const sm = createSceneManager(app.stage);
  const settings = { current: loadSettings() };
  saveSettings(settings.current);
  const rt: Runtime = { el, sm, physics, settings };

  const disposeOrientation = installOrientationLock(el);
  const exit = createExitButton(el, () => ctx.onExit(), { fullscreen: false });
  const onTick = (t: Ticker): void => {
    physics.step(t.deltaMS);
    sm.tick(t.deltaMS);
    tickTweens(performance.now());
  };
  app.ticker.add(onTick);
  startGame(rt);

  return {
    unmount(): void {
      app.ticker.remove(onTick);
      tweenGroup.removeAll();
      sm.destroy();
      physics.destroy();
      exit.dispose();
      disposeOrientation();
      app.destroy();
      // Sélecteur de calculs éventuellement ouvert (sa promesse ne résoudra jamais : sans effet).
      el.querySelectorAll('.cp-overlay').forEach((n) => n.remove());
    },
  };
}
```

`packages/game-rabbit-math/src/index.ts` :

```ts
import type { GameModule } from '@gambette/game-sdk';
import { mountRabbitMath } from './mount';

export const rabbitMath: GameModule = {
  meta: {
    key: 'rabbit-math',
    name: 'Rabbit Math',
    description: 'Lance des carottes au lapin qui porte la bonne réponse.',
    instructions:
      'Tire sur l’élastique et vise le lapin qui affiche le résultat du calcul. ' +
      'Le bouton engrenage permet de choisir les calculs à travailler.',
  },
  mount: mountRabbitMath,
};
```

`packages/game-rabbit-math/src/standalone-entry.ts` :

```ts
import { runStandalone } from '@gambette/game-sdk';
import { rabbitMath } from './index';

const root = document.getElementById('game-root');
if (!root) throw new Error('Missing #game-root');
void runStandalone(rabbitMath, { container: root }).then(() => {
  document.getElementById('loader')?.remove();
});
```

Dans `index.html` : remplacer `src="/src/main.ts"` par `src="/src/standalone-entry.ts"` et ajouter `position: relative;` à la règle `#game-root` (le bouton quitter est positionné en absolu). Puis :

```bash
git rm -q packages/game-rabbit-math/src/main.ts
```

- [ ] **Step 6: Vérifier**

```bash
pnpm exec prettier --write packages/game-rabbit-math
pnpm --filter @gambette/game-rabbit-math test && pnpm --filter @gambette/game-rabbit-math build && pnpm --filter @gambette/game-rabbit-math lint
```

Expected: PASS ; `dist/` standalone généré.

- [ ] **Step 7: Vérifier dans le navigateur**

Run: `pnpm --filter @gambette/game-rabbit-math dev`
Expected: le jeu démarre, « ✕ Quitter » est centré en haut et loggue `[standalone] exit` après confirmation. Un seul bouton plein écran (celui du jeu).

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(game-rabbit-math): expose rabbit-math comme GameModule montable

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PwD249iHE7SXS5EkecJV6c"
```

---

### Task 7: `apps/web` — shell Nuxt (menu, briefing, hôte de jeu)

**Files:**
- Create (copiés de `$LHG/apps/web` puis adaptés) : `app.vue`, `tsconfig.json`, `vitest.config.ts`, `assets/css/theme.css`, `layouts/default.vue`, `components/Atom/{FullscreenToggle,ShapeArcs}.vue`, `components/Molecule/ScreenHeader.vue`, `composables/useFullscreen.ts`, `test/{setup,useFullscreen.test}.ts`
- Create (écrits) : `package.json`, `nuxt.config.ts`, `games.ts`, `lib/{gameCosmetics,mountGame}.ts`, `composables/useGameSession.ts`, `features/{GameHost,BriefingPanel}.vue`, `components/Molecule/GameCard.vue`, `components/Organism/GameGrid.vue`, `pages/index.vue`, `pages/play/[key].vue`
- Test: `apps/web/test/{mountGame,useGameSession,games}.test.ts`

**Interfaces:**
- Consumes: `createGameRegistry`, `GameModule`, `GameContext`, `GameInstance`, `GameMeta` (Task 1) ; `rabbitMath` (Task 6).
- Produces: `startGame(module: GameModule, el: HTMLElement, ctx: GameContext, cb: { onReady(): void; onError(e: unknown): void }): { stop(): void }` dans `lib/mountGame.ts` ; `useGameSession(): { state: { phase: 'briefing' | 'playing' }; startPlaying(): void; backToBriefing(): void }`.

- [ ] **Step 1: Copier les fichiers repris**

```bash
W=apps/web; L=$LHG/apps/web
mkdir -p $W/{assets/css,layouts,components/Atom,components/Molecule,components/Organism,composables,features,lib,pages/play,test}
cp $L/{app.vue,tsconfig.json,vitest.config.ts} $W/
cp $L/assets/css/theme.css $W/assets/css/
cp $L/layouts/default.vue $W/layouts/
cp $L/components/Atom/{FullscreenToggle,ShapeArcs}.vue $W/components/Atom/
cp $L/components/Molecule/ScreenHeader.vue $W/components/Molecule/
cp $L/composables/useFullscreen.ts $W/composables/
cp $L/test/{setup.ts,useFullscreen.test.ts} $W/test/
```

`apps/web/package.json` :

```json
{
  "name": "@gambette/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "nuxi dev",
    "build": "nuxi generate",
    "prepare": "nuxi prepare",
    "typecheck": "nuxi typecheck",
    "test": "vitest run",
    "lint": "eslint lib composables games.ts --no-error-on-unmatched-pattern"
  },
  "dependencies": {
    "@gambette/game-rabbit-math": "workspace:*",
    "@gambette/game-sdk": "workspace:*",
    "nuxt": "^4.4.8",
    "vue": "^3.5.0",
    "vuetify": "^4.1.1"
  },
  "devDependencies": {
    "@nuxt/fonts": "^0.14.0",
    "jsdom": "^24.0.0",
    "vite-plugin-vuetify": "^2.1.3",
    "vitest": "^2.0.0",
    "vue-tsc": "^2.0.0",
    "vuetify-nuxt-module": "^0.19.5"
  }
}
```

`apps/web/nuxt.config.ts` :

```ts
export default defineNuxtConfig({
  ssr: false,
  modules: ['@nuxt/fonts', 'vuetify-nuxt-module'],
  components: [{ path: '~/components' }, { path: '~/features' }],
  css: ['~/assets/css/theme.css'],
  // Polices auto-hébergées au build (pas de requête CDN au runtime).
  fonts: {
    families: [
      { name: 'Raleway', provider: 'google', weights: [500, 600, 700, 800] },
      { name: 'Montserrat', provider: 'google', weights: [400, 500, 600, 700] },
    ],
  },
  vuetify: {
    moduleOptions: {},
    vuetifyOptions: {
      theme: {
        defaultTheme: 'light',
        themes: {
          light: {
            colors: {
              primary: '#00274B',
              secondary: '#FF7D6D',
              tertiary: '#9566FF',
              warning: '#FFCC5C',
            },
          },
        },
      },
    },
  },
  typescript: {
    typeCheck: false,
  },
  compatibilityDate: '2026-06-11',
});
```

- [ ] **Step 2: Tests (échouent)**

`apps/web/test/mountGame.test.ts` :

```ts
import { describe, it, expect, vi } from 'vitest';
import type { GameContext, GameInstance, GameModule } from '@gambette/game-sdk';
import { startGame } from '../lib/mountGame';

const ctx: GameContext = { locale: 'fr', onExit: () => {} };
const flush = () => new Promise((r) => setTimeout(r, 0));

function deferredModule() {
  let resolve!: (i: GameInstance) => void;
  let reject!: (e: unknown) => void;
  const instance = { unmount: vi.fn() };
  const module: GameModule = {
    meta: { key: 'k', name: 'k', description: '', instructions: '' },
    mount: vi.fn(
      () =>
        new Promise<GameInstance>((res, rej) => {
          resolve = res;
          reject = rej;
        }),
    ),
  };
  return { module, instance, resolve: () => resolve(instance), reject: (e: unknown) => reject(e) };
}

describe('startGame', () => {
  it('monte puis signale ready ; stop démonte', async () => {
    const d = deferredModule();
    const onReady = vi.fn();
    const g = startGame(d.module, document.createElement('div'), ctx, { onReady, onError: vi.fn() });
    d.resolve();
    await flush();
    expect(onReady).toHaveBeenCalledTimes(1);
    g.stop();
    expect(d.instance.unmount).toHaveBeenCalledTimes(1);
  });

  it('stop avant résolution : démonte dès que mount résout, sans ready', async () => {
    const d = deferredModule();
    const onReady = vi.fn();
    const g = startGame(d.module, document.createElement('div'), ctx, { onReady, onError: vi.fn() });
    g.stop();
    d.resolve();
    await flush();
    expect(d.instance.unmount).toHaveBeenCalledTimes(1);
    expect(onReady).not.toHaveBeenCalled();
  });

  it('erreur de mount → onError, pas de ready', async () => {
    const d = deferredModule();
    const onReady = vi.fn();
    const onError = vi.fn();
    startGame(d.module, document.createElement('div'), ctx, { onReady, onError });
    d.reject(new Error('boom'));
    await flush();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(onReady).not.toHaveBeenCalled();
  });

  it('mount synchrone qui lève → onError', async () => {
    const module: GameModule = {
      meta: { key: 'k', name: 'k', description: '', instructions: '' },
      mount: () => {
        throw new Error('sync');
      },
    };
    const onError = vi.fn();
    startGame(module, document.createElement('div'), ctx, { onReady: vi.fn(), onError });
    await flush();
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
```

`apps/web/test/useGameSession.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { useGameSession } from '../composables/useGameSession';

describe('useGameSession', () => {
  it('alterne briefing ↔ playing et partage l’état', () => {
    const a = useGameSession();
    const b = useGameSession();
    a.backToBriefing();
    expect(b.state.phase).toBe('briefing');
    a.startPlaying();
    expect(b.state.phase).toBe('playing');
    b.backToBriefing();
    expect(a.state.phase).toBe('briefing');
  });
});
```

`apps/web/test/games.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { registry } from '../games';

describe('registre de jeux', () => {
  it('contient rabbit-math avec une consigne', () => {
    const game = registry.get('rabbit-math');
    expect(game).toBeDefined();
    expect(game!.meta.instructions.length).toBeGreaterThan(0);
  });

  it('chaque jeu listé est résolu par sa clé', () => {
    for (const m of registry.list()) expect(registry.get(m.meta.key)).toBe(m);
  });
});
```

Run: `pnpm install && pnpm --filter @gambette/web test`
Expected: FAIL — `../lib/mountGame`, `../composables/useGameSession`, `../games` introuvables.

- [ ] **Step 3: Logique et composables**

`apps/web/lib/mountGame.ts` :

```ts
import type { GameContext, GameInstance, GameModule } from '@gambette/game-sdk';

export interface RunningGame {
  stop(): void;
}

export interface StartGameCallbacks {
  onReady(): void;
  onError(e: unknown): void;
}

/**
 * Monte un jeu (mount synchrone ou asynchrone) et garantit son démontage :
 * si `stop()` arrive avant la fin du chargement, l'instance est démontée dès
 * qu'elle résout (aucun canvas orphelin quand on quitte pendant le chargement).
 */
export function startGame(
  module: GameModule,
  el: HTMLElement,
  ctx: GameContext,
  cb: StartGameCallbacks,
): RunningGame {
  let instance: GameInstance | null = null;
  let stopped = false;
  Promise.resolve()
    .then(() => module.mount(el, ctx))
    .then(
      (inst) => {
        if (stopped) {
          inst.unmount();
          return;
        }
        instance = inst;
        cb.onReady();
      },
      (e: unknown) => {
        if (!stopped) cb.onError(e);
      },
    );
  return {
    stop(): void {
      stopped = true;
      instance?.unmount();
      instance = null;
    },
  };
}
```

`apps/web/composables/useGameSession.ts` :

```ts
import { reactive } from 'vue';

export type GamePhase = 'briefing' | 'playing';

const state = reactive<{ phase: GamePhase }>({ phase: 'briefing' });

export interface GameSessionApi {
  state: { readonly phase: GamePhase };
  startPlaying: () => void;
  backToBriefing: () => void;
}

export function useGameSession(): GameSessionApi {
  return {
    state,
    startPlaying: () => {
      state.phase = 'playing';
    },
    backToBriefing: () => {
      state.phase = 'briefing';
    },
  };
}
```

`apps/web/games.ts` :

```ts
import { createGameRegistry } from '@gambette/game-sdk';
import { rabbitMath } from '@gambette/game-rabbit-math';

export const registry = createGameRegistry([rabbitMath]);
```

`apps/web/lib/gameCosmetics.ts` :

```ts
// Habillage purement cosmétique des jeux pour les menus (couleur + emblème de
// carte), dérivé par clé de jeu sans toucher au SDK. Les couleurs réfèrent les
// tokens du thème Vuetify.

export interface GameCosmetic {
  /** Token de couleur du thème Vuetify (primary/secondary/tertiary/warning). */
  color: string;
  /** Icône MDI servant d'emblème. */
  icon: string;
  /** Caractéristiques mises en avant sur la carte (pastilles). */
  traits: string[];
}

const BY_KEY: Record<string, GameCosmetic> = {
  'rabbit-math': {
    color: 'secondary',
    icon: 'mdi-rabbit',
    traits: ['calcul', 'adresse'],
  },
};

// Pour tout jeu sans habillage dédié : rotation déterministe sur la charte.
const ROTATION: GameCosmetic[] = [
  { color: 'tertiary', icon: 'mdi-puzzle', traits: [] },
  { color: 'warning', icon: 'mdi-calculator-variant', traits: [] },
  { color: 'secondary', icon: 'mdi-gamepad-variant', traits: [] },
];

const FALLBACK: GameCosmetic = ROTATION[0]!;

export function gameCosmetic(key: string, index = 0): GameCosmetic {
  return BY_KEY[key] ?? ROTATION[index % ROTATION.length] ?? FALLBACK;
}
```

Run: `pnpm --filter @gambette/web test`
Expected: PASS (5 fichiers de test).

- [ ] **Step 4: Composants et pages**

`apps/web/features/GameHost.vue` :

```vue
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import type { GameContext, GameModule } from '@gambette/game-sdk';
import { startGame, type RunningGame } from '~/lib/mountGame';

const props = defineProps<{ module: GameModule; ctx: GameContext }>();
const emit = defineEmits<{ back: [] }>();
const host = ref<HTMLElement>();
const status = ref<'loading' | 'ready' | 'error'>('loading');
let running: RunningGame | null = null;

onMounted(() => {
  if (!host.value) return;
  running = startGame(props.module, host.value, props.ctx, {
    onReady: () => {
      status.value = 'ready';
    },
    onError: (e) => {
      console.error('[GameHost] échec du montage du jeu', e);
      status.value = 'error';
    },
  });
});
onBeforeUnmount(() => {
  running?.stop();
  running = null;
});
</script>

<template>
  <div class="game-host">
    <div ref="host" class="game-host__stage" />
    <div v-if="status === 'loading'" class="game-host__overlay">
      <VProgressCircular indeterminate color="white" size="48" width="4" />
    </div>
    <div v-else-if="status === 'error'" class="game-host__overlay">
      <p class="game-host__error">Le jeu n'a pas pu se charger.</p>
      <VBtn color="secondary" rounded="pill" prepend-icon="mdi-arrow-left" @click="emit('back')">
        Retour
      </VBtn>
    </div>
  </div>
</template>

<style scoped>
.game-host {
  position: fixed;
  inset: 0;
  background: #111;
  z-index: 2000;
}
.game-host__stage {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.game-host__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #fff;
}
.game-host__error {
  font-size: 1.1rem;
}
</style>
```

`apps/web/features/BriefingPanel.vue` :

```vue
<script setup lang="ts">
import { computed } from 'vue';
import type { GameMeta } from '@gambette/game-sdk';

const props = withDefaults(
  defineProps<{ meta: GameMeta; colorToken?: string; icon?: string }>(),
  { colorToken: 'primary', icon: 'mdi-gamepad-variant' },
);
const emit = defineEmits<{ play: [] }>();

const accent = computed(() => `rgb(var(--v-theme-${props.colorToken}))`);
</script>

<template>
  <VContainer class="briefing">
    <MoleculeScreenHeader show-back back-to="/" />

    <header class="briefing__header" :style="{ '--accent': accent }">
      <div class="briefing__emblem">
        <VIcon :icon="icon" size="34" color="white" />
      </div>
      <div class="briefing__heading">
        <h1 class="briefing__title">{{ meta.name }}</h1>
        <p class="briefing__instructions">{{ meta.instructions }}</p>
      </div>
    </header>

    <VBtn
      class="briefing__play"
      :color="colorToken"
      size="x-large"
      rounded="pill"
      prepend-icon="mdi-play"
      @click="emit('play')"
    >
      Jouer
    </VBtn>
  </VContainer>
</template>
```

…suivi du bloc `<style scoped>` copié de `$LHG/apps/web/features/BriefingPanel.vue`, en ne gardant que les règles `.briefing__header`, `.briefing__emblem`, `.briefing__title`, `.briefing__instructions` et `.briefing__play`.

`apps/web/components/Organism/GameGrid.vue` :

```vue
<script setup lang="ts">
import type { GameModule } from '@gambette/game-sdk';
const props = defineProps<{ games: GameModule[] }>();
const emit = defineEmits<{ play: [key: string] }>();
</script>

<template>
  <VRow>
    <VCol v-for="(g, i) in props.games" :key="g.meta.key" cols="12" sm="6" md="4">
      <MoleculeGameCard :meta="g.meta" :index="i" @play="emit('play', $event)" />
    </VCol>
  </VRow>
</template>
```

`apps/web/components/Molecule/GameCard.vue` : copier `$LHG/apps/web/components/Molecule/GameCard.vue`, puis :
- props : `defineProps<{ meta: GameMeta; index?: number }>()` (retirer `available`, `canPlay`) ; import `GameMeta` depuis `@gambette/game-sdk` ;
- supprimer `locked`, `needsPseudo`, la classe `game-card--locked`, le bloc `.game-card__lock`, les `VChip` « Verrouillé » / « Pseudo requis », les deux `<p class="game-card__hint">` et `:disabled` sur le bouton ;
- supprimer les règles CSS `.game-card--locked …`, `.game-card__lock`, `.game-card__hint` et le sélecteur `:not(.game-card--locked)` du hover.

`apps/web/pages/index.vue` :

```vue
<script setup lang="ts">
import { registry } from '~/games';

const games = registry.list();

function play(key: string): void {
  void navigateTo(`/play/${key}`);
}
</script>

<template>
  <VContainer class="home py-8">
    <MoleculeScreenHeader />

    <section class="hero">
      <div class="hero__decor" aria-hidden="true">
        <AtomShapeArcs color="#FFCC5C" class="hero__shape hero__shape--arcs" />
      </div>
      <div class="hero__content">
        <h1 class="hero__title">Gambette</h1>
        <p class="hero__tagline">Des jeux pour s'entraîner au calcul en s'amusant.</p>
      </div>
    </section>

    <section class="games">
      <h2 class="games__heading">Choisis ton jeu</h2>
      <OrganismGameGrid :games="games" @play="play" />
    </section>
  </VContainer>
</template>
```

…suivi du bloc `<style scoped>` copié de `$LHG/apps/web/pages/index.vue`, en retirant les règles `.hero--ready`, `.hero__brand`, `.hero__logo`, `.hero__title span`, `.hero__panel` (et sa media query) et `.games__header` ; ajouter `margin-bottom: 16px;` à `.games__heading`.

`apps/web/pages/play/[key].vue` :

```vue
<script setup lang="ts">
import { computed, onMounted } from 'vue';
import type { GameContext } from '@gambette/game-sdk';
import { registry } from '~/games';
import { gameCosmetic } from '~/lib/gameCosmetics';

const route = useRoute();
const key = route.params.key as string;
const gameModule = registry.get(key);
const cosmetic = computed(() => gameCosmetic(key));
const session = useGameSession();

const ctx: GameContext = {
  locale: 'fr',
  // Bouton « quitter » in-game : retour au briefing (démonte le jeu).
  onExit: () => session.backToBriefing(),
};

onMounted(() => {
  if (!gameModule) {
    void navigateTo('/', { replace: true });
    return;
  }
  session.backToBriefing();
});
</script>

<template>
  <template v-if="gameModule">
    <GameHost
      v-if="session.state.phase === 'playing'"
      :module="gameModule"
      :ctx="ctx"
      @back="session.backToBriefing()"
    />
    <BriefingPanel
      v-else
      :meta="gameModule.meta"
      :color-token="cosmetic.color"
      :icon="cosmetic.icon"
      @play="session.startPlaying()"
    />
  </template>
</template>
```

- [ ] **Step 5: Vérifier build, types, lint**

```bash
pnpm exec prettier --write apps/web
pnpm --filter @gambette/web test && pnpm --filter @gambette/web lint && pnpm --filter @gambette/web typecheck && pnpm --filter @gambette/web build
```

Expected: PASS ; `apps/web/.output/public/` contient le site statique. Si `nuxi typecheck` remonte des erreurs **dans les sources de rabbit-math** (consommées en source avec le tsconfig Nuxt), les corriger dans `packages/game-rabbit-math` sans changer le comportement, puis relancer `pnpm --filter @gambette/game-rabbit-math test`.

- [ ] **Step 6: Vérifier le parcours dans le navigateur**

Run: `pnpm --filter @gambette/web dev` puis ouvrir `http://localhost:3000`.
Expected :
1. Accueil : titre Gambette, une carte « Rabbit Math ».
2. Carte → `/play/rabbit-math` : consigne + Jouer + Retour.
3. Jouer → spinner, puis le jeu en plein cadre avec ses images (onglet Network : PNG servis depuis `/_nuxt/…`, aucune 404).
4. Engrenage → sélecteur de calculs ; changer la sélection, recharger la page, rejouer : sélection conservée.
5. ✕ Quitter → confirmer → retour au briefing ; Jouer à nouveau → un seul canvas dans le DOM.
6. `/play/inconnu` → redirection vers l'accueil.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(web): shell Nuxt avec menu, briefing et hôte de jeu

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PwD249iHE7SXS5EkecJV6c"
```

---

### Task 8: Vérification globale

**Files:** aucun nouveau (corrections éventuelles uniquement).

- [ ] **Step 1: Pipeline complet depuis un état propre**

```bash
rm -rf node_modules */*/node_modules */*/dist apps/web/.nuxt apps/web/.output .turbo
pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm format:check
```

Expected: tout passe (c'est exactement ce que la CI exécute).

- [ ] **Step 2: Contrôle des frontières**

```bash
grep -rnE "collaborator|api-contract|lehibou" --include=*.ts --include=*.vue --include=*.json packages apps | grep -v node_modules
grep -n "math-sdk" apps/web/package.json packages/game-sdk/package.json
```

Expected: aucune ligne (pas de reste du domaine lehibou-games ; ni le shell ni game-sdk ne dépendent de math-sdk).

- [ ] **Step 3: Commit (si des corrections ont été nécessaires)**

```bash
git add -A && git commit -m "chore: corrections de la vérification globale

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PwD249iHE7SXS5EkecJV6c"
```

Ne pas pousser : demander l'accord avant `git push -u origin feat/platform-bootstrap`.
