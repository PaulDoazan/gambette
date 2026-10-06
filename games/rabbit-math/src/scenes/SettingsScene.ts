import { Container } from 'pixi.js';
import type { Settings, RabbitsCount } from '../services/Settings';
import type { Scene } from '../core/Scene';
import type { Pair } from '@gambette/math-sdk';
import {
  createPanelBackground,
  createPanelTitle,
  createCycleRow,
  createCloseButton,
  createConfirmPrompt,
  RABBITS_OPTIONS,
  sessionImpactingChanged,
  onOff,
} from './SettingsPanel';
import { createStepperRow } from './SettingsStepperRow';

export interface SettingsSceneDeps {
  initial: Settings;
  onChange(next: Settings): void;
  onClose(next: Settings, restartRequested: boolean): void;
  onOpenCalcsPicker(currentSelection: Pair[]): Promise<Pair[]>;
}

export interface SettingsScene extends Scene {
  setSelectedPairs(pairs: Pair[]): void;
  setRabbitsCount(n: RabbitsCount): void;
  setTapMode(on: boolean): void;
  confirmCloseWith(restart: boolean): void;
}

interface State {
  current: Settings;
}

const applyPatch = (state: State, deps: SettingsSceneDeps, patch: Partial<Settings>): void => {
  state.current = { ...state.current, ...patch };
  deps.onChange(state.current);
};

const buildSetters = (state: State, deps: SettingsSceneDeps): Omit<SettingsScene, keyof Scene> => ({
  setSelectedPairs: (pairs) => applyPatch(state, deps, { selectedPairs: pairs }),
  setRabbitsCount: (n) => applyPatch(state, deps, { rabbitsCount: n }),
  setTapMode: (on) => applyPatch(state, deps, { tapMode: on }),
  confirmCloseWith: (restart) => deps.onClose(state.current, restart),
});

const buildSceneShell = (view: Container): Scene => ({
  id: 'settings',
  view,
  onEnter: () => {},
  onExit: () => {},
  onTick: () => {},
  pause: () => {},
  resume: () => {},
  destroy: () => view.destroy({ children: true }),
});

interface RowCtx {
  view: Container;
  state: State;
  deps: SettingsSceneDeps;
  update: (patch: Partial<Settings>) => void;
}

const calcsValueText = (n: number): string => `${n} / 90 calculs`;

const addQuestionsRow = (ctx: RowCtx): void => {
  const row = createCycleRow('Questions', 0, { underline: true });
  const refresh = (): void => row.setValue(calcsValueText(ctx.state.current.selectedPairs.length));
  refresh();
  row.onTap(async () => {
    const next = await ctx.deps.onOpenCalcsPicker(ctx.state.current.selectedPairs);
    ctx.update({ selectedPairs: next });
    refresh();
  });
  ctx.view.addChild(row.view);
};

const RABBITS_MIN = RABBITS_OPTIONS[0]!;
const RABBITS_MAX = RABBITS_OPTIONS[RABBITS_OPTIONS.length - 1]!;

const addRabbitsRow = (ctx: RowCtx): void => {
  const row = createStepperRow('Nombre de lapins', 1);
  const refresh = (): void => {
    const n = ctx.state.current.rabbitsCount;
    row.setValue(String(n));
    row.setEnabled({ minus: n > RABBITS_MIN, plus: n < RABBITS_MAX });
  };
  refresh();
  const step = (delta: -1 | 1): void => {
    const n = ctx.state.current.rabbitsCount;
    const next = n + delta;
    if (next < RABBITS_MIN || next > RABBITS_MAX) return;
    ctx.update({ rabbitsCount: next as RabbitsCount });
    refresh();
  };
  row.onMinus(() => step(-1));
  row.onPlus(() => step(1));
  ctx.view.addChild(row.view);
};

const addTapModeRow = (ctx: RowCtx): void => {
  const row = createCycleRow('Mode tap (accessibilité)', 2);
  const refresh = (): void => row.setValue(onOff(ctx.state.current.tapMode));
  refresh();
  row.onTap(() => {
    const next = !ctx.state.current.tapMode;
    ctx.update({ tapMode: next });
    refresh();
  });
  ctx.view.addChild(row.view);
};

const buildAllRows = (ctx: RowCtx): void => {
  addQuestionsRow(ctx);
  addRabbitsRow(ctx);
  addTapModeRow(ctx);
};

const installCloseFlow = (
  ctx: RowCtx,
  initial: Settings,
  onClose: (s: Settings, r: boolean) => void,
): void => {
  let close: Container | null = null;
  const closeNow = (restart: boolean) => onClose(ctx.state.current, restart);
  const showConfirm = () => {
    if (close) ctx.view.removeChild(close);
    const prompt = createConfirmPrompt(
      'Recommencer la partie ?',
      () => closeNow(true),
      () => closeNow(false),
    );
    ctx.view.addChild(prompt);
  };
  close = createCloseButton('Fermer', () =>
    sessionImpactingChanged(initial, ctx.state.current) ? showConfirm() : closeNow(false),
  );
  ctx.view.addChild(close);
};

const buildVisualPanel = (view: Container, state: State, deps: SettingsSceneDeps): void => {
  view.addChild(createPanelBackground());
  view.addChild(createPanelTitle('Paramètres'));
  const ctx: RowCtx = {
    view,
    state,
    deps,
    update: (patch) => applyPatch(state, deps, patch),
  };
  buildAllRows(ctx);
  installCloseFlow(ctx, deps.initial, deps.onClose);
};

export function createSettingsScene(deps: SettingsSceneDeps): SettingsScene {
  const view = new Container();
  const state: State = { current: { ...deps.initial } };
  buildVisualPanel(view, state, deps);
  return { ...buildSceneShell(view), ...buildSetters(state, deps) };
}
