import type { Question } from '@gambette/math-sdk';

export type Phase = 'aiming' | 'resolving' | 'round_over' | 'session_over';

export interface SessionConfig {
  readonly rounds: readonly Question[];
  readonly carrotsPerRound: number;
}

export interface SessionSnapshot {
  readonly currentIndex: number;
  readonly score: number;
  readonly carrotsLeft: number;
  readonly phase: Phase;
  readonly totalRounds: number;
}

export interface Session {
  currentQuestion(): Question;
  snapshot(): SessionSnapshot;
  startResolving(): void;
  recordHit(): void;
  recordMiss(): void;
  nextRound(): void;
  isOver(): boolean;
}

interface State {
  currentIndex: number;
  score: number;
  carrotsLeft: number;
  phase: Phase;
}

const requirePhase = (state: State, expected: Phase): void => {
  if (state.phase !== expected) {
    throw new Error(`Invalid phase: expected ${expected}, got ${state.phase}`);
  }
};

const getCurrentQuestion = (state: State, cfg: SessionConfig): Question => {
  const q = cfg.rounds[state.currentIndex];
  if (!q) throw new Error('No current question');
  return q;
};

const getSnapshot = (state: State, cfg: SessionConfig): SessionSnapshot => ({
  currentIndex: state.currentIndex,
  score: state.score,
  carrotsLeft: state.carrotsLeft,
  phase: state.phase,
  totalRounds: cfg.rounds.length,
});

const applyMiss = (state: State): void => {
  requirePhase(state, 'resolving');
  state.carrotsLeft -= 1;
  state.phase = state.carrotsLeft > 0 ? 'aiming' : 'round_over';
};

const applyNextRound = (state: State, cfg: SessionConfig): void => {
  if (state.phase !== 'round_over') {
    throw new Error(`nextRound requires round_over, got ${state.phase}`);
  }
  if (state.currentIndex === cfg.rounds.length - 1) {
    state.phase = 'session_over';
    return;
  }
  state.currentIndex += 1;
  state.carrotsLeft = cfg.carrotsPerRound;
  state.phase = 'aiming';
};

const applyHit = (state: State): void => {
  requirePhase(state, 'resolving');
  state.score += 1;
  state.phase = 'round_over';
};

const applyStartResolving = (state: State): void => {
  requirePhase(state, 'aiming');
  state.phase = 'resolving';
};

const buildSession = (state: State, cfg: SessionConfig): Session => ({
  currentQuestion: () => getCurrentQuestion(state, cfg),
  snapshot: () => getSnapshot(state, cfg),
  startResolving: () => applyStartResolving(state),
  recordHit: () => applyHit(state),
  recordMiss: () => applyMiss(state),
  nextRound: () => applyNextRound(state, cfg),
  isOver: () => state.phase === 'session_over',
});

export function createSession(cfg: SessionConfig): Session {
  const state: State = {
    currentIndex: 0,
    score: 0,
    carrotsLeft: cfg.carrotsPerRound,
    phase: 'aiming',
  };
  return buildSession(state, cfg);
}
