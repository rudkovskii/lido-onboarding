// План онбординга: что видят экраны (Handbook, полка Learned, план на доске, карточка рабочего места) и мир (рабочие места, автобег).
// Чистая модель — src/systems/progress.ts; склейка с хранилищем и шиной — src/systems/plan.ts (PlanApi).
import type { PathInfo } from '../systems/xp';
import type { Card, Track, TrackId } from './content';

/** Стадия карточки на рабочем месте: New (экран выключен), Started, Practiced, Mastered (значок, карточка уходит на полку «Learned»). */
export type Stage = 'new' | 'started' | 'practiced' | 'mastered';
/** new — не в плане; active — в работе на террасе; mastered — выучено (на полке). */
export type ItemStatus = 'new' | 'active' | 'mastered';

export interface ItemInfo {
  id: string;
  status: ItemStatus;
  /** null — не в плане или уже выучено. */
  stage: Stage | null;
  /** Верные ответы в текущей стадии. */
  drops: number;
  /** Что осталось до следующей стадии, по-английски. */
  next: string;
  /** Сколько раз освоено (0 или 1). */
  wins: number;
  /** Номер рабочего места, если в работе. */
  slot: number | null;
}

export interface PlanStats {
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
  masteredTotal: number;
  inProgress: number;
  answersTotal: number;
}

/** Фасад для экранов. Экраны не знают про хранилище: всё через него. */
export interface PlanApi {
  readonly tracks: readonly Track[];
  readonly cards: readonly Card[];
  card(id: string): Card | undefined;
  cardsOf(track: TrackId): Card[];
  info(id: string): ItemInfo;
  /** Добавить в план (новое — на свободное рабочее место). Уже добавленное пропускается. */
  addCards(ids: readonly string[]): { added: number; skipped: number };
  stats(): PlanStats;
  /** Полка «Learned»: выученные карточки по трекам. */
  learned(): { track: TrackId; ids: string[] }[];
  /** Подписка на любые изменения плана. */
  onChange(fn: () => void): () => void;
}

/** Рабочее место на террасе для мира. */
export interface PodView {
  slot: number;
  tile: [number, number];
  id: string;
  /** Короткая подпись над рабочим местом. */
  label: string;
  stage: Stage;
  drops: number;
}

/** Действие героя во время мини-игры (очередь автобега). */
export interface PodAct {
  /** work — верный ответ, advance — стадия выросла, master — освоено (значок), miss — ошибка. */
  kind: 'work' | 'advance' | 'master' | 'miss';
  id: string;
  label: string;
  /** Клетка рабочего места (null — места нет, герой стоит). */
  tile: [number, number] | null;
  /** Сколько опыта за ответ (для «+N»). */
  xp: number;
}
