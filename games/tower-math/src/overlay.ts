import { createExitButton } from '@gambette/game-sdk';
import { CHOICES_COUNT } from './questionFeed';
import { createScoreboard } from './scoreboard';

export interface TowerOverlay {
  setScore(n: number): void; // pastille Score+Record bas-gauche
  setRecord(n: number): void;
  setCalc(text: string): void; // calcul à résoudre, au-dessus des boutons
  setChoices(labels: readonly string[]): void; // 5 boutons haut-droite (efface le marquage)
  markChoices(wrongSlot: number, rightSlot: number): void; // mauvais résultat : rouge / vert
  showGameOver(score: number, reason: GameOverReason): void;
  hideGameOver(): void;
  dispose(): void;
}

/** Pourquoi la partie s'arrête, affiché au-dessus du score. */
export interface GameOverReason {
  title: string; // « Mauvaise réponse » / « Raté ! »
  detail?: string; // correction : « 6 × 7 = 42 »
}

export interface OverlayHandlers {
  onChoice(slot: number): void; // slot 0..4
  onReplay(): void;
  onSettings(): void; // engrenage : choix des calculs
  onExit(): void; // bouton quitter (tout en haut)
}

export interface OverlayOptions {
  record?: number;
}

export function createOverlay(
  parent: HTMLElement,
  handlers: OverlayHandlers,
  options: OverlayOptions = {},
): TowerOverlay {
  // Bouton quitter avec confirmation + plein écran sur tout appareil : SDK.
  const exitButton = createExitButton(parent, () => handlers.onExit(), { fullscreen: 'always' });
  const scoreboard = createScoreboard(parent, { record: options.record ?? 0 });

  // Engrenage en haut à gauche : ouvre le sélecteur de calculs.
  const settings = document.createElement('button');
  settings.dataset.test = 'tower-settings';
  settings.type = 'button';
  settings.textContent = '⚙';
  settings.setAttribute('aria-label', 'Choisir les calculs');
  settings.title = 'Choisir les calculs';
  settings.style.cssText =
    'position:absolute;top:12px;left:16px;z-index:6;width:40px;height:40px;padding:0;' +
    'border:1px solid rgba(255,255,255,0.4);border-radius:999px;cursor:pointer;' +
    'font:400 22px system-ui,sans-serif;background:rgba(255,255,255,0.12);color:#fff;';
  settings.addEventListener('click', () => handlers.onSettings());

  // Panneau quiz (bord droit, toute la hauteur) : le calcul en haut, puis les
  // 5 résultats centrés verticalement dans la hauteur restante.
  const quizPanel = document.createElement('div');
  quizPanel.dataset.test = 'tower-quiz';
  quizPanel.style.cssText =
    'position:absolute;top:16px;bottom:16px;right:16px;z-index:5;display:flex;' +
    'flex-direction:column;gap:6px;align-items:stretch;width:min(220px,40vw);' +
    'pointer-events:none;';

  const calc = document.createElement('div');
  calc.dataset.test = 'tower-calc';
  calc.style.cssText =
    'padding:10px 8px;border-radius:12px;text-align:center;' +
    'font:800 30px system-ui,sans-serif;color:#fff;' +
    'background:rgba(255,255,255,0.12);border:2px solid rgba(255,255,255,0.5);' +
    'pointer-events:auto;';

  const choices = document.createElement('div');
  choices.dataset.test = 'tower-choices';
  choices.style.cssText =
    'flex-grow:1;display:flex;flex-direction:column;justify-content:center;' +
    'align-items:center;gap:clamp(6px,3.5vh,24px);min-height:0;';

  // Boutons étroits et hauts (hauteur et espacement suivent l'écran) : les 5
  // tiennent en paysage sur téléphone (~360 px de haut).
  const CHOICE_CSS =
    'width:min(130px,70%);height:clamp(32px,10vh,64px);padding:0 12px;flex-shrink:0;' +
    'border:none;border-radius:10px;cursor:pointer;pointer-events:auto;' +
    'font:700 20px system-ui,sans-serif;background:rgba(255,255,255,0.92);color:#1a1a2e;' +
    'transition:background-color 120ms,color 120ms;';
  const buttons: HTMLButtonElement[] = [];
  for (let slot = 0; slot < CHOICES_COUNT; slot++) {
    const btn = document.createElement('button');
    btn.dataset.test = 'tower-choice';
    btn.type = 'button';
    btn.style.cssText = CHOICE_CSS;
    // Réponse dès l'appui (souris ou doigt) : le timing du pavé compte, attendre
    // le relâcher du clic le décalerait. Le clic qui suit est ignoré ; seul le
    // clic clavier (Entrée/Espace, detail 0) répond encore par 'click'.
    btn.addEventListener('pointerdown', (e) => {
      if (e.button === 0) handlers.onChoice(slot);
    });
    btn.addEventListener('click', (e) => {
      if (e.detail === 0) handlers.onChoice(slot);
    });
    buttons.push(btn);
  }
  choices.append(...buttons);
  quizPanel.append(calc, choices);

  const gameOver = document.createElement('div');
  gameOver.dataset.test = 'tower-replay';
  gameOver.style.cssText =
    'position:absolute;inset:0;z-index:10;display:none;flex-direction:column;' +
    'align-items:center;justify-content:center;gap:16px;background:rgba(10,10,26,0.85);' +
    'color:#fff;font-family:system-ui,sans-serif;text-align:center;';
  const reasonTitle = document.createElement('div');
  reasonTitle.dataset.test = 'tower-gameover-reason';
  reasonTitle.style.cssText = 'font-size:1.6rem;font-weight:800;color:#FF7D6D;';
  const reasonDetail = document.createElement('div');
  reasonDetail.dataset.test = 'tower-gameover-correction';
  reasonDetail.style.cssText = 'font-size:1.3rem;font-weight:700;color:#4ADE80;';
  const finalScore = document.createElement('div');
  finalScore.style.cssText = 'font-size:2rem;font-weight:700;';
  const replayBtn = document.createElement('button');
  replayBtn.dataset.test = 'tower-replay-btn';
  replayBtn.type = 'button';
  replayBtn.textContent = 'Rejouer';
  replayBtn.style.cssText =
    'padding:12px 32px;border:none;border-radius:8px;cursor:pointer;' +
    'font:700 18px system-ui,sans-serif;background:#fff;color:#1a1a2e;';
  replayBtn.addEventListener('click', () => handlers.onReplay());
  gameOver.append(reasonTitle, reasonDetail, finalScore, replayBtn);

  // Portrait mobile : on bloque le jeu et on demande le mode paysage.
  const rotate = document.createElement('div');
  rotate.dataset.test = 'tower-rotate';
  rotate.style.cssText =
    'position:absolute;inset:0;z-index:20;display:none;flex-direction:column;' +
    'align-items:center;justify-content:center;gap:12px;padding:24px;background:#00274B;' +
    'color:#fff;font:600 18px system-ui,sans-serif;text-align:center;';
  rotate.innerHTML = '<div style="font-size:3rem">📱↻</div>';
  const rotateText = document.createElement('div');
  rotateText.textContent = 'Tourne ton téléphone en horizontal pour jouer.';
  rotate.appendChild(rotateText);

  const portraitQuery =
    typeof window.matchMedia === 'function' ? window.matchMedia('(orientation: portrait)') : null;
  const syncOrientation = (): void => {
    rotate.style.display = portraitQuery?.matches ? 'flex' : 'none';
  };
  portraitQuery?.addEventListener('change', syncOrientation);
  syncOrientation();

  parent.append(settings, quizPanel, gameOver, rotate);

  return {
    setScore: (n) => scoreboard.setScore(n),
    setRecord: (n) => scoreboard.setRecord(n),
    setCalc(text: string): void {
      calc.textContent = text;
    },
    setChoices(labels: readonly string[]): void {
      buttons.forEach((btn, i) => {
        btn.textContent = labels[i] ?? '';
        delete btn.dataset.state;
        btn.style.cssText = CHOICE_CSS;
      });
    },
    markChoices(wrongSlot: number, rightSlot: number): void {
      const wrongBtn = buttons[wrongSlot];
      const rightBtn = buttons[rightSlot];
      if (rightBtn) {
        rightBtn.dataset.state = 'right';
        rightBtn.style.background = '#22C55E';
        rightBtn.style.color = '#fff';
      }
      if (wrongBtn) {
        wrongBtn.dataset.state = 'wrong';
        wrongBtn.style.background = '#E5484D';
        wrongBtn.style.color = '#fff';
        // Secousse (absente de jsdom : animate optionnel).
        wrongBtn.animate?.(
          [0, -8, 8, -6, 6, -3, 0].map((x) => ({ transform: `translateX(${x}px)` })),
          { duration: 360, easing: 'ease-out' },
        );
      }
    },
    showGameOver(scoreValue: number, reason: GameOverReason): void {
      reasonTitle.textContent = reason.title;
      reasonDetail.textContent = reason.detail ?? '';
      reasonDetail.style.display = reason.detail ? '' : 'none';
      finalScore.textContent = `Score : ${scoreValue}`;
      gameOver.style.display = 'flex';
    },
    hideGameOver(): void {
      gameOver.style.display = 'none';
    },
    dispose(): void {
      portraitQuery?.removeEventListener('change', syncOrientation);
      exitButton.dispose();
      scoreboard.dispose();
      settings.remove();
      quizPanel.remove();
      gameOver.remove();
      rotate.remove();
    },
  };
}
