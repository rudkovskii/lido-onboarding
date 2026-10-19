// Мини-игра: панель вопроса снизу, как диалог Stardew; мир сверху виден, герой бегает сам и работа рабочее место.
// Поток идёт раундами по 10 заданий (`ui/roundSummary.ts`): шапка «3 / 10», после 10-го итог раунда с «Next round» / «Back».
// Следующее задание даёт `deps.next`. Выход в любой момент: Esc, «Exit». Тап по карте игру не закрывает (мир виден специально).
// Два вида заданий: выбор из строк (`choice`) и сценарий с тремя крупными кнопками OK / Violation / Ask first (`scenario`).
// После ответа: вердикт, пояснение и правило карточки, потом «Next».
import { bus as globalBus, type Bus } from '../systems/bus';
import type { GameMode } from '../systems/content';
import { VERDICTS, VERDICT_LABEL, type Question } from '../systems/quiz';
import type { BusEvents } from '../types/bus';
import { el } from './dom';
import { MODE_NAME } from './glossary';
import { Round, renderRoundSummary, roundCss, ROUND_SIZE } from './roundSummary';
import { THEME_CSS } from './theme';

export interface AnswerResult {
  ok: boolean;
  /** Правильный ответ (как показать). */
  correct: string;
  /** Карточка, которую работа ответ. */
  card: { front: string; back: string };
  /** Сценарий: почему так. */
  explain?: string;
  /** Что осталось рабочее место после ответа. */
  progress?: string;
  /** Действие героя по ответу (для итога раунда: полито, выросло, собрано, опыт). */
  act?: { kind: 'work' | 'advance' | 'master' | 'miss'; xp: number };
  /** Путь к Onboarded до и после ответа и название уровня после ответа. */
  path?: { from: number; to: number; sub: number; label: string };
}

export interface MinigameDeps {
  bus?: Bus<BusEvents>;
  /** Следующее задание; `only` — одиночный повтор рабочее место (Practice). null — работа нечего. */
  next(mode: GameMode, only?: string): Question | null;
  answer(q: Question, given: string): AnswerResult;
  /** Мини-игра закрылась. */
  onExit?(): void;
}

export interface Minigame {
  start(mode: GameMode, only?: string): void;
  stop(): void;
  readonly isOpen: boolean;
  readonly mode: GameMode | null;
  readonly question: Question | null;
  root: HTMLElement;
}

