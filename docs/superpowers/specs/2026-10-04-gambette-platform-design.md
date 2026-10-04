# Gambette — Spec d'architecture

**Date** : 2026-10-04
**Statut** : Design validé (brainstorming) — à décliner en plan d'implémentation.

## 1. Objectif & contexte

**Gambette** est une plateforme web de jeux de calcul pour enfants. L'enfant joue ; un adulte règle, **dans chaque jeu** (bouton engrenage), les calculs travaillés. Tout est **local à l'appareil** : pas d'API, pas de compte, pas de classement.

Gambette reprend l'architecture de la plateforme `~/Projets/lehibou-games` (monorepo, shell Nuxt, contrat de jeu `mount()`), **sans ses jeux ni son domaine métier** (collaborateurs). Le premier jeu est [`rabbit-math`](https://github.com/PaulDoazan/rabbit-math). D'autres jeux de calcul suivront : la gestion des calculs (catalogue de tables, générateur de questions, sélecteur, persistance des réglages) est donc extraite dans un **SDK partagé**.

### Critères de succès

- Depuis l'accueil, on choisit Rabbit Math, on lit la consigne, on joue en plein écran, on quitte et on revient au briefing.
- Dans le jeu, l'engrenage permet de choisir les calculs ; le choix persiste entre deux sessions sur le même appareil.
- Un nouveau jeu de calcul peut réutiliser `math-sdk` (sélecteur + questions + store) sans copier de code de rabbit-math.
- `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck` passent à la racine ; la CI les exécute.

## 2. Décisions structurantes

| Sujet               | Décision                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| Public              | Enfants ; réglages faits par un adulte                                                               |
| Backend             | **Aucun**. Réglages en `localStorage`. Front statique seul                                           |
| Portée des réglages | **Propre à chaque jeu** (sélections indépendantes entre jeux)                                        |
| Écran de réglages   | **Dans le jeu** (bouton engrenage), le jeu ouvre le sélecteur du SDK                                 |
| Shell conservé      | Menu des jeux + briefing (consigne, Jouer/Retour) + hôte plein écran + bouton quitter                |
| Organisation SDK    | **Deux packages** : `game-sdk` (contrat plateforme ↔ jeu) et `math-sdk` (domaine calculs), découplés |
| Monorepo            | pnpm 10 + Turborepo, Node ≥ 22, TypeScript, ESLint, Prettier, Vitest (repris de lehibou-games)       |
| Front               | Nuxt 4 + Vuetify, SPA générée (`nuxi generate`)                                                      |
| CI                  | GitHub Actions : lint, typecheck, test, build. Pas de déploiement dans ce périmètre                  |

### Hors périmètre (abandonné de lehibou-games)

`apps/api` (NestJS), `packages/api-contract`, Prisma/Postgres, dashboard admin, collaborateurs, S3/CDN photos, OAuth Microsoft, leaderboard/podium/phrase du champion, pseudo joueur, `GameOverPanel`, scoreboard SDK, infra EC2/docker/nginx, jeux Memory et Tower, branding LeHibou.

## 3. Monorepo

```
gambette/
├─ apps/
│  └─ web/                    # Nuxt 4 + Vuetify (SPA générée)
├─ packages/
│  ├─ game-sdk/               # contrat plateforme ↔ jeu
│  ├─ math-sdk/               # domaine calculs + sélecteur + persistance des réglages
│  └─ game-rabbit-math/       # premier jeu (Pixi + matter-js + tween.js)
├─ docs/superpowers/          # specs & plans
├─ .github/workflows/ci.yml
├─ turbo.json · pnpm-workspace.yaml · tsconfig.base.json
├─ eslint.config.mjs · .prettierrc.json · .nvmrc · .npmrc
└─ package.json
```

Scope npm des packages : `@gambette/*`.

Graphe de dépendances :

```
apps/web ──► game-sdk
apps/web ──► game-rabbit-math ──► game-sdk
                              └─► math-sdk
```

`math-sdk` ne dépend de rien d'interne. `game-sdk` ne dépend de rien d'interne. Le shell ne dépend pas de `math-sdk`.

## 4. `packages/game-sdk` — contrat plateforme ↔ jeu

Repris de `lehibou-games/packages/game-sdk`, purgé du domaine collaborateurs.

```ts
export interface GameContext {
  onScore?(score: number): void; // optionnel — HUD futur
  onGameOver?(result: { score: number }): void;
  onExit(): void; // bouton quitter → retour briefing
  locale: 'fr';
}

export interface GameMeta {
  key: string; // ex. 'rabbit-math'
  name: string;
  description: string;
  instructions: string; // affichée sur le briefing
  thumbnail?: string; // visuel de la carte menu
}

export interface GameInstance {
  unmount(): void;
}

export interface GameModule {
  meta: GameMeta;
  mount(el: HTMLElement, ctx: GameContext): GameInstance | Promise<GameInstance>;
}
```

