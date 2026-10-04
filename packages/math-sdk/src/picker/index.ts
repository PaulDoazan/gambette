import type { Op, Pair } from '../domain/calcs';
import { buildPicker, type PickerHandles } from './dom';

export interface CalcsPickerOptions {
  initial: readonly Pair[];
  /** Élément hôte de l'overlay (défaut : document.body). Le jeu y passe sa racine. */
  container?: HTMLElement;
}

const NO_SELECTION_MSG = 'Sélectionne au moins un calcul.';

const opOf = (raw: string | undefined): Op => {
  if (raw === 'add' || raw === 'sub') return raw;
  return 'mul';
};

const readSelection = (boxes: readonly HTMLInputElement[]): Pair[] =>
  boxes
    .filter((cb) => cb.checked)
    .map((cb) => ({
      a: Number(cb.dataset.a),
      b: Number(cb.dataset.b),
      op: opOf(cb.dataset.op),
    }));

const updateCloseAvailability = (h: PickerHandles): void => {
  const count = h.checkboxes.filter((cb) => cb.checked).length;
  const allowed = count >= 1;
  h.backBtn.disabled = !allowed;
  h.closeBtn.disabled = !allowed;
  h.warn.textContent = allowed ? '' : NO_SELECTION_MSG;
};

const installCheckboxListeners = (h: PickerHandles): void => {
  for (const cb of h.checkboxes) {
    cb.addEventListener('change', () => updateCloseAvailability(h));
  }
};

const cleanup = (h: PickerHandles): void => {
  if (h.root.parentNode) h.root.parentNode.removeChild(h.root);
};

const installCloseHandlers = (h: PickerHandles, resolve: (pairs: Pair[]) => void): void => {
  const finish = (): void => {
    if (h.backBtn.disabled) return;
    const out = readSelection(h.checkboxes);
    cleanup(h);
    resolve(out);
  };
  h.backBtn.addEventListener('click', finish);
  h.closeBtn.addEventListener('click', finish);
};

export function openCalcsPicker(opts: CalcsPickerOptions): Promise<Pair[]> {
  return new Promise<Pair[]>((resolve) => {
    const initial = [...opts.initial];
    const handles = buildPicker(initial);
    (opts.container ?? document.body).appendChild(handles.root);
    installCheckboxListeners(handles);
    updateCloseAvailability(handles);
    installCloseHandlers(handles, (pairs) => {
      resolve(pairs.length >= 1 ? pairs : initial);
    });
  });
}
