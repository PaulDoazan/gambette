import { Group, Tween, Easing } from '@tweenjs/tween.js';

export const tweenGroup = new Group();

export function tweenObject<T extends object>(
  target: T,
  to: Partial<T>,
  ms: number,
  easing = Easing.Quadratic.Out,
): Promise<void> {
  return new Promise((resolve) => {
    new Tween(target, tweenGroup)
      .to(to, ms)
      .easing(easing)
      .onComplete(() => resolve())
      .start();
  });
}

export function tickTweens(now: number): void {
  tweenGroup.update(now);
}
