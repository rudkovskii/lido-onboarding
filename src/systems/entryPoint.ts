// Точка входа в мини-игру и возврат к ней. Игра запускается там, где герой стоит (доска, стол, рабочее место); при выходе
// («Exit ✕», Esc, итог раунда) герой и гусь мгновенно возвращаются на то место и с тем же лицом (`world:return`, сцена
// гасит экран на 150 мс и пересоздаёт карту). Позиция героя в сохранении, пока игра открыта, не пишется (`holding`):
// промежуточная клетка у рабочее место точкой возврата не становится. Чистая логика на шине, без Phaser и DOM.
import type { BusEvents } from '../types/bus';
import type { Dir } from '../types/input';
import type { Bus } from './bus';

/** Где стоял герой: карта, клетка, куда смотрел. */
export interface HeroSpot {
  map: string;
  x: number;
  y: number;
  facing: Dir;
}

export interface EntryPoint {
  /** Игра открыта: позицию героя в сохранение не писать. */
  readonly holding: boolean;
  /** Откуда игра запущена (пока открыта). */
  readonly origin: HeroSpot | null;
  /** Игра открылась: вот точка входа (её и стоит держать в сохранении, пока герой бегает по саду). */
  onStart(fn: (spot: HeroSpot) => void): () => void;
  dispose(): void;
}

export const sameSpot = (a: HeroSpot, b: HeroSpot): boolean => a.map === b.map && a.x === b.x && a.y === b.y;

export function createEntryPoint(bus: Bus<BusEvents>): EntryPoint {
  /** Где герой стоит сейчас (последняя стоянка или действие с объектом). */
  let here: HeroSpot | null = null;
  let workOn = false;
  let origin: HeroSpot | null = null;
  const starters = new Set<(s: HeroSpot) => void>();

  const offs = [
    bus.on('world:position', ({ location, x, y, facing }) => {
      here = { map: location, x, y, facing };
    }),
    // Объект сработал: герой стоит на клетке подхода (у события есть `hero`), лицом к объекту. Игра открывается в этом же кадре,
    // раньше, чем придёт `world:position`, поэтому берём клетку отсюда.
    bus.on('world:interact', ({ location, hero, facing }) => {
      if (hero) here = { map: location, x: hero[0], y: hero[1], facing };
    }),
    bus.on('work:auto', ({ on }) => {
      if (on === workOn) return;
      workOn = on;
      if (on) {
        origin = here ? { ...here } : null;
        if (origin) for (const fn of starters) fn({ ...origin });
        return;
      }
      const o = origin;
      origin = null;
      if (o) bus.emit('world:return', { ...o });
    }),
  ];

  return {
    get holding() {
      return workOn;
    },
    get origin() {
      return origin;
    },
    onStart(fn) {
      starters.add(fn);
      return () => starters.delete(fn);
    },
    dispose() {
      for (const off of offs) off();
      starters.clear();
    },
  };
}
