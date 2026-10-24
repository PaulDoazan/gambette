# Math River — trois manches — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enchaîner trois manches dans trois trous de plus en plus grands, reliés par des canaux, avec une caméra qui suit le poisson, jusqu'à la mer.

**Architecture:**
- Un « monde » Pixi de trois écrans côte à côte (largeur 3 × 720) contient le sable, les trous, l'eau, les canaux, la mer et le poisson. La caméra est `world.x = -cameraX`.
- Les seaux, les calculs, les visées, les flaques et l'eau en vol forment une couche d'interface fixe à l'écran. Elle s'efface pendant les transitions.
- La scène de jeu porte une petite machine à états (`playing` → `leaving` → `arriving` → `playing`, puis `finale`) et prévient le montage via `onUiHidden(hidden)`. Le montage masque ou réaffiche alors le bandeau DOM.

**Tech Stack:** TypeScript, Pixi.js 8 (Graphics), Vitest 4 + jsdom, pnpm/turbo.

**Spec:** `docs/superpowers/specs/2026-10-24-math-river-manches-design.md` (complète `2026-10-24-math-river-design.md`).

## Global Constraints

- Paquet `games/math-river` uniquement. Pas de nouvelle dépendance, pas d'images.
- Largeur 720. Hauteur via `configureBoard` (1280 à 1800). Les valeurs qui dépendent de la hauteur (`MID_Y`…) sont lues à l'appel.
- Rayons des trous : 160, 190, 220.
- Le niveau d'eau va de `MIN_LEVEL = 0.12` à 1 et repart de `START_LEVEL = 0.2` à chaque manche.
- Durées visées (allure : un bon seau toutes les 3 s pour la paire) : 60 s, 90 s, 120 s. Formule : `W_k = 3.2 / T_k` et `D_k = W_k / 12`.
- Une paire lente (un bon seau toutes les 8 s) progresse toujours : `W/8 − D > 0`.
- Effacement de l'interface : `UI_FADE_MS = 300`. Trajet de la caméra : `PAN_MS = 2500`.
- Le style du code suit le dépôt : commentaires en français, Prettier (simple quote, 100 colonnes), tests nommés en français.
- Commits : un par tâche (`feat(game-math-river): …`), avec les trailers de session. Une correction d'un commit non poussé se fait en `--fixup`.

## Review Focus

1. Un doigt posé au moment où la manche se termine : le seau revient sans tirer, et aucun toucher n'atteint le jeu avant le retour complet de l'interface. Test dans la tâche 5.
2. De l'eau en vol au moment où la manche se termine : elle ne remplit pas le trou suivant et ne renouvelle pas le calcul. Test dans la tâche 5.
3. « Rejouer » après la manche 3 : retour à la manche 1, caméra à 0, eau au départ. Test dans la tâche 5.
4. Un plateau de 1280 de haut : le trou de 220 ne chevauche ni les seaux ni les calculs. Test dans la tâche 1.
5. Le raccord du canal à la frontière de deux écrans : y = `MID_Y` et direction horizontale. Test dans la tâche 2.

---

### Task 1: Paramètres des manches et eau paramétrable

**Files:**
- Create: `src/config/rounds.ts`
- Modify: `src/config/water.ts` (retirer `WATER_PER_BUCKET` et `DRAIN_PER_SECOND`), `src/domain/water.ts`
- Test: `tests/config/rounds.spec.ts`, `tests/domain/water.spec.ts`

**Interfaces:**
- Produces:
  - `interface RoundSpec { holeRadius: number; perBucket: number; drainPerSecond: number }`
  - `ROUNDS: readonly RoundSpec[]` (3 manches)
  - `LAST_ROUND = 2`
  - `UI_FADE_MS = 300`, `PAN_MS = 2500`
  - `holeCenterOf(k): Vec` = `{ x: k * DESIGN_WIDTH + DESIGN_WIDTH / 2, y: MID_Y }`, en coordonnées du monde
  - `waterRadiusMax(k)` = `ROUNDS[k].holeRadius - 22`
  - `createWater(spec: Pick<RoundSpec,'perBucket'|'drainPerSecond'>, start = START_LEVEL): Water`, même API qu'aujourd'hui, avec en plus `reset(spec?)` qui change de manche

