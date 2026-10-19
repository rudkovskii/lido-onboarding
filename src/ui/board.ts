// Доска на Lido Campus: выбор мини-игры из трёх. Игра недоступна, пока в её треке нет посаженных карточек, и написано почему.
import type { Bus } from '../systems/bus';
import { GAME_MODES, MODE_TRACK, type GameMode } from '../systems/content';
import type { BusEvents } from '../types/bus';
import type { TrackId } from '../types/content';
import { el } from './dom';
import { MODE_ICON, MODE_NAME } from './glossary';
import { createPanel, nav } from './panel';

export interface BoardDeps {
  bus?: Bus<BusEvents>;
  /** Сколько на рабочее место растёт карточек каждого трека. */
  counts(): Record<TrackId, number>;
  onPick(mode: GameMode): void;
}

const DESC: Record<GameMode, string> = {
  1: 'A situation, three big buttons: OK, Violation or Ask first. Plus a few rule-recall questions.',
  2: 'Who decides what, and where does it go? Plus matching names and descriptions.',
  3: 'Pick the meaning of a term, or the term for a meaning.',
};

export function mountBoard(parent: HTMLElement, deps: BoardDeps): { open(): void; close(): void; readonly isOpen: boolean } {
  const panel = createPanel({ title: 'Mini-games', ...(deps.bus ? { bus: deps.bus } : {}) });
  parent.append(panel.root);
  const render = (): void => {
    const c = deps.counts();
    const total = GAME_MODES.reduce((n, m) => n + c[MODE_TRACK[m]], 0);
    const list = el('div', { style: 'display:flex;flex-direction:column;gap:8px' });
    list.append(el('div', { class: 'pq-muted' }, `In progress: ${total} cards. While you answer, your newcomer works through the cards at the terrace.`));
    for (const m of GAME_MODES) {
      const n = c[MODE_TRACK[m]];
      const why = n > 0 ? '' : 'Nothing in your plan for this track: add its cards at the Handbook (reception desk) in Onboarding HQ';
      list.append(
        el(
          'button',
          { type: 'button', class: 'pq-btn', 'data-mode': m, disabled: !!why, style: 'text-align:left;line-height:1.3', ...nav('modes', 'v', `mode:${m}`), onclick: () => (panel.close(), deps.onPick(m)) },
          el('div', { style: 'font-size:18px;font-weight:800' }, `${MODE_ICON[m]} ${m}. ${MODE_NAME[m].title}`),
          el('div', { style: 'font-weight:500;font-size:14px;opacity:.85' }, why || DESC[m]),
          why ? null : el('div', { style: 'font-weight:700;font-size:13px;color:#f2d552' }, `🖥 ${n} in progress`),
        ),
      );
    }
    panel.body.replaceChildren(list);
  };
  return {
    open() {
      render();
      panel.open();
      panel.focus();
    },
    close: () => panel.close(),
    get isOpen() {
      return panel.isOpen;
    },
  };
}
