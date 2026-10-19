"""Тайлы 16×16 кампуса и офиса: газон, плитка, терраса, стеклянная крыша кольца (автотайл), фасад, дверь, живая изгородь, вода бассейна,
пол офиса, стены. Без контура, цвета только из рамп материалов."""
from __future__ import annotations

import random

from art_core import Cv, P, Sheet, emit, single

T = 16
N, E, S, W = 1, 2, 4, 8


def grid(fill: str) -> list[list[str | None]]:
    return [[fill] * T for _ in range(T)]


def edge_dist(mask: int, x: int, y: int) -> int:
    ds = []
    if not mask & N: ds.append(y)
    if not mask & S: ds.append(T - 1 - y)
    if not mask & W: ds.append(x)
    if not mask & E: ds.append(T - 1 - x)
    return min(ds) if ds else 99


def corner_cut(mask: int, x: int, y: int) -> bool:
    """Скруглённые углы: где две соседние стороны открыты, срезаем угловой пиксель."""
    for a, b, cx, cy in ((N, W, 0, 0), (N, E, T - 1, 0), (S, W, 0, T - 1), (S, E, T - 1, T - 1)):
        if not mask & a and not mask & b and abs(x - cx) + abs(y - cy) <= 1:
            return True
    return False


def lawn(seed: int, light: bool):
    """Подстриженный газон: ровный тон и тонкие светлые штрихи; light — соседняя полоса покоса."""
    rng = random.Random(seed)
    base, hi, lo = ('grass.3', 'grass.4', 'grass.2') if light else ('grass.2', 'grass.3', 'grass.1')
    g = grid(base)
    for _ in range(7):
        g[rng.randrange(T)][rng.randrange(T)] = hi
    for _ in range(4):
        g[rng.randrange(T)][rng.randrange(T)] = lo
    return g


def paving(seed: int):
    """Светлая плитка: ряды по 8 px со сдвигом швов, лёгкая фактура, швы чуть темнее плиты."""
    rng = random.Random(seed)
    g = grid('concrete.3')
    for y in range(T):
        for x in range(T):
            r = rng.random()
            if r < 0.06:
                g[y][x] = 'concrete.4'
            elif r < 0.1:
                g[y][x] = 'concrete.2'
    for x in range(T):
        g[7][x] = 'concrete.2'
        g[15][x] = 'concrete.2'
    for y in range(0, 7):
        g[y][7] = 'concrete.2'
    for y in range(8, 15):
        g[y][15] = 'concrete.2'
    return g


def deck(seed: int, mask: int):
    """Терраса под рабочими местами: крупные серые плиты, у открытых сторон тёмная кромка."""
    rng = random.Random(seed)
    g = grid('stone.3')
    for y in range(T):
        for x in range(T):
            if rng.random() < 0.06:
                g[y][x] = 'stone.4'
    for i in range(T):
        g[7][i] = 'stone.2'
        g[i][7] = 'stone.2'
    for y in range(T):
        for x in range(T):
            d = edge_dist(mask, x, y)
            if corner_cut(mask, x, y):
                g[y][x] = 'concrete.2' if (x + y) % 2 else 'concrete.3'
            elif d == 0:
                g[y][x] = 'stone.1'
            elif d == 1:
                g[y][x] = 'stone.2'
    return g


def roof(seed: int, mask: int):
    """Стеклянная крыша кольца: светлое стекло с диагональными бликами и серым ободом у открытых сторон."""
    g = grid('glass.3')
    for y in range(T):
        for x in range(T):
            k = (x + y) % 8
            if k == 0:
                g[y][x] = 'glass.4'
            elif k == 1:
                g[y][x] = 'glass.2'
    for y in range(T):
        for x in range(T):
            d = edge_dist(mask, x, y)
            if d == 0:
                g[y][x] = 'concrete.4'
            elif d == 1:
                g[y][x] = 'concrete.2'
            elif d == 2:
                g[y][x] = 'tin.3'
    return g


def facade(variant: int):
    """Стеклянный фасад: тёмное зеркальное стекло, светлые импосты каждые 4 px, отражение неба."""
    g = grid('glass_dark.2')
    for y in range(T):
        for x in range(T):
            if (x + variant * 2) % 4 == 0:
                g[y][x] = 'concrete.3'
            elif y < 6:
                g[y][x] = 'glass_dark.3'
            elif y > 12:
                g[y][x] = 'glass_dark.1'
    for x in range(T):
        g[0][x] = 'concrete.4'
        g[1][x] = 'concrete.2'
        g[T - 1][x] = 'concrete.1'
    for k in range(5):
        g[3 + k][(variant * 5 + k * 2 + 1) % T] = 'glass_dark.4'
    return g


