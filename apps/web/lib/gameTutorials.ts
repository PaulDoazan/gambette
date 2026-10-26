// Petit tutoriel de l'écran d'accueil d'un jeu : quelques captures du vrai jeu, chacune avec un
// court texte sur le gameplay. Habillage du site, par clé de jeu, sans toucher au SDK.
import mathRiver1 from '../assets/tutorials/math-river/1.webp';
import mathRiver2 from '../assets/tutorials/math-river/2.webp';
import mathRiver3 from '../assets/tutorials/math-river/3.webp';
import passeTrappe1 from '../assets/tutorials/passe-trappe/1.webp';
import passeTrappe2 from '../assets/tutorials/passe-trappe/2.webp';
import passeTrappe3 from '../assets/tutorials/passe-trappe/3.webp';
import rabbitMath1 from '../assets/tutorials/rabbit-math/1.webp';
import rabbitMath2 from '../assets/tutorials/rabbit-math/2.webp';
import rabbitMath3 from '../assets/tutorials/rabbit-math/3.webp';
import towerMath1 from '../assets/tutorials/tower-math/1.webp';
import towerMath2 from '../assets/tutorials/tower-math/2.webp';
import towerMath3 from '../assets/tutorials/tower-math/3.webp';

export interface TutorialStep {
  /** Capture du jeu (URL). */
  image: string;
  text: string;
}

const BY_KEY: Record<string, readonly TutorialStep[]> = {
  'rabbit-math': [
    {
      image: rabbitMath1,
      text: 'Lis le calcul en haut, puis cherche le lapin qui porte le résultat.',
    },
    {
      image: rabbitMath2,
      text: 'Tire sur l’élastique pour viser : les pointillés montrent où ira la carotte.',
    },
    {
      image: rabbitMath3,
      text: 'Touché ! Le lapin attrape sa carotte, et un nouveau calcul arrive.',
    },
  ],
  'passe-trappe': [
    {
      image: passeTrappe1,
      text: 'Posez le téléphone entre vous : chacun a son camp, ses palets et son calcul.',
    },
    {
      image: passeTrappe2,
      text: 'Plaque le palet de la bonne réponse contre ton élastique, tire, puis relâche.',
    },
    {
      image: passeTrappe3,
      text: 'Fais-le passer par le trou : le premier qui n’a plus de palets dans son camp gagne !',
    },
  ],
  'tower-math': [
    {
      image: towerMath1,
      text: 'Un bloc glisse au-dessus de la tour, avec un calcul et cinq réponses.',
    },
    {
      image: towerMath2,
      text: 'Touche la bonne réponse quand le bloc est bien au-dessus de la tour : il se pose.',
    },
    {
      image: towerMath3,
      text: 'Chaque bloc garde son calcul. Monte le plus haut possible : une erreur termine la partie !',
    },
  ],
  'math-river': [
    {
      image: mathRiver1,
      text: 'Posez le téléphone entre vous : chacun a son calcul et cinq seaux, un seul est le bon.',
    },
    {
      image: mathRiver2,
      text: 'Tire le bon seau vers toi, vise le trou et relâche. Un mauvais seau lance du sable, qui fait baisser l’eau !',
    },
    {
      image: mathRiver3,
      text: 'Remplissez le trou avant que l’eau s’infiltre : le poisson file de trou en trou, jusqu’à la mer !',
    },
  ],
};

export function gameTutorial(key: string): readonly TutorialStep[] {
  return BY_KEY[key] ?? [];
}