- [ ] Test `rounds.spec.ts` :
  - Les rayons valent `[160, 190, 220]`.
  - Pour chaque manche, `0.8 / (perBucket / 3 - drainPerSecond)` est proche de `[60, 90, 120][k]` (±2 s).
  - `perBucket / 8 > drainPerSecond`.
  - Après `configureBoard(1280)`, `MID_Y + 220 + 22 < CALC_BLOCK.A.y - CALC_BLOCK_SIZE.h / 2` et `MID_Y - 242 > CALC_BLOCK.B.y + CALC_BLOCK_SIZE.h / 2`.
- [ ] Adapter `water.spec.ts` : `createWater(ROUNDS[0])`. Ajouter « `reset(ROUNDS[2])` : niveau de départ et apport de la manche 3 ».
- [ ] Lancer `pnpm vitest run tests/config tests/domain/water.spec.ts` : échec attendu.
- [ ] Implémenter. Valeurs : `perBucket = 3.2 / T`, `drainPerSecond = perBucket / 12`. Corriger les imports de `GameScene.spec.ts` (`WATER_PER_BUCKET` devient `ROUNDS[0].perBucket`).
- [ ] Lancer `pnpm vitest run` : tout passe. Puis commit.

### Task 2: Canaux entre trous et vers la mer

**Files:**
- Modify: `src/domain/channel.ts` (réécriture)
- Test: `tests/domain/channel.spec.ts` (réécriture)

**Interfaces:**
- Consumes: `ROUNDS`, `holeCenterOf`.
- Produces:
  - `interface Channel { center(t): Vec; halfWidth(t): number; heading(t): number; outline(extra: number, from?: number, to?: number): number[]; bank(side: 1|-1): number[] }`, en coordonnées du monde, avec t ∈ [0, 1].
  - `channelFrom(k: 0|1|2): Channel` : de k vers k+1, ou vers la mer pour k = 2.
  - `SEA_SHORE_X(): number` : x monde du rivage de la mer, soit `2 * 720 + 600`.
  - `channelBoundaryT(k): number` : t où le canal franchit la frontière d'écran (k = 0, 1).

**Tracé :**
- Le canal part de `holeCenterOf(k).x + R_k - 24` et arrive à `holeCenterOf(k+1).x - R_{k+1} + 24`. Pour k = 2, il arrive à `SEA_SHORE_X() + 40`.
- x varie linéairement avec t.
- y est découpé en deux segments : du départ à la frontière, puis de la frontière à l'arrivée. Pour k = 2, il n'y a qu'un segment. Sur chaque segment, avec `v ∈ [0, 1]` : `y = MID_Y + SWAY · sin(2πv) · sin(πv)`, avec `SWAY` ≈ 50 à régler à l'œil. Cette forme est nulle et de pente nulle aux deux bouts de chaque segment.
- Demi-largeur : la formule actuelle (évasement et congé) appliquée aux deux bouts. Pour la mer, l'évasement s'applique au bout d'arrivée.

- [ ] Tests :
  - Départ dans le trou k, à moins de `R_k` du centre. Arrivée dans le trou k+1.
  - À `channelBoundaryT(k)` : `x = (k+1)·720`, `y ≈ MID_Y`, `heading ≈ 0` (à 0,02 près).
  - Sinueux : s'écarte de plus de 15 px de `MID_Y` sur chaque segment.
  - `heading(0.01) ≈ 0`.
  - Le test actuel de tangence des berges au bord du trou, gardé pour les deux bouts.
  - `outline` donne un polygone de points finis, et `outline(0, 0, 0.5)` s'arrête avant la frontière.
- [ ] Lancer les tests (échec), implémenter, relancer (succès).
- [ ] `Beach`, `Pool` et `Fish` ne compilent plus : la tâche 3 les adapte. Ne pas commiter avant la tâche 3 ; elle part dans le même commit.

### Task 3: Monde de trois écrans : sable, trous, mer, eau, poisson

**Files:**
- Modify: `src/entities/Beach.ts`, `src/entities/Pool.ts`, `src/entities/Fish.ts`
- Create: `src/entities/Sea.ts`
- Test: `tests/entities/Fish.spec.ts` (nouveau), `tests/entities/Pool.spec.ts` (nouveau)