def door_glass():
    g = facade(0)
    for y in range(2, T):
        for x in range(2, 14):
            g[y][x] = 'glass.3' if x != 7 and x != 8 else 'tin.2'
    for x in range(1, 15):
        g[2][x] = 'tin.2'
    for y in range(2, T):
        g[y][1] = 'tin.2'
        g[y][14] = 'tin.2'
    g[9][6] = 'tin.4'; g[9][9] = 'tin.4'
    g[4][3] = 'glass.4'; g[5][4] = 'glass.4'; g[4][11] = 'glass.4'
    return g


def hedge():
    rng = random.Random(9)
    g = grid('leaf.2')
    for y in range(T):
        for x in range(T):
            r = rng.random()
            if r < 0.22:
                g[y][x] = 'leaf.3'
            elif r < 0.34:
                g[y][x] = 'leaf.1'
    for x in range(T):
        g[0][x] = 'leaf.3'
        g[T - 1][x] = 'leaf.1'
    return g


def water_patch(seed: int, mask: int):
    """Вода бассейна (автотайл): рябь periodic по 16 px, светлая каёмка и бортик из камня у открытых сторон."""
    rng = random.Random(77)
    g = [['water.2'] * T for _ in range(T)]
    for _ in range(22):
        x, y = rng.randrange(T), rng.randrange(T)
        g[y][x] = 'water.3' if rng.random() < 0.6 else 'water.1'
    for gy in (3, 10):
        for x in range(T):
            if (x * 5 + gy) % 7 < 3:
                g[gy][x] = 'water.4'
                g[(gy + 1) % T][(x + 1) % T] = 'water.1'
    for x, y in ((2, 6), (9, 13), (13, 1)):
        g[y][x] = 'glass.2'
    for y in range(T):
        for x in range(T):
            d = edge_dist(mask, x, y)
            if corner_cut(mask, x, y):
                g[y][x] = 'concrete.2' if (x + y) % 2 else 'concrete.3'
            elif d == 0:
                g[y][x] = 'concrete.4'
            elif d == 1:
                g[y][x] = 'concrete.3' if (x + y) % 2 else 'concrete.4'
            elif d == 2:
                g[y][x] = 'water.4'
    return g


def ofloor(seed: int):
    """Пол офиса: светлый ковролин плитками 8×8, слабый шов, редкие светлые крапинки."""
    rng = random.Random(seed)
    g = grid('concrete.3')
    for y in range(T):
        for x in range(T):
            if (x // 8 + y // 8) % 2:
                g[y][x] = 'concrete.3'
            if rng.random() < 0.05:
                g[y][x] = 'concrete.4'
    for i in range(T):
        g[7][i] = 'concrete.2'
        g[i][7] = 'concrete.2'
    return g


def wall_top():
    g = grid('concrete.3')
    for x in range(T):
        g[0][x] = 'concrete.4'; g[T - 1][x] = 'concrete.1'
    return g


def wall_face():
    """Белая стена с плинтусом и тонкими швами панелей."""
    g = grid('chalk.2')
    for y in range(12):
        g[y][0] = 'chalk.3'
        g[y][T - 1] = 'chalk.1'
    for x in range(T):
        g[0][x] = 'concrete.1'
        g[12][x] = 'tin.3'
        for y in range(13, T):
            g[y][x] = 'tin.2'
        g[T - 1][x] = 'tin.1'
    return g


def mat_tile():
    g = grid('tin.1')
    for y in range(T):
        for x in range(T):
            if (x + y) % 4 == 0:
                g[y][x] = 'tin.2'
    for i in range(T):
        g[0][i] = 'tin.0'; g[T - 1][i] = 'tin.0'; g[i][0] = 'tin.0'; g[i][T - 1] = 'tin.0'
    return g


def build() -> None:
    for sid, light in (('t_lawn', False), ('t_lawn2', True)):
        sh = Sheet(sid, T, T, anchor=[8, 15])
        for i in range(4):
            sh.add(lawn(i + 1, light))
        emit(sh)
    sh = Sheet('t_paving', T, T, anchor=[8, 15])
    for i in range(4):
        sh.add(paving(i + 5))
    emit(sh)
    for sid, fn in (('t_deck', deck), ('t_roof', roof), ('t_water', lambda s, m: water_patch(s, m))):
        s = Sheet(sid, T, T, anchor=[8, 15])
        for mask in range(16):
            s.add(fn(41 + mask, mask))
        emit(s)
    f = Sheet('t_facade', T, T, anchor=[8, 15])
    for v in range(2):
        f.add(facade(v))
    emit(f)
    single('t_door', door_glass(), anchor=[8, 15])
    single('t_hedge', hedge(), anchor=[8, 15])
    fl = Sheet('t_floor', T, T, anchor=[8, 15])
    for i in range(3):
        fl.add(ofloor(i + 1))
    emit(fl)
    single('t_wall_top', wall_top(), anchor=[8, 15])
    single('t_wall_face', wall_face(), anchor=[8, 15])
    single('t_mat', mat_tile(), anchor=[8, 15])
