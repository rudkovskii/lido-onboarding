import Phaser from 'phaser';
import { bus } from '../systems/bus';
import type { PodAct, PodView } from '../types/plan';
import type { Dir } from '../types/input';
import type { Xy } from '../world/ascii';
import { LocationModel } from '../world/location';
import { LabelGate } from '../world/labelGate';

// Терраса с рабочими местами: на каждую добавленную в план карточку приходится стол с монитором (стадии New / Started / Practiced /
// Mastered), подпись над столом у героя и автобег во время мини-игры: очередь действий (герой подходит к столу и «печатает», при
// освоении всплывает значок). Ответы не ждут анимацию: действия копятся и проигрываются ускоренно (скорость = 1 + длина очереди, до ×4).

const T = 16;
const ATLAS = 'custom';

interface SpriteMeta {
  size: [number, number];
  frames: string[];
  anims: Record<string, string[]>;
}

export interface PodHost {
  scene: Phaser.Scene;
  model: LocationModel;
  sprites: Record<string, SpriteMeta>;
  hero: Phaser.GameObjects.Sprite;
  /** Положить плитку террасы под рабочие места (перерисовать автотайлы). */
  deck(cells: readonly Xy[]): void;
  /** Мир → экранные CSS px. */
  toScreen(x: number, y: number): { x: number; y: number };
  /** Мир принимает ввод (не открыт экран). */
  inputOn(): boolean;
}

interface Job {
  act: PodAct;
  phase: 'walk' | 'work' | 'pop';
  until: number;
  /** Смена стадии уже показана. */
  evolved?: boolean;
}

/** Столько действий героя ждут в очереди; лишние схлопываются. */
const MAX_QUEUE = 6;

/** Рабочее место: спрайт стадии. */
interface Pod {
  view: PodView;
  spr: Phaser.GameObjects.Sprite | Phaser.GameObjects.Graphics;
}

const STAGE_FRAME: Record<string, string> = { new: 'pod_new', started: 'pod_started', practiced: 'pod_practiced', mastered: 'pod_mastered' };

export class PodLayer {
  /** Анимация героя поверх ходьбы (`work`). */
  heroAction: string | null = null;
  auto = false;
  private pods = new Map<string, Pod>();
  /** Освоенные: на столе уже «Mastered», ждут, пока герой доиграет действие. */
  private pendingMaster = new Set<string>();
  /** Столы, у которых смена стадии ждёт, пока герой дойдёт и поработает. */
  private deferred = new Set<string>();
  private queue: PodAct[] = [];
  private job: Job | null = null;
  private focus: { id: string; tile: Xy; label: string } | null = null;
  private focusWalked = '';
  private lastLabel = '';
  private labelGate = new LabelGate();
  private offs: (() => void)[] = [];
  private views: PodView[] = [];

  constructor(private h: PodHost) {
    // Старт сцены (в том числе после перезагрузки): стол под боком у героя не подписываем.
    this.labelGate.arm();
    this.offs.push(
      bus.on('world:input', ({ enabled }) => {
        if (!enabled) return;
        this.labelGate.arm();
        this.lastLabel = '';
        bus.emit('fx:label', null);
      }),
      bus.on('pods:update', ({ pods, cells }) => this.setPods(pods, cells)),
      bus.on('work:act', (a) => {
        // Освоено: на столе сразу «Mastered», он остаётся, пока герой не доиграет действие (раскладка его уже убрала).
        if (a.kind === 'master') this.markMastered(a.id);
        this.queue.push(a);
        // Игрок отвечает быстрее анимации: старые действия не играем, только «+N» над столом.
        while (this.queue.length > MAX_QUEUE) {
          const i = this.queue.findIndex((x) => x.kind !== 'master');
          if (i < 0) break;
          const [old] = this.queue.splice(i, 1);
          if (old?.tile && old.xp > 0) this.float(old.tile, `+${old.xp}`, 'xp');
        }
      }),
      bus.on('work:focus', ({ id, tile, label }) => {
        this.focus = id && tile ? { id, tile, label } : null;
      }),
      bus.on('work:auto', ({ on }) => {
        this.auto = on;
        if (!on) {
          this.focus = null;
          this.focusWalked = '';
          this.labelGate.arm();
          this.lastLabel = '';
          bus.emit('fx:label', null);
        }
      }),
    );
  }

  dispose(): void {
    for (const off of this.offs) off();
    this.offs = [];
    bus.emit('fx:label', null);
  }

