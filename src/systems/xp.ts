// Путь к «Onboarded»: очки, 8 уровней («Level N») и итоговый «Onboarded». Чистая часть, без браузера и хранилища: уровень не
// хранится, а выводится из состояния сада (журнал ответов).
//
// Очки: выученная (собранная) карточка 1. Растущее считается частично (только после первого ответа по нему), чтобы полоска
// двигалась с первых ответов: семечко 0,1 / росток 0,3 / кустик 0,6 веса. Onboarded = все карточки выучены.
import { CARDS } from './content';
import type { ItemState } from './garden';

export const SUB_COUNT = 8;

export interface Sublevel {
  /** Номер 0…8 (0 — старт, до первого порога; 9 — Onboarded). */
  n: number;
  label: string;
}

const S = (n: number, label: string): Sublevel => ({ n, label });

/** Уровни: 0 — старт, 1…8 — «Level N», дальше «Onboarded 🎉». */
export const SUBLEVELS: readonly Sublevel[] = [S(0, 'Start'), ...Array.from({ length: SUB_COUNT }, (_, i) => S(i + 1, `Level ${i + 1}`))];
export const DONE_LEVEL: Sublevel = S(SUB_COUNT + 1, 'Onboarded 🎉');

/** Короткая подпись уровня для HUD, кровати и итога раунда: «Start», «Level 3/8», «Onboarded 🎉». */
export function levelLabel(n: number): string {
  return n <= 0 ? SUBLEVELS[0]!.label : n > SUB_COUNT ? DONE_LEVEL.label : `Level ${n}/${SUB_COUNT}`;
}

/** Куда ведёт следующий порог: «Level 4» или «Onboarded» после последнего уровня. */
export const nextTarget = (n: number): string => (n >= SUB_COUNT ? 'Onboarded' : `Level ${n + 1}`);

/** Доля веса за растущее (стадия → доля). */
export const PARTIAL_BY_STAGE = { seed: 0.1, sprout: 0.3, bush: 0.6 } as const;

/** Всего очков = карточек. */
export const TOTAL = CARDS.length;

/** Пороги уровней 1…8 в очках: растут чуть быстрее начала, 8-й уровень — 90 % пути. Строго возрастают. */
export function thresholds(total: number): number[] {
  const end = Math.max(SUB_COUNT, Math.round(total * 0.9));
  const out: number[] = [];
  for (let k = 1; k <= SUB_COUNT; k++) out.push(Math.max(1, Math.round(end * (k / SUB_COUNT) ** 1.25)));
  for (let i = 1; i < out.length; i++) if (out[i]! <= out[i - 1]!) out[i] = out[i - 1]! + 1;
  return out;
}

export const THRESHOLDS: readonly number[] = thresholds(TOTAL);

/** Очки сада: выученное и частичный зачёт за растущее. */
export function pointsOf(items: Iterable<ItemState>): { grown: number; partial: number; growing: number } {
  let grown = 0;
  let partial = 0;
  let growing = 0;
  for (const it of items) {
    if (it.harvests > 0) {
      grown += 1;
      continue;
    }
    if (it.stage === null) continue;
    growing++;
    // Посаженное, но ни разу не отвеченное не считается: путь двигают ответы, а не посадки.
    if (it.answers === 0) continue;
    partial += PARTIAL_BY_STAGE[it.stage];
  }
  return { grown, partial, growing };
}

export interface PathInfo {
  /** 0…8 — уровень, 9 — Onboarded. */
  sub: number;
  label: string;
  /** 0…1 внутри уровня (до следующего порога). */
  ratio: number;
  /** Непрерывная позиция: sub + ratio (для «+0.4 level»). */
  pos: number;
  /** Очки с частичным зачётом, и только выученное. */
  points: number;
  grown: number;
  total: number;
  /** Доля пути до Onboarded, 0…1 (1 — только когда всё выучено). */
  pct: number;
  /** Очков до следующего уровня; null — готово. */
  toNext: number | null;
  /** «Level 4» / «Onboarded»; null — готово. */
  nextTo: string | null;
  /** Порог следующего уровня в очках. */
  nextAt: number | null;
  done: boolean;
}

export function pathOf(p: { grown: number; partial: number }, total: number = TOTAL, th: readonly number[] = THRESHOLDS): PathInfo {
  const grown = round2(p.grown);
  const points = Math.min(total, round2(p.grown + p.partial));
  if (grown >= total) return { sub: SUB_COUNT + 1, label: DONE_LEVEL.label, ratio: 1, pos: SUB_COUNT + 1, points: total, grown: total, total, pct: 1, toNext: null, nextTo: null, nextAt: null, done: true };
  let sub = 0;
  while (sub < th.length && points >= th[sub]!) sub++;
  const lo = sub === 0 ? 0 : th[sub - 1]!;
  const hi = sub < th.length ? th[sub]! : total;
  const ratio = Math.min(0.99, Math.max(0, (points - lo) / Math.max(1, hi - lo)));
  return {
    sub,
    label: SUBLEVELS[sub]!.label,
    ratio,
    pos: sub + ratio,
    points,
    grown,
    total,
    pct: Math.min(0.99, points / total),
    toNext: Math.max(0, Math.ceil(hi - points - 1e-9)),
    nextTo: nextTarget(sub),
    nextAt: hi,
    done: false,
  };
}

const round2 = (x: number): number => Math.round(x * 100) / 100;

/** «+0.4 level»: рост позиции, одна цифра после точки; меньше 0,1 — пусто. */
export function growthText(delta: number): string {
  const d = Math.round(delta * 10) / 10;
  if (d < 0.1) return '';
  return `+${d} ${d === 1 ? 'level' : 'levels'}`;
}
