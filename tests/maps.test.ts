import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { LocationMap, PropObject } from '../src/types/map';
import { frameFor, parseAscii, tileLayers, type TilesetMeta } from '../src/world/ascii';
import { LocationModel, around, buildObjects } from '../src/world/location';
import { findPath } from '../src/world/pathfind';
import { MAPS, getMap, resolveSpawn, START } from '../src/world/maps';

const tileset = JSON.parse(readFileSync('public/atlas/campus.json', 'utf8')) as TilesetMeta;
const sprites = JSON.parse(readFileSync('public/atlas/sprites.json', 'utf8')) as Record<string, { size: [number, number] }>;

describe('карты: форма и ссылки', () => {
  it('две карты: кампус и офис; старт на кампусе', () => {
    expect(Object.keys(MAPS).sort()).toEqual(['campus', 'office']);
    expect(START).toEqual({ map: 'campus', spawn: 'start' });
  });

  for (const [id, map] of Object.entries(MAPS)) {
    describe(id, () => {
      it('ASCII разбирается, каждый тайл легенды есть в тайлсете', () => {
        expect(map.id).toBe(id);
        const parsed = parseAscii(map);
        expect([parsed.w, parsed.h]).toEqual(map.size);
        const { ground } = tileLayers(tileset, map, parsed);
        expect(ground.flat().every((i) => i >= 0)).toBe(true);
        for (const [ch, e] of Object.entries(map.legend)) expect(tileset.tiles[e.tile], `легенда "${ch}" → ${e.tile}`).toBeTruthy();
      });

      it('спрайты объектов есть в атласе', () => {
        for (const o of map.objects) if (o.type === 'prop') expect(sprites[o.sprite], `${o.id}: ${o.sprite}`).toBeTruthy();
      });

      it('спавны на проходимых клетках, не на двери', () => {
        const m = new LocationModel(map, resolveSpawn(map, 'default').tile, { cat: false });
        for (const [name, s] of Object.entries(map.spawns)) {
          expect(m.passable(s[0], s[1]), `спавн ${name}`).toBe(true);
          expect(m.isExit([s[0], s[1]]), `спавн ${name} не дверь`).toBe(false);
        }
      });

      it('объекты внутри карты, id уникальны', () => {
        const ids = map.objects.map((o) => ('id' in o ? `${o.type}:${o.id}` : `exit:${o.at}`));
        expect(new Set(ids).size).toBe(ids.length);
        for (const o of buildObjects(map)) {
          expect(o.at[0] >= 0 && o.at[1] >= 0 && o.at[0] + o.size[0] <= map.size[0] && o.at[1] + o.size[1] <= map.size[1], o.key).toBe(true);
        }
      });

      it('все проходимые клетки связаны с точкой входа', () => {
        const m = new LocationModel(map, resolveSpawn(map, 'default').tile, { cat: false });
        const from = resolveSpawn(map, 'default').tile;
        const [w, h] = map.size;
        // Кроме клеток внутри забора вокруг грядок: туда тоже должен быть вход (ворота), поэтому проверяем всё.
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            if (!m.passable(x, y) || m.isExit([x, y])) continue;
            const r = findPath({ w, h, passable: (cx, cy) => m.passable(cx, cy) && !m.isExit([cx, cy]) }, from, [x, y]);
            expect(r.exact, `клетка ${x},${y} недостижима`).toBe(true);
          }
      });
    });
  }

  it('двери ведут друг к другу: шаг в дверь даёт спавн на другой карте, откуда видна обратная дверь', () => {
    for (const map of Object.values(MAPS)) {
      for (const o of map.objects) {
        if (o.type !== 'exit') continue;
        const to = getMap(o.to);
        expect(to.spawns[o.spawn], `${map.id} → ${o.to}:${o.spawn}`).toBeTruthy();
        const back = to.objects.find((x) => x.type === 'exit' && x.to === map.id);
        expect(back, `у ${o.to} нет двери обратно в ${map.id}`).toBeTruthy();
        // Спавн стоит рядом с обратной дверью, лицом в сторону от неё не обязательно, но рядом.
        const s = to.spawns[o.spawn]!;
        const d = Math.abs(s[0] - back!.at[0]) + Math.abs(s[1] - back!.at[1]);
        expect(d).toBeLessThanOrEqual(2);
      }
    }
  });

  it('интерактивные объекты: Handbook, Learned, план, радио в офисе и инфо-тотем на кампусе; к каждому можно подойти', () => {
    const uses: Record<string, string> = { office: 'desk,plan,radio,shelf', campus: 'board' };
    for (const [id, list] of Object.entries(uses)) {
      const map = getMap(id);
      const found = map.objects.filter((o): o is PropObject => o.type === 'prop' && !!o.use).map((o) => o.use);
      expect(found.sort()).toEqual(list.split(','));
      const m = new LocationModel(map, resolveSpawn(map, 'default').tile, { cat: false });
      for (const o of m.objects.filter((x) => x.use)) {
        const free = around(o.rects).filter(([x, y]) => m.passable(x, y));
        expect(free.length, `${o.key}: подходов`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('терраса: участок 6×4 внутри площади, запас под расширение, рабочие места не на стенах и воде', () => {
    const campus = getMap('campus');
    const plot = campus.objects.find((o) => o.type === 'plot')!;
    if (plot.type !== 'plot') throw new Error();
    expect(plot.size).toEqual([6, 4]);
    const parsed = parseAscii(campus);
    const m = new LocationModel(campus, resolveSpawn(campus, 'default').tile, { cat: false });
    const r = plot.reserve!;
    expect(r.size[0] * r.size[1]).toBeGreaterThan(24);
    for (let y = r.at[1]; y < r.at[1] + r.size[1]; y++) for (let x = r.at[0]; x < r.at[0] + r.size[0]; x++) {
      expect(parsed.ground[y]![x], `${x},${y}`).toBe('p');
      expect(m.passable(x, y)).toBe(true);
    }
  });

  it('кампус: кольцо из крыши и фасада вокруг двора с бассейном, дверь в офис на южной кромке', () => {
    const campus = getMap('campus');
    const parsed = parseAscii(campus);
    const flat = parsed.ground.flat();
    expect(flat.filter((c) => c === 'R').length).toBeGreaterThan(150);
    expect(flat.filter((c) => c === 'W').length).toBe(18); // бассейн 6×3
    const door = campus.objects.find((o) => o.type === 'exit');
    expect(door && door.type === 'exit' && door.to).toBe('office');
  });

  it('карты удобны на телефоне: офис крупно, кампус целиком по ширине', async () => {
    const { pickZoom } = await import('../src/world/camera');
    const office = getMap('office');
    const campus = getMap('campus');
    const usable = 844 - 52 - 47 - 148 - 34;
    expect(pickZoom(390, 844, office.size[0] * 16, office.size[1] * 16, usable)).toBeGreaterThanOrEqual(1);
    expect(pickZoom(390, 844, campus.size[0] * 16, campus.size[1] * 16, usable)).toBeGreaterThanOrEqual(1);
    expect([2, 3, 4]).toContain(pickZoom(1440, 900, office.size[0] * 16, office.size[1] * 16));
  });

  it('кадры автотайлов: фрейм находится для каждой клетки', () => {
    for (const id of ['campus', 'office']) {
      const map = getMap(id);
      const parsed = parseAscii(map);
      for (let y = 0; y < parsed.h; y++) for (let x = 0; x < parsed.w; x++) expect(frameFor(tileset, map as LocationMap, parsed.ground, x, y)).toBeGreaterThanOrEqual(0);
    }
  });
});