**Interfaces:**
- Consumes: `channelFrom`, `ROUNDS`, `holeCenterOf`, `SEA_SHORE_X`.
- Produces:
  - `createBeach(): { view }` : sable sur `0..3·720`, les trois trous (bourrelet, cuvette, anneaux), les trois canaux (lit, bourrelet, berges hors des trous) et des décors variés par écran, hors des zones des seaux et des calculs.
  - `createSea(): { view; update(dtMs) }` : bande d'eau à droite de `SEA_SHORE_X()`, rivage ondulé, lignes d'écume qui vont et viennent, toute la hauteur.
  - `createPool(k, startLevel): Pool`, avec la même API. Le centre est `holeCenterOf(k)` et le rayon d'eau va de `WATER_R_MIN` à `waterRadiusMax(k)`. `overflow()` remplit `channelFrom(k)` jusqu'au bout. `drain()` vide son canal en `PAN_MS`. `reset(level)` vide le canal.
  - `waterRadius(level, k)`.
  - `createFish()` en coordonnées du monde, avec trois méthodes :
    - `swimIn(k)` : nage en rond dans le trou k.
    - `escape(k, onOut)` : rejoint `channelFrom(k).center(0.12)`, suit le canal jusqu'à t = 1, puis gagne le centre du trou k+1 (ou nage dans la mer sur 200 px), et appelle `onOut` une fois arrivé.
    - `position()` : position monde, que la caméra suit.

  La durée de `escape` est `PAN_MS`. `ESCAPE_MS` est retiré de `config/water.ts`.

- [ ] Tests :
  - `Fish` : après `escape(0, cb)` et `PAN_MS + 50` ms de `update`, `cb` est appelé une fois et `position()` est à moins de 60 px de `holeCenterOf(1)`. La position x reste croissante sur le trajet (la caméra ne recule pas).
  - `Pool` : `waterRadius(1, 2) === waterRadiusMax(2)`.
- [ ] Implémenter. Les trois pools et la mer vivent dans le monde (assemblage dans la tâche 5). Lancer `pnpm vitest run` et `pnpm exec tsc --noEmit -p .` : `GameScene` reste à adapter et peut encore échouer.
- [ ] Commit groupé avec la tâche 2 une fois que `tsc` passe, c'est-à-dire avec l'adaptation minimale de `GameScene` à la manche 0. Sinon, commit après la tâche 5 en deux commits distincts (canal et monde, puis manches).

### Task 4: Visée selon le trou courant

**Files:**
- Modify: `src/domain/aim.ts`, `tests/domain/aim.spec.ts`

**Interfaces:**
- Produces: `inHole(p: Vec, radius = HOLE_RADIUS): boolean`, en coordonnées écran. Le trou courant est toujours au centre de l'écran quand on joue.

- [ ] Test : `inHole({x: 360 + 200, y: MID_Y}, 220)` vaut vrai, et avec le rayon par défaut il vaut faux.
- [ ] Implémenter, lancer les tests, commit avec la tâche 5.

### Task 5: Manches, caméra et effacement de l'interface dans GameScene

**Files:**
- Modify: `src/scenes/GameScene.ts`, `src/entities/AimGuide.ts` (`onTarget` reçoit le rayon courant)
- Test: `tests/scenes/GameScene.spec.ts`

**Interfaces:**
- Consumes: tout ce qui précède.
- Produces, en plus de l'API actuelle de `createGameScene` :
  - L'option `deps.onUiHidden?(hidden: boolean)`.
  - `round(): number` (0 à 2).
  - `uiVisible(): boolean`, vrai seulement en `playing`.
  - `cameraX(): number`.

**Machine à états :**
- **`playing`** : comme aujourd'hui. Quand `water.full()` :
  - si `round < LAST_ROUND` → `releaseAll()`, `pool.overflow()`, `fish.escape(k, …)`, `onUiHidden(true)`, état `leaving` ;
  - sinon → même chose, puis `finale`.
