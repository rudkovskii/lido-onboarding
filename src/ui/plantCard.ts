// Карточка растения на грядке: карточка (front/back), стадия, что осталось до урожая. «Practice» зовёт мини-игру трека.
import type { Bus } from '../systems/bus';
import type { BusEvents } from '../types/bus';
import type { FarmApi } from '../types/farm';
import { el } from './dom';
import { createPanel, nav, STAGE_NAME } from './panel';

const css = `
.pc { display: flex; flex-direction: column; gap: 8px; }
.pc .big { font-size: 26px; font-weight: 800; line-height: 1.15; overflow-wrap: anywhere; }
.pc .back { font-size: 17px; line-height: 1.3; overflow-wrap: anywhere; }
.pc .trk { font-size: 13px; font-weight: 700; opacity: .7; text-transform: uppercase; letter-spacing: .4px; }
.pc-rows { display: flex; flex-direction: column; gap: 2px; margin-top: 4px; }
.pc-row { display: flex; justify-content: space-between; gap: 10px; padding: 6px 2px; border-bottom: 1px dashed var(--pq-wood-dark); font-size: 16px; }
.pc-row b { text-align: right; }
.pc-next { background: #fffaf0; border: 2px solid var(--pq-wood-dark); border-radius: 8px; padding: 8px 10px; font-size: 15px; }
.pc-btns { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
.pc-btns .pq-btn { flex: 1 1 auto; }
`;

export interface PlantCardOptions {
  onReview(id: string): void;
}

export interface PlantCardScreen {
  open(id: string): void;
  close(): void;
  readonly isOpen: boolean;
}

export function mountPlantCard(parent: HTMLElement, api: FarmApi, opts: PlantCardOptions, bus?: Bus<BusEvents>): PlantCardScreen {
  const panel = createPanel({ title: 'Plant', bus });
  const content = el('div', { class: 'pc' });
  panel.body.append(el('style', {}, css), content);
  parent.append(panel.root);

  let id: string | null = null;
  const row = (label: string, value: string): HTMLElement => el('div', { class: 'pc-row' }, el('span', {}, label), el('b', {}, value));

  function render(): void {
    if (!id) return;
    const cur = id;
    const card = api.card(cur);
    const i = api.info(cur);
    const track = api.tracks.find((t) => t.id === card?.track);
    const stage = i.stage ? STAGE_NAME[i.stage] : i.status === 'grown' ? 'learned' : 'not planted';
    content.replaceChildren(
      el('div', { class: 'trk' }, track?.title ?? ''),
      el('div', { class: 'big', 'data-front': '' }, card?.front ?? cur),
      el('div', { class: 'back' }, card?.back ?? ''),
      el('div', { class: 'pc-rows' }, row('Stage', stage), row('Correct answers in this stage', String(i.drops))),
      el('div', { class: 'pc-next', 'data-next': '' }, el('b', {}, '🌱 '), i.next || 'All good'),
      el(
        'div',
        { class: 'pc-btns' },
        el(
          'button',
          {
            type: 'button',
            class: 'pq-btn',
            'data-review': '',
            ...nav('pc', 'h', 'review'),
            onclick: () => {
              panel.close();
              opts.onReview(cur);
            },
          },
          'Practice now',
        ),
      ),
    );
    panel.syncFocus();
  }

  let off: (() => void) | null = null;
  panel.onClose(() => {
    off?.();
    off = null;
  });
  return {
    open(next) {
      id = next;
      if (!panel.isOpen) {
        panel.open();
        off = api.onChange(() => panel.isOpen && render());
      }
      render();
      panel.focus('review');
    },
    close() {
      panel.close();
    },
    get isOpen() {
      return panel.isOpen;
    },
  };
}
