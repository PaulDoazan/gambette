export interface Vec {
  x: number;
  y: number;
}

export interface Aimable {
  aimAt(point: Vec): void;
  releaseVelocity(): Vec;
  reset(): void;
}

export interface SlingshotInputDeps {
  slingshot: Aimable;
  onRelease(velocity: Vec): void;
  onAim(): void;
}

export interface SlingshotInput {
  handlePointerDown(p: Vec): void;
  handlePointerMove(p: Vec): void;
  handlePointerUp(): void;
}

interface State {
  dragging: boolean;
}

const onMove = (state: State, deps: SlingshotInputDeps) => (p: Vec) => {
  if (!state.dragging) return;
  deps.slingshot.aimAt(p);
  deps.onAim();
};

const onUp = (state: State, deps: SlingshotInputDeps) => () => {
  if (!state.dragging) return;
  const v = deps.slingshot.releaseVelocity();
  deps.slingshot.reset();
  deps.onRelease(v);
  state.dragging = false;
};

export function createSlingshotInput(deps: SlingshotInputDeps): SlingshotInput {
  const state: State = { dragging: false };
  return {
    handlePointerDown: () => {
      state.dragging = true;
    },
    handlePointerMove: onMove(state, deps),
    handlePointerUp: onUp(state, deps),
  };
}
