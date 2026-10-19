// Сад целиком: модель сада + карточки + шина. Реализует PlanApi для экранов и даёт мини-игре задания и ответы.
// Хранилище и часы подставляет склейка (main.ts): здесь нет браузера.
import type { BusEvents } from '../types/bus';
import type { Card, TrackId } from '../types/content';
import type { PodAct, PlanApi, PlanStats, ItemInfo, PodView } from '../types/plan';
import type { Bus } from './bus';
import { CARDS, CARD_BY_ID, MODE_TRACK, TRACKS, cardsOf, labelOf, type GameMode } from './content';
import { POD_CELLS, TIER_CAP, applyAnswer, derive, nextText, pickTask, addCards, statusOf, syncSlots, type AnswerEntry, type PlanSave, type PlanState } from './progress';
import { grade, makeQuestion, type Question } from './quiz';
import { TOTAL, THRESHOLDS, pathOf, pointsOf, type PathInfo } from './xp';

export interface PlanDeps {
  bus: Bus<BusEvents>;
  load(): PlanSave;
  save(g: PlanSave): void;
  now(): number;
  rand?: () => number;
}

/** Результат ответа для экрана мини-игры. */
export interface AnswerOut {
  ok: boolean;
  /** Правильный ответ (как показать). */
  correct: string;
  /** Карточка, которую работа ответ: правило / термин и его смысл. */
  card: { front: string; back: string };
  /** Для сценария: пояснение; для вопроса про структуру: пусто. */
  explain?: string;
  act: PodAct;
  /** Что осталось этому рабочее место после ответа. */
  progress: string;
  /** Путь к Onboarded до и после ответа. */
  path: { from: number; to: number; sub: number; label: string };
}

export interface Plan extends PlanApi {
  /** Следующее задание мини-игры (и `work:focus` для героя). `only` — одиночный повтор рабочее место. */
  next(mode: GameMode, only?: string): Question | null;
  answer(q: Question, given: string): AnswerOut;
  /** Режим для «Practice»: игра трека карточки. */
  modeOf(id: string): GameMode;
  pods(): PodView[];
  /** Сколько растёт на рабочее место по трекам. */
  counts(): Record<TrackId, number>;
  /** Пересчитать раскладку и разослать рабочее место и опыт. */
  refresh(): void;
  readonly plan: PlanSave;
  readonly state: PlanState;
}

