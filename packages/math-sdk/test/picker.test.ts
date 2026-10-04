import { describe, it, expect, afterEach } from 'vitest';
import { openCalcsPicker } from '../src/picker';
import type { Pair } from '../src/domain/calcs';

const INITIAL: Pair[] = [{ a: 7, b: 8, op: 'mul' }];
const box = (root: ParentNode, a: number, b: number, op: string) =>
  root.querySelector<HTMLInputElement>(
    `input[data-a="${a}"][data-b="${b}"][data-op="${op}"]:not([data-random])`,
  )!;
const check = (cb: HTMLInputElement, on: boolean) => {
  cb.checked = on;
  cb.dispatchEvent(new Event('change', { bubbles: true }));
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('openCalcsPicker', () => {
  it('s’ouvre dans document.body avec la sélection initiale cochée', () => {
    void openCalcsPicker({ initial: INITIAL });
    const root = document.body.querySelector('.cp-overlay')!;
    expect(root).not.toBeNull();
    expect(box(root, 7, 8, 'mul').checked).toBe(true);
    expect(box(root, 6, 8, 'mul').checked).toBe(false);
  });

  it('résout la nouvelle sélection au clic Retour et se retire', async () => {
    const p = openCalcsPicker({ initial: INITIAL });
    const root = document.body.querySelector('.cp-overlay')!;
    check(box(root, 6, 8, 'mul'), true);
    root.querySelector<HTMLButtonElement>('.cp-back')!.click();
    const out = await p;
    expect(out).toEqual(expect.arrayContaining([...INITIAL, { a: 6, b: 8, op: 'mul' }]));
    expect(out).toHaveLength(2);
    expect(document.querySelector('.cp-overlay')).toBeNull();
  });

  it('interdit de fermer sans aucun calcul coché', () => {
    void openCalcsPicker({ initial: INITIAL });
    const root = document.body.querySelector('.cp-overlay')!;
    check(box(root, 7, 8, 'mul'), false);
    expect(root.querySelector<HTMLButtonElement>('.cp-back')!.disabled).toBe(true);
    expect(root.querySelector<HTMLButtonElement>('.cp-close')!.disabled).toBe(true);
    expect(root.querySelector('.cp-warn')!.textContent).not.toBe('');
  });

  it('s’attache au container fourni et disparaît avec lui', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    void openCalcsPicker({ initial: INITIAL, container });
    expect(container.querySelector('.cp-overlay')).not.toBeNull();
    container.remove();
    expect(document.querySelector('.cp-overlay')).toBeNull();
  });
});
