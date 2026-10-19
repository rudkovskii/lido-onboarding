// Handbook: книга на столе в Onboarding HQ. Три вкладки = три трека; карточки с кратким содержанием, посадка одной карточки
// или всего трека. Посаженное растёт в Knowledge garden (ответами в мини-играх).
import { bus as globalBus, type Bus } from '../systems/bus';
import type { BusEvents } from '../types/bus';
import type { TrackId } from '../types/content';
import type { FarmApi } from '../types/farm';
import { el } from './dom';
import { STAGE_NAME, createPanel, nav } from './panel';
import { iconKeyOf, stageIcon, STAGE_ICON_CSS } from './stageIcon';

const css = `
${STAGE_ICON_CSS}
.hb { display: flex; flex-direction: column; gap: 10px; }
.hb-head { position: sticky; top: -12px; z-index: 3; margin: -12px -12px 0; padding: 10px 12px 8px; background: var(--pq-cream); display: flex; flex-direction: column; gap: 6px; border-bottom: 2px solid var(--pq-wood-dark); box-sizing: border-box; }
.hb-tabs { display: flex; gap: 6px; }
.hb-tabs .pq-btn { flex: 1 1 0; min-width: 0; padding: 8px 6px; font-size: 14px; line-height: 1.15; }
.hb-tabs .pq-btn small { display: block; font-size: 11px; font-weight: 600; opacity: .8; margin-top: 2px; }
.hb-desc { font-size: 14px; opacity: .85; }
.hb-note { font-size: 13px; font-weight: 700; color: #8a3a1a; }
.hb-bulk { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.hb-bulk .cnt { font-size: 13px; opacity: .75; }
.hb-list { display: flex; flex-direction: column; gap: 6px; }
.hb-row { display: flex; align-items: center; gap: 8px; background: #fffaf0; border: 2px solid var(--pq-wood-dark); border-radius: 6px; padding: 6px 8px; min-height: 52px; box-sizing: border-box; }
.hb-row .txt { flex: 1 1 auto; min-width: 0; }
.hb-row .front { font-size: 17px; font-weight: 800; overflow-wrap: anywhere; line-height: 1.15; }
.hb-row .back { font-size: 14px; opacity: .85; overflow-wrap: anywhere; line-height: 1.25; margin-top: 2px; }
.hb-row .st { flex: 0 0 auto; font-size: 12px; font-weight: 700; opacity: .8; text-align: right; min-width: 56px; }
.hb-row .pq-btn { flex: 0 0 auto; }
.hb-row.done { background: #e9f1d6; }
`;

export interface Handbook {
  open(track?: TrackId): void;
  close(): void;
  readonly isOpen: boolean;
  readonly track: TrackId;
}

export function mountHandbook(parent: HTMLElement, farm: FarmApi, bus: Bus<BusEvents> = globalBus): Handbook {
  const panel = createPanel({ title: 'Handbook', wide: true, bus });
  const content = el('div', { class: 'hb' });
  panel.body.append(el('style', {}, css), content);
  parent.append(panel.root);
  const base = (): string => {
    try {
      return import.meta.env.BASE_URL ?? '/';
    } catch {
      return '/';
    }
  };
  let track: TrackId = farm.tracks[0]!.id;

  function render(): void {
    const t = farm.tracks.find((x) => x.id === track) ?? farm.tracks[0]!;
    const cards = farm.cardsOf(t.id);
    const count = (id: TrackId): { planted: number; total: number } => {
      const cs = farm.cardsOf(id);
      return { planted: cs.filter((c) => farm.info(c.id).status !== 'new').length, total: cs.length };
    };
    const tabs = el(
      'div',
      { class: 'hb-tabs', role: 'tablist' },
      ...farm.tracks.map((x) => {
        const n = count(x.id);
        return el(
          'button',
          {
            type: 'button',
            role: 'tab',
            class: `pq-btn small${x.id === track ? ' on' : ''}`,
            'data-tab': x.id,
            'aria-pressed': x.id === track ? 'true' : 'false',
            ...nav('tabs', 'h', `tab:${x.id}`),
            onclick: () => {
              track = x.id;
              render();
              panel.focus(`tab:${x.id}`);
            },
          },
          x.title,
          el('small', {}, `${n.planted}/${n.total} planted`),
        );
      }),
    );
    const left = cards.filter((c) => farm.info(c.id).status === 'new');
    const bulk = el(
      'div',
      { class: 'hb-bulk' },
      el(
        'button',
        {
          type: 'button',
          class: 'pq-btn small',
          'data-plant-track': t.id,
          disabled: left.length === 0,
          ...nav('bulk', 'h', 'plant-track'),
          onclick: () => {
            farm.plant(left.map((c) => c.id));
            render();
            panel.syncFocus();
          },
        },
        left.length ? `Plant the whole track (${left.length})` : 'Whole track planted',
      ),
      el('span', { class: 'cnt' }, `${cards.length} cards`),
    );
    const head = el('div', { class: 'hb-head' }, tabs, el('div', { class: 'hb-desc' }, `${t.subtitle}. ${t.desc}`), t.id === 'policies' ? el('div', { class: 'hb-note', 'data-phantom': '' }, 'Phantom policies: invented for this demo, not real Lido rules.') : null, bulk);
    const rows = cards.map((c) => {
      const i = farm.info(c.id);
      const key = iconKeyOf(i);
      const status =
        i.status === 'new'
          ? el(
              'button',
              {
                type: 'button',
                class: 'pq-btn small',
                'data-plant': c.id,
                'aria-label': `Plant ${c.front}`,
                ...nav('cards', 'v', `plant:${c.id}`),
                onclick: () => {
                  farm.plant([c.id]);
                  render();
                  panel.syncFocus();
                },
              },
              'Plant',
            )
          : el('span', { class: 'st', 'data-status': c.id }, i.status === 'grown' ? 'Learned' : STAGE_NAME[i.stage ?? 'seed']);
      return el(
        'div',
        { class: `hb-row${i.status === 'grown' ? ' done' : ''}`, 'data-card': c.id },
        key ? stageIcon(key, base()) : el('span', { class: 'pq-sico dim', 'aria-hidden': 'true' }),
        el('div', { class: 'txt' }, el('div', { class: 'front' }, c.front), el('div', { class: 'back' }, c.back)),
        status,
      );
    });
    content.replaceChildren(head, el('div', { class: 'hb-list' }, ...rows));
  }

  let off: (() => void) | null = null;
  panel.onClose(() => {
    off?.();
    off = null;
  });
  return {
    open(next) {
      if (next) track = next;
      render();
      if (!panel.isOpen) {
        panel.open();
        off = farm.onChange(() => panel.isOpen && (render(), panel.syncFocus()));
      }
      panel.focus();
    },
    close: () => panel.close(),
    get isOpen() {
      return panel.isOpen;
    },
    get track() {
      return track;
    },
  };
}
