import { DESIGN_WIDTH, MATH_SIGN } from '../config/dimensions';

export interface EndOfSessionRabbit {
  playHopInPlace(): Promise<void>;
  playRunAwayRight(offscreenX: number): Promise<void>;
}

export interface EndOfSessionSign {
  tweenWidthTo(w: number, ms?: number): Promise<void>;
  setEndOfSessionMessage(score: number, total: number): void;
  setWidth(w: number): void;
}

export interface EndOfSessionDeps {
  fallenRabbits: readonly EndOfSessionRabbit[];
  sign: EndOfSessionSign;
  score: number;
  totalRounds: number;
  delay: (ms: number) => Promise<void>;
}

export async function playEndOfSession(deps: EndOfSessionDeps): Promise<void> {
  await deps.sign.tweenWidthTo(MATH_SIGN.expandedWidth);
  deps.sign.setEndOfSessionMessage(deps.score, deps.totalRounds);
  await Promise.all(deps.fallenRabbits.map((r) => r.playHopInPlace()));
  await Promise.all(deps.fallenRabbits.map((r) => r.playRunAwayRight(DESIGN_WIDTH + 80)));
  await deps.delay(1000);
  deps.sign.setWidth(MATH_SIGN.defaultWidth);
}
