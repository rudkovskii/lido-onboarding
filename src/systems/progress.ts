// Сад знаний: чистая модель роста. Без браузера и системных часов: время приходит параметром.
//
// Сохраняется только то, что сделал игрок: посадки (`planned`) и журнал ответов (`log`, только дописывается), плюс раскладка
// по рабочее место (`slots`, `tier`), чтобы рабочее место не прыгали. Стадии, капли, освоение и опыт выводятся из журнала заново.
//
// Правила роста (демо: цикл целиком за одну сессию, без привязки к дням):
//   New → Started: 1 верный ответ;
//   Started → Practiced: ещё 2 верных;
//   Practiced → освоение: ещё 1 верный.
// Всего 4 верных ответа на карточку. Ошибка снимает одну каплю текущей стадии (не ниже 0), стадия от ошибки не падает.
// За один ответ — не больше одной стадии. Собранная карточка уходит на полку «Learned» и остаётся там.
import type { Stage } from '../types/plan';
import type { GameMode } from './content';

export const XP = { correct: 1, stage: 3, card: 10 } as const;
/** Верных ответов, нужных для перехода в следующую стадию. */
export const NEED: Readonly<Record<'new' | 'started' | 'practiced', number>> = { new: 1, started: 2, practiced: 1 };
/** Всего верных ответов от семени до освоение. */
export const ANSWERS_TO_MASTER = NEED.new + NEED.started + NEED.practiced;

/** Рабочие места: прямоугольники [x, y, w, h] на карте кампуса по ступеням расширения (каждая следующая включает прежнюю). */
export const POD_TIERS: readonly (readonly [number, number, number, number])[] = [
  [17, 31, 6, 4], // 6×4 (plot:terrace)
  [15, 30, 10, 6], // резерв 10×6
  [15, 30, 10, 8], // ещё два ряда
];

/** Клетки грядок по порядку номеров: сначала участок, потом резерв, потом ряды. */
export const POD_CELLS: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  const seen = new Set<string>();
  for (const [x0, y0, w, h] of POD_TIERS)
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) {
        const k = `${x},${y}`;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push([x, y]);
      }
  return out;
})();

/** Сколько грядок на каждой ступени. */
export const TIER_CAP: readonly number[] = POD_TIERS.map((_, i) => {
  const seen = new Set<string>();
  for (const [x0, y0, w, h] of POD_TIERS.slice(0, i + 1)) for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) seen.add(`${x},${y}`);
  return seen.size;
});

export interface PlanEntry {
  t: number;
  id: string;
}

export interface AnswerEntry {
  t: number;
  id: string;
  ok: boolean;
  mode: GameMode;
}

export interface PlanSave {
  planned: PlanEntry[];
  log: AnswerEntry[];
  /** Растение → номер рабочее место (индекс в POD_CELLS). */
  slots: Record<string, number>;
  /** Ступень расширения (индекс в POD_TIERS), только растёт. */
  tier: number;
}

export function newPlan(): PlanSave {
  return { planned: [], log: [], slots: {}, tier: 0 };
}

export interface ItemState {
  id: string;
  addedAt: number;
  /** Стадия роста; null — выучено (собрано). */
  stage: 'new' | 'started' | 'practiced' | null;
  drops: number;
  wins: number;
  lastAnswer: number | null;
  answers: number;
  /** Весь опыт, набранный этим рабочее место. */
  xp: number;
}

export interface PlanState {
  items: Map<string, ItemState>;
  xp: number;
  answers: number;
}

/** Что дал ответ (для автобега и «+N»). */
export interface Outcome {
  kind: 'work' | 'advance' | 'master' | 'miss' | 'none';
  xp: number;
  from: Stage | null;
  to: Stage | null;
}

export const stageOf = (it: ItemState): Stage | null => it.stage;

function addItem(st: PlanState, e: PlanEntry): void {
  if (st.items.has(e.id)) return;
  st.items.set(e.id, { id: e.id, addedAt: e.t, stage: 'new', drops: 0, wins: 0, lastAnswer: null, answers: 0, xp: 0 });
}

