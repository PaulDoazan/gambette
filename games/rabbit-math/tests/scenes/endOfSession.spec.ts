import { describe, it, expect, vi } from 'vitest';
import { playEndOfSession } from '../../src/scenes/endOfSession';
import { MATH_SIGN, DESIGN_WIDTH } from '../../src/config/dimensions';

const fakeSign = () => ({
  tweenWidthTo: vi.fn(async () => {}),
  setEndOfSessionMessage: vi.fn(),
  setWidth: vi.fn(),
});

const fakeRabbit = () => ({
  playHopInPlace: vi.fn(async () => {}),
  playRunAwayRight: vi.fn(async () => {}),
});

const runWithFallen = async (rabbits: ReturnType<typeof fakeRabbit>[]) => {
  const sign = fakeSign();
  const delay = vi.fn(async () => {});
  await playEndOfSession({
    fallenRabbits: rabbits,
    sign,
    score: 7,
    totalRounds: 10,
    delay,
  });
  return { sign, delay };
};

describe('playEndOfSession sequence', () => {
  it('expands the sign and sets the score message', async () => {
    const r1 = fakeRabbit();
    const r2 = fakeRabbit();
    const { sign } = await runWithFallen([r1, r2]);
    expect(sign.tweenWidthTo).toHaveBeenCalledWith(MATH_SIGN.expandedWidth);
    expect(sign.setEndOfSessionMessage).toHaveBeenCalledWith(7, 10);
  });

  it('hops and runs every fallen rabbit, then pauses, then resets width', async () => {
    const r1 = fakeRabbit();
    const r2 = fakeRabbit();
    const { sign, delay } = await runWithFallen([r1, r2]);
    expect(r1.playHopInPlace).toHaveBeenCalledTimes(1);
    expect(r2.playHopInPlace).toHaveBeenCalledTimes(1);
    expect(r1.playRunAwayRight).toHaveBeenCalledWith(DESIGN_WIDTH + 80);
    expect(r2.playRunAwayRight).toHaveBeenCalledWith(DESIGN_WIDTH + 80);
    expect(delay).toHaveBeenCalledWith(1000);
    expect(sign.setWidth).toHaveBeenCalledWith(MATH_SIGN.defaultWidth);
  });
});

describe('playEndOfSession with no fallen rabbits', () => {
  it('still expands the sign, displays the score, and pauses', async () => {
    const sign = fakeSign();
    const delay = vi.fn(async () => {});
    await playEndOfSession({
      fallenRabbits: [],
      sign,
      score: 0,
      totalRounds: 10,
      delay,
    });
    expect(sign.tweenWidthTo).toHaveBeenCalledWith(MATH_SIGN.expandedWidth);
    expect(sign.setEndOfSessionMessage).toHaveBeenCalledWith(0, 10);
    expect(delay).toHaveBeenCalledWith(1000);
    expect(sign.setWidth).toHaveBeenCalledWith(MATH_SIGN.defaultWidth);
  });
});

const buildOrderingMocks = (calls: string[]) => ({
  sign: {
    tweenWidthTo: vi.fn(async () => {
      calls.push('tween');
    }),
    setEndOfSessionMessage: vi.fn(() => {
      calls.push('msg');
    }),
    setWidth: vi.fn(() => {
      calls.push('reset');
    }),
  },
  rabbit: {
    playHopInPlace: vi.fn(async () => {
      calls.push('hop');
    }),
    playRunAwayRight: vi.fn(async () => {
      calls.push('run');
    }),
  },
  delay: vi.fn(async () => {
    calls.push('delay');
  }),
});

describe('playEndOfSession ordering', () => {
  it('runs tween, message, hop, run, delay, reset in that order', async () => {
    const calls: string[] = [];
    const { sign, rabbit, delay } = buildOrderingMocks(calls);
    await playEndOfSession({
      fallenRabbits: [rabbit],
      sign,
      score: 1,
      totalRounds: 1,
      delay,
    });
    expect(calls).toEqual(['tween', 'msg', 'hop', 'run', 'delay', 'reset']);
  });
});
