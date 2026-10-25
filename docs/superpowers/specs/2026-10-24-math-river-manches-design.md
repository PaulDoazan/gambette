# Math River — trois manches jusqu'à la mer

Complète `2026-10-24-math-river-design.md` (le jeu à un trou, déjà en ligne). Tout ce que ce
document ne change pas reste tel quel : tir en cloche, 5 seaux par joueur avec un seul bon, calcul
propre à chacun, renouvellement avec scintillement, eau qui s'infiltre sans jamais assécher le
trou, pas de défaite.

## Intention

Aujourd'hui, la partie s'arrête dès que le poisson quitte le premier trou. On veut une petite
histoire en trois étapes : le poisson passe de trou en trou, toujours plus grands, jusqu'à
rejoindre la mer. Chaque étape est une manche, un peu plus longue que la précédente. Les deux
joueurs vivent un voyage, au lieu de remplir un seul trou.

## Déroulé (décidé avec Paul)

1. **Manche 1** : le trou actuel, avec son canal qui part à droite.
2. **Fin de manche** : l'eau atteint le canal et le poisson s'y engage. Au même moment, les seaux,
   les deux panneaux de calcul et le bandeau de gauche (Quitter, plein écran, engrenage)
   disparaissent.
3. **Transition** : l'écran glisse vers la droite en suivant le poisson le long du canal. Le
   poisson arrive dans un **nouveau trou, un peu plus grand**. Ce trou est relié par un canal à
   gauche (celui d'où vient le poisson) et par un autre à droite (la suite).
4. **Manche 2** : l'interface revient en entier (seaux, calculs, bandeau) et on rejoue.
5. Même fin de manche et même transition vers un **3ᵉ trou, encore plus grand**. Sur le côté
   droit de cet écran, on voit **la mer, avec quelques vagues**. Son canal de droite mène à la
   mer.
6. **Fin de la manche 3** : le poisson rejoint la mer, et la partie est terminée.

**Chaque manche est plus longue que la précédente** : un trou plus grand demande plus de bons
seaux pour être rempli.

## Objectifs

- Trois manches enchaînées, avec des trous de taille croissante et une durée croissante.
- Une transition lisible : l'interface s'efface, la caméra suit le poisson, l'interface revient.
- Les canaux forment un seul cours d'eau continu d'un écran à l'autre : le canal de droite d'un
  trou est le même que le canal de gauche du suivant.
- La mer, visible et animée dans la manche 3, comme destination.

## Non-objectifs

- Pas de choix du nombre de manches et pas de sauvegarde de la progression : une partie fait
  toujours trois manches, depuis la manche 1.
- Pas de nouvelle mécanique de tir ou de calcul.
- Pas de défaite, ni de chrono affiché.

## À éviter absolument

- Un tir ou un doigt encore posé qui « fuit » dans la transition : un seau qui part pendant que
  l'écran glisse, ou un toucher qui atteint le jeu pendant ce temps.
- Une cassure visible dans le canal, au raccord d'un écran à l'autre.
- Un bandeau Quitter qui reste visible, ou qui réapparaît trop tôt, pendant la transition.

## Contraintes

- Même pile qu'aujourd'hui : Pixi 8, dessin en `Graphics` uniquement, pas d'images.
- Plateau de largeur 720 et de hauteur variable (1280 à 1800, via `configureBoard`). Le plus grand
  trou ne doit chevaucher ni les seaux ni les panneaux de calcul, y compris sur le plateau le moins
  haut (1280).
- Écran portrait, deux joueurs face à face : A en bas, B en haut, tourné de 180°.
- Les tests restent en Vitest et jsdom, sans canvas.

## Le comment (mes choix, à vérifier par Paul)

- **Un monde de trois écrans côte à côte.** Le trou k (k = 0, 1, 2) est au centre de l'écran k,
  donc en x = 720·k + 360, à mi-hauteur. La caméra est un simple décalage horizontal du monde. Les
  seaux, les panneaux de calcul et les visées restent fixes à l'écran, hors du monde.
- **Rayons des trous** : 160, 190 et 220 px. Le niveau de l'eau garde la même échelle (0 = fond,
  1 = canal), avec un rayon d'eau proportionnel au trou.
