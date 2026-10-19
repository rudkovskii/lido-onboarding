// Полный список событий шины. Связь scenes/world ⇄ ui и склейка main.ts идут только через неё.
import type { FarmAct, PlantView } from './farm';
import type { DpadSide, Dir, MapControls, RoutedIntent, Source } from './input';

/** Объекты, с которыми можно что-то сделать (`use` в content/maps/*.json). */
export type UseKind = 'desk' | 'board' | 'bin' | 'shelf' | 'bed' | 'plant' | 'radio';

/**
 * КОНТРАКТ ДЛЯ F-03. Игрок нажал A рядом с интерактивным объектом или тапнул по нему (мир сам подошёл).
 * Мир при этом ничего не открывает: слушатель решает, что показать. Событие приходит один раз за действие.
 */
export interface WorldInteract {
  /** id карты: `home` или `farm`. */
  location: string;
  /** Что за объект: desk (Słownik), board (выбор мини-игры), bin (коробка урожая), shelf (банки), bed (кровать), radio (радио с музыкой). */
  use: UseKind | (string & {});
  /** Он же id объекта на карте (у этих пяти совпадает с `use`). */
  id: string;
  /** Ключ объекта в локации: `prop:desk`. */
  key: string;
  /** Подпись для заглушки-пузыря: «Польский · Русский». */
  label: string;
  /** Клетка объекта, с которой взаимодействовали. */
  tile: [number, number];
  via: 'action' | 'tap';
  /** Куда смотрел герой. */
  facing: Dir;
  /** Клетка, на которой стоит герой (откуда игра запущена: сюда он вернётся, `systems/entryPoint.ts`). */
  hero?: [number, number];
}

/** Звуки действий (`systems/platform/sfx.ts`): шаги, полив, урожай, ответ, окна. */
export type SfxName = 'step_grass' | 'step_wood' | 'water' | 'pick' | 'plim' | 'correct' | 'wrong' | 'grow' | 'open' | 'close';

export interface BusEvents {
  /** Мир принимает ввод (оверлей закрыт) или нет (открыт экран F-03: герой встаёт, ввод идёт в оверлей). */
  'world:input': { enabled: boolean };
  /** КОНТРАКТ ДЛЯ F-03: действие с объектом (стол, доска, коробка, полка, кровать). */
  'world:interact': WorldInteract;
  /** Герой шагнул в дверь: карта сменится сама (`to` и имя спавна). */
  'world:exit': { from: string; to: string; spawn: string };
  /** Карта загружена: роутер переключает режим ввода. */
  'world:location': { id: string; controls: MapControls };
  /** Герой остановился: склейка пишет позицию в сохранение. */
  'world:position': { location: string; x: number; y: number; facing: Dir };
  /** Опыт и путь к A1 для HUD (V11c). `level` — название уровня («Уровень 7», «Старт», «A1»); `sub` — номер 0…20 (21 — A1), `of` — уровней всего (20); `ratio` — доля внутри уровня; `pct` — доля пути до A1; `toNext` — очков до следующего уровня (null — A1); `growing` — сколько слов растёт; `xp` — всего очков опыта; `gain` — «+N» за ответ; `up` — новый уровень (вспышка, карточка, звук). */
  'hud:xp': { level: string; ratio: number; sub?: number; of?: number; pct?: number; pos?: number; toNext?: number | null; xp?: number; gain?: number; up?: boolean; growing?: number };
  /** Грядки фермы: растения и вскопанные клетки (шлёт склейка при любом изменении и при входе на ферму). */
  'farm:plants': { plants: PlantView[]; cells: [number, number][] };
  /** Мини-игра открыта (герой бегает сам) или закрыта. `bottom` — высота панели вопроса снизу, CSS px. */
  'farm:auto': { on: boolean; bottom: number };
  /** Текущее задание мини-игры: герой идёт к этой грядке, подпись над ней. */
  'farm:focus': { id: string | null; tile: [number, number] | null; label: string };
  /** Действие героя по ответу (полив, удобрение, урожай, промах): встаёт в очередь автобега. */
  'farm:act': FarmAct;
  /** Всплывающая надпись над точкой мира (экранные CSS px): «+10», подпись растения. */
  'fx:float': { x: number; y: number; text: string; kind: 'xp' | 'miss' | 'info' };
  /** Звук действия мира (шаг героя, плеск, срыв, «плим» в коробке): играет `systems/platform/sfx.ts`, если звук включён. */
  'fx:sfx': { name: SfxName };
  /** Подпись над растением у героя (экранные CSS px); null — спрятать. */
  'fx:label': { text: string; x: number; y: number } | null;
  /** Герой стоит у объекта, с которым сработает A (над ним рисуется «A»): `x`,`y` — точка над объектом в экранных CSS px; null — отошёл или экран открыт. */
  'fx:near': { use: string; id: string; x: number; y: number } | null;
  /** Первые шаги новичка (`ui/hintsGuide.ts`): к какому объекту вести героя (`desk`, `board`); null — указатель погас. */
  'guide:goal': { use: string | null };
  /** Где на экране герой и цель указателя (CSS px); `via: 'door'` — цель на другой карте, указываем на дверь. null — спрятать. */
  /** Где сейчас стрелка указателя первых шагов (экранные CSS px центра, null — скрыта): тап по ней = тап по её цели. */
  'guide:arrow': { x: number; y: number } | null;
  'fx:guide': { hero: { x: number; y: number }; target: { x: number; y: number }; via: 'object' | 'door' } | null;
  /** Мини-игра закрыта (или «Wróć» после «Na pole!»): герой и кот возвращаются на клетку, откуда игру запустили, лицом туда же. Сцена гасит экран на 150 мс и ставит героя (карту пересоздаёт, если нужна другая). */
  'world:return': { map: string; x: number; y: number; facing: Dir };
  /** Intent после роутера: `to` = мир или оверлей по фокусу. */
  'input:intent': RoutedIntent;
  'input:source': { source: Source };
  /** Показать или спрятать d-pad; решает роутер по источнику, устройству и настройке. */
  'input:dpad': { visible: boolean; side: DpadSide };
  /** Новая сборка уже управляет страницей, игрок играет: тост «Новая версия · Обновить». */
  'app:update': Record<string, never>;
  /** Игрок нажал «Обновить»: дописать сохранение и перезагрузиться. */
  'app:reload': Record<string, never>;
}
