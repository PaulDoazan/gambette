# Passe-trappe — Calcul, réglages et gros palets

**Date** : 2026-10-04
**Statut** : Design validé (brainstorming) — à décliner en plan d'implémentation.
**Contexte** : évolution de `games/passe-trappe` (spec `2026-10-04-passe-trappe-design.md`, branche `feat/passe-trappe`).

## 1. Objectif

Faire du passe-trappe un jeu de calcul : chaque camp a un calcul (ex. `6 × 8`), chaque palet porte un résultat, et **seul le palet portant le bon résultat peut être lancé avec l'élastique**. Ajouter des réglages de partie (nombre de palets, calculs travaillés) et améliorer le rendu (palets 2 × plus gros, élastique en contact avec le bord du palet).

### Critères de succès

- Un adulte ouvre l'engrenage, choisit 5 à 10 palets par joueur et les calculs ; le réglage persiste entre deux sessions.
- Chaque camp affiche son calcul, lisible par son joueur ; dans chaque camp non vide, exactement un palet porte la bonne réponse, les autres des réponses proches et toutes différentes.
- Le bon palet part avec l'élastique ; un mauvais palet vibre et n'avance que de quelques centimètres.
- Dès qu'un palet franchit la ligne médiane, les deux calculs changent et tous les palets sont ré-étiquetés.
- Toute la chaîne (lint, typecheck, test, build, format:check) reste verte.

## 2. Décisions

| Sujet                 | Décision                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| Réglages              | Engrenage dans le jeu → panneau (palets 5–10, « Choisir les calculs »), comme rabbit-math                     |
| Calculs               | **Un calcul différent par camp** ; les deux changent à chaque passage                                         |
| Bonnes réponses       | **Exactement une** par camp non vide                                                                          |
| Mauvaises réponses    | `generateDistractors(réponse, 'medium', n − 1, rng)` du `math-sdk` (écart 3 à 9, valeurs distinctes)          |
| Source des calculs    | `createCalcsStore('passe-trappe')` (défaut : 10 multiplications aléatoires) + `openCalcsPicker` du `math-sdk` |
| Taille des palets     | Rayon **56 px** (× 2) ; trou = 1,6 × diamètre                                                                 |
| Contact élastique     | Sur le **bord** du palet (cercle extérieur), plus sur son centre                                              |
| Mauvais palet relâché | Vibration visuelle 400 ms + petite poussée physique ≤ **120 px/s**                                            |

## 3. Taille, élastique, nombre de palets

- `PUCK_RADIUS = 56` ; `GAP_WIDTH = round(1,6 × 2 × 56) = 179`.
- **Nombre de palets par joueur** `pucksPerPlayer ∈ [5, 10]`, défaut 5, passé à la scène (remplace la constante `PUCKS_PER_PLAYER`).
- **Disposition initiale** : jusqu'à 5 palets → une rangée centrée à mi-chemin entre la cloison et l'élastique ; au-delà → deux rangées (la première de `ceil(n/2)`, la seconde de `floor(n/2)` décalée en quinconce), espacement vertical ≥ 2 × rayon + 8 px, toutes dans le camp et devant l'élastique.
- **Élastique sur le bord** :
  - étirement = `(bord du palet côté joueur) − ligne` : pour A `puck.y + R − line.y`, pour B `line.y − (puck.y − R)` ; borné à `[0, MAX_STRETCH]` ;
  - le V est dessiné jusqu'au point du bord du palet côté joueur (`(x, y + R)` pour A, `(x, y − R)` pour B), seulement si l'étirement > 0 ;
  - direction du lancer : bissectrice calculée depuis ce point de contact ;
  - le palet tenu est borné à `line.y + MAX_STRETCH − R` (A) / `line.y − MAX_STRETCH + R` (B) ; la borne « moitié arrière du camp » est conservée.
- La barrière physique de l'élastique (palets libres) reste une arête à `line.y` : un palet libre s'arrête quand son bord touche l'élastique.

## 4. Calcul et étiquetage

### Calculs par camp

- Un calcul (`Pair` du `math-sdk`) par camp, tiré au hasard parmi les calculs choisis ; on évite de reprendre le calcul précédent du même camp quand il en existe d'autres.
- **Bloc de calcul** affiché en haut à droite du camp **du point de vue de son joueur**, juste sous la ligne médiane : pour A, à droite de l'écran sous la cloison ; pour B, tourné à 180°, donc à gauche de l'écran au-dessus de la cloison. Texte `a × b = ?` (symbole selon l'opération : ×, +, −). Les blocs ne chevauchent ni l'engrenage, ni le bouton quitter du SDK, ni le trou.

### Étiquettes des palets

- Chaque palet affiche un nombre au centre, orienté vers le joueur du camp où il se trouve (rotation 0 en A, π en B), mis à jour quand il change de camp.
- Dans chaque camp non vide de `n` palets : une bonne réponse (`computeAnswer(pair)`) sur un palet choisi au hasard, et `n − 1` mauvaises réponses distinctes via `generateDistractors(réponse, 'medium', n − 1, rng)`. Toutes les valeurs d'un camp sont distinctes.
- **Renouvellement** : quand un palet change de camp (passage de la ligne médiane), les **deux** calculs sont re-tirés et **tous** les palets ré-étiquetés selon leur camp courant (le palet qui vient de passer compte dans son nouveau camp). Deux renouvellements successifs sont séparés d'au moins **300 ms** (un palet qui oscille sur la ligne ne provoque qu'un renouvellement).

