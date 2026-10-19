// Learned: полка в Onboarding HQ. Выученные (собранные) карточки по трекам, с полоской «выучено / всего».
import { bus as globalBus, type Bus } from '../systems/bus';
import type { BusEvents } from '../types/bus';
import type { PlanApi } from '../types/plan';
import { el } from './dom';
import { createPanel, nav } from './panel';

const css = `
.shelf-sum { font-size: 17px; font-weight: 700; margin-bottom: 10px; }
.shelf-track { margin-bottom: 14px; }
.shelf-track h3 { margin: 0 0 4px; font-size: 18px; display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
.shelf-track h3 small { font-size: 13px; font-weight: 600; opacity: .75; }
.shelf-bar { height: 12px; background: #e4d4a8; border: 2px solid var(--pq-ink); border-radius: 6px; overflow: hidden; margin-bottom: 6px; }
.shelf-bar i { display: block; height: 100%; background: var(--pq-leaf); }
.shelf-list { display: flex; flex-direction: column; gap: 5px; }
.shelf-item { background: #fffaf0; border: 2px solid var(--pq-wood-dark); border-radius: 6px; padding: 6px 8px; }
.shelf-item .front { font-size: 16px; font-weight: 800; overflow-wrap: anywhere; }
.shelf-item .back { font-size: 14px; opacity: .85; overflow-wrap: anywhere; margin-top: 2px; }
.shelf-empty { opacity: .7; padding: 4px 2px; font-size: 14px; }
`;

export interface ShelfScreen {
  open(): void;
  close(): void;
  readonly isOpen: boolean;
}

export function mountShelf(parent: HTMLElement, plan: PlanApi, bus: Bus<BusEvents> = globalBus): ShelfScreen {
  const panel = createPanel({ title: 'Learned', bus });
  const content = el('div', {});
  const closeBtn = el('button', { type: 'button', class: 'pq-btn', 'data-done': '', ...nav('done', 'v', 'done'), onclick: () => panel.close() }, 'Close');
  panel.body.append(el('style', {}, css), content, el('div', { style: 'margin-top:12px' }, closeBtn));
  parent.append(panel.root);

  function render(): void {
    const learned = new Map(plan.learned().map((l) => [l.track, l.ids]));
    const total = [...learned.values()].reduce((n, ids) => n + ids.length, 0);
    const sections = plan.tracks.map((t) => {
      const ids = learned.get(t.id) ?? [];
      const all = plan.cardsOf(t.id).length;
      const pct = all ? Math.round((ids.length / all) * 100) : 0;
      return el(
        'section',
        { class: 'shelf-track', 'data-track': t.id },
        el('h3', {}, t.title, el('small', {}, `${ids.length} / ${all}`)),
        el('div', { class: 'shelf-bar' }, el('i', { style: `width:${pct}%` })),
        ids.length
          ? el(
              'div',
              { class: 'shelf-list' },
              ...ids.map((id) => {
                const c = plan.card(id);
                return el('div', { class: 'shelf-item', 'data-id': id }, el('div', { class: 'front' }, c?.front ?? id), el('div', { class: 'back' }, c?.back ?? ''));
              }),
            )
          : el('div', { class: 'shelf-empty' }, 'Nothing here yet. Master cards of this track and they land on this shelf.'),
      );
    });
    content.replaceChildren(el('div', { class: 'shelf-sum', 'data-sum': '' }, `Learned: ${total} of ${plan.cards.length} cards`), ...sections);
  }

  let off: (() => void) | null = null;
  panel.onClose(() => {
    off?.();
    off = null;
  });
  return {
    open() {
      if (panel.isOpen) return;
      panel.open();
      off = plan.onChange(() => panel.isOpen && render());
      render();
      panel.focus();
    },
    close: () => panel.close(),
    get isOpen() {
      return panel.isOpen;
    },
  };
}
