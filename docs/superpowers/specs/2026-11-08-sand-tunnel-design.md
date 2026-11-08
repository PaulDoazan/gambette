# Sand Tunnel — Spec de design

**Date** : 2026-11-08
**Statut** : design validé avec Paul en conversation (maquette « réseau libre » retenue).
**Contexte** : 5e jeu Gambette. Reprend le décor de sable, la mare, le poisson et les effets d'eau
de Math River, mais inverse le principe des autres jeux : on donne le résultat, l'enfant retrouve
le calcul.

## Intention

Un enfant, seul, voit un résultat (« = 42 »). Sous ce panneau, un petit réseau de 9 éléments
(6 nombres et 3 opérateurs) est posé dans le sable comme des galets. Il part de la mare du
poisson et glisse le doigt : nombre, opérateur, nombre. Le sable se creuse sous son doigt et
forme une galerie. Quand il lève le doigt :

- **bon calcul** : l'eau de la mare s'engouffre dans la galerie (belle animation de liquide),
  rejoint la sortie, puis le poisson emprunte le chemin. L'écran glisse vers un autre réseau,
  comme la transition entre deux manches de Math River ;
- **mauvais calcul** : l'eau avance jusqu'à l'élément fautif, puis le sable s'effondre sur les
  éléments incorrects. On voit que l'eau ne peut pas passer. La galerie se rebouche et l'enfant
  recommence sur le même réseau, sans pénalité.

Trois réseaux, puis le poisson rejoint la mer : victoire.

## Décidé avec Paul

- Jeu **solo**.
- Ordre du geste : **nombre → opérateur → nombre**, en partant de la mare.
- Vérification **au lever du doigt**.
- Réseau **libre** (maquette B) : des galets éparpillés reliés par quelques sillons, pas une grille
  parfaite.
- **Un seul chemin correct** par réseau ; une mauvaise option ne coupe jamais le bon chemin.
- Après une erreur, on recommence le même réseau, **sans défaite**.
- **3 réseaux**, puis la mer.
- Animation de liquide soignée quand le chemin est bon ; animation de sable sur les éléments
  incorrects.

## Non-objectifs

Sons, score, chrono, mode deux joueurs, choix du nombre de réseaux.

## Le comment (mes choix)

- Paquet `games/sand-tunnel` (`@gambette/game-sand-tunnel`), clé `sand-tunnel`, nom « Sand
  Tunnel », port Vite 5105. Pixi 8, dessin en `Graphics`, pas d'images. Mêmes conventions que
  Math River, dont on reprend (copie, comme les autres jeux entre eux) le poisson, les effets
  d'eau, le sable qui s'étale, la mer et le décor.
- **Plateau** : 720 de large, hauteur 1280 à 1800 (`configureBoard`). Monde de trois écrans côte à
  côte ; la caméra glisse vers la droite en suivant le poisson.
- **Disposition alternée** : sur les écrans pairs, la mare est en bas à gauche et la sortie en haut
  à droite ; sur l'écran impair, c'est l'inverse. La sortie d'un écran et la mare du suivant sont
  à la même hauteur : un canal droit les relie à travers la frontière des écrans. La sortie du
  dernier écran se jette dans la mer, au bord droit.
- **Interface fixe** : panneau du résultat en haut au centre ; bandeau navy des boutons
  (Quitter, plein écran, engrenage) au bord gauche, au milieu, comme Math River.
- **Réseau** (domaine pur, testé) : 3 nombres de départ (reliés à la mare), 3 opérateurs (+, −, ×,
  toujours les trois), 3 nombres d'arrivée (reliés à la sortie). Chaque départ est relié à 2
  opérateurs et chaque opérateur à 2 arrivées. Le calcul correct est tiré dans la sélection des
  réglages, les autres nombres sont des leurres proches. Le générateur recommence tant que plus
  d'un chemin donne le résultat. Placement : trois bandes le long de la diagonale mare → sortie,
  avec un décalage aléatoire, puis une vérification qu'aucun sillon ne passe sur un autre galet
  et que les galets ne se touchent pas.
- **Geste** : on commence dans la mare (ou directement sur un nombre de départ). Le doigt n'ajoute
  un élément que s'il est relié au dernier par un sillon ; revenir sur l'élément précédent annule
  le dernier. Un seul doigt à la fois. Lever le doigt avant le 3e élément rebouche la galerie.
- **Réglages** : engrenage → choix des calculs (`createCalcsStore('sand-tunnel')`). Changer les
  calculs relance la partie.
- **Victoire** : « Le poisson a rejoint la mer ! », Rejouer / Quitter.
- **Site** : ajouté au registre, avec vignette et tutoriel en 3 captures du vrai jeu.

## Laissé au constructeur

Courbes d'animation, dessin exact des galets, de l'écume et des grains de sable, découpage en
fichiers.