const css = `
${THEME_CSS}
${roundCss}
.pq-game { position: fixed; left: 0; right: 0; bottom: 0; z-index: 55; display: flex; justify-content: center; pointer-events: none;
  padding: 0 calc(env(safe-area-inset-right) + 8px) calc(env(safe-area-inset-bottom) + 8px) calc(env(safe-area-inset-left) + 8px);
  font: 16px/1.3 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: var(--pq-ink); hyphens: none; -webkit-hyphens: none; }
.pq-game * { hyphens: none; -webkit-hyphens: none; }
.pq-game[hidden] { display: none; }
.pq-game-box { pointer-events: auto; width: min(720px, 100%); box-sizing: border-box; background: var(--pq-wood); border: 3px solid var(--pq-ink); border-radius: 12px;
  box-shadow: 0 4px 0 var(--pq-ink), inset 0 0 0 2px var(--pq-wood-dark); padding: 6px 8px 8px; height: clamp(280px, 60dvh, 460px); max-height: calc(100dvh - 24px); display: flex; flex-direction: column; }
.pq-game-head { flex: 0 0 auto; min-height: 38px; flex-wrap: nowrap; display: flex; justify-content: space-between; align-items: center; gap: 8px; color: var(--pq-cream); padding: 0 2px 6px; font-weight: 700; font-size: 14px; }
.pq-game-head .pq-btn { padding: 6px 10px; font-size: 14px; flex: 0 0 auto; }
.pq-game-paper { flex: 1 1 auto; min-height: 0; background: var(--pq-cream); border: 2px solid var(--pq-ink); border-radius: 6px; padding: 10px 12px; overflow-y: auto; overflow-x: hidden; transition: background .15s; display: flex; flex-direction: column; gap: 8px; }
/* Закреплённая полоса действий: «Next» всегда на одном месте и не уходит за край. */
.pq-game-foot { flex: 0 0 auto; display: flex; gap: 8px; align-items: stretch; min-height: 46px; padding-top: 8px; }
.pq-game-foot .pq-btn { flex: 1 1 auto; }
.pq-game-foot .pq-btn.wait { opacity: .5; }
.pq-game-foot .pq-btn[data-next] { font-size: 18px; font-weight: 800; padding-top: 12px; padding-bottom: 12px; }
.pq-game-foot .pq-btn.pq-back { flex: 1.3 1 0; background: #f2d552; color: var(--pq-ink); white-space: nowrap; padding-left: 6px; padding-right: 6px; }
.pq-game-paper.ok { background: #d6efc0; }
.pq-game-paper.bad { background: #f6d7cc; }
.pq-q { font-size: 21px; font-weight: 800; margin: 0 0 2px; overflow-wrap: break-word; line-height: 1.25; }
.pq-q.scn { font-size: 19px; font-weight: 700; }
.pq-q-hint { font-size: 13px; opacity: .7; }
.pq-progress { font-size: 13px; color: #4a6b2a; font-weight: 600; }
.pq-roundno { flex: 0 0 auto; font-size: 13px; font-weight: 800; background: var(--pq-wood-dark); border: 1px solid var(--pq-cream); border-radius: 6px; padding: 1px 7px; white-space: nowrap; font-variant-numeric: tabular-nums; }
.pq-roundno[hidden] { display: none; }
.pq-game-title { min-width: 0; flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pq-game-title small { font-size: 11px; font-weight: 600; opacity: .7; margin-left: 6px; }
.pq-qblock { flex: 0 0 auto; }
/* Варианты: короткие — сетка 2×2, длинные — колонкой. */
.pq-opts { display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: minmax(54px, auto); gap: 8px; }
.pq-opts.col { grid-template-columns: 1fr; grid-auto-rows: minmax(48px, auto); }
.pq-opts.verdicts { grid-template-columns: repeat(3, 1fr); grid-auto-rows: 72px; }
.pq-game .pq-opt { display: flex; align-items: center; gap: 6px; box-sizing: border-box; text-align: left; color: var(--pq-ink); background: #fffaf0; font-size: 16px; line-height: 1.2; padding: 8px 10px; }
.pq-game .pq-opt .n { flex: 0 0 auto; min-width: 14px; opacity: .5; font-size: 13px; }
.pq-game .pq-opt .t { flex: 1 1 auto; min-width: 0; overflow-wrap: break-word; }
.pq-opts.col .pq-opt { font-size: 15px; }
.pq-opts.verdicts .pq-opt { justify-content: center; text-align: center; font-size: 19px; font-weight: 800; }
.pq-opts.verdicts .pq-opt .n { position: absolute; margin: -44px 0 0 -2px; }
.pq-opts.verdicts .pq-opt[data-opt='ok'] { background: #cfe8b4; }
.pq-opts.verdicts .pq-opt[data-opt='violation'] { background: #f3c1b6; }
.pq-opts.verdicts .pq-opt[data-opt='ask'] { background: #f6e3a2; }
.pq-game .pq-opt.right { background: #8cc66a !important; }
.pq-game .pq-opt.wrong { background: #e88e7c !important; }
.pq-game .pq-opt[disabled] { opacity: 1; }
.pq-game .pq-opt[disabled]:not(.right):not(.wrong) { opacity: .55; }
.pq-fb { font-size: 15px; display: flex; flex-direction: column; gap: 4px; }
.pq-fb .big { font-size: 19px; font-weight: 800; line-height: 1.2; overflow-wrap: break-word; }
.pq-fb .why { font-weight: 600; }
.pq-fb .rule { font-size: 14px; background: #fffaf0; border: 2px solid var(--pq-wood-dark); border-radius: 6px; padding: 5px 8px; overflow-wrap: break-word; }
.pq-fb .rule b { font-weight: 800; }
.pq-game.kb .is-focus, .pq-game :focus-visible { outline: 3px solid var(--pq-accent); outline-offset: 1px; }
@media (max-width: 520px) {
  .pq-game-title small { display: none; }
  .pq-exit-lbl { display: none; }
  .pq-game-head .pq-btn.pq-exit { min-width: 40px; }
  .pq-q { font-size: 18px; } .pq-q.scn { font-size: 17px; } .pq-fb { font-size: 14px; } .pq-fb .big { font-size: 17px; }
  .pq-game-paper { padding: 8px; }
  .pq-opts.verdicts { grid-auto-rows: 64px; } .pq-opts.verdicts .pq-opt { font-size: 16px; padding: 6px 4px; }
}
`;

