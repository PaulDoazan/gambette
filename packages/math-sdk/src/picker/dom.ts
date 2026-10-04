import type { Op, Pair } from '../domain/calcs';
import { CALCS_PICKER_CSS } from './style';
import {
  OP_LABEL,
  OP_SYMBOL,
  type OpPanelHandles,
  buildOpPanel,
  initialKeys,
  pairKey,
} from './sections';
import { wireExclusivity } from './exclusivity';

export interface PickerHandles {
  root: HTMLDivElement;
  body: HTMLDivElement;
  closeBtn: HTMLButtonElement;
  backBtn: HTMLButtonElement;
  warn: HTMLDivElement;
  checkboxes: HTMLInputElement[];
}

export { pairKey };

const TAB_OPS: readonly Op[] = ['mul', 'add', 'sub'];

const buildStyle = (): HTMLStyleElement => {
  const style = document.createElement('style');
  style.textContent = CALCS_PICKER_CSS;
  return style;
};

const buildHeader = (): { wrap: HTMLDivElement; close: HTMLButtonElement } => {
  const wrap = document.createElement('div');
  wrap.className = 'cp-header';
  const title = document.createElement('h2');
  title.className = 'cp-title';
  title.textContent = 'Choisis tes calculs';
  const close = document.createElement('button');
  close.className = 'cp-close';
  close.textContent = '✕';
  close.setAttribute('aria-label', 'Fermer');
  wrap.append(title, close);
  return { wrap, close };
};

const buildTab = (op: Op, active: boolean): HTMLButtonElement => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = active ? 'cp-tab cp-tab-active' : 'cp-tab';
  btn.dataset.op = op;
  btn.textContent = `${OP_SYMBOL[op]} ${OP_LABEL[op]}`;
  return btn;
};

const wireTabs = (tabs: readonly HTMLButtonElement[], panels: readonly HTMLDivElement[]): void => {
  tabs.forEach((tab, idx) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('cp-tab-active'));
      tab.classList.add('cp-tab-active');
      panels.forEach((p, i) => {
        p.style.display = i === idx ? '' : 'none';
      });
    });
  });
};

const buildTabsRow = (tabs: readonly HTMLButtonElement[]): HTMLDivElement => {
  const row = document.createElement('div');
  row.className = 'cp-tabs';
  tabs.forEach((t) => row.appendChild(t));
  return row;
};

const buildBody = (initial: readonly Pair[], checkboxes: HTMLInputElement[]): HTMLDivElement => {
  const body = document.createElement('div');
  body.className = 'cp-body';
  const has = initialKeys(initial);
  const tabs = TAB_OPS.map((op, i) => buildTab(op, i === 0));
  body.appendChild(buildTabsRow(tabs));
  const handles: OpPanelHandles[] = TAB_OPS.map((op) => buildOpPanel(op, has, checkboxes));
  handles.forEach((h, i) => {
    if (i !== 0) h.panel.style.display = 'none';
    body.appendChild(h.panel);
  });
  wireTabs(
    tabs,
    handles.map((h) => h.panel),
  );
  wireExclusivity(handles);
  return body;
};

const buildFooter = (): {
  wrap: HTMLDivElement;
  warn: HTMLDivElement;
  back: HTMLButtonElement;
} => {
  const wrap = document.createElement('div');
  wrap.className = 'cp-footer';
  const warn = document.createElement('div');
  warn.className = 'cp-warn';
  warn.textContent = '';
  const back = document.createElement('button');
  back.className = 'cp-back';
  back.textContent = 'Retour';
  wrap.append(warn, back);
  return { wrap, warn, back };
};

export const buildPicker = (initial: readonly Pair[]): PickerHandles => {
  const root = document.createElement('div');
  root.className = 'cp-overlay';
  root.appendChild(buildStyle());
  const card = document.createElement('div');
  card.className = 'cp-card';
  const { wrap: header, close: closeBtn } = buildHeader();
  const checkboxes: HTMLInputElement[] = [];
  const body = buildBody(initial, checkboxes);
  const { wrap: footer, warn, back: backBtn } = buildFooter();
  card.append(header, body, footer);
  root.appendChild(card);
  return { root, body, closeBtn, backBtn, warn, checkboxes };
};