export function createPlan(d: PlanDeps): Plan {
  const rand = d.rand ?? Math.random;
  let g: PlanSave = d.load();
  // Растения карточек, которых нет в контенте (контент изменился): убираем, чтобы задание не вышло без карточки.
  g = { ...g, planned: g.planned.filter((p) => CARD_BY_ID.has(p.id)), log: g.log.filter((a) => CARD_BY_ID.has(a.id)) };
  let st: PlanState = derive(g);
  /** Последние показанные id: основа правила «не повторять чаще, чем раз в N заданий». */
  const recent: string[] = [];
  /** Сценарии и вопросы, которые уже были в этой сессии. */
  const seen = new Set<string>();
  const listeners = new Set<() => void>();

  const path = (): PathInfo => pathOf(pointsOf(st.items.values()));
  /** Позиция на пути при запуске: от неё считается рост за сессию («+0.4 level»). */
  const pos0 = path().pos;

  const pods = (): PodView[] => {
    const out: PodView[] = [];
    for (const [id, slot] of Object.entries(g.slots)) {
      const it = st.items.get(id);
      const cell = POD_CELLS[slot];
      if (!it || !cell || it.stage === null) continue;
      out.push({ slot, tile: [cell[0], cell[1]], id, label: labelOf(id), stage: it.stage, drops: it.drops });
    }
    return out.sort((a, b) => a.slot - b.slot);
  };
  const emitPods = (): void => {
    d.bus.emit('pods:update', { pods: pods(), cells: POD_CELLS.slice(0, TIER_CAP[g.tier]).map((c) => [c[0], c[1]]) });
  };
  const emitXp = (gain = 0, up = false): void => {
    const l = path();
    d.bus.emit('hud:xp', {
      level: l.label,
      ratio: l.ratio,
      sub: l.sub,
      of: THRESHOLDS.length,
      pct: l.pct,
      pos: l.pos,
      toNext: l.toNext,
      xp: st.xp,
      inProgress: [...st.items.values()].filter((it) => it.stage !== null).length,
      ...(gain ? { gain } : {}),
      ...(up ? { up } : {}),
    });
  };
  const changed = (): void => {
    d.save(g);
    for (const fn of [...listeners]) fn();
  };

  const info = (id: string): ItemInfo => {
    const it = st.items.get(id);
    return { id, status: statusOf(st, id), stage: it ? it.stage : null, drops: it?.drops ?? 0, next: nextText(it), wins: it?.wins ?? 0, slot: g.slots[id] ?? null };
  };

  const plan: Plan = {
    tracks: TRACKS,
    cards: CARDS,
    card: (id) => CARD_BY_ID.get(id),
    cardsOf,
    info,
    addCards(ids) {
      const ok = ids.filter((id) => CARD_BY_ID.has(id));
      const r = addCards(g, st, ok, d.now());
      if (!r.added.length) return { added: 0, skipped: ids.length };
      g = syncSlots(r.save, (st = derive(r.save)));
      emitPods();
      emitXp();
      changed();
      return { added: r.added.length, skipped: ids.length - r.added.length };
    },
    stats(): PlanStats {
      const l = path();
      const items = [...st.items.values()];
      return {
        xp: st.xp,
        level: l.label,
        ratio: l.ratio,
        path: l,
        total: TOTAL,
        thresholds: THRESHOLDS,
        sessionGain: Math.max(0, l.pos - pos0),
        masteredTotal: items.filter((it) => it.wins > 0).length,
        inProgress: items.filter((it) => it.stage !== null).length,
        answersTotal: st.answers,
      };
    },
    learned() {
      const by = new Map<TrackId, string[]>();
      for (const c of CARDS) if ((st.items.get(c.id)?.wins ?? 0) > 0) by.set(c.track, [...(by.get(c.track) ?? []), c.id]);
      return TRACKS.filter((t) => by.has(t.id)).map((t) => ({ track: t.id, ids: by.get(t.id)! }));
    },
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    next(mode, only) {
      const track = MODE_TRACK[mode];
      const id = only ?? pickTask(g, st, { recent, accept: (x) => CARD_BY_ID.get(x)?.track === track });
      if (!id) {
        d.bus.emit('work:focus', { id: null, tile: null, label: '' });
        return null;
      }
      recent.push(id);
      if (recent.length > 8) recent.shift();
      const made = makeQuestion(mode, id, rand, { seen });
      if (!made) return null;
      if (made.kind === 'scenario') seen.add(made.scenarioId);
      const q: Question = { ...made, progress: nextText(st.items.get(id)) };
      const slot = g.slots[id];
      const cell = slot !== undefined ? POD_CELLS[slot] : undefined;
      d.bus.emit('work:focus', { id, tile: cell ? [cell[0], cell[1]] : null, label: labelOf(id) });
      return q;
    },
    answer(q, given) {
      const now = d.now();
      const r = grade(q, given);
      const p0 = path();
      const slot = g.slots[q.id];
      const cell = slot !== undefined ? POD_CELLS[slot] : undefined;
      const e: AnswerEntry = { t: now, id: q.id, ok: r.ok, mode: q.mode };
      g = { ...g, log: [...g.log, e] };
      const o = applyAnswer(st, e);
      g = syncSlots(g, st);
      const act: PodAct = { kind: o.kind === 'none' ? 'work' : o.kind, id: q.id, label: labelOf(q.id), tile: cell ? [cell[0], cell[1]] : null, xp: o.xp };
      d.bus.emit('work:act', act);
      emitPods();
      const p1 = path();
      emitXp(o.xp, p1.sub > p0.sub);
      changed();
      const c = CARD_BY_ID.get(q.id) as Card;
      return {
        ok: r.ok,
        correct: r.correct,
        card: { front: c.front, back: c.back },
        ...(q.kind === 'scenario' ? { explain: q.explain } : {}),
        act,
        progress: nextText(st.items.get(q.id)),
        path: { from: p0.pos, to: p1.pos, sub: p1.sub, label: p1.label },
      };
    },
    modeOf(id) {
      const t = CARD_BY_ID.get(id)?.track;
      return t === 'structure' ? 2 : t === 'glossary' ? 3 : 1;
    },
    pods,
    counts() {
      const out: Record<TrackId, number> = { policies: 0, structure: 0, glossary: 0 };
      for (const p of pods()) {
        const t = CARD_BY_ID.get(p.id)?.track;
        if (t) out[t]++;
      }
      return out;
    },
    refresh() {
      const ng = syncSlots(g, st);
      if (ng !== g) {
        g = ng;
        changed();
      }
      emitPods();
      emitXp();
    },
    get plan() {
      return g;
    },
    get state() {
      return st;
    },
  };
  return plan;
}
