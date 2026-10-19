# AGENTS.md: Lido Pool Onboarding (демо)

Браузерная пиксельная игра-демо для онбординга в Lido Finance (когда-то форк другой пиксельной игры; от неё остался только движок «карточка со стадиями»).
Phaser 4.2.1 + TypeScript + Vite + DOM-оверлей, PWA на GitHub Pages `/lido-onboarding/`. Решения и мэппинг понятий — `ONBOARDING.md`.
`CLAUDE.md` — копия этого файла (не симлинк): меняешь AGENTS.md, копируй.
Не официальный продукт Lido: политики выдуманы (трек `policies`), структура и термины — публичные факты. Логотипов Lido нет.

## Что это
Новичок ходит по кампусу (светлый технопарк: стеклянное кольцо-офис, во дворе бассейн Lido с шезлонгами; стрелки/WASD, d-pad, тап), за ним ходит гусь.
Дверь в кольце ведёт в **Onboarding HQ** (open space): ресепшен = **Handbook** (3 вкладки-трека, «Add to plan» / «Add whole track»), стена значков = **Learned**,
доска = **My onboarding plan** (уровень, прогресс), колонка = радио. На площади кампуса инфо-тотем **Mini-games** и **терраса**: каждая карточка в плане
стоит там рабочим местом (стол с монитором). Стартовый экран `ui/splash.ts` (`?splash=0` пропускает).
Внутри кода гусь по-прежнему зовётся Cat (`world/catLife.ts`, `model.cat`, спот `cat_sleep`): имя историческое, спрайт — лист `goose`.

## Где контент
`content/lido/cards.json`: `tracks`, `cards` (id, track, front, back, band), `scenarios` (policies), `structureQuestions`. Читается при сборке
(`systems/content.ts`). Весь UI на английском; кириллицы и польских букв в строках интерфейса нет (комментарии могут быть по-русски).

## Три игры (`systems/quiz.ts`, режим = трек, `MODE_TRACK`)
1. **Pool Rules** (`policies`): чаще сценарий `scenarios` с тремя кнопками OK / Violation / Ask first, после ответа вердикт + `explain` + правило
   карточки; иначе front → выбор back из 4 (отвлекающие — back других карточек трека).
2. **Who's Who** (`structure`): `structureQuestions` (верный + 3 `wrong`) и карточки front↔back, выбор из 4.
3. **Staking 101** (`glossary`): термин → смысл и смысл → термин.
Каждое задание привязано к карточке (`id`); верный ответ двигает её. Раунд = 10 заданий, итог, «Next round» (`ui/minigame.ts`, `ui/roundSummary.ts`).
Свежие сценарии/вопросы предпочитаются (`seen` в `plan.ts`), чтобы карточка не крутила одно и то же.

## Прогресс (`systems/progress.ts`, чистая модель; фасад `systems/plan.ts`, `PlanApi`)
Без дней: **New** → **Started** 1 верный ответ, → **Practiced** ещё 2, → **Mastered** ещё 1 (`NEED`, всего 4 на карточку). Ошибка снимает зачёт стадии (`drops`), саму стадию не роняет.
Освоенная карточка уходит на стену Learned. Сохраняются добавленные в план (`planned`) и журнал ответов (`log`), стадии выводятся заново (`derive`). Рабочие места на террасе:
`POD_TIERS` (24 / 60 / 80 клеток, координаты по `content/maps/campus.json`, плита `deck` кладётся под них динамически).
Уровни (`systems/xp.ts`): 8 уровней «Level N», финал «Onboarded 🎉» (все карточки освоены); освоенная карточка 1 очко, карточка в работе — часть (0,1 / 0,3 / 0,6).
Статусы `ItemInfo.status`: `new` (не в плане) / `active` (в работе) / `mastered`. События шины: `pods:update`, `work:auto`, `work:focus`, `work:act` (`work|advance|master|miss`).

