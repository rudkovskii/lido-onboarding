import Phaser from 'phaser';
import { startInput } from './input';
import { Boot } from './scenes/Boot';
import { BG_COLOR, World, type WorldStart } from './scenes/World';
import { backupDue, shouldRemind, withMark } from './systems/backup';
import { bus } from './systems/bus';
import { createPlan } from './systems/plan';
import { createEntryPoint } from './systems/entryPoint';
import { audioContext, connectAudio } from './systems/platform/audio';
import { createMusicPlayer } from './systems/platform/music';
import { createClock } from './systems/platform/clock';
import { connectSfx } from './systems/platform/sfx';
import { registerPwa, reloadForUpdate, lastReloadAt, lastReloadFrom, watchVersion } from './systems/platform/pwa';
import { GameStorage, memoryKV, parseProfile } from './systems/platform/storage';
import { exportFileName, exportSave, importSave, type Save } from './systems/save';
import { staleBuild, updateAction } from './systems/update';
import { mountBoard } from './ui/board';
import { mountFloats } from './ui/float';
import { mountHandbook } from './ui/handbook';
import { mountMinigame } from './ui/minigame';
import { mountPodCard } from './ui/podCard';
import { mountShelf } from './ui/shelf';
import { mountSummary } from './ui/summary';
import { mountLevelUp, mountPath } from './ui/levelUp';
import { mountDpad } from './ui/dpad';
import { mountHints } from './ui/hints';
import { mountGuide, type GuideStage } from './ui/hintsGuide';
import { mountHud } from './ui/hud';
import { mountRadio } from './ui/radio';
import { mountMusicHud } from './ui/radioHud';
import { mountSettings } from './ui/settings';
import { mountSplash } from './ui/splash';
import { mountUpdateToast } from './ui/updateToast';

const params = new URLSearchParams(location.search);
// `?dev=<id>`: dev-режим (`window.__pq`) и отдельный профиль сохранения `lido-onboarding-<id>`.
const profile = parseProfile(params.get('dev'));
const dev = profile !== null;
// Без звука вслух: `?mute=1` — эффекты и музыка не создают аудио.
const mute = params.get('mute') === '1';

