# Math River — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 4e jeu Gambette, collaboratif : deux joueurs lancent le seau portant la bonne réponse dans un trou pour faire monter l'eau jusqu'au canal et libérer un poisson.

**Architecture:** Domaine pur (`aim`, `water`, `touchRouting`, `quiz`) testé sans Pixi ; entités Pixi `Graphics` sans physique ; `GameScene` orchestre seaux, vols, niveau et poisson ; `mount.ts` reprend le cycle de passe-trappe (réglages, victoire, boutons SDK) sans planck.

**Tech Stack:** TypeScript, Pixi.js 8, `@gambette/game-sdk`, `@gambette/math-sdk`, Vitest 4 + jsdom.

**Spec:** `docs/superpowers/specs/2026-10-24-math-river-design.md`

## Global Constraints

- Paquet `games/math-river` (`@gambette/game-math-river`), port 5104 `strictPort`, script racine `dev:math-river`.
- Valeurs : `HOLE_RADIUS = 160`, `MAX_STRETCH = 150`, `MIN_STRETCH = 24`, `MAX_RANGE = 760`, `MIN_LEVEL = 0.12`, `START_LEVEL = 0.2`, `WATER_PER_BUCKET = 0.12`, `DRAIN_PER_SECOND = 0.018`, `STRUGGLE_LEVEL = 0.4`, `ESCAPE_MS = 2200`.
- Français dans le code, les commentaires et les tests ; style Prettier racine.
- Un commit par tâche sur `PaulDoazan/math-river`, messages conventionnels `feat(game-math-river): …`.

## Review Focus

1. **Les deux joueurs tirent en même temps** → chacun garde son seau, son vol et son calcul. Test : Task 3.
2. **Tir pendant le vol de son propre seau** → ignoré jusqu'au nouveau calcul. Test : Task 3.
3. **Victoire pendant qu'un vol est en cours / qu'un doigt est posé** → un seul `onWin`, seau relâché. Test : Task 3.
4. **Infiltration longue sans tir** → le niveau reste à `MIN_LEVEL`. Test : Task 2.
5. **Ouvrir les réglages pendant une visée** → le seau revient, aucun tir parti. Test : Task 4.

---

### Task 1: Socle du paquet et domaine pur

**Files:** `games/math-river/{package.json,vite.config.ts,vitest.config.ts,tsconfig.json,index.html}`, `src/config/{dimensions,water,theme}.ts`, `src/domain/{types,touchRouting,quiz,aim,water}.ts`, `tests/domain/*.spec.ts`, `tests/setup.ts`, `package.json` (script).

**Interfaces (Produces):**

- `aimFrom(home: Vec, grip: Vec): Aim | null` — `Aim = { stretch, target: Vec, range }`, null sous `MIN_STRETCH`.
- `clampGrip(home: Vec, p: Vec): Vec` — à au plus `MAX_STRETCH` de `home`, dans le plateau.
- `flightAt(from: Vec, to: Vec, t: number): { x, y, lift }` — `lift = sin(πt)`.
- `flightMs(range: number): number`, `inHole(p: Vec): boolean`.
- `createWater(start?: number)` → `{ level(), pour(), update(dtMs), full(), reset() }`.
- `createTouchRouter()` (comme passe-trappe), `pickCalc`, `labelCamp` (repris de passe-trappe).

Tests : visée opposée à la traction, portée ∝ étirement et plafonnée, null sous le seuil ; `inHole` dedans / bord / dehors ; vol nul aux extrémités et maximal à mi-course ; eau : remplit, s'infiltre, plancher, plafond 1, `full()`, `reset()` ; routage ; 5 valeurs distinctes avec la bonne réponse.

### Task 2: Entités et `GameScene`

**Files:** `src/entities/*.ts`, `src/scenes/GameScene.ts`, `tests/scenes/GameScene.spec.ts`.

**Interfaces (Produces):** `createGameScene({ pairs, rng?, onWin })` → `{ view, pointerDown(id, p), pointerMove(id, p), pointerUp(id), releaseAll(), calc(pl), buckets(pl), level(), tick(dtMs), reset(), destroy() }` ; `buckets(pl)` → `{ value, empty, position }[]`.

Tests : bon seau dans le trou → niveau monte après le vol et nouveau calcul ; à côté → niveau inchangé, nouveau calcul ; mauvais seau → vide, niveau inchangé, calcul conservé ; pas de saisie pendant le vol ; deux joueurs simultanés ; plancher ; victoire → `onWin` une seule fois après l'évasion ; `reset`.

### Task 3: Scènes réglages / victoire, `mount`, intégration au shell

**Files:** `src/scenes/{SettingsScene,VictoryScene}.ts`, `src/services/Settings.ts`, `src/mount.ts`, `src/index.ts`, `src/standalone-entry.ts`, `tests/mount.spec.ts`, `apps/web/{games.ts,lib/gameCosmetics.ts,package.json,test/games.test.ts}`.

Tests : smoke montage (canvas, quitter à gauche, engrenage), `unmount` vide `el`, double cycle, victoire → Rejouer / Quitter, réglages ouverts → `releaseAll`, registre du shell contient `math-river`.

### Task 4: Vérification

`pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build` ; partie jouée dans le navigateur (captures).
