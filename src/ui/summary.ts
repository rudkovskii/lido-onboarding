// My onboarding plan (доска в Onboarding HQ): уровень, прогресс, сводка по карточкам.
import type { Bus } from '../systems/bus';
import type { BusEvents } from '../types/bus';
import type { PlanApi } from '../types/plan';
import { el } from './dom';
import { createPanel, nav } from './panel';
import { growthText, levelLabel } from '../systems/xp';

const css = `
.sum { display: flex; flex-direction: column; gap: 10px; }
.sum-hero { display: flex; gap: 10px; }
.sum-big { flex: 1 1 0; background: #fffaf0; border: 2px solid var(--pq-wood-dark); border-radius: 8px; padding: 10px; text-align: center; }
.sum-big b { display: block; font-size: 34px; line-height: 1.1; }
.sum-big span { font-size: 14px; opacity: .75; }
.sum-rows { display: flex; flex-direction: column; gap: 4px; }
.sum-row { display: flex; justify-content: space-between; gap: 10px; padding: 6px 4px; border-bottom: 1px dashed var(--pq-wood-dark); font-size: 16px; }
.sum-row b { font-size: 17px; }
.sum-level { background: #fffaf0; border: 2px solid var(--pq-wood-dark); border-radius: 8px; padding: 10px; }
.sum-level .top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
.sum-level .lvl { font-size: 26px; font-weight: 700; }
.sum-bar { height: 16px; background: #e4d4a8; border: 2px solid var(--pq-ink); border-radius: 8px; overflow: hidden; }
.sum-bar i { display: block; height: 100%; background: var(--pq-leaf); }
.sum-hint { font-size: 14px; opacity: .8; }
`;

export interface SummaryScreen {
  openPlan(): void;
  close(): void;
  readonly isOpen: boolean;
}

export function mountSummary(parent: HTMLElement, api: PlanApi, bus?: Bus<BusEvents>, onPath?: () => void): SummaryScreen {
  const panel = createPanel({ title: 'My onboarding plan', bus });
  const content = el('div', { class: 'sum' });
  const closeBtn = el('button', { type: 'button', class: 'pq-btn', 'data-done': '', ...nav('done', 'v', 'done'), onclick: () => panel.close() }, 'Close');
  panel.body.append(el('style', {}, css), content, el('div', { style: 'margin-top:12px' }, closeBtn));
  parent.append(panel.root);

  const hero = (done: number, total: number): HTMLElement =>
    el(
      'div',
      { class: 'sum-hero' },
      el('div', { class: 'sum-big' }, el('b', { 'data-total': '' }, String(done)), el('span', {}, 'cards mastered')),
      el('div', { class: 'sum-big' }, el('b', { 'data-left': '' }, String(Math.max(0, total - done))), el('span', {}, 'still to go')),
    );
  const row = (label: string, value: string | number): HTMLElement => el('div', { class: 'sum-row' }, el('span', {}, label), el('b', {}, String(value)));

  function render(): void {
    const s = api.stats();
    const p = s.path;
    const pct = Math.max(0, Math.min(100, Math.round(s.ratio * 100)));
    const grow = growthText(s.sessionGain);
    content.replaceChildren(
      hero(s.masteredTotal, s.total),
      el(
        'div',
        { class: 'sum-level' },
        el('div', { class: 'top' }, el('span', { class: 'lvl', 'data-level': '' }, levelLabel(p.sub)), el('span', { 'data-session-gain': '' }, grow ? `${grow} this session` : `${s.xp} XP`)),
        el('div', { class: 'sum-bar', role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100 }, el('i', { style: `width:${pct}%` })),
        el('div', { class: 'sum-hint', style: 'margin-top:4px', 'data-level-hint': '' }, p.done ? 'Onboarded: every card is mastered' : `To Onboarded: ${Math.floor(p.pct * 100)}% · to ${p.nextTo}: ${p.toNext} more pts`),
        onPath ? el('button', { type: 'button', class: 'pq-btn small', style: 'margin-top:8px', 'data-open-path': '', ...nav('path', 'v', 'path'), onclick: () => (panel.close(), onPath()) }, 'Path to Onboarded') : null,
      ),
      el('div', { class: 'sum-rows' }, row('Cards mastered', s.masteredTotal), row('In progress', s.inProgress), row('Answers so far', s.answersTotal)),
    );
  }

  let off: (() => void) | null = null;
  panel.onClose(() => {
    off?.();
    off = null;
  });
  return {
    openPlan() {
      if (!panel.isOpen) {
        panel.open();
        off = api.onChange(() => panel.isOpen && render());
      }
      render();
      panel.focus();
    },
    close: () => panel.close(),
    get isOpen() {
      return panel.isOpen;
    },
  };
}
