import { Container } from 'pixi.js';
import { createBackground, type Background } from '../entities/Background';
import { createTree, type Tree } from '../entities/Tree';
import { createRabbit, type Rabbit } from '../entities/Rabbit';
import { createSlingshot, type Slingshot } from '../entities/Slingshot';
import { createMathSign, type MathSign } from '../entities/MathSign';
import { createCarrotCounter, type CarrotCounter } from '../entities/CarrotCounter';
import { createGearButton, type GearButton } from '../entities/GearButton';
import { createFullscreenButton, type FullscreenButton } from '../entities/FullscreenButton';
import { TREE_PERCHES_BY_COUNT, type Perch } from '../config/dimensions';
import type { Settings } from '../services/Settings';
import { CARROTS_PER_ROUND, DEFAULT_DIFFICULTY, ROUNDS_PER_SESSION } from '../domain/sessionConfig';
import type { PhysicsWorld } from '../core/PhysicsWorld';
import type { Scene } from '../core/Scene';
import { generateQuestions } from '@gambette/math-sdk';
import { createSession, type Session } from '../domain/Session';
import { installRoundFlow, type RoundFlow } from './gameRound';

export interface GameSceneDeps {
  settings: Settings;
  physics: PhysicsWorld;
  onOpenSettings(): void;
  onSessionRestart(): void;
  onToggleFullscreen(): void;
  delay?: (ms: number) => Promise<void>;
}

export interface GameScene extends Scene {
  rabbits(): readonly Rabbit[];
  mathSign(): MathSign;
  session(): Session;
  forceCorrectHit(): void;
  forceWrongHit(rabbitIndex?: number): void;
}

interface Parts {
  view: Container;
  background: Background;
  tree: Tree;
  slingshot: Slingshot;
  sign: MathSign;
  counter: CarrotCounter;
  gear: GearButton;
  fullscreen: FullscreenButton;
  rabbits: Rabbit[];
  session: Session;
  perches: ReadonlyArray<Perch>;
}

const newSession = (settings: Settings): Session => {
  const rounds = generateQuestions({
    pairs: settings.selectedPairs,
    difficulty: DEFAULT_DIFFICULTY,
    count: ROUNDS_PER_SESSION,
    choicesCount: settings.rabbitsCount,
    seed: Date.now(),
  });
  return createSession({ rounds, carrotsPerRound: CARROTS_PER_ROUND });
};

const buildRabbits = (choices: readonly number[], perches: ReadonlyArray<Perch>): Rabbit[] =>
  perches.map((p, i) => {
    const r = createRabbit({ position: { x: p.x, y: p.y } });
    r.setNumber(choices[i] ?? 0);
    return r;
  });

const assembleScene = (deps: GameSceneDeps): Parts => {
  const view = new Container();
  const background = createBackground();
  const tree = createTree(deps.settings.rabbitsCount);
  const slingshot = createSlingshot();
  const sign = createMathSign();
  const counter = createCarrotCounter(CARROTS_PER_ROUND - 1);
  const gear = createGearButton({ onTap: deps.onOpenSettings });
  const fullscreen = createFullscreenButton({ onTap: deps.onToggleFullscreen });
  const session = newSession(deps.settings);
  const perches = TREE_PERCHES_BY_COUNT[deps.settings.rabbitsCount];
  const rabbits = buildRabbits(session.currentQuestion().choices, perches);
  sign.setQuestion(session.currentQuestion());
  return {
    view,
    background,
    tree,
    slingshot,
    sign,
    counter,
    gear,
    fullscreen,
    rabbits,
    session,
    perches,
  };
};

const attachChildren = (parts: Parts): void => {
  parts.view.addChild(parts.background.view);
  parts.view.addChild(parts.tree.view);
  parts.view.addChild(parts.slingshot.view);
  parts.view.addChild(parts.sign.view);
  parts.view.addChild(parts.counter.view);
  parts.view.addChild(parts.gear.view);
  parts.view.addChild(parts.fullscreen.view);
  for (const r of parts.rabbits) parts.view.addChild(r.view);
};

const defaultDelay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const wireFlow = (deps: GameSceneDeps, parts: Parts): RoundFlow =>
  installRoundFlow({
    view: parts.view,
    physics: deps.physics,
    slingshot: parts.slingshot,
    rabbits: parts.rabbits,
    sign: parts.sign,
    counter: parts.counter,
    session: parts.session,
    perches: parts.perches,
    delay: deps.delay ?? defaultDelay,
    tapMode: deps.settings.tapMode,
    onSessionEnd: () => deps.onSessionRestart(),
  });

const buildSceneApi = (parts: Parts, flow: RoundFlow): GameScene => ({
  id: 'game',
  view: parts.view,
  rabbits: () => parts.rabbits,
  mathSign: () => parts.sign,
  session: () => parts.session,
  forceCorrectHit: () => flow.forceCorrectHit(),
  forceWrongHit: (i?: number) => flow.forceWrongHit(i),
  onEnter: () => {},
  onExit: () => {},
  onTick: (dt) => flow.tick(dt),
  pause: () => {},
  resume: () => {},
  destroy: () => {
    flow.destroy();
    parts.view.destroy({ children: true });
  },
});

export function createGameScene(deps: GameSceneDeps): GameScene {
  const parts = assembleScene(deps);
  attachChildren(parts);
  const flow = wireFlow(deps, parts);
  return buildSceneApi(parts, flow);
}
