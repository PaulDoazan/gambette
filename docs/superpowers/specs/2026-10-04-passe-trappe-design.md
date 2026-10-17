# Passe-trappe — Spec de design

**Date** : 2026-10-04
**Statut** : Design validé (brainstorming) — à décliner en plan d'implémentation.
**Contexte** : s'appuie sur `2026-10-04-gambette-platform-design.md` (plateforme Gambette, `game-sdk`, `math-sdk`, rabbit-math).

## 1. Objectif

Ajouter à Gambette un second jeu : un **passe-trappe** (jeu d'adresse en bois) en **vue de dessus**, pour **2 joueurs face à face sur le même smartphone** tenu en portrait. Chaque joueur tire des palets en les plaquant contre l'élastique de son camp pour les faire passer par le trou de la cloison centrale. **Le premier dont le camp est vide a gagné.** Collisions entre palets et contre les bords.

Pour l'instant, **adresse uniquement** : la notion de calcul (via `math-sdk`) viendra dans une itération ultérieure.

Le travail inclut deux préalables :

1. **Un dossier par jeu** : les jeux quittent `packages/` pour `games/<jeu>/`.
2. **Une seule bibliothèque physique** : rabbit-math migre de matter-js vers **planck.js** (port de Box2D), utilisé aussi par le passe-trappe.

### Critères de succès

- `games/rabbit-math` et `games/passe-trappe` existent ; `packages/` ne contient plus que `game-sdk` et `math-sdk`.
- Rabbit-math se joue comme avant (test de non-régression des trajectoires au vert) et `matter-js` n'est plus une dépendance du dépôt.
- Depuis l'accueil Gambette, on lance le passe-trappe, deux joueurs jouent en même temps sur un téléphone, et le jeu désigne le vainqueur avec Rejouer / Quitter.
- Chaque jeu se lance seul en local : `pnpm dev:rabbit-math` (port 5101) et `pnpm dev:passe-trappe` (port 5102).
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm format:check` passent ; la CI les exécute.

## 2. Décisions structurantes

| Sujet              | Décision                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| Rangement des jeux | `games/<jeu>/` à la racine ; `packages/` réservé aux bibliothèques partagées                                |
| Moteur physique    | **planck.js** pour tous les jeux ; matter-js retiré                                                         |
| Rythme de jeu      | **Simultané, multitouch** : course de vitesse, un tir en cours par joueur                                   |
| Palets             | Indifférenciés : « mes palets » = **tout palet dans mon camp** ; 5 par camp au départ                       |
| Victoire           | Camp vide **pendant 1 s d'affilée**                                                                         |
| Rendu              | Pixi.js 8, formes `Graphics`, aucune image                                                                  |
| Dev standalone     | Un serveur Vite par jeu, port fixe (rabbit-math 5101, passe-trappe 5102)                                    |
| Partage de code    | Pas de `physics-sdk` (rien de commun entre les deux usages) ; orientation et bouton quitter dans `game-sdk` |

## 3. Réorganisation du dépôt

```
gambette/
├─ apps/web/
├─ packages/              # bibliothèques partagées uniquement
│  ├─ game-sdk/
│  └─ math-sdk/
└─ games/                 # un dossier par jeu
   ├─ rabbit-math/        # @gambette/game-rabbit-math (déplacé, nom npm inchangé)
   └─ passe-trappe/       # @gambette/game-passe-trappe (nouveau)
```

- `pnpm-workspace.yaml` : ajout de `games/*`.
- Déplacement par `git mv` (historique conservé). Noms de packages inchangés → aucun changement d'import dans `apps/web`.
- Scripts racine : `"dev:rabbit-math": "pnpm --filter @gambette/game-rabbit-math dev"`, `"dev:passe-trappe": "pnpm --filter @gambette/game-passe-trappe dev"`.
- Chaque jeu fixe son port dans son `vite.config.ts` (`server.port`, `strictPort: true` pour échouer clairement si le port est pris plutôt que d'en choisir un autre en silence).

## 4. Migration de rabbit-math vers planck.js

### Périmètre

matter-js n'est utilisé que pour **un corps** (la carotte), dans 5 fichiers : `core/PhysicsWorld.ts`, `entities/Carrot.ts`, `scenes/gameRound.ts`, `scenes/gameRoundCleanup.ts`, `systems/TrajectoryPreview.ts` (+ `tests/core/PhysicsWorld.spec.ts`). Les collisions carotte ↔ lapins sont géométriques (code maison), pas déléguées au moteur.

### Approche

- `PhysicsWorld` garde son interface publique en **pixels** ; l'implémentation devient un `planck.World` et porte la conversion `PX_PER_M` (constante unique). Le reste du jeu ne manipule jamais de mètres.
- Les appels `Matter.Body.*` deviennent leurs équivalents planck (`setLinearVelocity`, `setPosition`, `setAngularVelocity`, `setType('static' | 'dynamic')`), encapsulés dans `Carrot` / `PhysicsWorld`.
- `TrajectoryPreview` simule la trajectoire avec un monde planck jetable (même principe qu'aujourd'hui).
- Les constantes physiques (gravité, vitesse de lancement) sont recalibrées pour que la sensation soit identique.

### Garde-fou de non-régression

**Avant toute modification**, un test `tests/core/trajectory.golden.spec.ts` enregistre, avec matter-js, la position de la carotte toutes les 100 ms pendant 2 s pour **3 tirs de référence** (faible, moyen, fort) et fige ces valeurs dans un fichier de référence. Après migration, le même test rejoue ces tirs avec planck et exige un écart **≤ 4 px** à chaque échantillon. Ce test reste dans la suite.

### Fin de migration

`matter-js` et `@types/matter-js` sont retirés ; `planck` est la seule dépendance physique du dépôt.

## 5. Évolutions de `game-sdk`

1. **`createExitButton(parent, onExit, opts)`** : nouvelle option `placement?: 'top' | 'side'` (défaut `'top'`, comportement actuel). `'side'` place le bouton sur le bord gauche, centré verticalement (au niveau de la cloison du passe-trappe), car le haut de l'écran est le camp du joueur B.
2. **`installOrientationLock(parent, required)`** : déplacé de rabbit-math vers `game-sdk`, avec `required: 'landscape' | 'portrait'` ; retourne une fonction de dispose. Rabbit-math l'utilise avec `'landscape'` (comportement actuel : overlay « Tourne ton téléphone » en portrait) ; le passe-trappe avec `'portrait'`.

## 6. Le jeu passe-trappe

### Plateau

Résolution logique **720 × 1280** (portrait), mise à l'échelle avec bandes (letterbox) comme rabbit-math.

```
┌───────────────────────┐  ← bord du joueur B (haut ; il voit l'écran à l'envers)
│ ═══════élastique B═══ │
│    ●   ●   ●   ●   ●  │  camp B
│                       │
│ ██████████   ████████ │  cloison centrale, trou au milieu
│                       │
│    ●   ●   ●   ●   ●  │  camp A
│ ═══════élastique A═══ │
└───────────────────────┘  ← bord du joueur A (bas)
```

- Palets : rayon ≈ 28 px ; 5 par camp au départ, disposés en ligne entre l'élastique et la cloison.
- Trou : largeur ≈ 1,6 × diamètre d'un palet, centré.
- Élastiques : tendus d'un mur latéral à l'autre, en retrait du bord du joueur ; droits au repos, dessinés en V quand un palet les déforme.
- Toutes les cotes vivent dans `config/dimensions.ts`.

### Tir

1. Un toucher qui **commence** dans la moitié d'écran d'un joueur appartient à ce joueur. S'il commence sur un palet de son camp, ce palet est saisi.
2. Le palet saisi suit le doigt via un **`MouseJoint`** planck : il reste un corps physique et pousse les autres palets au lieu de les traverser.
3. Le palet saisi reste confiné au camp du joueur. S'il passe l'élastique vers le bord, l'élastique se déforme ; l'étirement est plafonné (`MAX_STRETCH`).
4. Au relâcher :
   - élastique tendu → vitesse de lancement **proportionnelle à l'étirement** (plafonnée), dans la **direction de la bissectrice du V** (somme des vecteurs unitaires palet → ancrage gauche et palet → ancrage droit). Tirer le palet de côté vise en diagonale ;
   - élastique non tendu → le palet est simplement lâché.
5. **Un palet tenu par joueur à la fois** : tout autre doigt du même joueur est ignoré tant que le premier est posé. Les deux joueurs peuvent tirer simultanément.

### Physique (planck.js, `config/physics.ts`)

- Gravité nulle ; `linearDamping` des palets pour le frottement du plateau (le palet glisse puis s'arrête).
- Restitution ≈ 0,8 palet ↔ palet, ≈ 0,6 palet ↔ mur ; friction faible.
- Palets en `bullet: true` (détection continue des collisions) : un palet rapide ne traverse ni la cloison ni les murs.
- Murs extérieurs et cloison (deux segments laissant le trou) : corps statiques.
- Pas de temps fixe : `world.step(1/60)`, répété autant de fois que nécessaire pour rattraper le temps écoulé depuis la frame précédente (plafonné à 5 sous-pas).

### Règles

- **Camp d'un palet** : position de son centre par rapport à la ligne médiane.
- **Victoire** : le camp d'un joueur reste vide **1 s d'affilée** → ce joueur gagne. Le délai évite de couronner un joueur dont le palet traverse puis revient par rebond. Égalité impossible (les 10 palets restent sur le plateau).

### Déroulé

1. Shell : briefing → Jouer → `mount`. La partie démarre immédiatement, palets en place.
2. Victoire : `VictoryScene` affiche « Joueur du bas gagne ! » / « Joueur du haut gagne ! » **deux fois** — à l'endroit et tourné à 180° — avec **Rejouer** (palets remis en position initiale) et **Quitter** (`ctx.onExit()`).
3. Bouton quitter du SDK en `placement: 'side'` ; bouton plein écran du SDK actif sur mobile (le jeu n'en a pas d'autre).
4. Orientation : `installOrientationLock(el, 'portrait')`.
5. Desktop : la souris fonctionne (un seul pointeur), ce qui suffit pour tester.

### Structure

```
games/passe-trappe/
├─ index.html, vite.config.ts (port 5102), vitest.config.ts, tsconfig.json, package.json
└─ src/
   ├─ index.ts                 # GameModule { meta.key: 'passe-trappe' }
   ├─ mount.ts                 # montage / démontage complet (async)
   ├─ standalone-entry.ts      # runStandalone(passeTrappe)
   ├─ config/{dimensions,physics,theme}.ts
   ├─ core/App.ts              # Pixi Application + ticker d'instance
   ├─ core/PhysicsWorld.ts     # planck.World, conversion px ↔ m, sous-pas
   ├─ domain/                  # pur : ni Pixi ni planck
   │  ├─ elastic.ts            # étirement, vitesse/direction de lancement
   │  ├─ rules.ts              # campOf, détecteur de victoire (délai 1 s)
   │  └─ touchRouting.ts       # pointeur → joueur, un palet tenu par joueur
   ├─ entities/{Board,Puck,Elastic}.ts
   ├─ input/DragController.ts  # événements pointeur → MouseJoint → lancer
   └─ scenes/{GameScene,VictoryScene}.ts
```

`mount()` / `unmount()` suivent le contrat et les garanties de rabbit-math : ticker propre à l'instance, nettoyage partiel si le montage échoue, `el` vide après `unmount()`, aucun écouteur `window` résiduel.

### Intégration au shell

- `apps/web/games.ts` : registre `[rabbitMath, passeTrappe]`.
- `apps/web/lib/gameCosmetics.ts` : entrée `'passe-trappe'` (couleur `tertiary`, icône `mdi-swap-vertical`, traits `adresse`, `2 joueurs`).
- Meta : nom « Passe-trappe », description courte, consigne expliquant le tir à l'élastique et la condition de victoire.

## 7. Tests

| Cible                  | Tests                                                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `domain/elastic`       | direction = bissectrice (tir centré → droit vers le trou ; tir décalé → diagonal) ; norme ∝ étirement ; plafond ; non tendu → aucun lancer                                                 |
| `domain/rules`         | `campOf` de part et d'autre de la ligne médiane ; camp vide < 1 s → pas de vainqueur ; ≥ 1 s → vainqueur ; palet revenu → délai remis à zéro ; détecteur réinitialisable (Rejouer)         |
| `domain/touchRouting`  | toucher attribué à la moitié où il commence ; 2ᵉ doigt du même joueur ignoré ; deux joueurs simultanés ; relâcher libère                                                                   |
| Physique (planck réel) | palet lancé vers le trou → passe dans l'autre camp ; palet contre un mur → rebondit ; palet très rapide contre la cloison → ne la traverse pas ; deux palets → collision et échange d'élan |
| `mount`                | smoke : canvas + bouton quitter ; `unmount` vide `el` ; double cycle sans écouteur résiduel ; échec de montage → nettoyage                                                                 |
| `game-sdk`             | `placement: 'side'` ; `installOrientationLock` portrait / paysage + dispose                                                                                                                |
| Rabbit-math            | test de non-régression des trajectoires (§4) ; suite existante au vert                                                                                                                     |
| Shell                  | registre : `passe-trappe` résolu avec consigne                                                                                                                                             |

## 8. Hors périmètre

Notion de calcul (itération suivante), sons, IA / mode solo, scores et classement, réglages (nombre de palets, taille du trou), animations décoratives, images.

## 9. Ordre de réalisation suggéré

1. Déplacer rabbit-math vers `games/` (+ workspace, scripts `dev:*`, port fixe).
2. Évolutions `game-sdk` (orientation, placement du bouton quitter) et adoption dans rabbit-math.
3. Test de non-régression des trajectoires (matter-js), puis migration de rabbit-math vers planck.js, retrait de matter-js.
4. Passe-trappe : domaine pur → physique → entités / entrée → scènes → `mount`.
5. Intégration au shell.
