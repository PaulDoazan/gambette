# Tour de calcul — Spec de design

**Date** : 2026-10-14
**Statut** : Design validé (brainstorming) — à décliner en plan d'implémentation.

## 1. Objectif & contexte

Ajouter à Gambette un deuxième jeu de calcul, **Tour de calcul**, porté de
[`lehibou-games/packages/game-tower`](https://github.com/PaulDoazan/lehibou-games/tree/develop/packages/game-tower)
(Tower Slice : empilement/découpe de pavés en three.js + cannon-es, déclenché par un quiz).

Même codebase et même gameplay, à une différence près : la photo du collaborateur et les
3 noms proposés sont remplacés par **un calcul et 5 résultats**. Les calculs sont réglés via
`math-sdk` (sélecteur + persistance), comme dans rabbit-math. Le jeu se joue en plein écran et
se quitte via le bouton du `game-sdk`.

### Critères de succès

- Depuis l'accueil, on choisit Tour de calcul, on lit la consigne, on joue, on quitte et on revient au briefing.
- Chaque pavé mobile s'accompagne d'un calcul (ex. `6 × 7`) et de 5 résultats ; cliquer le bon résultat découpe le pavé à sa position courante (le timing compte), un mauvais résultat termine la partie.
- Le pavé posé porte le calcul résolu sur sa face du dessus (`6 × 7 = 42`).
- L'engrenage ouvre le sélecteur de calculs de `math-sdk` ; le choix persiste entre deux sessions (clé `gambette.tower-math.calcs`).
- Score de la partie et record local affichés ; le record persiste (clé `gambette.tower-math.record`).
- Un bouton plein écran est proposé à côté de « Quitter » sur **tous** les appareils où l'API Fullscreen existe.
- `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm format:check` passent à la racine.

## 2. Décisions

| Sujet             | Décision                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------ |
| Nom / clé         | « Tour de calcul » / `tower-math`, package `@gambette/game-tower-math`                     |
| Moteur            | Repris de game-tower sans changement de comportement (three.js, cannon-es)                 |
| Quiz              | 1 calcul + 5 résultats (`generateQuestions`, `choicesCount: 5`, `difficulty: 'medium'`)    |
| Mauvaise réponse  | Fin de partie (inchangé)                                                                   |
| Face du pavé posé | Calcul résolu, texture canvas 2D (plus de photo, plus de réseau)                           |
| Réglages          | Engrenage DOM dans le jeu → `openCalcsPicker` ; jeu en pause pendant ; nouvelle tour après |
| Score             | Pastille Score + Record locale au jeu ; record en `localStorage`                           |
| Plein écran       | Option `fullscreen: 'always'` ajoutée à `createExitButton` du `game-sdk`                   |
| Orientation       | Portrait bloqué (« Tournez votre téléphone ») — inchangé                                   |

### Hors périmètre

Domaine collaborateurs (`quiz.ts` par genre, `loadPhoto.ts`, cache de textures photo, retry
CORS), scoreboard partagé dans le SDK, leaderboard, sons, réglage de difficulté par l'adulte.

## 3. Graphe de dépendances

```
apps/web ──► game-tower-math ──► game-sdk
                             └─► math-sdk
```

`game-tower-math` dépend de `three` et `cannon-es` (mêmes versions majeures que game-tower,
pour un portage sans dérive d'API). L'outillage (TypeScript, Vite, Vitest, jsdom, ESLint) est
aligné sur `game-rabbit-math` ; `package.json` exporte `./src/index.ts` comme lui.

## 4. `packages/game-tower-math`

```
packages/game-tower-math/
├─ index.html                  # standalone
├─ src/
│  ├─ index.ts                 # GameModule towerMath
│  ├─ game.ts                  # mountTowerMath(el, ctx) : orchestration
│  ├─ engine.ts                # repris tel quel (empilement/découpe pur)
│  ├─ motion.ts                # repris tel quel (aller-retour indépendant du framerate)
│  ├─ scene.ts                 # repris ; textures photo → texture calcul (canvas)
│  ├─ calcTexture.ts           # dessine « a op b = r » dans un canvas
│  ├─ questionFeed.ts          # flux infini de questions par lots
│  ├─ record.ts                # lecture/écriture du record local
│  ├─ scoreboard.ts            # pastille Score + Record (porté de lehibou-games)
│  ├─ overlay.ts               # carte calcul, 5 boutons, engrenage, rejouer, portrait
│  └─ standalone-entry.ts      # runStandalone(towerMath)
└─ test/                       # engine, motion, questionFeed, record, calcTexture, mount
```

### 4.1 Méta

```ts
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

### 4.2 Questions — `questionFeed.ts`

```ts
createQuestionFeed(pairs: readonly Pair[], seed?: number): { next(): Question }
```

- Génère des lots de 50 via `generateQuestions({ pairs, difficulty: 'medium', count: 50, choicesCount: 5, seed })`, et relance un lot (seed suivante) quand le précédent est épuisé : la tour n'a pas de fin.
- `generateQuestions` évite déjà la répétition immédiate d'une paire au sein d'un lot.
- Chaque `Question` contient `a`, `b`, `op`, `answer`, `choices` (5 valeurs mélangées dont la réponse).

### 4.3 Flux de jeu — `game.ts`

Identique à game-tower, collaborateurs remplacés par le flux de questions :

1. `begin()` : `engine.start()`, `scene.reset()`, score 0, `nextQuiz()`.
2. `nextQuiz()` : `feed.next()` → `overlay.setCalc("6 × 7")`, `overlay.setChoices(["42", …])`.
3. `onChoice(slot)` : verrou `transitioning` ; si `choices[slot] !== answer` → `engine.fail()` + `endGame()` ; sinon `engine.slice(position)` → raté = `endGame()`, découpe = `scene.applyCut()`, `scene.texturePlacedTop(label)` avec `label = "6 × 7 = 42"`, `ctx.onScore?.(score)`, score affiché, `nextQuiz()`.
4. `endGame()` : chute du pavé, puis après 900 ms `ctx.onGameOver?.({ score })`, mise à jour du record, écran « Rejouer ».

Symboles d'opération via `opSymbol` de `math-sdk`.

### 4.4 Réglages (engrenage)

- Bouton engrenage DOM dans l'overlay (à côté du panneau quiz).
- Au clic : `paused = true` (la boucle RAF continue mais n'appelle plus `scene.tick()`, donc le pavé est figé), boutons de réponse ignorés, puis `openCalcsPicker({ initial: calcs.load(), container: root })`.
- À la résolution : `calcs.save(pairs)`, nouveau `createQuestionFeed(pairs)`, `paused = false`, `begin()` (nouvelle tour, le score repart à 0).
- `calcs = createCalcsStore('tower-math')` (défaut du store : 10 multiplications au hasard).
- Ouverture ignorée si le jeu est en transition ou si un sélecteur est déjà ouvert.

### 4.5 Scène — `scene.ts`

Repris de game-tower. Seuls changements :

- `preloadPhoto` supprimé.
- `texturePlacedTop(label: string)` : texture `THREE.CanvasTexture` produite par `calcTexture.ts` (fond clair, texte centré, taille de police adaptée à la longueur du libellé), mise en cache par libellé, appliquée sur la face du dessus avec la même rotation que la photo (caméra iso). Textures libérées au `dispose()`.
- Décalage de caméra conservé (le panneau quiz occupe la droite de l'écran).

### 4.6 Overlay — `overlay.ts`

- Panneau en haut à droite (`width:min(220px,40vw)`) : **carte calcul** (texte grand, à la place de la photo) puis **5 boutons** empilés, compacts pour tenir en paysage sur téléphone (~360 px de haut).
- `data-test` : `tower-root`, `tower-quiz`, `tower-calc`, `tower-choice`, `tower-settings`, `tower-replay`, `tower-replay-btn`, `tower-rotate`.
- Écran « Rejouer » (score final) et écran portrait repris tels quels.
- Bouton quitter : `createExitButton(root, () => ctx.onExit(), { fullscreen: 'always' })`.

### 4.7 Score & record

- `scoreboard.ts` : pastille bas-gauche « Score / Record », record affiché = `max(record, score)` (comportement de lehibou-games).
- `record.ts` : `loadRecord(): number` / `saveRecord(n)` sur `gambette.tower-math.record` ; valeur absente, invalide ou `localStorage` qui lève → 0, sans erreur ; écriture silencieusement ignorée si le stockage est indisponible.
- Le record est sauvegardé en fin de partie s'il est battu.

### 4.8 `unmount()`

Pose `disposed`, annule le RAF et le timer de game over, retire l'écouteur `resize`, dispose l'overlay (orientation, bouton quitter et écouteurs plein écran, scoreboard), retire tout `.cp-overlay` ouvert (la promesse du sélecteur ne résoudra jamais : sans effet), dispose la scène (géométries, matériaux, textures, renderer). Après `unmount()`, `el` est vide.

### 4.9 Standalone

`pnpm --filter @gambette/game-tower-math dev` → `index.html` + `runStandalone(towerMath)`.

## 5. `packages/game-sdk` — plein écran « partout »

`createExitButton(parent, onExit, opts: { fullscreen?: boolean | 'always' })` :

| Valeur          | Bouton plein écran affiché                              |
| --------------- | ------------------------------------------------------- |
| `true` (défaut) | mobile (pointeur grossier) et API disponible — inchangé |
| `'always'`      | dès que l'API est disponible, quel que soit l'appareil  |
| `false`         | jamais — inchangé (rabbit-math)                         |

Cible toujours `document.documentElement` (l'état persiste au retour au briefing, cohérent avec
`useFullscreen` du shell). Aucun changement pour rabbit-math.

## 6. `apps/web`

- `games.ts` : `createGameRegistry([rabbitMath, towerMath])`.
- `lib/gameCosmetics.ts` : `'tower-math': { color: 'tertiary', icon: 'mdi-cube-outline', traits: ['calcul', 'réflexes'] }`.
- Dépendance `@gambette/game-tower-math: workspace:*`.

## 7. Gestion d'erreur

- Création du contexte WebGL impossible : `mount` lève ; `GameHost` affiche déjà l'erreur et le bouton Retour.
- Stockage indisponible : calculs par défaut (store `math-sdk`) et record 0, sans erreur.
- API plein écran absente ou refusée : bouton masqué ou clic sans effet, sans rejet non géré (comportement existant du SDK).

## 8. Tests

- **Repris** : `engine.test.ts`, `motion.test.ts`.
- **Nouveaux** :
  - `questionFeed` : 5 choix distincts contenant la réponse ; seules les paires fournies ; plus de 50 appels sans épuisement.
  - `record` : aller-retour, donnée invalide → 0, `localStorage` qui lève.
  - `calcTexture` : libellé dessiné (canvas mocké), cache par libellé.
- **`mount.test.ts`** (three/scène mockés comme dans game-tower) : 5 boutons et la carte calcul affichés ; bonne réponse → score +1 et `onScore` ; mauvaise réponse → `onGameOver` et écran Rejouer ; Rejouer → nouvelle partie ; engrenage → sélecteur ouvert dans `root`, pause, puis nouvelle tour et sélection sauvegardée ; Quitter confirmé → `onExit` ; `unmount` → `el` vide, plus d'écouteur `resize`.
- **game-sdk** `exit-button.test.ts` : `'always'` affiche le bouton plein écran sur desktop ; `true` ne l'affiche pas sur desktop ; `false` jamais.
- **apps/web** `games.test.ts` : le registre contient `tower-math`.

## 9. Ordre de réalisation

1. `game-sdk` : option `fullscreen: 'always'` + test.
2. Package `game-tower-math` : socle (package.json, tsconfig, vite/vitest), import de `engine`/`motion` et de leurs tests.
3. `questionFeed`, `record`, `calcTexture`, `scoreboard`.
4. `scene` adaptée, `overlay`, `game`, `index`, standalone ; `mount.test`.
5. Branchement dans `apps/web` (registre, habillage) et vérification du parcours complet dans le navigateur.
