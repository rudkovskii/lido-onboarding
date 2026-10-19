# AGENTS.md: Lido Pool Onboarding (демо)

Браузерная пиксельная игра-демо для онбординга в Lido Finance (форк фермы «polski-quest», оставлен только движок «растим карточки»).
Phaser 4.2.1 + TypeScript + Vite + DOM-оверлей, PWA на GitHub Pages `/lido-onboarding/`. Решения и мэппинг понятий — `ONBOARDING.md`.
`CLAUDE.md` — копия этого файла (не симлинк): меняешь AGENTS.md, копируй.
Не официальный продукт Lido: политики выдуманы (трек `policies`), структура и термины — публичные факты. Логотипов Lido нет.

## Что это
Новичок ходит по кампусу у бассейна (стрелки/WASD, d-pad, тап), за ним ходит гусь. В доме «Onboarding HQ» на столе **Handbook**
(3 вкладки = 3 трека, посадка карточки или трека), полка **Learned**, радио, кровать (прогресс). На улице **Knowledge garden**
(грядки), доска **Mini-games**, коробка урожая. Стартовый экран `ui/splash.ts` (`?splash=0` пропускает).
Внутри кода гусь по-прежнему зовётся Cat (`world/catLife.ts`, `model.cat`, спот `cat_sleep`): имя историческое, спрайт — лист `goose`.

## Где контент
`content/lido/cards.json`: `tracks`, `cards` (id, track, front, back, band), `scenarios` (policies), `structureQuestions`. Читается при сборке
(`systems/content.ts`). Весь UI на английском; кириллица и польские буквы в `src/` допустимы только в комментариях (проверяется тестом/grep).

## Три игры (`systems/quiz.ts`, режим = трек, `MODE_TRACK`)
1. **Pool Rules** (`policies`): чаще сценарий `scenarios` с тремя кнопками OK / Violation / Ask first, после ответа вердикт + `explain` + правило
   карточки; иначе front → выбор back из 4 (отвлекающие — back других карточек трека).
2. **Who's Who** (`structure`): `structureQuestions` (верный + 3 `wrong`) и карточки front↔back, выбор из 4.
3. **Staking 101** (`glossary`): термин → смысл и смысл → термин.
Каждое задание привязано к карточке (`id`); верный ответ растит её. Раунд = 10 заданий, итог, «Next round» (`ui/minigame.ts`, `ui/roundSummary.ts`).
Свежие сценарии/вопросы предпочитаются (`seen` в `farm.ts`), чтобы карточка не крутила одно и то же.

## Рост (`systems/garden.ts`, чистая модель)
Без дней и «производства»: семя → росток 1 верный ответ, → куст ещё 2, → урожай ещё 1 (`NEED`, всего 4 на карточку). Ошибка снимает каплю, стадию не роняет.
Урожай уходит на полку Learned. Сохраняются посадки и журнал ответов, стадии выводятся заново (`derive`). Грядки: `PLOT_TIERS` (24, 60, 80 клеток).
Уровни (`systems/xp.ts`): 8 уровней «Level N», финал «Onboarded 🎉» (все карточки выучены); выученная карточка 1 очко, растущая частично.
Фасад для экранов — `systems/farm.ts` (`FarmApi`), вид растения — `plantLook.ts` (16 кустов по crc32 id). `?now=` оставлен для проверок, на рост не влияет.

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
`tools/art_*.py` рисуют `art/sprites/*.sprite.json` (`npm run art`), `npm run sprites` собирает атлас `public/atlas/`. Цвета только по именам материалов
(`art/materials.json`, рампа `<материал>.0…4` и `.o`), hex в спрайтах нельзя; палитра ≤ 320 цветов (новый материал = 6 цветов). Герой — безымянный новичок
(`art_hero.py`, худи `hoodie`), гусь — `art_goose.py` (те же имена анимаций, что были у кота), бассейн — тайл `t_water` (автотайл) + `sunbed`, `umbrella`.
Новый спрайт сдвигает атлас: обнови `ATLAS_SIZE`/`ICON_FRAMES` в `ui/stageIcon.ts` (тест сверяет размер). Иконки PWA: `npm run icons`.

## Сохранение
`systems/save.ts` + `platform/storage.ts`. Префикс ключей `lo_`, база `lido-onboarding` (профиль `?dev=<id>` -> `lido-onboarding-<id>`): не пересекается с польской игрой на том же домене.

## Проверка
`npm run check` = typecheck + check:layers + check:banned + test + sprites:check + build. Dev: `npm run dev`, адрес
`http://localhost:5173/lido-onboarding/?mute=1&dev=1&mem=1` (без звука, `window.__pq`, сохранение в памяти; `&splash=0` без стартового экрана).
**Звук вслух на проверках не играть**: только `?mute=1`. Тесты: `tests/lido.test.ts` (контент, три игры, полный цикл, экраны), остальные — мир, ввод, сохранение, музыка, PWA.
Работа: коммиты по-русски, без пуша в `main` без просьбы; версии в package.json точные, зависимости не обновлять без задачи.