  private frame(name: string): string | null {
    return this.h.sprites[name]?.frames[0] ?? null;
  }

  /** Спрайт стола; нет кадра в атласе — простая фигура. */
  private makePod(v: PodView): Pod['spr'] {
    const x = v.tile[0] * T + T / 2;
    const bottom = v.tile[1] * T + T;
    const depth = 10 + bottom - 1;
    const f = this.frame(STAGE_FRAME[v.stage]!);
    if (f) return this.h.scene.add.sprite(x, bottom, ATLAS, f).setOrigin(0.5, 1).setDepth(depth);
    const g = this.h.scene.add.graphics().setDepth(depth);
    const colors: Record<string, number> = { new: 0x3d2f3b, started: 0x5ba3d2, practiced: 0x3a73a8, mastered: 0x4f9a35 };
    g.fillStyle(colors[v.stage] ?? 0x3d2f3b, 1).fillRect(x - 6, bottom - 18, 12, 9);
    return g;
  }

  private destroyPod(p: Pod): void {
    p.spr.destroy();
  }

  private parts(p: Pod): Phaser.GameObjects.Sprite[] {
    return p.spr instanceof Phaser.GameObjects.Sprite ? [p.spr] : [];
  }

  private setPods(pods: PodView[], cells: [number, number][]): void {
    this.views = pods;
    this.h.deck(cells);
    const seen = new Set<string>();
    for (const v of pods) {
      seen.add(v.id);
      const cur = this.pods.get(v.id);
      const stage = this.pendingMaster.has(v.id) ? 'mastered' : v.stage;
      const view = { ...v, stage };
      if (cur && cur.view.stage === view.stage && cur.view.tile[0] === v.tile[0] && cur.view.tile[1] === v.tile[1]) {
        cur.view = view;
        continue;
      }
      // Новая стадия: пока герой не поработает, на столе старый спрайт (см. `rebuild`).
      if (cur && cur.view.stage !== view.stage && cur.view.tile[0] === v.tile[0] && cur.view.tile[1] === v.tile[1] && this.advancePending(v.id)) {
        this.deferred.add(v.id);
        continue;
      }
      this.deferred.delete(v.id);
      if (cur) this.destroyPod(cur);
      this.pods.set(v.id, { view, spr: this.makePod(view) });
    }
    for (const [id, p] of this.pods) {
      if (seen.has(id) || this.pendingMaster.has(id)) continue;
      this.deferred.delete(id);
      this.destroyPod(p);
      this.pods.delete(id);
    }
    this.h.model.setPods(pods.map((p) => ({ id: p.id, tile: p.tile, label: p.label })));
  }

  // ───────────── автобег ─────────────

  private speed(): number {
    // Мини-игру закрыли, а действия ещё не доиграны: доигрываем быстро, ввод игрока ждёт (см. `blocking`).
    if (!this.auto) return 3;
    return 1 + Math.min(3, this.queue.length);
  }

  /** Герой доигрывает очередь после закрытия мини-игры: ходьба игрока подождёт. */
  get blocking(): boolean {
    return !this.auto && (this.job !== null || this.queue.length > 0);
  }

  update(time: number): void {
    const m = this.h.model;
    m.speed = this.auto || this.job ? this.speed() : 1;
    m.leash = this.auto || this.job !== null; // гусь рядом, своими делами не занят
    if (!this.job && this.queue.length) this.start(this.queue.shift()!);
    if (this.job) this.advance(time);
    else if (this.auto && this.focus && !m.busy) {
      const key = `${this.focus.id}@${this.focus.tile.join(',')}`;
      if (this.focusWalked !== key) {
        this.focusWalked = key;
        m.walkNear(this.focus.tile);
      } else if (!m.busy) m.faceTile(this.focus.tile);
    }
    // Очередь доиграна, а смена стадии не показана: меняем спрайт без показа.
    if (this.deferred.size && !this.job && !this.queue.length) for (const id of [...this.deferred]) this.rebuild(id, false);
    this.drawLabel(time);
  }

  private advancePending(id: string): boolean {
    const j = this.job;
    return this.queue.some((a) => a.id === id && a.kind === 'advance' && a.tile) || (!!j && j.act.id === id && j.act.kind === 'advance' && !!j.act.tile && (j.phase === 'walk' || (j.phase === 'work' && !j.evolved)));
  }

