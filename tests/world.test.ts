// Мир: кампус и офис. Ходьба, двери, подход к объектам по тапу, гусь рядом с героем, рабочие места на террасе.
import { describe, expect, it } from 'vitest';
import { getMap } from '../src/world/maps';
import type { WorldEvent } from '../src/world/location';
import { modelAt, run, send } from './helpers';

const exits = (evs: WorldEvent[]) => evs.filter((e): e is Extract<WorldEvent, { type: 'exit' }> => e.type === 'exit');
const interacts = (evs: WorldEvent[]) => evs.filter((e): e is Extract<WorldEvent, { type: 'interact' }> => e.type === 'interact');

describe('кампус и офис', () => {
  it('старт на кампусе: герой стоит на площади перед южной дверью кольца', () => {
    const m = modelAt('campus', 'start');
    expect(m.player.tile).toEqual([20, 28]);
    expect(m.passable(20, 28)).toBe(true);
  });

  it('тап по двери: герой доходит до неё и входит в офис, там встаёт у двери', () => {
    const m = modelAt('campus', 'start');
    const door = getMap('campus').objects.find((o) => o.type === 'exit')!;
    send(m, { type: 'goto', tile: [door.at[0], door.at[1]] });
    const evs = exits(run(m, 8000));
    expect(evs).toHaveLength(1);
    expect(evs[0]).toMatchObject({ to: 'office', spawn: 'from_campus' });
    const o = modelAt('office', 'from_campus', 'up');
    expect(o.passable(o.player.tile[0], o.player.tile[1])).toBe(true);
  });

  it('из офиса через дверь на кампус: герой появляется у двери кольца', () => {
    const m = modelAt('office', 'from_campus', 'up');
    const door = getMap('office').objects.find((o) => o.type === 'exit')!;
    send(m, { type: 'goto', tile: [door.at[0], door.at[1]] });
    const evs = exits(run(m, 4000));
    expect(evs).toHaveLength(1);
    expect(evs[0]).toMatchObject({ to: 'campus', spawn: 'door' });
    const back = getMap('campus').spawns.door!;
    expect(back[1]).toBeGreaterThan(getMap('campus').objects.find((o) => o.type === 'exit')!.at[1]);
  });

  it('тап по объектам офиса: Handbook, Learned, план, радио шлют interact со своим use', () => {
    for (const use of ['desk', 'shelf', 'plan', 'radio']) {
      const m = modelAt('office', 'from_campus', 'up');
      send(m, { type: 'interact', target: `prop:${use}` });
      const ev = interacts(run(m, 8000));
      expect(ev.map((e) => e.use), use).toEqual([use]);
    }
  });

  it('тап по инфо-тотему на кампусе открывает мини-игры (use=board)', () => {
    const m = modelAt('campus', 'start');
    send(m, { type: 'interact', target: 'prop:totem' });
    expect(interacts(run(m, 8000)).map((e) => e.use)).toEqual(['board']);
  });

  it('рабочие места проходимы: герой подходит к столу и встаёт на его клетку', () => {
    const m = modelAt('campus', 'start');
    m.setPods([{ id: 'pol.keys', tile: [17, 31], label: 'Keys' }]);
    send(m, { type: 'interact', target: 'pod:pol.keys' });
    const ev = interacts(run(m, 8000));
    expect(ev.map((e) => e.use)).toEqual(['pod']);
  });

  it('гусь идёт за героем и держится рядом', () => {
    const m = modelAt('campus', 'start');
    send(m, { type: 'goto', tile: [20, 33] });
    run(m, 6000);
    const g = m.cat!;
    expect(Math.abs(g.tile[0] - m.player.tile[0]) + Math.abs(g.tile[1] - m.player.tile[1])).toBeLessThanOrEqual(6);
  });
});