/** Применить ответ к состоянию (мутирует). Не посаженное игнорируется. */
export function applyAnswer(st: PlanState, a: AnswerEntry): Outcome {
  const it = st.items.get(a.id);
  if (!it) return { kind: 'none', xp: 0, from: null, to: null };
  it.lastAnswer = a.t;
  it.answers++;
  st.answers++;
  const from = it.stage;
  if (!a.ok) {
    it.drops = Math.max(0, it.drops - 1);
    return { kind: 'miss', xp: 0, from, to: from };
  }
  let xp = XP.correct;
  let kind: Outcome['kind'] = 'work';
  let to: Stage | null = from;
  if (it.stage !== null) {
    it.drops++;
    if (it.drops >= NEED[it.stage]) {
      it.drops = 0;
      xp += XP.stage;
      kind = 'advance';
      if (it.stage === 'new') {
        it.stage = 'started';
        to = 'started';
      } else if (it.stage === 'started') {
        it.stage = 'practiced';
        to = 'practiced';
      } else {
        it.stage = null;
        it.wins = 1;
        xp += XP.card;
        kind = 'master';
        to = 'mastered';
      }
    }
  }
  st.xp += xp;
  it.xp += xp;
  return { kind, xp, from, to };
}

/** Состояние из сохранения: посадки и ответы по времени (посадка раньше ответа в тот же миг). */
export function derive(g: PlanSave): PlanState {
  const st: PlanState = { items: new Map(), xp: 0, answers: 0 };
  const ev: ({ p: PlanEntry } | { a: AnswerEntry })[] = [...g.planned.map((p) => ({ p })), ...g.log.map((a) => ({ a }))];
  ev.sort((x, y) => ('p' in x ? x.p.t : x.a.t) - ('p' in y ? y.p.t : y.a.t) || ('p' in x ? 0 : 1) - ('p' in y ? 0 : 1));
  for (const e of ev) {
    if ('p' in e) addItem(st, e.p);
    else applyAnswer(st, e.a);
  }
  return st;
}

export function statusOf(st: PlanState, id: string): 'new' | 'active' | 'mastered' {
  const it = st.items.get(id);
  if (!it) return 'new';
  return it.stage === null ? 'mastered' : 'active';
}

/** Сколько верных ответов осталось до следующей стадии (для растущего). */
export function leftInStage(it: ItemState): number {
  return it.stage === null ? 0 : Math.max(1, NEED[it.stage] - it.drops);
}

/** Одна строка «что осталось», с большой буквы. */
export function nextText(it: ItemState | undefined): string {
  if (!it) return 'Add it to your plan at the Handbook';
  if (it.stage === null) return 'Learned. It stays on your shelf';
  const n = leftInStage(it);
  const ans = `${n} more correct ${n === 1 ? 'answer' : 'answers'}`;
  if (it.stage === 'new') return `${ans} to Started`;
  if (it.stage === 'started') return `${ans} to Practiced`;
  return `${ans} to Mastered`;
}

/** Посадить: новые id в конец журнала посадок (уже посаженное пропускается). */
export function addCards(g: PlanSave, st: PlanState, ids: readonly string[], now: number): { save: PlanSave; added: string[] } {
  const added: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (st.items.has(id) || seen.has(id)) continue;
    seen.add(id);
    added.push(id);
  }
  if (!added.length) return { save: g, added };
  return { save: { ...g, planned: [...g.planned, ...added.map((id) => ({ t: now, id }))] }, added };
}

/**
 * Разложить по рабочее место: собранное освобождает рабочее место; растущие без рабочее место (в порядке посадки) занимают свободные с
 * наименьшим номером. Не хватает грядок — ступень расширения растёт.
 */
