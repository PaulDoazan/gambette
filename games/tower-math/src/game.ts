import type { GameContext, GameInstance } from '@gambette/game-sdk';
import { createCalcsStore, openCalcsPicker, type Pair, type Question } from '@gambette/math-sdk';
import { createTowerEngine } from './engine';
import { createQuestionFeed, formatCalc, formatSolved } from './questionFeed';
import { loadRecord, saveRecord } from './record';
import { createScene } from './scene';
import { createOverlay, type GameOverReason } from './overlay';

export const GAME_KEY = 'tower-math';
const GAMEOVER_DELAY_MS = 900; // laisse voir la chute avant l'écran de fin

/**
 * Tour de calcul : moteur d'empilement/découpe porté de Tower Slice
 * (lehibou-games), quiz remplacé par un calcul + 5 résultats (math-sdk).
 * Cliquer le bon résultat découpe à la position courante du pavé (le timing
 * compte) et le calcul résolu tamponne le dessus du pavé posé ; un mauvais
 * résultat termine la partie. L'engrenage ouvre le sélecteur de calculs (jeu
 * en pause) puis relance une tour.
 */
export function mountTowerMath(el: HTMLElement, ctx: GameContext): GameInstance {
  const calcs = createCalcsStore(GAME_KEY);
  let pairs: Pair[] = calcs.load();
  let feed = createQuestionFeed(pairs);
  let record = loadRecord();

  const root = document.createElement('div');
  root.dataset.test = 'tower-root';
  root.style.cssText =
    'position:relative;width:100%;height:100%;overflow:hidden;background:#00274B;';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;display:block;width:100%;height:100%;';
  root.appendChild(canvas);
  el.appendChild(root);

  const engine = createTowerEngine();
  const scene = createScene(canvas);

  let raf = 0;
  let gameOverTimer = 0;
  let transitioning = false;
  let paused = false; // sélecteur de calculs ouvert : pavé figé, réponses ignorées
  let disposed = false;
  let question: Question | null = null;

  function nextQuiz(): void {
    question = feed.next();
    overlay.setCalc(formatCalc(question));
    overlay.setChoices(question.choices.map(String));
  }

  // Fige le record dès qu'il est battu : fin de partie, mais aussi changement de
  // calculs ou sortie en pleine partie (sinon le record affiché retomberait).
  function commitRecord(): void {
    if (engine.score <= record) return;
    record = engine.score;
    saveRecord(record);
  }

  function begin(): void {
    const { foundation, first } = engine.start();
    scene.reset(foundation, first);
    overlay.hideGameOver();
    overlay.setRecord(record);
    overlay.setScore(0);
    nextQuiz();
  }

  // Raté ou mauvais résultat : le pavé courant chute, puis onGameOver + écran rejouer.
  function endGame(reason: GameOverReason): void {
    scene.dropCurrent();
    gameOverTimer = window.setTimeout(() => {
      if (disposed) return;
      const score = engine.score;
      commitRecord();
      ctx.onGameOver?.({ score });
      overlay.showGameOver(score, reason);
      transitioning = false;
    }, GAMEOVER_DELAY_MS);
  }

  function onChoice(slot: number): void {
    if (disposed || paused || transitioning || engine.status !== 'playing' || !question) return;
    transitioning = true; // verrou : spawn du pavé suivant

    if (question.choices[slot] !== question.answer) {
      engine.fail(); // mauvais résultat → défaite : le pavé chute comme sur un raté
      overlay.markChoices(slot, question.choices.indexOf(question.answer));
      endGame({ title: 'Mauvaise réponse', detail: formatSolved(question) });
      return;
    }

    const result = engine.slice(scene.currentPositionOnAxis());
    if (result.type === 'missed') {
      endGame({ title: 'Raté ! Le bloc est tombé à côté.' });
      return;
    }

    scene.applyCut(result.cut);
    scene.texturePlacedFace(formatSolved(question)); // le calcul résolu tamponne la face de l'étage posé
    ctx.onScore?.(engine.score);
    overlay.setScore(engine.score);
    nextQuiz();
    transitioning = false;
  }

  function openSettings(): void {
    if (disposed || paused || transitioning) return;
    paused = true;
    // Démonté avant la résolution : la promesse reste sans effet (garde disposed).
    void openCalcsPicker({ initial: pairs, container: root }).then((next) => {
      if (disposed) return;
      pairs = next;
      calcs.save(pairs);
      feed = createQuestionFeed(pairs);
      paused = false;
      commitRecord();
      begin(); // nouvelle tour avec la nouvelle sélection
    });
  }

  const overlay = createOverlay(
    root,
    {
      onChoice,
      onReplay: (): void => {
        if (!disposed && engine.status === 'lost' && !transitioning) begin();
      },
      onSettings: openSettings,
      onExit: (): void => {
        if (!disposed) ctx.onExit();
      },
    },
    { record },
  );

  function onResize(): void {
    scene.resize(root.clientWidth || window.innerWidth, root.clientHeight || window.innerHeight);
  }

  function loop(): void {
    raf = requestAnimationFrame(loop);
    if (!paused) scene.tick();
  }

  window.addEventListener('resize', onResize);
  begin();
  loop();

  return {
    unmount(): void {
      disposed = true;
      commitRecord();
      cancelAnimationFrame(raf);
      window.clearTimeout(gameOverTimer);
      window.removeEventListener('resize', onResize);
      overlay.dispose();
      scene.dispose();
      root.remove(); // emporte aussi le sélecteur de calculs s'il est ouvert
    },
  };
}
