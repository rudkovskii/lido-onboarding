// Сад знаний: что видят экраны (справочник, полка, коробка, кровать, карточка растения) и мир (грядки, автобег).
// Чистая модель — src/systems/garden.ts; склейка с хранилищем и шиной — src/systems/farm.ts (FarmApi).
import type { PathInfo } from '../systems/xp';
import type { Card, Track, TrackId } from './content';

/** Стадия растения. ripe — созрело (миг перед тем, как герой сорвёт). Сорванное уходит на полку «Learned». */
export type Stage = 'seed' | 'sprout' | 'bush' | 'ripe';
/** new — не посажено; growing — на грядке; grown — выучено (на полке). */
export type ItemStatus = 'new' | 'growing' | 'grown';

export interface ItemInfo {
  id: string;
  status: ItemStatus;
  /** null — не посажено или уже выучено. */
  stage: Stage | null;
  /** Верные ответы в текущей стадии. */
  drops: number;
  /** Что осталось до следующей стадии, по-английски. */
  next: string;
  /** Сколько раз собрано. */
  harvests: number;
  /** Номер грядки, если растёт. */
  slot: number | null;
}

export interface FarmStats {
  xp: number;
  level: string;
  /** 0..1 внутри текущего уровня. */
  ratio: number;
  /** Путь к «Onboarded»: уровень 0…8 (9 — готово), очки, пороги. */
  path: PathInfo;
  /** Всего карточек (= очки пути). */
  total: number;
  thresholds: readonly number[];
  /** Сколько уровней набрано с запуска (непрерывно, 0,4 = 40 % уровня). */
  sessionGain: number;
  grownTotal: number;
  growing: number;
  answersTotal: number;
}

/** Фасад для экранов. Экраны не знают про хранилище: всё через него. */
export interface FarmApi {
  readonly tracks: readonly Track[];
  readonly cards: readonly Card[];
  card(id: string): Card | undefined;
  cardsOf(track: TrackId): Card[];
  info(id: string): ItemInfo;
  /** Посадить (новое — семенем на свободную грядку). Уже посаженное пропускается. */
  plant(ids: readonly string[]): { planted: number; skipped: number };
  stats(): FarmStats;
  /** Полка «Learned»: выученные карточки по трекам. */
  learned(): { track: TrackId; ids: string[] }[];
  /** Подписка на любые изменения сада. */
  onChange(fn: () => void): () => void;
}

/** Вид растения (`systems/plantLook.ts`): один из 16 кустов. */
export interface PlantLook {
  type: 'plant';
  variant: number;
}

/** Растение на грядке для мира. */
export interface PlantView {
  slot: number;
  tile: [number, number];
  id: string;
  /** Короткая подпись над растением. */
  label: string;
  stage: Stage;
  drops: number;
  look?: PlantLook;
}

/** Действие героя во время мини-игры (очередь автобега). */
export interface FarmAct {
  kind: 'water' | 'grow' | 'harvest' | 'miss';
  id: string;
  label: string;
  /** Грядка растения (null — растение без грядки, герой стоит). */
  tile: [number, number] | null;
  /** Сколько опыта за ответ (для «+N»). */
  xp: number;
}
