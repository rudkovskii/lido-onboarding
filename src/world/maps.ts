// Карты мира: JSON из content/maps/ бандлится в код. Проверка формы — tests/maps.test.ts.
import campus from '../../content/maps/campus.json';
import office from '../../content/maps/office.json';
import type { Dir } from '../types/input';
import type { LocationMap } from '../types/map';
import { parseAscii } from './ascii';
import { buildObjects } from './location';

export const MAPS: Readonly<Record<string, LocationMap>> = {
  campus: campus as unknown as LocationMap,
  office: office as unknown as LocationMap,
};

/** Где игра стартует с чистого сохранения. */
export const START = { map: 'campus', spawn: 'start' } as const;

export function getMap(id: string): LocationMap {
  const m = MAPS[id];
  if (!m) throw new Error(`No map "${id}"`);
  return m;
}

/** Старт из сохранения: карты прежних версий (`farm`, `home`) больше нет — тогда старт кампуса, иначе сцена падает и мир пустой. */
export function startOf(map: string | undefined, spawn?: string | readonly number[], facing?: Dir): { map: string; spawn: string | readonly number[]; facing?: Dir } {
  if (map === undefined || !Object.hasOwn(MAPS, map)) return { map: START.map, spawn: START.spawn };
  return { map, spawn: spawn ?? START.spawn, ...(facing ? { facing } : {}) };
}

export interface Spawn {
  tile: [number, number];
  facing: Dir;
}

/**
 * Где поставить героя: имя спавна или клетка (сохранение). Клетка непроходима, занята объектом или за краем — спавн карты
 * по умолчанию. `facing` перекрывает поворот из карты.
 */
export function resolveSpawn(map: LocationMap, spawn: string | readonly number[] | undefined, facing?: Dir): Spawn {
  const named = (name: string): Spawn => {
    const s = map.spawns[name] ?? map.spawns.default;
    if (!s) throw new Error(`${map.id}: no spawn "${name}" and no default`);
    return { tile: [s[0], s[1]], facing: facing ?? (s[2] as Dir | undefined) ?? 'down' };
  };
  if (typeof spawn === 'string') return named(spawn);
  if (spawn && spawn.length >= 2) {
    const [x, y] = spawn as [number, number];
    const p = parseAscii(map);
    const ok = x >= 0 && y >= 0 && x < p.w && y < p.h && !p.solid[y]![x] && !buildObjects(map).some((o) => o.rects.some((r) => x >= r[0] && y >= r[1] && x < r[0] + r[2] && y < r[1] + r[3]));
    if (ok) return { tile: [x, y], facing: facing ?? 'down' };
  }
  return named('default');
}
