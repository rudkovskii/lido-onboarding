// @vitest-environment happy-dom
// Ядро онбординга: контент, рост карточек, три игры, полный цикл за один заход, экраны (игра, Handbook, splash), точка входа.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CARDS, CARD_BY_ID, GAME_MODES, MODE_TRACK, SCENARIOS, STRUCTURE_QUESTIONS, TRACKS, cardsOf, type GameMode } from '../src/systems/content';
import { createEntryPoint } from '../src/systems/entryPoint';
import { createFarm, type Farm } from '../src/systems/farm';
import { ANSWERS_TO_HARVEST, newGarden, type GardenSave } from '../src/systems/garden';
import { grade, makeQuestion, type Question } from '../src/systems/quiz';
import { TOTAL, THRESHOLDS, pathOf } from '../src/systems/xp';
import type { BusEvents } from '../src/types/bus';
import { mountHandbook } from '../src/ui/handbook';
import { mountMinigame } from '../src/ui/minigame';
import { mountSplash } from '../src/ui/splash';
import { seeded, testBus } from './helpers';

function setup(seed = 3) {
  const bus = testBus();
  let g: GardenSave = newGarden();
  let t = 1_000_000;
  const farm = createFarm({ bus, load: () => g, save: (x) => (g = x), now: () => (t += 1000), rand: seeded(seed) });
  return { bus, farm, garden: () => g };
}

/** Верный ответ на задание (как его даст игрок). */
const right = (q: Question): string => (q.kind === 'scenario' ? q.verdict : q.answer);
const wrong = (q: Question): string => (q.kind === 'scenario' ? (q.verdict === 'ok' ? 'violation' : 'ok') : q.options.find((o) => o !== q.answer)!);