## Мир
Карты — ASCII JSON `content/maps/campus.json` и `office.json`; их генерирует `tools/gen_maps.py` (кольцо, двор, терраса, расстановка), потом правятся руками.
Кольцо: тайлы `roof` (стеклянная крыша, автотайл с серым ободом), `facade` на южных кромках, дверь `door`; на западе проход во двор. Объекты: `prop`, `exit`, `plot`, `spot`.
`scenes/podLayer.ts` рисует рабочие места и автобег во время мини-игры: герой идёт к столу и «печатает» (поза `work`), при Mastered всплывает значок.
Звуки (`platform/sfx.ts`): мягкие UI-клики и тоны (`work`, `advance`, `chime`).

## Слои (ловит `npm run check:layers`)
- `src/systems/**` без `platform/`: чистая логика, без `phaser`, браузерных глобалов, `Date.now()` (время параметром).
- `src/systems/platform/**`: адаптеры (IndexedDB, AudioContext, музыка, sfx, PWA, часы).
- `src/world/**`, `src/scenes/**`: ходьба, карты, камера, Phaser-сцена; `world/location.ts` чистая модель.
- `src/ui/**`: DOM-оверлей, без `phaser` и `world|scenes`. `src/input/**`: клавиатура, d-pad, тап -> intents в шину.
- Склейка слоёв только в `src/main.ts`; мир и экраны общаются через `bus` (`src/types/bus.ts`).

## Запрещено (`npm run check:banned`)
Phaser 3 API (`preFX`, `postFX`, `Pipeline`, `Mesh`, `Phaser.CANVAS`…); текст в canvas (`add.text`); `localStorage`/`indexedDB`/`fetch`/`Date.now()` в чистых
`systems`; прямые `keydown`/`pointerdown` в сценах и экранах; ручная правка `public/atlas/*` (только `npm run sprites`).

## Арт (sprite-as-data)
`tools/art_*.py` рисуют `art/sprites/*.sprite.json` (`npm run art`), `npm run sprites` собирает атлас `public/atlas/` (тайлсет `campus` из `art/tilesets/campus.json`).
Модули: `art_tiles.py` (газон, плитка, терраса, крыша, фасад, вода, пол офиса), `art_campus.py` (деревья в кадках, скамьи, кафе, тотем, шезлонги, рабочие места
`pod_new|started|practiced|mastered`, иконки стадий, значок), `art_office.py` (ресепшен, стена значков, доска, колонка, столы, переговорка), `art_hero.py`
(безымянный новичок в худи, поза `work`), `art_goose.py` (гусь, имена анимаций как у прежнего компаньона). Цвета только по именам материалов (`art/materials.json`,
рампа `<материал>.0…4` и `.o`), hex в спрайтах нельзя; палитра ≤ 320 цветов (материал = 6 цветов). Материал, которым не пользуется ни один спрайт, удаляй из `materials.json`.
Новый спрайт может сдвинуть атлас: обнови `ATLAS_SIZE`/`ICON_FRAMES` в `ui/stageIcon.ts` (тест сверяет). Иконки PWA: `npm run icons`.

## Сохранение
`systems/save.ts` + `platform/storage.ts`. Префикс ключей `lo_`, база `lido-onboarding` (профиль `?dev=<id>` -> `lido-onboarding-<id>`): не пересекается с другими играми на том же домене.

## Проверка
`npm run check` = typecheck + check:layers + check:banned + test + sprites:check + build. Dev: `npm run dev`, адрес
`http://localhost:5173/lido-onboarding/?mute=1&dev=1&mem=1` (без звука, `window.__pq`, сохранение в памяти; `&splash=0` без стартового экрана).
**Звук вслух на проверках не играть**: только `?mute=1`. Скрытая вкладка браузера не рисует кадры: гони сцену `__pq.game.step(t, 16)` в цикле.
Тесты: `tests/lido.test.ts` (контент, три игры, полный цикл, экраны), `tests/world.test.ts` (кампус и офис), остальные — карты, ввод, сохранение, музыка, PWA.
Работа: коммиты по-русски, без пуша в `main` без просьбы; версии в package.json точные, зависимости не обновлять без задачи.
