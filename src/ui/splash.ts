// Стартовый экран: название демо, оговорка про неофициальность и кнопка «Start». Пока он открыт, мир не принимает ввод.
// Нажатие «Start» — первый жест игрока: заодно будит звук (см. `systems/platform/audio.ts`).
import { bus as globalBus, type Bus } from '../systems/bus';
import type { BusEvents } from '../types/bus';
import { el } from './dom';
import { THEME_CSS } from './theme';

export const SPLASH_TITLE = 'Lido Pool · Onboarding (prototype)';
export const SPLASH_NOTE = 'Not an official Lido product. Policies in this demo are fictional; structure facts are public.';

const css = `
${THEME_CSS}
.pq-splash { position: fixed; inset: 0; z-index: 120; display: flex; align-items: center; justify-content: center; padding: 16px;
  background: linear-gradient(180deg, #1f5f8b 0%, #2e8fa8 55%, #2e5b3b 100%); font: 16px/1.35 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: var(--pq-ink); }
.pq-splash[hidden] { display: none; }
.pq-splash-card { width: min(420px, 100%); box-sizing: border-box; background: var(--pq-cream); border: 3px solid var(--pq-ink); border-radius: 12px; box-shadow: 0 5px 0 var(--pq-ink), inset 0 0 0 3px var(--pq-wood);
  padding: 22px 20px 20px; text-align: center; display: flex; flex-direction: column; gap: 14px; }
.pq-splash-card h1 { margin: 0; font-size: 24px; line-height: 1.2; }
.pq-splash-card p { margin: 0; font-size: 15px; opacity: .85; }
.pq-splash-card .pq-btn { font-size: 20px; padding: 14px 18px; background: var(--pq-accent); color: var(--pq-ink); }
`;

export interface Splash {
  readonly isOpen: boolean;
  close(): void;
}

export function mountSplash(parent: HTMLElement, o: { bus?: Bus<BusEvents>; onStart?: () => void } = {}): Splash {
  const bus = o.bus ?? globalBus;
  const start = el('button', { type: 'button', class: 'pq-btn', 'data-splash-start': '', onclick: () => api.close() }, 'Start');
  const root = el('div', { class: 'pq-splash', role: 'dialog', 'aria-label': SPLASH_TITLE, 'data-splash': '' }, el('style', {}, css), el('div', { class: 'pq-splash-card' }, el('h1', {}, SPLASH_TITLE), el('p', { 'data-splash-note': '' }, SPLASH_NOTE), start));
  parent.append(root);
  let open = true;
  bus.emit('world:input', { enabled: false });
  // Enter/Пробел на кнопке нажимают её сами; фокус сразу на «Start».
  setTimeout(() => start.focus({ preventScroll: true }), 0);
  const api: Splash = {
    get isOpen() {
      return open;
    },
    close() {
      if (!open) return;
      open = false;
      root.remove();
      bus.emit('world:input', { enabled: true });
      o.onStart?.();
    },
  };
  return api;
}