function download(name: string, text: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function main(): Promise<void> {
  const overlay = document.getElementById('overlay');
  const parent = document.getElementById('game');
  if (!overlay || !parent) throw new Error('#overlay or #game not found');

  const store = new GameStorage(params.get('mem') === '1' ? { kv: memoryKV(), ls: null } : profile ? { profile } : {});
  const { save } = await store.load(Date.now());
  store.attachLifecycle();
  void store.requestPersist();

  // Звук: выключатель в настройках, `?mute=1` — вообще без звука. Голосов нет: синтез эффектов и музыка.
  if (!mute) {
    connectAudio();
    connectSfx(bus, () => store.save.settings.sound, undefined, { mute, volume: () => store.save.settings.sfxVolume / 100 });
  }
  // Музыка: плеер HTMLAudio, по умолчанию выключена; `?mute=1` — аудио не создаётся, переключатели работают.
  const music = createMusicPlayer({
    mute,
    base: import.meta.env.BASE_URL,
    get: () => store.save.settings.music,
    set: (m) => store.update((s) => ({ ...s, settings: { ...s.settings, music: m } }), Date.now()),
    ctxOf: audioContext,
  });
  bus.on('world:location', ({ id }) => music.setLocation(id));
  // Мини-игра открыта: музыка тише.
  bus.on('work:auto', ({ on }) => music.setDuck(on));
  mountUpdateToast(overlay);

  const settings = mountSettings(overlay, {
    muted: mute,
    version: __BUILD_ID__,
    ...(profile ? { profile } : {}),
    getSound: () => store.save.settings.sound,
    setSound: (on) => store.update((s) => ({ ...s, settings: { ...s.settings, sound: on } }), Date.now()),
    music,
    getSfxVolume: () => store.save.settings.sfxVolume,
    setSfxVolume: (v) => store.update((s) => ({ ...s, settings: { ...s.settings, sfxVolume: v } }), Date.now()),
    lastSaved: () => store.lastSavedAt ?? store.save.updated,
    backupDue: () => backupDue(Date.now(), store.save.created, store.save.hints),
    exportSave: () => {
      const name = exportFileName(Date.now(), new Date().getTimezoneOffset());
      download(name, exportSave(store.save));
      store.update((s: Save) => ({ ...s, hints: withMark(s.hints, 'saved', Date.now()) }), Date.now());
      return name;
    },
    importSave: async (text) => {
      const r = importSave(text);
      if (!r.ok) return { ok: false, message: r.reason === 'version' ? 'This file is from a newer version of the game.' : 'This is not a Lido onboarding save.' };
      await store.replace(r.save, Date.now());
      setTimeout(() => location.reload(), 400);
      return { ok: true, message: 'Save loaded, restarting.' };
    },
    reset: async () => {
      download(exportFileName(Date.now(), new Date().getTimezoneOffset()), exportSave(store.save));
      await store.wipe();
      location.reload();
    },
  });

  // Сад: карточки, Handbook, полка, мини-игры. Часы со сдвигом `?now=` оставлены для проверок (рост от дней не зависит).
  const clock = createClock(params.get('now'));
  const plan = createPlan({
    bus,
    load: () => store.save.plan,
    save: (plan) => store.update((s: Save) => ({ ...s, plan }), clock.now()),
    now: () => clock.now(),
  });
  const hud = mountHud(overlay, {
    onSettings: () => settings.open(),
    goal: () => {
      const s = plan.stats();
      return `Learned ${s.masteredTotal} of ${s.total} · in progress ${s.inProgress}`;
    },
    onGoal: () => {
      if (!game.isOpen) summary.openPlan();
    },
    onLevel: () => {
      if (!game.isOpen) pathScreen.open();
    },
  });
  mountLevelUp(overlay);
  mountMusicHud(overlay, music);
  const radio = mountRadio(overlay, music);
  mountFloats(overlay);
  // Надёжное сохранение: галочка в углу после записи сада, тост при сбое записи (хранилище само повторяет), раз в 7 дней — напоминание скачать копию.
  let shownPlan = store.save.plan;
  store.onWrite((e) => {
    if (e.type === 'error') return hud.setSaveError(true);
    hud.setSaveError(false);
    if (store.save.plan !== shownPlan) {
      shownPlan = store.save.plan;
      hud.flashSaved();
    }
  });
  if (shouldRemind(Date.now(), store.save.created, store.save.hints)) {
    store.update((s: Save) => ({ ...s, hints: withMark(s.hints, 'remind', Date.now()) }), Date.now());
    setTimeout(
      () =>
        hud.toast('No save backup for a while.', {
          label: 'Download',
          run: () => {
            download(exportFileName(Date.now(), new Date().getTimezoneOffset()), exportSave(store.save));
            store.update((s: Save) => ({ ...s, hints: withMark(s.hints, 'saved', Date.now()) }), Date.now());
          },
        }),
      4000,
    );
  }
  const hasHint = (h: string): boolean => store.save.hints.includes(h);
  const addHint = (h: string): void => {
    if (!hasHint(h)) store.update((s: Save) => ({ ...s, hints: [...s.hints, h] }), Date.now());
  };
  mountHints(overlay, { seen: hasHint, mark: addHint });
  // Первые шаги: к столу (до первого открытия Handbook), потом к доске (до первой мини-игры). Игрок, который уже сажал или отвечал, указателя не видит.
  mountGuide(overlay, {
    stage: (): GuideStage | null => {
      const g = store.save.plan;
      if (!hasHint('guide:desk') && g.planned.length === 0) return 'desk';
      if (!hasHint('guide:board') && g.log.length === 0) return 'board';
      // Играл и вырастил всё посаженное: на рабочее место пусто, а выучено не всё.
      if (g.planned.length > 0 && g.log.length > 0) {
        const s = plan.stats();
        if (s.inProgress === 0 && s.masteredTotal < s.total) return 'emptyplan';
      }
      return null;
    },
    done: (stage) => {
      if (stage !== 'emptyplan') addHint(`guide:${stage}`);
    },
  });
  const game = mountMinigame(overlay, {
    next: (mode, only) => plan.next(mode, only),
    answer: (q, given) => {
      const r = plan.answer(q, given);
      return { ok: r.ok, correct: r.correct, card: r.card, ...(r.explain ? { explain: r.explain } : {}), progress: r.progress, act: { kind: r.act.kind, xp: r.act.xp }, path: r.path };
    },
  });
  // Точка входа в игру и возврат к ней при выходе (`world:return`).
  const entry = createEntryPoint(bus);
  // Герой уйдёт к рабочее место; в сохранении остаётся точка входа (вкладку закрыли посреди игры — вернёмся к доске, а не в сад).
  entry.onStart((s) => store.update((save: Save) => ({ ...save, position: { map: s.map, x: s.x, y: s.y, facing: s.facing } }), clock.now()));
  const board = mountBoard(overlay, {
    counts: () => (plan.refresh(), plan.counts()),
    onPick: (mode) => game.start(mode),
  });
  const handbook = mountHandbook(overlay, plan);
  const shelf = mountShelf(overlay, plan);
  const pathScreen = mountPath(overlay, plan);
  const summary = mountSummary(overlay, plan, undefined, () => pathScreen.open());
  const podCard = mountPodCard(overlay, plan, { onReview: (id) => game.start(plan.modeOf(id), id) });
  bus.on('world:interact', ({ use, id }) => {
    if (game.isOpen) return;
    if (use === 'desk') handbook.open();
    else if (use === 'shelf') shelf.open();
    else if (use === 'plan') summary.openPlan();
    else if (use === 'radio') radio.open();
    else if (use === 'board') board.open();
    else if (use === 'pod') podCard.open(id);
  });
  bus.on('world:location', ({ id }) => {
    if (id === 'campus') plan.refresh();
  });
  plan.refresh();

  // Позиция героя и поворот: пишем, когда он остановился. Пока открыта мини-игра, клетка у рабочее место точкой возврата не становится.
  bus.on('world:position', ({ location: map, x, y, facing }) => {
    if (entry.holding) return;
    store.update((s: Save) => ({ ...s, position: { map, x, y, facing } }), clock.now());
  });

  // Стартовый экран: «Lido Pool · Onboarding (prototype)». `?splash=0` пропускает (проверки).
  const splash = params.get('splash') === '0' ? null : mountSplash(overlay);
  // Сцена создаётся уже после экрана: когда она сообщила карту, ввод мира держим закрытым, пока экран открыт.
  bus.on('world:location', () => {
    if (splash?.isOpen) bus.emit('world:input', { enabled: false });
  });

  const start: WorldStart = save.position ? { map: save.position.map, spawn: [save.position.x, save.position.y], facing: save.position.facing } : {};
  const phaser = new Phaser.Game({
    type: Phaser.WEBGL,
    parent,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: BG_COLOR,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER },
    input: { activePointers: 2 },
    scene: [Boot, World],
  });
  phaser.registry.set('boot:start', start);

  const world = (): World | null => {
    const s = phaser.scene.getScene('World') as World | null;
    return s && phaser.scene.isActive('World') ? s : null;
  };
  // Порядок важен: сначала d-pad (он слушает `input:dpad`), потом startInput.
  const dpad = mountDpad(document.body, bus);
  const input = startInput({
    dpad,
    mapControls: 'walk',
    // Касание уже было в прошлый раз: d-pad и A видны с первого кадра и после перезагрузки.
    touchSeen: hasHint('touch'),
    onTouch: () => addHint('touch'),
    pointer: { target: parent, tileAt: (x, y) => world()?.tileAt(x, y) ?? null },
  });
  bus.on('world:location', ({ controls }) => input.router.setMapControls(controls));

  // Новая сборка: service worker уже новый. Нет открытых экранов — тихая перезагрузка (прогресс дописан), иначе заметный тост.
  const reload = (): void => void reloadForUpdate(() => store.flush(), { from: __BUILD_ID__ });
  bus.on('app:reload', reload);
  let screenOpen = false;
  let updatePending = false;
  const needReload = (): void => {
    updatePending = true;
    const busy = screenOpen || game.isOpen;
    if (updateAction({ busy, lastReloadAt: lastReloadAt(), now: Date.now(), lastReloadFrom: lastReloadFrom(), local: __BUILD_ID__ }) === 'reload') reload();
    else bus.emit('app:update', {});
  };
  // Экраны закрылись, а обновление ждёт: спросить политику снова.
  const retryUpdate = (): void => {
    if (updatePending && !screenOpen && !game.isOpen) needReload();
  };
  bus.on('world:input', ({ enabled }) => {
    screenOpen = !enabled;
    if (enabled) setTimeout(retryUpdate, 0);
  });
  bus.on('work:auto', ({ on }) => {
    if (!on) setTimeout(retryUpdate, 0);
  });
  registerPwa({ onNeedReload: needReload });
  // Страница из старого кэша (HTTP-кэш index.html, встроенный браузер без SW): версия с сервера без кэша.
  watchVersion({ base: import.meta.env.BASE_URL, local: __BUILD_ID__, isStale: staleBuild, onStale: needReload });

  if (dev) (window as unknown as { __pq?: Record<string, unknown> }).__pq = { bus, game: phaser, store, world, settings, input, plan, minigame: game, clock, music, splash };
}

void main();
