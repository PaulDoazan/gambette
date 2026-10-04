import type { OpPanelHandles } from './sections';

const RANDOM_COUNT = 10;

const allCbsOf = (h: OpPanelHandles): HTMLInputElement[] => [h.randomCb, ...h.pairCbs];

const setChecked = (cb: HTMLInputElement, checked: boolean): void => {
  if (cb.checked === checked) return;
  cb.checked = checked;
  cb.dispatchEvent(new Event('change', { bubbles: true }));
};

const uncheckAll = (cbs: readonly HTMLInputElement[]): void => {
  for (const cb of cbs) setChecked(cb, false);
};

const pickRandomIndices = (count: number, total: number): Set<number> => {
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j]!, indices[i]!];
  }
  return new Set(indices.slice(0, Math.min(count, total)));
};

const checkRandomSubset = (cbs: readonly HTMLInputElement[], count: number): void => {
  const picked = pickRandomIndices(count, cbs.length);
  cbs.forEach((cb, i) => setChecked(cb, picked.has(i)));
};

const wireCrossCategory = (handles: readonly OpPanelHandles[]): void => {
  handles.forEach((h, i) => {
    const others = handles.filter((_, j) => j !== i).flatMap(allCbsOf);
    for (const cb of allCbsOf(h)) {
      cb.addEventListener('change', () => {
        if (cb.checked) uncheckAll(others);
      });
    }
  });
};

const wireRandomToggles = (handles: readonly OpPanelHandles[]): void => {
  handles.forEach((h) => {
    let programmatic = false;
    h.randomCb.addEventListener('change', () => {
      programmatic = true;
      try {
        if (h.randomCb.checked) checkRandomSubset(h.pairCbs, RANDOM_COUNT);
        else uncheckAll(h.pairCbs);
      } finally {
        programmatic = false;
      }
    });
    for (const cb of h.pairCbs) {
      cb.addEventListener('change', () => {
        if (programmatic) return;
        if (h.randomCb.checked) h.randomCb.checked = false;
      });
    }
  });
};

export const wireExclusivity = (handles: readonly OpPanelHandles[]): void => {
  wireRandomToggles(handles);
  wireCrossCategory(handles);
};
