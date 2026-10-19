// Задания мини-игр: чистые функции, случай приходит параметром (`rand`). Каждое задание привязано к карточке (`id`): верный ответ растит её.
//   1 Pool Rules (трек policies): чаще сценарий (ситуация → OK / Violation / Ask first), реже «правило → выбери формулировку из 4»;
//   2 Who's Who (трек structure): вопрос из structureQuestions (верный + 3 неверных) или карточка front → back / back → front;
//   3 Staking 101 (трек glossary): термин → смысл и смысл → термин, выбор из 4.
import type { Card, TrackId, Verdict } from '../types/content';
import { CARD_BY_ID, MODE_TRACK, SCENARIOS, STRUCTURE_QUESTIONS, cardsOf, type GameMode } from './content';

export const VERDICT_LABEL: Record<Verdict, string> = { ok: 'OK', violation: 'Violation', ask: 'Ask first' };
export const VERDICTS: readonly Verdict[] = ['ok', 'violation', 'ask'];

/** Откуда задание: сценарий, вопрос про структуру или карточка (вперёд/назад). */
export type QuestionSource = 'scenario' | 'structure' | 'recall' | 'reverse';

/**
 * `progress` — что осталось рабочее место до следующей стадии, его дописывает кампус.
 * choice: выбор из 4 строк; scenario: три крупные кнопки OK / Violation / Ask first.
 */
export type Question = (
  | { mode: GameMode; id: string; kind: 'choice'; source: Exclude<QuestionSource, 'scenario'>; prompt: string; hint: string; options: string[]; answer: string }
  | { mode: GameMode; id: string; kind: 'scenario'; source: 'scenario'; scenarioId: string; prompt: string; hint: string; verdict: Verdict; explain: string }
) & { progress?: string };

export function shuffle<T>(xs: readonly T[], rand: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const norm = (s: string): string => s.trim().toLowerCase();

/** 3 отвлекающих для карточки: поле `field` других карточек того же трека (без повторов текста). */
export function distractors(card: Card, field: 'front' | 'back', rand: () => number, n = 3, pool: readonly Card[] = cardsOf(card.track)): string[] {
  const seen = new Set([norm(card[field])]);
  const out: string[] = [];
  for (const x of shuffle(pool, rand)) {
    if (out.length >= n) break;
    const v = x[field].trim();
    if (x.id === card.id || seen.has(norm(v))) continue;
    seen.add(norm(v));
    out.push(v);
  }
  return out;
}

/** Выбор front → back или back → front. */
export function recallQuestion(mode: GameMode, card: Card, dir: 'fb' | 'bf', rand: () => number): Question {
  const [from, to] = dir === 'fb' ? (['front', 'back'] as const) : (['back', 'front'] as const);
  const options = shuffle([card[to], ...distractors(card, to, rand)], rand);
  const hints: Record<TrackId, [string, string]> = {
    policies: ['Pick the rule that goes with this topic', 'Which topic does this rule belong to?'],
    structure: ['Pick the right description', 'Pick the right name'],
    glossary: ['Pick the meaning', 'Pick the term'],
  };
  return {
    mode,
    id: card.id,
    kind: 'choice',
    source: dir === 'fb' ? 'recall' : 'reverse',
    prompt: card[from],
    hint: hints[card.track][dir === 'fb' ? 0 : 1],
    options,
    answer: card[to],
  };
}

export interface MakeOpts {
  /** Уже заданные в этой сессии сценарии и вопросы (id): свежие предпочитаются, чтобы карточка не крутила одно и то же. */
  seen?: ReadonlySet<string>;
}

/** Собрать задание для карточки `id` в игре `mode`. null — карточки нет или она из другого трека. */
export function makeQuestion(mode: GameMode, id: string, rand: () => number, opts: MakeOpts = {}): Question | null {
  const card = CARD_BY_ID.get(id);
  if (!card || card.track !== MODE_TRACK[mode]) return null;
  const seen = opts.seen ?? new Set<string>();
  if (mode === 1) {
    const fresh = SCENARIOS.filter((s) => s.card === id && !seen.has(s.id));
    // Pool Rules: в основном сценарии; когда свежих сценариев по карточке нет — вопрос на вспоминание правила.
    if (fresh.length && rand() < 0.8) {
      const s = fresh[Math.floor(rand() * fresh.length)]!;
      return { mode, id, kind: 'scenario', source: 'scenario', scenarioId: s.id, prompt: s.situation, hint: 'What do you do?', verdict: s.verdict, explain: s.explain };
    }
    return recallQuestion(mode, card, 'fb', rand);
  }
  if (mode === 2) {
    const fresh = STRUCTURE_QUESTIONS.filter((q) => q.card === id && !seen.has(q.id));
    if (fresh.length && rand() < 0.5) {
      const q = fresh[Math.floor(rand() * fresh.length)]!;
      return { mode, id, kind: 'choice', source: 'structure', prompt: q.q, hint: 'Pick the answer', options: shuffle([q.a, ...q.wrong], rand), answer: q.a };
    }
  }
  return recallQuestion(mode, card, rand() < 0.5 ? 'fb' : 'bf', rand);
}

export interface Graded {
  ok: boolean;
  /** Правильный ответ для показа. */
  correct: string;
}

/** Проверить ответ: выбор — строка варианта; сценарий — `ok` / `violation` / `ask`. */
export function grade(q: Question, given: string): Graded {
  if (q.kind === 'scenario') return { ok: given === q.verdict, correct: VERDICT_LABEL[q.verdict] };
  return { ok: given.trim() === q.answer.trim(), correct: q.answer };
}