### Lancer

- **Bon palet** (porte la bonne réponse de son camp au relâcher) : lancer à l'élastique inchangé.
- **Mauvais palet** : saisie et glisser autorisés ; au relâcher, pas d'impulsion élastique. Le palet :
  - **vibre** 400 ms (oscillation de la vue Pixi autour de sa position, sans effet physique) ;
  - reçoit une poussée physique dans la direction qu'aurait eue le lancer, de norme ≤ **120 px/s** (`WRONG_LAUNCH_SPEED`), puis freine normalement.
- Relâcher sans tension : le plafond existant `DROP_MAX_SPEED` (300 px/s) s'applique à tout palet.
- Pendant la vibration, le palet reste saisissable.

## 5. Réglages

- **Engrenage** dessiné dans le canvas sur le segment gauche de la cloison, sans chevaucher le bouton quitter du SDK (placé à gauche, au niveau de la cloison).
- **Panneau** (scène Pixi, orientée joueur du bas) : titre « Réglages » ; « Palets par joueur » avec boutons − / + (5 à 10) ; bouton « Choisir les calculs » → `openCalcsPicker({ initial, container: el })` ; bouton « Fermer ».
- Ouverture du panneau → partie en pause (pas de tick physique, entrées de jeu ignorées, bouton quitter du SDK masqué). Fermeture → si `pucksPerPlayer` ou la sélection de calculs a changé, la scène de jeu est recréée (nouvelle partie) ; sinon reprise à l'identique.
- **Persistance** : calculs via `createCalcsStore('passe-trappe')` ; `pucksPerPlayer` sous `gambette.passe-trappe.settings` (`{ pucksPerPlayer }`), valeur bornée à [5, 10], donnée invalide ou stockage indisponible → défaut 5, sans erreur.
- `math-sdk` devient une dépendance de `@gambette/game-passe-trappe`.

## 6. Structure

| Fichier                                  | Rôle                                                                                         |
| ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/domain/quiz.ts` (nouveau, pur)      | `pickCalc(pairs, previous, rng)`, `labelCamp(pair, count, rng)` → `{ correctIndex, values }` |
| `src/domain/crossings.ts` (nouveau, pur) | détecteur de changement de camp avec délai minimal de 300 ms                                 |
| `src/services/Settings.ts` (nouveau)     | `loadSettings` / `saveSettings` (`pucksPerPlayer` + calculs)                                 |
| `src/entities/CalcBlock.ts` (nouveau)    | bloc de calcul orienté par joueur                                                            |
| `src/entities/GearButton.ts` (nouveau)   | engrenage Pixi                                                                               |
| `src/scenes/SettingsScene.ts` (nouveau)  | panneau de réglages                                                                          |
| `src/entities/Puck.ts`                   | valeur affichée + orientation ; vibration                                                    |
| `src/domain/elastic.ts`, `rules.ts`      | contact sur le bord, bornes du palet tenu                                                    |
| `src/input/DragController.ts`            | lancer refusé pour un mauvais palet (`canLaunch(puck)`)                                      |
| `src/scenes/GameScene.ts`                | `pucksPerPlayer`, calculs, étiquetage, renouvellement                                        |
| `src/mount.ts`                           | engrenage, pause, recréation de scène                                                        |
| `src/config/dimensions.ts`, `physics.ts` | rayon 56, `WRONG_LAUNCH_SPEED`, positions des blocs et de l'engrenage                        |

## 7. Tests

| Cible             | Tests                                                                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quiz`            | une seule bonne réponse ; valeurs distinctes ; mauvaises réponses à ≤ 9 de la bonne (hors élargissement) ; camp de 1 palet → bonne réponse ; 0 → rien ; déterminisme avec rng ; `pickCalc` évite le précédent |
| `crossings`       | changement de camp → renouvellement ; oscillation < 300 ms → un seul ; deux passages espacés → deux                                                                                                           |
| `elastic`/`rules` | étirement mesuré depuis le bord (A et B) ; non tendu tant que le bord n'a pas passé la ligne ; bornes du palet tenu                                                                                           |
| `DragController`  | mauvais palet tendu puis relâché → vitesse ≤ `WRONG_LAUNCH_SPEED` ; bon palet → lancer normal (vitesse ≫ 120 px/s)                                                                                            |
| `GameScene`       | `pucksPerPlayer` 5 et 10 respectés ; une bonne réponse par camp au départ ; après un passage : calculs changés, une bonne réponse par camp, valeurs distinctes                                                |
| `Settings`        | aller-retour ; borne [5, 10] ; donnée corrompue → défaut ; stockage qui lève → défaut                                                                                                                         |
| `mount`           | panneau → pause (tick et entrées bloqués, bouton quitter masqué) ; fermeture sans changement → reprise ; avec changement → nouvelle scène                                                                     |

## 8. Hors périmètre

Réglage de la difficulté des mauvaises réponses (fixée à `medium`), score ou nombre de bonnes réponses, sons, aide visuelle sur le bon palet, panneau de réglages orienté pour le joueur du haut.