/** Через сколько после проверки «Next» начинает нажиматься. */
export const NEXT_DELAY_MS = 300;
/** Первые мс итога раунда клавиша действия его не нажимает: не промахнуться по «Back» на «Next». */
export const SUMMARY_GUARD_MS = 400;

export function mountMinigame(parent: HTMLElement, deps: MinigameDeps): Minigame {
  const bus = deps.bus ?? globalBus;
  const title = el('span', { class: 'pq-game-title', 'data-title': '' }, '');
  const roundNo = el('span', { class: 'pq-roundno', 'data-round-no': '', title: 'Task in this round', hidden: true }, `1 / ${ROUND_SIZE}`);
  const exitBtn = el('button', { type: 'button', class: 'pq-btn pq-exit', 'data-exit': '', 'aria-label': 'Exit', onclick: () => api.stop() }, el('span', { class: 'pq-exit-lbl' }, 'Exit '), '✕');
  const paper = el('div', { class: 'pq-game-paper', 'data-game': '' });
  const foot = el('div', { class: 'pq-game-foot', 'data-foot': '' });
  const box = el('div', { class: 'pq-game-box', role: 'dialog', 'aria-label': 'Mini-game' }, el('div', { class: 'pq-game-head' }, title, roundNo, exitBtn), paper, foot);
  const root = el('div', { class: 'pq-game', hidden: true }, el('style', {}, css), box);
  parent.append(root);

  let open = false;
  let mode: GameMode | null = null;
  let only: string | undefined;
  let q: Question | null = null;
  let answered = false;
  let focusIdx = -1;
  /** Рамка выбора нужна только тому, кто ходит стрелками; на тапе и до первой стрелки ничего не обведено. */
  let kbNav = false;
  let nextReady = true;
  const round = new Round();
  let roundN = 1;
  let summaryOpen = false;
  let summaryAt = 0;
  let armTimer: ReturnType<typeof setTimeout> | null = null;

  const navs = (): HTMLElement[] => [...root.querySelectorAll<HTMLElement>('[data-nav]')].filter((n) => !(n as HTMLButtonElement).disabled);
  const setFocus = (i: number): void => {
    for (const n of root.querySelectorAll('.is-focus')) n.classList.remove('is-focus');
    const list = navs();
    if (!list.length) return;
    focusIdx = (i + list.length) % list.length;
    if (kbNav) list[focusIdx]!.classList.add('is-focus');
  };
  /** Стрелки: вправо/вниз — следующий, влево/вверх — предыдущий (сетка 2×2 и колонка читаются одинаково). */
  const moveTarget = (dir: 'up' | 'down' | 'left' | 'right'): number => {
    const list = navs();
    if (focusIdx < 0 || focusIdx >= list.length) return 0;
    const cur = list[focusIdx]!;
    const inGrid = cur.closest('.pq-opts');
    const cols = inGrid?.classList.contains('col') ? 1 : inGrid?.classList.contains('verdicts') ? 3 : inGrid ? 2 : 1;
    const step = dir === 'left' ? -1 : dir === 'right' ? 1 : dir === 'up' ? -cols : cols;
    return Math.max(0, Math.min(list.length - 1, focusIdx + step));
  };
  const paintRound = (): void => {
    roundNo.hidden = !!only;
    const shown = summaryOpen ? round.count : Math.min(ROUND_SIZE, round.count + (answered ? 0 : 1));
    roundNo.textContent = `${shown} / ${ROUND_SIZE}`;
  };
  const reportHeight = (): void => {
    if (!open) return;
    bus.emit('work:auto', { on: true, bottom: Math.round(box.getBoundingClientRect().height + 12) });
  };
  const clearTimer = (): void => {
    if (armTimer) clearTimeout(armTimer);
    armTimer = null;
    nextReady = true;
  };

  const finish = (r: AnswerResult): void => {
    answered = true;
    round.add(r);
    paintRound();
    paper.classList.add(r.ok ? 'ok' : 'bad');
    const fb = el('div', { class: 'pq-fb', 'data-feedback': r.ok ? 'ok' : 'bad' });
    fb.append(el('div', { class: 'big', 'data-verdict': '' }, r.ok ? `✓ Correct${q?.kind === 'scenario' ? `: ${r.correct}` : ''}` : q?.kind === 'scenario' ? `✗ Not quite. It is: ${r.correct}` : `✗ Not quite. Correct answer: ${r.correct}`));
    if (r.explain) fb.append(el('div', { class: 'why', 'data-explain': '' }, r.explain));
    fb.append(el('div', { class: 'rule', 'data-rule': '' }, el('b', {}, r.card.front), ' — ', r.card.back));
    if (r.progress) fb.append(el('div', { class: 'pq-progress', 'data-progress-after': '' }, `🖥 ${r.progress}`));
    // «Next» просыпается через 300 мс: двойной тап по варианту не пропускает следующее задание.
    nextReady = false;
    const next = el('button', { type: 'button', class: 'pq-btn wait', 'data-nav': '', 'data-next': '', onclick: () => nextReady && advance() }, 'Next →');
    armTimer = setTimeout(() => {
      armTimer = null;
      nextReady = true;
      next.classList.remove('wait');
    }, NEXT_DELAY_MS);
    // Результат встаёт на место вопроса; варианты остаются, правильный подсвечен.
    const host = paper.querySelector<HTMLElement>('.pq-qblock');
    if (host) host.replaceChildren(fb);
    else paper.prepend(fb);
    for (const b of box.querySelectorAll<HTMLButtonElement>('.pq-opt')) b.disabled = true;
    foot.replaceChildren(next);
    paper.scrollTop = 0;
    setFocus(navs().indexOf(next));
    next.focus({ preventScroll: true });
    requestAnimationFrame(reportHeight);
  };

  const submit = (given: string): void => {
    if (!q || answered || !given) return;
    finish(deps.answer(q, given));
  };

  const pick = (i: number): void => {
    if (!q || answered) return;
    const btns = [...paper.querySelectorAll<HTMLButtonElement>('.pq-opt')];
    const btn = btns[i];
    const value = btn?.dataset.opt;
    if (!btn || value === undefined) return;
    const right = q.kind === 'scenario' ? q.verdict : q.answer;
    btn.classList.add(value === right ? 'right' : 'wrong');
    btns.find((b) => b.dataset.opt === right)?.classList.add('right');
    submit(value);
  };

  const renderOptions = (qq: Question): HTMLElement => {
    const verdicts = qq.kind === 'scenario';
    const items = qq.kind === 'scenario' ? VERDICTS.map((v) => ({ value: v as string, text: VERDICT_LABEL[v] })) : qq.options.map((o) => ({ value: o, text: o }));
    const long = !verdicts && items.some((o) => o.text.length > 26);
    const grid = el('div', { class: `pq-opts${verdicts ? ' verdicts' : long ? ' col' : ''}` });
    items.forEach((o, i) => grid.append(el('button', { type: 'button', class: 'pq-btn pq-opt', 'data-nav': '', 'data-opt': o.value, onclick: () => pick(i) }, el('span', { class: 'n' }, `${i + 1}`), el('span', { class: 't' }, o.text))));
    return grid;
  };

  const render = (): void => {
    clearTimer();
    paper.classList.remove('ok', 'bad');
    paper.replaceChildren();
    foot.replaceChildren();
    paper.scrollTop = 0;
    answered = false;
    summaryOpen = false;
    focusIdx = -1;
    paintRound();
    if (!q || !mode) {
      paper.append(el('div', { class: 'pq-q' }, 'Nothing to work on yet'), el('div', { class: 'pq-q-hint' }, 'Add cards of this track to your plan at the Handbook (reception desk) in Onboarding HQ.'));
      requestAnimationFrame(reportHeight);
      return;
    }
    const qb = el('div', { class: 'pq-qblock', 'data-qblock': '' }, el('div', { class: q.kind === 'scenario' ? 'pq-q scn' : 'pq-q', 'data-prompt': '' }, q.prompt), el('div', { class: 'pq-q-hint' }, q.hint));
    if (q.progress) qb.append(el('div', { class: 'pq-progress', 'data-progress': '' }, `🖥 ${q.progress}`));
    paper.append(qb, renderOptions(q));
    setFocus(0);
    root.classList.toggle('kb', kbNav);
    reportHeight();
    requestAnimationFrame(reportHeight);
  };

  const advance = (): void => {
    clearTimer();
    if (!open || !mode) return;
    if (only && answered) {
      api.stop();
      return;
    }
    // 10 ответов в раунде: вместо следующего задания итог (одиночный повтор рабочее место раундов не знает).
    if (!only && round.done) {
      showSummary();
      return;
    }
    q = deps.next(mode, only);
    // Поливать больше нечего, а ответы в раунде уже были: итог раунда вместо пустого экрана.
    if (!q && !only && round.count > 0) {
      showSummary('Nothing left to work on in this game. Add more cards at the Handbook.');
      return;
    }
    render();
  };

  const showSummary = (note?: string): void => {
    clearTimer();
    summaryOpen = true;
    answered = true;
    q = null;
    paper.classList.remove('ok', 'bad');
    const card = renderRoundSummary(roundN, round.stats);
    if (note) card.append(el('div', { class: 'pq-sum-note', 'data-sum-note': '', style: 'margin-top:8px;font-size:14px;font-weight:600;text-align:center' }, note));
    paper.replaceChildren(card);
    paper.scrollTop = 0;
    const more = el('button', { type: 'button', class: 'pq-btn', 'data-nav': '', 'data-more': '', onclick: () => nextRound() }, 'Next round');
    // «Back»: выйти и мгновенно вернуться к месту, откуда запустил игру (`systems/entryPoint.ts`); в фокусе по умолчанию.
    const end = el('button', { type: 'button', class: 'pq-btn pq-back', 'data-nav': '', 'data-end': '', 'data-back-entry': '', onclick: () => api.stop() }, '↩ Back');
    foot.replaceChildren(end, more);
    summaryAt = performance.now();
    paintRound();
    setFocus(0);
    end.focus({ preventScroll: true });
    requestAnimationFrame(reportHeight);
  };

  const nextRound = (): void => {
    if (!open || !mode || !summaryOpen) return;
    round.reset();
    roundN++;
    summaryOpen = false;
    q = deps.next(mode, only);
    render();
  };

  const offIntent = bus.on('input:intent', (i) => {
    if (!open || i.to !== 'ui') return;
    switch (i.type) {
      case 'cancel':
        if (i.source !== 'pointer') api.stop();
        return;
      case 'hotkey':
        if (summaryOpen) {
          if (i.n === 1) nextRound();
          else if (i.n === 2) api.stop();
          return;
        }
        if (answered) return;
        pick(i.n - 1);
        return;
      case 'move':
        if (!i.held) return;
        {
          // Первое нажатие стрелки только показывает рамку там, где фокус (обычно первый вариант), а не сдвигает её.
          const first = !kbNav;
          kbNav = true;
          root.classList.add('kb');
          setFocus(first && focusIdx >= 0 ? focusIdx : moveTarget(i.dir));
        }
        return;
      case 'interact': {
        if (summaryOpen) {
          if (performance.now() - summaryAt >= SUMMARY_GUARD_MS) navs()[focusIdx]?.click();
          return;
        }
        if (answered) {
          if (nextReady) advance();
          return;
        }
        // Рамки ещё нет: первое нажатие её показывает, а не отвечает за игрока на «1».
        if (!kbNav) {
          kbNav = true;
          root.classList.add('kb');
          setFocus(Math.max(0, focusIdx));
          return;
        }
        navs()[focusIdx]?.click();
        return;
      }
      default:
        return;
    }
  });
  void offIntent;

  const api: Minigame = {
    root,
    start(m, onlyId) {
      mode = m;
      only = onlyId;
      if (!open) {
        round.reset();
        roundN = 1;
        summaryOpen = false;
      }
      title.replaceChildren(MODE_NAME[m].title, el('small', {}, MODE_NAME[m].sub));
      kbNav = false;
      root.classList.remove('kb');
      if (!open) {
        open = true;
        root.hidden = false;
        bus.emit('world:input', { enabled: false });
      }
      q = deps.next(m, only);
      render();
    },
    stop() {
      if (!open) return;
      clearTimer();
      summaryOpen = false;
      open = false;
      root.hidden = true;
      q = null;
      mode = null;
      bus.emit('work:auto', { on: false, bottom: 0 });
      bus.emit('world:input', { enabled: true });
      deps.onExit?.();
    },
    get isOpen() {
      return open;
    },
    get mode() {
      return mode;
    },
    get question() {
      return q;
    },
  };
  return api;
}
