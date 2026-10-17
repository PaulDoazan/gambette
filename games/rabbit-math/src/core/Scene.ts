import type { Container } from 'pixi.js';

export interface Scene {
  readonly view: Container;
  readonly id: string;
  onEnter(): void;
  onExit(): void;
  onTick(deltaMs: number): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}
