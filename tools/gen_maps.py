#!/usr/bin/env python3
"""Генерирует content/maps/campus.json (кольцевой офис, бассейн во дворе, терраса) и office.json (open space).
    python3 tools/gen_maps.py
Карты лежат готовыми в content/maps/*.json и правятся руками; скрипт нужен, чтобы пересобрать кольцо, если поменяются размеры."""
from __future__ import annotations

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
W, H = 40, 40
CX, CY = 20, 13
RO, RI = 12.5, 7.5


def campus() -> dict:
    g = [['l'] * W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            if (x // 2) % 2:
                g[y][x] = 'm'  # полосы покоса газона
    dist = lambda x, y: math.hypot(x - CX, y - CY)  # noqa: E731
    # дорожка вокруг кольца и большая площадь с террасой
    for y in range(H):
        for x in range(W):
            if RO <= dist(x, y) <= RO + 2.6 or (11 <= x <= 29 and 26 <= y <= 38):
                g[y][x] = 'p'
    # двор: газон внутри кольца, плитка вокруг бассейна
    for y in range(H):
        for x in range(W):
            if dist(x, y) < RI:
                g[y][x] = 'm' if (x // 2) % 2 else 'l'
    for y in range(10, 17):
        for x in range(14, 26):
            g[y][x] = 'p'
    for y in range(12, 15):
        for x in range(17, 23):
            g[y][x] = 'W'
    # кольцо: крыша, на южных кромках фасад; проход во двор с запада
    ring = [[RI <= dist(x, y) <= RO for x in range(W)] for y in range(H)]
    for y in range(H):
        for x in range(W):
            if ring[y][x] and x < CX and abs(y - CY) <= 1:
                ring[y][x] = False
                g[y][x] = 'p'
    for y in range(H):
        for x in range(W):
            if ring[y][x]:
                south = ring[y + 1][x] if y + 1 < H else False
                g[y][x] = 'R' if south else 'F'
    # дверь на южной стороне
    dy = max(y for y in range(H) if ring[y][CX])
    g[dy][CX] = 'd'
    for x in range(W):
        g[0][x] = g[H - 1][x] = 'h'
    for y in range(H):
        g[y][0] = g[y][W - 1] = 'h'
    rows = [''.join(r) for r in g]
    legend = {
        'l': {'tile': 'lawn'}, 'm': {'tile': 'lawn2'}, 'p': {'tile': 'paving'},
        'R': {'tile': 'roof', 'auto': True, 'solid': True}, 'F': {'tile': 'facade', 'solid': True}, 'd': {'tile': 'door'},
        'W': {'tile': 'water', 'auto': True, 'solid': True}, 'k': {'tile': 'deck', 'auto': True}, 'h': {'tile': 'hedge', 'solid': True},
    }
    objs: list[dict] = []

    def prop(i, sprite, at, size=(1, 1), **k):
        objs.append({'type': 'prop', 'id': i, 'sprite': sprite, 'at': list(at), 'size': list(size), **k})

    objs.append({'type': 'exit', 'at': [CX, dy], 'to': 'office', 'spawn': 'from_campus'})
    prop('totem', 'totem', (25, 27), (2, 1), use='board', label='Mini-games', shadow=26)
    prop('cafe', 'cafe', (8, 27), (2, 1), shadow=28)
    prop('bench0', 'bench', (12, 28), (2, 1), solid=False, shadow=26)
    prop('bench1', 'bench', (28, 28), (2, 1), solid=False, shadow=26)
    prop('rack0', 'bikerack', (30, 33), (2, 1), shadow=26)
    prop('lamp0', 'lamp', (15, 27), shadow=10)
    prop('lamp1', 'lamp', (24, 27), shadow=10)
    # бассейн во дворе: шезлонги, зонты
    prop('sunbed0', 'sunbed', (15, 15), (2, 1), solid=False, shadow=26)
    prop('sunbed1', 'sunbed', (17, 15), (2, 1), solid=False, shadow=26)
    prop('sunbed2', 'sunbed', (21, 15), (2, 1), solid=False, shadow=26)
    prop('umbrella0', 'umbrella', (20, 15), shadow=12)
    prop('umbrella1', 'umbrella', (24, 15), shadow=12)
    prop('bench2', 'bench', (17, 10), (2, 1), solid=False, shadow=26)
    # ряды круглых деревьев: по дуге вокруг кольца и вдоль краёв
    n = 0
    for k in range(0, 360, 12):
        a = math.radians(k)
        x, y = round(CX + (RO + 4.0) * math.cos(a)), round(CY + (RO + 4.0) * math.sin(a))
        if 2 <= x <= W - 3 and 2 <= y <= 24 and g[y][x] in 'lm' and not (y > 24):
            prop(f'tree_a{n}', 'ctree' if n % 2 == 0 else 'ctree2', (x, y), shadow=18)
            n += 1
    for y in range(3, 38, 3):
        for x in (2, W - 3):
            if g[y][x] in 'lmp' and not (y < 26 and abs(x - CX) < 11):
                prop(f'tree_e{x}_{y}', 'ctree' if (y // 3) % 2 else 'ctree2', (x, y), shadow=18)
    for x in range(5, 35, 3):
        if g[37][x] in 'lm':
            prop(f'tree_s{x}', 'ctree' if (x // 3) % 2 else 'ctree2', (x, 38), shadow=18)
    prop('spot_goose', 'bench', (0, 0), solid=False) if False else None
    return {
        'id': 'campus', 'name': 'Lido Campus', 'size': [W, H], 'defaultGround': 'l', 'legend': legend,
        'layers': {'ground': rows},
        'spawns': {'default': [20, 28, 'up'], 'start': [20, 28, 'up'], 'door': [CX, dy + 1, 'down'], 'from_office': [CX, dy + 1, 'down']},
        'objects': objs + [{'type': 'plot', 'id': 'terrace', 'at': [17, 31], 'size': [6, 4], 'reserve': {'at': [15, 30], 'size': [10, 6]}}],
    }


def office() -> dict:
    w, h = 20, 14
    g = [['F'] * w for _ in range(h)]
    for x in range(w):
        g[0][x] = 'W'; g[1][x] = 'g'; g[h - 1][x] = 'w'
    for y in range(h):
        g[y][0] = 'W'; g[y][w - 1] = 'W'
    g[h - 1][10] = 'd'
    rows = [''.join(r) for r in g]
    legend = {'F': {'tile': 'floor'}, 'W': {'tile': 'wall_top', 'solid': True}, 'g': {'tile': 'facade', 'solid': True}, 'w': {'tile': 'wall_face', 'solid': True}, 'd': {'tile': 'door'}, 'm': {'tile': 'mat'}}
    rows[h - 2] = rows[h - 2][:10] + 'm' + rows[h - 2][11:]
    objs: list[dict] = [{'type': 'exit', 'at': [10, h - 1], 'to': 'campus', 'spawn': 'door'}]

    def prop(i, sprite, at, size=(1, 1), **k):
        objs.append({'type': 'prop', 'id': i, 'sprite': sprite, 'at': list(at), 'size': list(size), **k})

    prop('desk', 'reception', (8, 3), (3, 1), use='desk', label='Handbook', shadow=44)
    prop('shelf', 'badgewall', (3, 2), (2, 1), use='shelf', label='Learned', shadow=26)
    prop('plan', 'whiteboard', (14, 2), (2, 1), use='plan', label='My onboarding plan', shadow=26)
    prop('radio', 'speaker', (12, 3), use='radio', label='Radio', shadow=12)
    for i, (x, y) in enumerate(((3, 7), (6, 7), (3, 10), (6, 10))):
        prop(f'odesk{i}', 'odesk', (x, y), (2, 1), shadow=28)
    prop('glassroom', 'glassroom', (14, 7), (4, 3), shadow=0)
    for i, (x, y) in enumerate(((1, 3), (18, 3), (1, 11), (12, 11), (18, 11))):
        prop(f'pot{i}', 'opot', (x, y), shadow=12)
    return {
        'id': 'office', 'name': 'Onboarding HQ', 'size': [w, h], 'defaultGround': 'F', 'legend': legend,
        'layers': {'ground': rows},
        'spawns': {'default': [10, h - 3, 'up'], 'from_campus': [10, h - 3, 'up']},
        'objects': objs + [{'type': 'spot', 'id': 'cat_sleep', 'at': [2, h - 3]}],
    }


if __name__ == '__main__':
    for name, m in (('campus', campus()), ('office', office())):
        (ROOT / 'content' / 'maps' / f'{name}.json').write_text(json.dumps(m, indent=1, ensure_ascii=False) + '\n', 'utf8')
        print('ok', name)