| Élément                    | Sort                                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `types.ts`                 | Repris, modifié comme ci-dessus                                                                       |
| `registry.ts`              | Repris ; `isAvailable(key, collaboratorCount)` supprimé (plus de seuil)                               |
| `standalone.ts`            | Repris ; contexte sans collaborateurs, gère un `mount` asynchrone                                     |
| `exit-button.ts`           | Repris ; `data-test` `tower-exit*` → `game-exit*` ; option `{ fullscreen?: boolean }` (défaut `true`) |
| `mock.ts`, `scoreboard.ts` | Supprimés                                                                                             |

Changements vs lehibou-games : suppression de `Collaborator`, `Gender`, `minCollaborators`, `record` ; `mount` peut être **asynchrone** (Pixi `Application.init()` et préchargement d'assets).

## 5. `packages/math-sdk` — domaine des calculs

Extraction du code existant de rabbit-math (déjà isolé et testé). Couvre les trois opérations `mul | add | sub`.

```
packages/math-sdk/src/
├─ domain/
│  ├─ calcs.ts        # Op, Pair, computeAnswer, opSymbol, pairKey,
│  │                  # allMulPairs/allAddPairs/allSubPairs, TABLE_LISTS, getTableList
│  ├─ rng.ts          # Rng, mulberry32, pickFrom, shuffle
│  ├─ distractors.ts  # Difficulty, generateDistractors        (ex-DifficultyConfig.ts)
│  └─ questions.ts    # Question, QuestionRequest, generateQuestions (ex-QuestionGenerator.ts)
├─ picker/            # openCalcsPicker                         (ex-ui/CalcsPicker*.ts)
├─ store.ts           # createCalcsStore
└─ index.ts
```

### API publique

```ts
// Sélecteur DOM vanilla (styles injectés), sans dépendance de framework.
openCalcsPicker(opts: { initial: readonly Pair[]; container?: HTMLElement }): Promise<Pair[]>;

// Persistance par jeu, clé localStorage `gambette.<gameKey>.calcs`.
createCalcsStore(
  gameKey: string,
  opts?: { defaults?: () => Pair[] },
): {
  load(): Pair[]; // absent/invalide → defaults() (défaut : 10 multiplications aléatoires)
  save(pairs: readonly Pair[]): void;
};

// Génération déterministe d'une série de questions à choix.
generateQuestions(req: {
  pairs: readonly Pair[];
  difficulty: Difficulty;
  count: number;
  choicesCount: number;
  seed: number;
}): Question[];
```

### Comportements

- **`container` du sélecteur** (nouveau) : défaut `document.body`. Le jeu passe son propre élément : le sélecteur lui appartient et disparaît avec lui au démontage.
- **Sélection vide interdite** : comportement existant conservé (boutons de fermeture désactivés + message tant qu'aucun calcul n'est coché).
- **Store** : ne persiste **que** la sélection de calculs. Validation de forme à la lecture (tableau de `{a, b, op}` numériques, `op` normalisé en `mul` s'il est absent) ; toute donnée invalide ou un `localStorage` indisponible (exception) → valeurs par défaut, sans lever d'erreur.
- Les réglages propres à un jeu (ex. `rabbitsCount`, `tapMode`) restent dans le jeu, sous sa propre clé.

### Tests

Reprise des tests rabbit-math `tables`, `Rng`, `DifficultyConfig`, `QuestionGenerator` (renommés selon les modules), test du sélecteur (sélection, sélection vide, `container`), test du store (aller-retour, donnée corrompue, clé par jeu, `localStorage` qui lève).

## 6. `packages/game-rabbit-math` — premier jeu

Copie de `rabbit-math` (`src/`, `tests/`, assets), avec ses dépendances (`pixi.js` 8, `matter-js`, `@tweenjs/tween.js`), adaptée en `GameModule` :

```ts
export const rabbitMath: GameModule = {
  meta: { key: 'rabbit-math', name: 'Rabbit Math', description: '…', instructions: '…' },
  async mount(el, ctx) {
    /* … */ return { unmount };
  },
};
```

### Adaptations

| Aujourd'hui (app autonome)                                                         | Dans Gambette                                                                                                                              |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Rendu dans `#game-root`                                                            | Rendu dans `el`                                                                                                                            |
| Resize basé sur `window.innerWidth/Height`                                         | Inchangé (l'hôte occupe tout le viewport) ; écouteur retiré à `unmount()`                                                                  |
| `Ticker.shared` global                                                             | Ticker propre à l'instance, arrêté à `unmount()`                                                                                           |
| Orientation lock sur `document.body`                                               | Installé sur `el`, retiré à `unmount()`                                                                                                    |
| Plein écran sur `document.documentElement`                                         | Inchangé — cohérent avec le shell (`useFullscreen` cible aussi la racine, l'état persiste d'un écran à l'autre)                            |
| Musique démarrée (`startMusic`)                                                    | Non branchée : le dépôt rabbit-math ne contient aucun fichier son (`public/assets/sounds/` absent). `Audio.ts` est conservé pour plus tard |
| Assets via `import.meta.env.BASE_URL`                                              | Assets via `new URL('./assets/…', import.meta.url)` (embarqués par Vite)                                                                   |
| `domain/tables`, `Rng`, `DifficultyConfig`, `QuestionGenerator`, `ui/CalcsPicker*` | Supprimés ; importés de `@gambette/math-sdk`                                                                                               |
| `Settings.ts` persiste `selectedPairs` + réglages                                  | `selectedPairs` via `createCalcsStore('rabbit-math')` ; `rabbitsCount`, `tapMode` gardés sous `gambette.rabbit-math.settings`              |
| Pas de sortie                                                                      | Bouton quitter du SDK → `ctx.onExit()`, avec `{ fullscreen: false }` (le jeu a déjà son bouton plein écran)                                |

Restent dans le jeu : `Session`, `sessionConfig`, `manche`, toutes les scènes, entités et systèmes. L'engrenage ouvre `SettingsScene` (Pixi), qui appelle `openCalcsPicker({ initial, container: el })`.

**`unmount()`** : détruit l'application Pixi (canvas inclus), arrête ticker, tweens et monde physique, retire les écouteurs (`resize`, orientation) et tout overlay DOM ouvert (sélecteur). Après `unmount()`, `el` est vide.

**Standalone** : `index.html` + `standalone-entry.ts` appellent `runStandalone(rabbitMath)` ; `pnpm --filter @gambette/game-rabbit-math dev` permet de jouer hors plateforme.

### Tests

Tests existants conservés (entités, systèmes, scènes, services). Ajout d'un smoke test `mount` → `unmount` : `el` vide et aucun écouteur `resize` restant.

## 7. `apps/web` — shell Nuxt

### Parcours

1. **Accueil `/`** — `ScreenHeader` (titre « Gambette ») + `GameGrid` de `GameCard`, alimentée par le registre (`games.ts`).
2. **Jeu `/play/[key]`** — `BriefingPanel` : nom, consigne, boutons **Jouer** et **Retour**. « Jouer » → `GameHost` monte le jeu dans un `<div>` plein écran (`await module.mount(el, ctx)`). `ctx.onExit` → `unmount()`, sortie du plein écran, retour au briefing.
3. Clé inconnue → retour à l'accueil.

### Repris de lehibou-games (nettoyés)

`pages/index.vue`, `pages/play/[key].vue`, `features/BriefingPanel.vue`, `features/GameHost.vue`, `components/Organism/GameGrid.vue`, `components/Molecule/GameCard.vue`, `components/Molecule/ScreenHeader.vue`, `components/Atom/FullscreenToggle.vue`, atomes de formes décoratives, `composables/useFullscreen.ts`, `layouts/default.vue`, `lib/gameCosmetics.ts`.

### Supprimés

vue-query (`plugins/vue-query.ts`, `queryKeys`), `useApi`/`lib/api.ts`, admin (pages, layout, middleware, composables, `features/Admin*`), `ChampionPhraseForm`, `ChampionPhraseCard`, `Podium`, `LeaderboardTable`, `GameOverPanel`, `PseudoField`/`usePlayer`, `useGameSession` (dans sa forme liée à l'API), `LogoOwl`, `ConfirmDialog`, `CollaboratorFormDialog`, `PhotoUploadField`, script `dev:readonly`.

Le game over est géré par le jeu lui-même (rabbit-math relance déjà une manche) ; le shell ignore `onGameOver` dans ce périmètre.

### Gestion d'erreur

Si `mount()` rejette, `GameHost` affiche un message d'erreur et un bouton de retour au briefing ; l'erreur est loguée en console.

### Tests

Tests unitaires du registre (`games.ts` : clés uniques, toutes résolues) et de `useFullscreen` repris ; test de `GameHost` : `mount` appelé au clic Jouer, `unmount` appelé sur `onExit` et au démontage du composant.

## 8. CI

`.github/workflows/ci.yml` repris et réduit : install pnpm, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`. Pas de job de déploiement ni de service Postgres.

## 9. Ordre de réalisation suggéré

1. Socle monorepo (config racine, CI).
2. `game-sdk` purgé.
3. `math-sdk` extrait de rabbit-math, tests au vert.
4. `game-rabbit-math` : import, branchement sur `math-sdk`, adaptation `mount/unmount`, standalone.
5. `apps/web` nettoyé, registre avec Rabbit Math, parcours complet vérifié dans le navigateur.
