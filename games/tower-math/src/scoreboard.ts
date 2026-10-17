export interface Scoreboard {
  /** Score courant ; le record affiché suit `max(record, score)` en direct. */
  setScore(n: number): void;
  setRecord(n: number): void;
  dispose(): void;
}

/**
 * Pastille Score + Record ancrée en bas à gauche (portée du scoreboard de
 * lehibou-games). Le record affiché vaut toujours `max(record, score)`.
 */
export function createScoreboard(parent: HTMLElement, opts: { record?: number } = {}): Scoreboard {
  let record = opts.record ?? 0;
  let score = 0;

  const box = document.createElement('div');
  box.style.cssText =
    'position:absolute;bottom:16px;left:16px;z-index:5;' +
    'display:flex;flex-direction:column;gap:2px;' +
    'color:#fff;background:rgba(0,39,75,0.7);padding:8px 20px;border-radius:20px;';

  const scoreLine = document.createElement('div');
  scoreLine.dataset.test = 'tower-score';
  scoreLine.style.cssText = 'font:700 20px system-ui,sans-serif;line-height:1.1;';

  const recordLine = document.createElement('div');
  recordLine.dataset.test = 'tower-record';
  recordLine.style.cssText = 'font:600 13px system-ui,sans-serif;opacity:0.85;';

  box.append(scoreLine, recordLine);
  parent.appendChild(box);

  const render = (): void => {
    scoreLine.textContent = `Score : ${score}`;
    recordLine.textContent = `Record : ${Math.max(record, score)}`;
  };
  render();

  return {
    setScore(n: number): void {
      score = n;
      render();
    },
    setRecord(n: number): void {
      record = n;
      render();
    },
    dispose(): void {
      box.remove();
    },
  };
}