describe('контент', () => {
  it('три трека, ссылки сценариев и вопросов ведут на карточки своего трека', () => {
    expect(TRACKS.map((t) => t.id)).toEqual(['policies', 'structure', 'glossary']);
    expect(CARDS.length).toBe(TOTAL);
    for (const s of SCENARIOS) expect(CARD_BY_ID.get(s.card)?.track).toBe('policies');
    for (const q of STRUCTURE_QUESTIONS) {
      expect(CARD_BY_ID.get(q.card)?.track).toBe('structure');
      expect(q.wrong).toHaveLength(3);
    }
  });
  it('в UI-контенте нет кириллицы и польских букв', () => {
    const text = JSON.stringify([CARDS, SCENARIOS, STRUCTURE_QUESTIONS, TRACKS]);
    expect(text).not.toMatch(/[А-Яа-яЁёąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/);
  });
  it('путь: уровни растут, «Onboarded» только когда выучено всё', () => {
    expect(THRESHOLDS).toHaveLength(8);
    expect(pathOf({ grown: TOTAL - 1, partial: 0.9 }).done).toBe(false);
    expect(pathOf({ grown: TOTAL, partial: 0 })).toMatchObject({ done: true, label: 'Onboarded 🎉' });
  });
});

describe('игры: задание привязано к карточке, верный ответ растит, неверный нет', () => {
  const NAME: Record<GameMode, string> = { 1: 'Pool Rules', 2: "Who's Who", 3: 'Staking 101' };
  for (const mode of GAME_MODES) {
    it(`${NAME[mode]}: задание из своего трека, правильный ответ растит карточку, неправильный не растит`, () => {
      const { farm } = setup();
      const ids = cardsOf(MODE_TRACK[mode]).slice(0, 3).map((c) => c.id);
      farm.plant(ids);
      const q = farm.next(mode)!;
      expect(q).toBeTruthy();
      expect(CARD_BY_ID.get(q.id)?.track).toBe(MODE_TRACK[mode]);
      const bad = farm.answer(q, wrong(q));
      expect(bad.ok).toBe(false);
      expect(farm.info(q.id).stage).toBe('seed');
      expect(farm.info(q.id).drops).toBe(0);
      const q2 = farm.next(mode, q.id)!;
      const good = farm.answer(q2, right(q2));
      expect(good.ok).toBe(true);
      expect(farm.info(q.id).stage).toBe('sprout'); // семя → росток за 1 верный
    });
  }

  it('Pool Rules: в основном сценарии (вердикт OK / Violation / Ask first + пояснение), остальное — вспоминание правила из 4', () => {
    const rand = seeded(5);
    const kinds: string[] = [];
    for (const c of cardsOf('policies')) for (let i = 0; i < 4; i++) kinds.push(makeQuestion(1, c.id, rand)!.source);
    const scn = kinds.filter((k) => k === 'scenario').length;
    expect(scn).toBeGreaterThan(kinds.length / 4);
    const s = SCENARIOS[0]!;
    const q = makeQuestion(1, s.card, () => 0, { seen: new Set() })!;
    expect(q.kind).toBe('scenario');
    if (q.kind === 'scenario') expect(grade(q, q.verdict).ok).toBe(true);
    const recall = makeQuestion(1, s.card, () => 0.99, { seen: new Set(SCENARIOS.map((x) => x.id)) })!;
    expect(recall.kind).toBe('choice');
    if (recall.kind === 'choice') {
      expect(recall.options).toHaveLength(4);
      expect(new Set(recall.options).size).toBe(4);
      expect(recall.answer).toBe(CARD_BY_ID.get(s.card)!.back);
    }
  });

  it("Who's Who: вопрос из structureQuestions (верный + 3 неверных) и карточки в обе стороны; Staking 101: термин↔смысл", () => {
    const sq = STRUCTURE_QUESTIONS[0]!;
    const q = makeQuestion(2, sq.card, () => 0, { seen: new Set() })!;
    expect(q.kind === 'choice' && q.source).toBe('structure');
    if (q.kind === 'choice') expect([...q.options].sort()).toEqual([sq.a, ...sq.wrong].sort());
    const dirs = new Set<string>();
    for (let i = 0; i < 40; i++) dirs.add(makeQuestion(3, cardsOf('glossary')[0]!.id, seeded(i + 1))!.source);
    expect(dirs).toEqual(new Set(['recall', 'reverse']));
    expect(makeQuestion(3, 'pol.keys', () => 0)).toBeNull(); // карточка чужого трека
  });
});

describe('рост без дней: семя → росток 1, → куст +2, → урожай +1', () => {
  it('полный цикл карточки за один заход, урожай уходит на полку «Learned»', () => {
    const { farm, bus } = setup();
    const acts: BusEvents['farm:act'][] = [];
    bus.on('farm:act', (a) => acts.push(a));
    const id = cardsOf('glossary')[0]!.id;
    farm.plant([id]);
    const stages: (string | null)[] = [];
    for (let i = 0; i < ANSWERS_TO_HARVEST; i++) {
      const q = farm.next(3)!;
      farm.answer(q, right(q));
      stages.push(farm.info(id).stage);
    }
    expect(stages).toEqual(['sprout', 'sprout', 'bush', null]);
    expect(farm.info(id)).toMatchObject({ status: 'grown', harvests: 1 });
    expect(acts.map((a) => a.kind)).toEqual(['grow', 'water', 'grow', 'harvest']);
    expect(farm.learned()).toEqual([{ track: 'glossary', ids: [id] }]);
    expect(farm.next(3)).toBeNull(); // поливать больше нечего
  });

  it('сессия в ~10 минут: посадить трек и пройти раунды до «Onboarded» без дней и пропусков', () => {
    const { farm } = setup(11);
    for (const t of TRACKS) farm.plant(cardsOf(t.id).map((c) => c.id));
    let answers = 0;
    for (const mode of GAME_MODES) {
      for (let guard = 0; guard < 400; guard++) {
        const q = farm.next(mode);
        if (!q) break;
        farm.answer(q, right(q));
        answers++;
      }
    }
    expect(farm.stats()).toMatchObject({ grownTotal: TOTAL, growing: 0 });
    expect(farm.stats().path.done).toBe(true);
    // ровно 4 верных ответа на карточку: даже 47 карточек влезают в один заход
    expect(answers).toBe(TOTAL * ANSWERS_TO_HARVEST);
  });

  it('ошибка снимает каплю, но не стадию', () => {
    const { farm } = setup();
    const id = cardsOf('structure')[0]!.id;
    farm.plant([id]);
    let q = farm.next(2, id)!;
    farm.answer(q, right(q)); // росток
    q = farm.next(2, id)!;
    farm.answer(q, right(q)); // 1 из 2
    expect(farm.info(id)).toMatchObject({ stage: 'sprout', drops: 1 });
    q = farm.next(2, id)!;
    farm.answer(q, wrong(q));
    expect(farm.info(id)).toMatchObject({ stage: 'sprout', drops: 0 });
  });

  it('прогресс переживает перезагрузку (сад выводится из журнала)', () => {
    const a = setup();
    const id = cardsOf('policies')[0]!.id;
    a.farm.plant([id]);
    const q = a.farm.next(1, id)!;
    a.farm.answer(q, right(q));
    const again: Farm = createFarm({ bus: testBus(), load: () => a.garden(), save: () => undefined, now: () => 9_999_999 });
    expect(again.info(id).stage).toBe('sprout');
  });
});

/** Нажать «Next» без ожидания 300 мс (кнопка включается по таймеру). */
function nextClick(root: HTMLElement): void {
  vi.advanceTimersByTime(400);
  root.querySelector<HTMLButtonElement>('[data-next]')!.click();
}

describe('экраны', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  it('мини-игра: сценарий с тремя кнопками, вердикт + пояснение + правило, «Next», раунд из 10 и итог', () => {
    const bus = testBus();
    const f = setup(7);
    f.farm.plant(cardsOf('policies').map((c) => c.id));
    const root = document.createElement('div');
    document.body.append(root);
    const game = mountMinigame(root, { bus, next: (m, only) => f.farm.next(m, only), answer: (q, given) => f.farm.answer(q, given) });
    game.start(1);
    expect(root.querySelector('[data-title]')?.textContent).toContain('Pool Rules');
    for (let i = 1; i <= 10; i++) {
      const q = game.question!;
      if (q.kind === 'scenario') expect([...root.querySelectorAll('[data-opt]')].map((b) => b.textContent?.replace(/^\d/, ''))).toEqual(['OK', 'Violation', 'Ask first']);
      root.querySelector<HTMLButtonElement>(`[data-opt="${CSS.escape(right(q))}"]`)!.click();
      expect(root.querySelector('[data-feedback="ok"]')).not.toBeNull();
      expect(root.querySelector('[data-rule]')).not.toBeNull();
      if (q.kind === 'scenario') expect(root.querySelector('[data-explain]')?.textContent).toBe(SCENARIOS.find((s) => s.id === q.scenarioId)!.explain);
      expect(root.querySelector('[data-round-no]')?.textContent).toBe(`${i} / 10`);
      root.querySelector<HTMLButtonElement>('[data-next]')!.classList.remove('wait');
      nextClick(root);
    }
    // 10 ответов → вместо 11-го задания итог раунда
    expect(root.querySelector('[data-round-summary]')).not.toBeNull();
    expect(game.isOpen).toBe(true);
    game.stop();
    expect(game.isOpen).toBe(false);
  });

  it('Handbook: три вкладки, посадка одной карточки и целого трека', () => {
    const f = setup();
    const root = document.createElement('div');
    const hb = mountHandbook(root, f.farm, f.bus);
    hb.open();
    const tabs = [...root.querySelectorAll('[data-tab]')];
    expect(tabs.map((t) => t.getAttribute('data-tab'))).toEqual(['policies', 'structure', 'glossary']);
    expect(tabs.map((t, i) => t.textContent!.startsWith(TRACKS[i]!.title))).toEqual([true, true, true]);
    expect(root.querySelector('[data-phantom]')?.textContent).toContain('invented');
    root.querySelector<HTMLButtonElement>('[data-plant]')!.click();
    expect(f.farm.stats().growing).toBe(1);
    root.querySelector<HTMLButtonElement>('[data-tab="glossary"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-plant-track="glossary"]')!.click();
    expect(f.farm.stats().growing).toBe(1 + cardsOf('glossary').length);
    expect(root.querySelector('[data-phantom]')).toBeNull();
  });

  it('splash: заголовок, оговорка, «Start» открывает мир (world:input)', () => {
    const bus = testBus();
    const inputs: boolean[] = [];
    bus.on('world:input', (e) => inputs.push(e.enabled));
    const root = document.createElement('div');
    const s = mountSplash(root, { bus });
    expect(root.textContent).toContain('Lido Pool · Onboarding (prototype)');
    expect(root.textContent).toContain('Not an official Lido product. Policies in this demo are fictional; structure facts are public.');
    root.querySelector<HTMLButtonElement>('[data-splash-start]')!.click();
    expect(s.isOpen).toBe(false);
    expect(root.querySelector('[data-splash]')).toBeNull();
    expect(inputs).toEqual([false, true]);
  });

  it('точка входа: герой возвращается на место, откуда запущена игра', () => {
    const bus = testBus();
    const e = createEntryPoint(bus);
    const back: BusEvents['world:return'][] = [];
    bus.on('world:return', (s) => back.push(s));
    bus.emit('world:interact', { location: 'farm', use: 'board', id: 'board', key: 'prop:board', label: 'x', tile: [12, 9], via: 'tap', facing: 'up', hero: [12, 10] });
    bus.emit('farm:auto', { on: true, bottom: 300 });
    expect(e.holding).toBe(true);
    bus.emit('farm:auto', { on: false, bottom: 0 });
    expect(back).toEqual([{ map: 'farm', x: 12, y: 10, facing: 'up' }]);
    expect(e.holding).toBe(false);
  });
});