  /** Пересобрать стол по текущему виду; `show` — стадия сменилась на глазах: вспыхнул экран и искры. */
  private rebuild(id: string, show: boolean, k = 1): void {
    this.deferred.delete(id);
    const p = this.pods.get(id);
    const v = this.views.find((x) => x.id === id);
    if (!p || !v) return;
    const view = { ...v, stage: this.pendingMaster.has(id) ? ('mastered' as const) : v.stage };
    this.destroyPod(p);
    p.view = view;
    p.spr = this.makePod(view);
    if (!show) return;
    bus.emit('fx:sfx', { name: 'advance' });
    const parts = this.parts(p);
    if (parts.length) {
      for (const o of parts) o.setScale(0.9);
      this.h.scene.tweens.add({ targets: parts, scaleX: 1, scaleY: 1, duration: 260 / k, ease: 'Back.easeOut' });
    }
    this.burst(view.tile[0] * T + T / 2, view.tile[1] * T - 8, 6, 11, k);
  }

  /** Искры (кадр `fx_spark`) вокруг точки мира. */
  private burst(cx: number, cy: number, n: number, r: number, k: number, delay = 0): void {
    const s = this.h.scene;
    const f = this.frame('fx_spark');
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.4;
      const o = f ? s.add.sprite(cx, cy, ATLAS, f).setOrigin(0.5, 0.5) : s.add.rectangle(cx, cy, 2, 2, 0x8cc0ea);
      o.setDepth(20_000);
      s.tweens.add({ targets: o, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.8 - 4, alpha: 0, delay: delay / k, duration: 440 / k, ease: 'Quad.easeOut', onComplete: () => o.destroy() });
    }
  }

  /** Верный ответ: монитор мигает (стол слегка «вздыхает»), над ним искра. */
  private pulse(id: string, k: number, delay = 0): void {
    const p = this.pods.get(id);
    if (!p || !(p.spr instanceof Phaser.GameObjects.Sprite)) return;
    const parts = this.parts(p);
    const s = this.h.scene;
    s.tweens.killTweensOf(parts);
    for (const o of parts) o.setScale(1);
    s.tweens.add({ targets: parts, scaleY: 1.08, scaleX: 0.96, yoyo: true, duration: 110 / k, delay: delay / k, ease: 'Sine.easeOut', onComplete: () => parts.forEach((o) => o.setScale(1)) });
    this.burst(p.view.tile[0] * T + T / 2, p.view.tile[1] * T - 8, 3, 7, k, delay + 40);
  }

  /** Неверный ответ: стол дрожит на месте. */
  private shake(id: string, k: number): void {
    const p = this.pods.get(id);
    if (!p || !(p.spr instanceof Phaser.GameObjects.Sprite)) return;
    const parts = this.parts(p);
    const x0 = p.view.tile[0] * T + T / 2;
    this.h.scene.tweens.killTweensOf(parts);
    for (const o of parts) o.setX(x0);
    this.h.scene.tweens.add({ targets: parts, x: x0 + 1.5, yoyo: true, repeat: 2, duration: 45 / k, onComplete: () => parts.forEach((o) => o.setX(x0)) });
  }

  private markMastered(id: string): void {
    this.pendingMaster.add(id);
    const p = this.pods.get(id);
    if (!p) return;
    this.destroyPod(p);
    p.view = { ...p.view, stage: 'mastered' };
    p.spr = this.makePod(p.view);
  }

  private start(act: PodAct): void {
    this.job = { act, phase: 'walk', until: 0 };
    if (act.tile) this.h.model.walkNear(act.tile);
    this.focusWalked = '';
  }

  private advance(time: number): void {
    const j = this.job!;
    const m = this.h.model;
    const k = this.speed();
    switch (j.phase) {
      case 'walk': {
        if (m.busy) return;
        if (j.act.tile) m.faceTile(j.act.tile);
        j.phase = 'work';
        const base = j.act.kind === 'advance' ? 800 : j.act.kind === 'master' ? 600 : j.act.kind === 'miss' ? 450 : 600;
        j.until = time + base / k;
        this.heroAction = j.act.kind === 'miss' ? null : 'work';
        this.fx(j.act, k);
        return;
      }
      case 'work': {
        if (time < j.until) return;
        this.heroAction = null;
        if (j.act.kind !== 'master') {
          if (j.act.xp > 0 && j.act.tile) this.float(j.act.tile, `+${j.act.xp}`, 'xp');
          if (j.act.kind === 'miss' && j.act.tile) this.float(j.act.tile, '−1', 'miss');
          this.job = null;
          return;
        }
        // Освоено: над столом всплывает значок и летит вверх, к счётчику на плашке; стол уходит с террасы.
        bus.emit('fx:sfx', { name: 'chime' });
        this.pendingMaster.delete(j.act.id);
        const tile = j.act.tile;
        if (tile) {
          const cx = tile[0] * T + T / 2;
          const top = tile[1] * T - 6;
          this.burst(cx, top + 6, 8, 12, k);
          const f = this.frame('item_badge');
          if (f) {
            const s = this.h.scene;
            const it = s.add.sprite(cx, top, ATLAS, f).setOrigin(0.5, 1).setScale(0.4).setDepth(20_001);
            s.tweens.add({
              targets: it,
              scaleX: 1,
              scaleY: 1,
              duration: 220 / k,
              ease: 'Back.easeOut',
              onComplete: () => s.tweens.add({ targets: it, y: top - 26, alpha: 0, delay: 180 / k, duration: 520 / k, ease: 'Quad.easeIn', onComplete: () => it.destroy() }),
            });
          }
          this.float(tile, `+${j.act.xp}`, 'xp');
        }
        const p = this.pods.get(j.act.id);
        if (p && !this.views.some((v) => v.id === j.act.id)) {
          this.destroyPod(p);
          this.pods.delete(j.act.id);
        }
        j.phase = 'pop';
        j.until = time + 380 / k;
        return;
      }
      case 'pop': {
        if (time < j.until) return;
        this.job = null;
        return;
      }
    }
  }

  /** Эффекты действия: клик по клавиатуре и искра; стол отзывается: переходит в новую стадию, мигает, дрожит при ошибке. */
  private fx(act: PodAct, k: number): void {
    if (!act.tile) return;
    const s = this.h.scene;
    const cx = act.tile[0] * T + T / 2;
    const top = act.tile[1] * T - 8;
    if (act.kind === 'miss') this.shake(act.id, k);
    if (act.kind === 'work' || act.kind === 'advance') {
      bus.emit('fx:sfx', { name: 'work' });
      if (act.kind === 'advance') {
        const j = this.job;
        s.time.delayedCall(300 / k, () => {
          if (j) j.evolved = true;
          this.rebuild(act.id, true, k);
        });
      } else this.pulse(act.id, k, 200);
    }
    if (act.kind === 'master') this.pulse(act.id, k);
    if (act.kind === 'advance' || act.kind === 'master') this.burst(cx, top, 4, 9, k, 250);
  }

  private float(tile: Xy, text: string, kind: 'xp' | 'miss' | 'info'): void {
    const p = this.h.toScreen(tile[0] * T + T / 2, tile[1] * T);
    bus.emit('fx:float', { x: p.x, y: p.y, text, kind });
  }

  /** Подпись над столом: в мини-игре — текущее задание, вне её — стол, к которому повернулся герой. */
  private drawLabel(time: number): void {
    let target: { label: string; tile: Xy } | null = null;
    let sticky = false;
    if (this.auto && this.focus) {
      target = this.focus;
      sticky = true;
    } else if (!this.auto && this.h.inputOn()) {
      const hint = this.h.model.actionHint();
      if (hint && hint.key.startsWith('pod:')) {
        const id = hint.key.slice(4);
        const v = this.views.find((p) => p.id === id);
        if (v) target = { label: v.label, tile: v.tile };
      }
    }
    // Вне мини-игры подпись гаснет через пару секунд: не висит над героем, пока он стоит у стола.
    if (!this.labelGate.show(target ? `${sticky ? 'q' : 'p'}:${target.label}@${target.tile.join(',')}` : null, time, sticky)) target = null;
    if (!target) {
      if (this.lastLabel) bus.emit('fx:label', null);
      this.lastLabel = '';
      return;
    }
    const p = this.h.toScreen(target.tile[0] * T + T / 2, target.tile[1] * T - 2);
    const key = `${target.label}@${Math.round(p.x)},${Math.round(p.y)}`;
    if (key === this.lastLabel) return;
    this.lastLabel = key;
    bus.emit('fx:label', { text: target.label, x: p.x, y: p.y });
  }

  /** Ключ анимации героя с учётом действия (нет таких кадров в атласе — null). */
  heroAnim(facing: Dir, _walking: boolean, exists: (key: string) => boolean): string | null {
    if (this.heroAction) {
      const k = `hero:${this.heroAction}_${facing}`;
      if (exists(k)) return k;
    }
    return null;
  }
}
