// Иконки стадий для DOM (справочник): кадры 16×16 `icon_*` из атласа `public/atlas/custom.png`.
// Координаты берутся из `custom.json` (тест сверяет, что они не разъехались после `npm run sprites`).
import type { ItemInfo } from '../types/plan';
import { el } from './dom';

export const ATLAS_SIZE = { w: 256, h: 304 } as const;
export type IconKey = 'icon_new' | 'icon_started' | 'icon_practiced' | 'icon_mastered';
export const ICON_FRAMES: Record<IconKey, readonly [number, number]> = {
  icon_new: [91, 189],
  icon_started: [127, 189],
  icon_practiced: [109, 189],
  icon_mastered: [73, 189],
};

export const STAGE_ICON_CSS = `
.pq-sico { display: inline-block; width: 32px; height: 32px; background-repeat: no-repeat; image-rendering: pixelated; vertical-align: middle; }
.pq-sico.dim { opacity: .55; }
`;

/** Какой кадр показывает элемент: New, Started, Practiced; выучено — освоение. null — не посажено. */
export function iconKeyOf(i: Pick<ItemInfo, 'status' | 'stage'>): IconKey | null {
  if (i.status === 'new') return null;
  if (i.status === 'mastered') return 'icon_mastered';
  switch (i.stage) {
    case 'new':
      return 'icon_new';
    case 'started':
      return 'icon_started';
    case 'practiced':
      return 'icon_practiced';
    case 'mastered':
      return 'icon_mastered';
    default:
      return 'icon_new';
  }
}

/** Иконка: кадр 16×16, показан ×2 (целый масштаб, пиксели не мылятся). `base` — `import.meta.env.BASE_URL`. */
export function stageIcon(key: IconKey, base = '/', dim = false): HTMLSpanElement {
  const [x, y] = ICON_FRAMES[key];
  return el('span', {
    class: dim ? 'pq-sico dim' : 'pq-sico',
    'data-icon': key,
    'aria-hidden': 'true',
    style: `background-image:url(${base}atlas/custom.png);background-position:-${x * 2}px -${y * 2}px;background-size:${ATLAS_SIZE.w * 2}px ${ATLAS_SIZE.h * 2}px`,
  });
}