- **Durée (revue par Paul le 25/10)** : la version à 1 min / 1 min 30 / 2 min était beaucoup trop
  longue. On reprend le réglage du jeu à un trou : infiltration de 0,018 par seconde à chaque
  manche, et 0,12 par bon seau dans le premier trou. Les joueurs doivent aller assez vite pour
  remplir le trou. Les trous 2 et 3 reçoivent un peu moins par seau (0,105 puis 0,095), pour que
  chaque manche reste un peu plus longue : environ 36 s, 47 s et 58 s pour une paire qui réussit un
  bon seau toutes les 6 s chacun. Une paire trop lente voit l'eau redescendre, sans jamais passer
  sous le plancher.
- **Canal entre deux trous** : une seule courbe en S, du bord droit du trou k au bord gauche du
  trou k+1. Elle passe à mi-hauteur à la frontière des deux écrans et y est horizontale, pour que
  chaque écran, vu seul, montre un canal qui sort proprement du cadre. On part de `main` : le
  prolongement en biais de la branche `PaulDoazan/math-river-canal-edge` (commit `c799ba7`, non
  poussé) est abandonné.
- **Eau des canaux** (mon choix) : le canal par lequel le poisson est arrivé se vide pendant la
  transition. Au début de la manche suivante, il est dessiné vide, en sable mouillé. Seul le canal
  de sortie se remplit, en fin de manche.
- **Bandeau de gauche** (mon choix) : il reste où il est et recouvre l'arrivée du canal de gauche
  dans les manches 2 et 3. Le poisson est déjà dans le trou quand le bandeau réapparaît.
- **Mer** : une bande d'eau en bord droit de l'écran 3, avec un rivage ondulé et des lignes
  d'écume qui vont et viennent. Le canal du trou 3 s'y jette.
- **Enchaînement d'une fin de manche** :
  1. On relâche tous les seaux, sans tir.
  2. L'eau encore en vol tombe normalement, mais ne compte plus.
  3. L'interface s'efface en ≈ 300 ms, et les flaques disparaissent (ce point est ma supposition).
  4. La caméra suit le poisson en ≈ 2,5 s.
  5. Dans le nouveau trou, l'eau repart du niveau de départ (0,2).
  6. De nouveaux calculs sont tirés, puis l'interface réapparaît en ≈ 300 ms.

  Tant que l'interface n'est pas entièrement revenue, les touchers sont ignorés.

- **Fin de partie** : à la manche 3, le poisson nage du canal jusque dans la mer. Ensuite, l'écran
  de victoire actuel s'affiche (« Le poisson est sauvé ! »). Ce point est ma supposition.
  « Rejouer » ramène la caméra et l'eau à la manche 1.
- **Changer les réglages** en cours de partie relance aussi la partie à la manche 1, comme
  aujourd'hui.
- **Côté code** :
  - La scène de jeu gère le numéro de manche et la caméra.
  - Elle prévient le montage quand l'interface doit disparaître ou revenir, avec un rappel du type
    `onUiHidden(hidden)`. Le bandeau DOM vit dans le montage.
  - Le trou, le décor et l'eau deviennent paramétrables par leur centre et leur rayon.
  - Le canal devient une fonction du tronçon qu'il relie.

## Laissé au constructeur

- La place des coquillages, de la pelle et du râteau sur les écrans 2 et 3. Ce sont des variantes
  du décor actuel, en évitant les zones des seaux et des calculs.
- Les courbes d'animation exactes : fondu de l'interface, vitesse de la caméra, nage du poisson.
- Le dessin précis de la mer et des vagues, dans le style actuel (traits marron foncé, couleurs
  pleines).
- Le découpage en fichiers et la stratégie de tests, en suivant les habitudes du dépôt.
