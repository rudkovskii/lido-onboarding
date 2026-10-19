// Раунды мини-игры: по 10 заданий, потом итог в стиле Stardew («Next round» / «Back»). Лимита на число раундов нет.
// Здесь счёт раунда (чистая часть) и карточка итога; шапку «3 / 10» и переходы ведёт `ui/minigame.ts`.
import { growthText, levelLabel } from '../systems/xp';
import { el } from './dom';

/** Заданий в одном раунде. */
export const ROUND_SIZE = 10;

/** Что нужно раунду от результата ответа (подмножество `AnswerResult`). */
export interface RoundAnswer {
  ok: boolean;
  /** Действие героя: работа, рост, освоение, промах; `xp` — опыт за ответ. */
  act?: { kind: 'work' | 'advance' | 'master' | 'miss'; xp: number };
  /** Путь к Onboarded до и после ответа (позиция в уровнях) и название после ответа. */
  path?: { from: number; to: number; sub: number; label: string };
}

export interface RoundStats {
  total: number;
  correct: number;
  /** Отработано: каждый верный ответ = один заход героя к рабочему месту. */
  worked: number;
  /** Сменили стадию (Started, Practiced). */
  grew: number;
  /** Освоено карточек. */
  mastered: number;
  xp: number;
  bestStreak: number;
  /** Путь к Onboarded: позиция до первого и после последнего ответа раунда, название и номер уровня сейчас. */
  path?: { from: number; to: number; sub: number; label: string };
}

/** Счётчик раунда: `add` на каждый ответ, `done` — раунд набрал `ROUND_SIZE`. */
export class Round {
  private s: RoundStats = emptyStats();
  private streak = 0;

  get stats(): Readonly<RoundStats> {
    return this.s;
  }
  get count(): number {
    return this.s.total;
  }
  get done(): boolean {
    return this.s.total >= ROUND_SIZE;
  }
  add(r: RoundAnswer): void {
    const s = this.s;
    s.total++;
    s.xp += r.act?.xp ?? 0;
    if (r.path) s.path = { from: s.path?.from ?? r.path.from, to: r.path.to, sub: r.path.sub, label: r.path.label };
    if (r.ok) {
      s.correct++;
      this.streak++;
      s.bestStreak = Math.max(s.bestStreak, this.streak);
      const k = r.act?.kind;
      if (k !== 'miss') s.worked++;
      if (k === 'advance') s.grew++;
      if (k === 'master') s.mastered++;
    } else this.streak = 0;
  }
  reset(): void {
    this.s = emptyStats();
    this.streak = 0;
  }
}

function emptyStats(): RoundStats {
  return { total: 0, correct: 0, worked: 0, grew: 0, mastered: 0, xp: 0, bestStreak: 0 };
}

export const roundCss = `
.pq-round { display: flex; flex-direction: column; gap: 4px; }
.pq-round h3 { margin: 0 0 2px; font-size: 20px; font-weight: 800; text-align: center; }
.pq-round .sub { text-align: center; font-size: 13px; opacity: .7; margin-bottom: 4px; }
.pq-round dl { margin: 0; display: grid; grid-template-columns: 1fr auto; row-gap: 3px; column-gap: 6px; font-size: 16px; }
.pq-round dt { display: flex; align-items: baseline; gap: 6px; overflow: hidden; white-space: nowrap; }
.pq-round dt::after { content: ''; flex: 1 1 auto; border-bottom: 2px dotted rgba(42, 20, 24, .35); transform: translateY(-3px); }
.pq-round dd { margin: 0; font-weight: 800; text-align: right; font-variant-numeric: tabular-nums; }
.pq-round .xp dd { color: #4a6b2a; }
.pq-round .way { margin-top: 6px; padding: 6px 8px; text-align: center; background: #fffaf0; border: 2px solid var(--pq-wood-dark); border-radius: 8px; font-size: 15px; font-weight: 700; }
.pq-round .way b { color: #4a6b2a; }
/* Узко: итог в две колонки и без подзаголовка, чтобы все 6 строк влезали в панель без прокрутки. */
@media (max-width: 520px) { .pq-round h3 { font-size: 18px; } .pq-round .sub { display: none; } .pq-round dl { grid-template-columns: 1fr auto 1fr auto; column-gap: 8px; row-gap: 8px; font-size: 14px; } }
`;

/** Карточка итога раунда. `n` — номер раунда за этот заход (1, 2, …). */
export function renderRoundSummary(n: number, s: Readonly<RoundStats>): HTMLElement {
  const row = (label: string, value: string, cls = ''): HTMLElement[] => [el('dt', cls ? { class: cls } : {}, label), el('dd', cls ? { class: cls } : {}, value)];
  const good = s.total > 0 && s.correct === s.total ? 'Flawless!' : s.correct * 10 >= s.total * 8 ? 'Good round' : 'Round finished';
  return el(
    'div',
    { class: 'pq-round', 'data-round-summary': '' },
    el('h3', {}, `Round ${n} · summary`),
    el('div', { class: 'sub' }, good),
    el(
      'dl',
      {},
      ...row('Correct', `${s.correct} of ${s.total}`),
      ...row('Worked', String(s.worked)),
      ...row('Moved up', String(s.grew)),
      ...row('Mastered', String(s.mastered)),
      ...row('XP', `+${s.xp}`, 'xp'),
      ...row('Best streak', String(s.bestStreak)),
    ),
    wayLine(s.path),
  );
}

/** Строка пути: «Level 2/8 · +0.4 level» (рост раунда — только если он есть). */
function wayLine(p: RoundStats['path']): HTMLElement | null {
  if (!p) return null;
  const where = levelLabel(p.sub);
  const grow = growthText(p.to - p.from);
  return el('div', { class: 'way', 'data-round-way': '' }, where, grow ? ' · ' : '', grow ? el('b', {}, grow) : null);
}
