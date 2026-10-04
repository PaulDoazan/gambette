import { Application, Container, type Ticker } from 'pixi.js';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../config/dimensions';
import { COLORS } from '../config/theme';

export interface AppApi {
  readonly stage: Container;
  readonly canvas: HTMLCanvasElement;
  readonly ticker: Ticker;
  readonly logical: { width: number; height: number };
  resize(): void;
  destroy(): void;
}

async function initPixi(): Promise<Application> {
  const app = new Application();
  await app.init({
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
    background: COLORS.sky,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });
  return app;
}

function attachCanvas(app: Application, parent: HTMLElement): Container {
  parent.appendChild(app.canvas);
  const root = new Container();
  app.stage.addChild(root);
  return root;
}

function makeResizeHandler(canvas: HTMLCanvasElement): () => void {
  return () => {
    const { innerWidth: w, innerHeight: h } = window;
    const scale = Math.min(w / DESIGN_WIDTH, h / DESIGN_HEIGHT);
    canvas.style.width = `${DESIGN_WIDTH * scale}px`;
    canvas.style.height = `${DESIGN_HEIGHT * scale}px`;
  };
}

export async function createApp(parent: HTMLElement): Promise<AppApi> {
  const app = await initPixi();
  const root = attachCanvas(app, parent);
  const resize = makeResizeHandler(app.canvas);
  resize();
  window.addEventListener('resize', resize);
  return {
    stage: root,
    canvas: app.canvas,
    ticker: app.ticker,
    logical: { width: DESIGN_WIDTH, height: DESIGN_HEIGHT },
    resize,
    destroy: () => {
      window.removeEventListener('resize', resize);
      app.destroy(true, { children: true });
    },
  };
}