export function syncSlots(g: PlanSave, st: PlanState): PlanSave {
  const slots: Record<string, number> = {};
  const used = new Set<number>();
  for (const [id, n] of Object.entries(g.slots)) {
    const it = st.items.get(id);
    if (!it || used.has(n) || n >= POD_CELLS.length || it.stage === null) continue;
    slots[id] = n;
    used.add(n);
  }
  const want: string[] = [];
  for (const p of g.planned) {
    const it = st.items.get(p.id);
    if (it && it.stage !== null && slots[p.id] === undefined && !want.includes(p.id)) want.push(p.id);
  }
  let tier = Math.max(0, Math.min(g.tier, TIER_CAP.length - 1));
  const need = used.size + want.length;
  while (tier < TIER_CAP.length - 1 && need > TIER_CAP[tier]!) tier++;
  let next = 0;
  for (const id of want) {
    while (next < TIER_CAP[tier]! && used.has(next)) next++;
    if (next >= TIER_CAP[tier]!) break;
    slots[id] = next;
    used.add(next);
  }
  const same = tier === g.tier && Object.keys(slots).length === Object.keys(g.slots).length && Object.entries(slots).every(([k, v]) => g.slots[k] === v);
  return same ? g : { ...g, slots, tier };
}

const STAGE_RANK: Record<string, number> = { new: 0, started: 1, practiced: 2 };

export interface PickOpts {
  /** Последние показанные id (самые свежие в конце): их не повторяем, пока есть из чего выбрать. */
  recent?: readonly string[];
  /** Только карточки, которые годятся этой игре (трек). */
  accept?: (id: string) => boolean;
}

/** Сколько заданий подряд одна карточка не повторяется. */
export const REPEAT_GAP = 3;
export const repeatGap = (pool: number): number => Math.max(0, Math.min(REPEAT_GAP, pool - 1));

/**
 * Следующая карточка для мини-игры из карточек в работе. Ближе к освоение — раньше (Practiced, потом Started, потом New; внутри стадии
 * больше зачётов — раньше), так что один заход доводит карточки до освоение, а не размазывает ответы. Ту же карточку подряд не даём.
 */
export function pickTask(g: PlanSave, st: PlanState, opts: PickOpts = {}): string | null {
  const accept = opts.accept ?? (() => true);
  const pool = [...st.items.values()].filter((it) => it.stage !== null && g.slots[it.id] !== undefined && accept(it.id));
  if (!pool.length) return null;
  const gap = repeatGap(pool.length);
  const banned = new Set(gap > 0 ? (opts.recent ?? []).slice(-gap) : []);
  const progress = (it: ItemState): number => (STAGE_RANK[it.stage ?? 'new'] ?? 0) * 100 + it.drops * 10;
  const sorted = pool
    .filter((it) => !banned.has(it.id))
    .sort((a, b) => progress(b) - progress(a) || (a.lastAnswer ?? 0) - (b.lastAnswer ?? 0) || (g.slots[a.id] ?? 0) - (g.slots[b.id] ?? 0));
  return (sorted[0] ?? pool[0])?.id ?? null;
}

/** Нормализация раздела сохранения (мусор отбрасывается). */
export function normalizePlan(raw: unknown): PlanSave {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  const planned = Array.isArray(r.planned) ? r.planned.filter((p): p is PlanEntry => !!p && typeof p === 'object' && typeof p.id === 'string' && num(p.t)).map((p) => ({ t: p.t, id: p.id })) : [];
  const log = Array.isArray(r.log)
    ? r.log
        .filter((a): a is AnswerEntry => !!a && typeof a === 'object' && typeof a.id === 'string' && num(a.t) && typeof a.ok === 'boolean' && [1, 2, 3].includes(a.mode))
        .map((a) => ({ t: a.t, id: a.id, ok: a.ok, mode: a.mode }))
    : [];
  const slots: Record<string, number> = {};
  if (r.slots && typeof r.slots === 'object') for (const [k, v] of Object.entries(r.slots as Record<string, unknown>)) if (num(v) && v >= 0) slots[k] = Math.trunc(v);
  const tier = num(r.tier) ? Math.max(0, Math.min(TIER_CAP.length - 1, Math.trunc(r.tier))) : 0;
  return { planned, log, slots, tier };
}