- **`leaving`** :
  - L'alpha de l'interface tombe à 0 en `UI_FADE_MS`. Les flaques sont détruites.
  - L'eau en vol termine son vol sans remplir ni renouveler.
  - La caméra suit le poisson : `cameraX = clamp(fish.x - 360, k·720, (k+1)·720)`. Le pool k appelle `drain()`.
  - Le rappel de `escape` termine le trajet : `cameraX = (k+1)·720`, `round = k+1`, `water.reset(ROUNDS[k+1])`, `fish.swimIn(k+1)`, `renew` des deux joueurs sans éclat. On passe en `arriving`.
- **`arriving`** : l'alpha remonte à 1 en `UI_FADE_MS`, puis `onUiHidden(false)` et retour en `playing`.
- **`finale`** : l'interface s'efface, le poisson nage vers la mer et `onWin` est appelé une seule fois au rappel. La caméra ne bouge pas.
- **Touchers** : `pointerDown` est ignoré hors de `playing`.
- **`reset()`** : manche 0, caméra 0, toutes les pools remises à zéro, `fish.swimIn(0)`, alpha 1, `playing`. Pas d'appel à `onUiHidden` : c'est le montage qui gère ses boutons au « Rejouer ».
- **Coordonnées** : la cible d'un tir est en écran, la ride (`ripple`) en monde (`target.x + cameraX`).

- [ ] Tests (une aide `fillHole(scene)` qui tire des bons seaux au centre jusqu'à `level() === 1`) :
  - Fin de manche 1 : `onUiHidden(true)` est appelé, `uiVisible()` est faux. Pendant la transition, `pointerDown` sur un seau ne le saisit pas (le seau ne bouge pas après `pointerMove`). Après `PAN_MS + 2·UI_FADE_MS + 100` ms : `round() === 1`, `cameraX() === 720`, `level() === START_LEVEL`, `onUiHidden(false)` est appelé, `uiVisible()` est vrai, et le jeu est de nouveau jouable (un bon seau fait monter le niveau de `ROUNDS[1].perBucket` à l'infiltration près).
  - Doigt posé en fin de manche : le seau revient à sa place et aucun tir n'est parti.
  - Eau en vol en fin de manche : à la manche 2, le niveau vaut `START_LEVEL` et le calcul est celui tiré à l'arrivée.
  - Trois manches remplies : `onWin` est appelé une seule fois, après la manche 3 seulement, et `round()` reste à 2.
  - `reset()` après la victoire : `round() === 0`, `cameraX() === 0`, `level() === START_LEVEL`, jouable.
  - Le test actuel « eau au niveau du canal… onWin une seule fois » devient « fin de manche 1 : pas de victoire ».
- [ ] Lancer (échec), implémenter, relancer (succès). Puis typecheck, lint, Prettier.
- [ ] Commit(s), selon la tâche 3.

### Task 6: Montage : bandeau masqué pendant les transitions

**Files:**
- Modify: `src/mount.ts`, `tests/mount.spec.ts`

**Interfaces:**
- Consumes: `deps.onUiHidden`.

Brancher `onUiHidden: (hidden) => (hidden ? hideExit() : setButtonsHidden(false))`. Le retour est immédiat : aucun tap ne précède le retour de l'interface, donc pas de délai `EXIT_REVEAL_DELAY_MS`. L'engrenage est inactif tant que le bandeau est masqué ; c'est déjà le cas, puisque le bandeau n'est pas affiché.

- [ ] Test : en simulant `onUiHidden(true)` (via un `createGameScene` espionné ou par la scène réelle avec des ticks), le bandeau et `game-exit` sont masqués. Après `onUiHidden(false)`, ils sont visibles.
- [ ] Implémenter, lancer toute la suite, typecheck, lint.
- [ ] Vérification visuelle en local (`pnpm dev:math-river`, Playwright 390×844). Captures à prendre : manche 1, transition au milieu du trajet (interface absente, canal continu à la frontière), manche 2 (canal de gauche vide et trou plus grand), manche 3 (mer et vagues), victoire. Vérifier qu'aucune erreur n'apparaît dans la console.
- [ ] Mettre à jour la description du jeu dans `src/index.ts` (instructions : « 3 trous jusqu'à la mer »).
- [ ] Commit.
