# Math River — Spec de design

**Date** : 2026-10-24
**Statut** : Design validé (issue #6, maquettes en commentaire) — à décliner en plan d'implémentation.
**Contexte** : 4e jeu Gambette ; reprend le face-à-face et les blocs de calcul de passe-trappe, le tir en parabole de rabbit-math.

## 1. Objectif

Premier jeu **collaboratif** : deux joueurs face à face sur le même téléphone en portrait sauvent un poisson coincé au fond d'un trou dans le sable. Chacun résout son calcul, lance le seau portant le bon résultat dans le trou ; quand l'eau atteint le canal, le poisson s'échappe. **Pas de défaite.**

## 2. Décisions structurantes

| Sujet          | Décision                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| Paquet         | `games/math-river` (`@gambette/game-math-river`), port Vite **5104**, script `dev:math-river`          |
| Rendu          | Pixi.js 8, formes `Graphics`, aucune image ; vue du dessus                                             |
| Physique       | **Aucune** : le vol de l'eau est calculé (interpolation au sol + hauteur en `sin(πt)`) ; pas de planck |
| Plateau        | 720 de large, hauteur suivant l'écran (1280–1800), comme passe-trappe                                  |
| Rythme         | Simultané, multitouch ; un seau tenu par joueur                                                        |
| Calcul         | Un calcul par joueur ; 5 seaux, une seule bonne réponse (`labelCamp` de passe-trappe)                  |
| Réglages       | Engrenage → choix des calculs (`createCalcsStore('math-river')`)                                       |
| Boutons du SDK | Tous au **bord gauche, au milieu** sur un bandeau navy (le centre est le trou, la droite est le canal) |

## 3. Plateau

```
┌───────────────────────┐  ← joueur B (voit son côté à l'envers)
│  (15) (18) (12) (21) (9)   seaux de B
│ [ 6 × 3 = ? ]         │
│                       │
│ ▌▌     ( trou )═══════│→  canal, sortie à droite, à mi-hauteur
│ ▌▌      poisson       │
│         [ 4 × 7 = ? ] │
│  (24) (32) (28) (21) (35)  seaux de A
└───────────────────────┘  ← joueur A
```

- Trou : cercle de rayon `HOLE_RADIUS = 160` centré (360, MID_Y). Canal : largeur 56, du bord droit du trou au bord droit de l'écran.
- Eau : disque dont le rayon va de `WATER_R_MIN = 36` (niveau 0) à `HOLE_RADIUS − 22` (niveau 1, celui du canal). Cercle en pointillés blancs au rayon du niveau 1.
- Seaux : rayon 46, 5 par joueur à `BUCKET_INSET = 180` du bord du joueur, x = 80 + i × 140.
- Blocs de calcul : 250 × 76 ; A à droite au-dessus de ses seaux, B à gauche (tourné de 180°).

## 4. Tir

1. Un toucher appartient au joueur de la moitié d'écran où il commence ; un seul seau tenu par joueur.
2. Le seau saisi suit le doigt, à au plus `MAX_STRETCH = 150` px de sa place.
3. Visée : direction = opposée à la traction ; portée = `stretch / MAX_STRETCH × MAX_RANGE` (`MAX_RANGE = 760`). En dessous de `MIN_STRETCH = 24`, pas de tir (le seau revient). Aperçu : points dont la taille suit la hauteur de la cloche, viseur au point d'impact.
4. Au relâcher (tir valide) :
   - **bon seau** : il se vide, l'eau vole vers le point visé (durée `FLIGHT_MS = 500 + 0,5 × portée` ms). Dans le trou (distance au centre ≤ `HOLE_RADIUS`) → niveau `+ WATER_PER_BUCKET` et ondes ; sinon flaque « À côté ! ». À l'atterrissage, **nouveau calcul et 5 nouveaux seaux** pour ce joueur, avec éclat scintillant. Pendant le vol, ce joueur ne peut pas saisir de seau.
   - **mauvais seau** : il se vide sur place (flaque à ses pieds), reste vide et grisé ; le niveau ne change pas.

## 5. Eau, poisson, fin

- Niveau ∈ [`MIN_LEVEL = 0,12`, 1], départ `START_LEVEL = 0,2`. Infiltration continue `DRAIN_PER_SECOND = 0,018` ; plancher `MIN_LEVEL` (jamais à sec). `WATER_PER_BUCKET = 0,12`. Victoire quand le niveau atteint 1. Calibrage : 1 à 2 min pour une paire qui joue juste.
- Poisson : tourne dans l'eau ; s'agite (éclaboussures) sous `STRUGGLE_LEVEL = 0,4`. Jamais mort.
- Victoire : l'eau entre dans le canal, le poisson nage dans le canal jusqu'à sortir de l'écran (`ESCAPE_MS = 2200`), puis `VictoryScene` : « Le poisson est sauvé ! » à l'endroit et tourné, Rejouer / Quitter.

## 6. Structure

```
games/math-river/src/
├─ index.ts, mount.ts, standalone-entry.ts
├─ config/{dimensions,water,theme}.ts
├─ core/App.ts
├─ domain/                 # pur : ni Pixi
│  ├─ types.ts, touchRouting.ts, quiz.ts
│  ├─ aim.ts               # visée, portée, vol, test « dans le trou »
│  └─ water.ts             # niveau, remplissage, infiltration, victoire
├─ entities/{Beach,Pool,Fish,Bucket,CalcBlock,AimGuide,Splash,Burst}.ts
├─ services/Settings.ts
└─ scenes/{GameScene,SettingsScene,VictoryScene}.ts
```

## 7. Tests

Domaine (`aim`, `water`, `touchRouting`, `quiz`), `GameScene` (tir réussi / raté / mauvais seau, renouvellement, deux joueurs, plancher, victoire, Rejouer), `Settings`, `mount` (smoke, unmount, cycle, réglages), registre du shell.

## 8. Hors périmètre

Sons, mode solo, score, réglage de la vitesse d'infiltration.
