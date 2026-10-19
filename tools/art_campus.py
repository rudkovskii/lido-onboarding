"""Спрайты кампуса: круглые деревья в кадках, скамья, велопарковка, кафе, лампа, инфо-тотем «Mini-games», шезлонг и зонт у бассейна,
рабочие места (4 стадии карточки: New / Started / Practiced / Mastered), значок-награда, иконки стадий для DOM.
Белый, светлый бетон, сталь, стекло; цвета только из материалов (art/materials.json)."""
from __future__ import annotations

from art_core import Cv, P, Sheet, emit, single


def tree_round(sid: str, mat: str) -> None:
    """Круглое дерево на бетонной кадке 16×32: шар кроны, тонкий ствол."""
    parts = {'crown': P(mat, r=4, g='crown'), 'trunk': P('wood_dark', r=1, g='trunk'), 'pot': P('concrete', r=2, g='pot')}
    c = Cv(16, 32, parts)
    c.rect(7, 16, 2, 11, 'trunk')
    c.ell(8, 9.5, 7.2, 7.4, 'crown')
    c.rect(3, 26, 10, 5, 'pot')
    c.dots([5, 6, 6, 5, 10, 7, 8, 4], f'{mat}.4')
    single(sid, c.render(), anchor=[8, 31])


def bench() -> None:
    """Скамья 32×16: светлые рейки, стальные опоры."""
    parts = {'slat': P('plank', r=1, g='slat'), 'leg': P('tin', r=1, g='leg'), 'back': P('plank', r=1, g='back')}
    c = Cv(32, 16, parts)
    c.rect(3, 12, 2, 3, 'leg'); c.rect(27, 12, 2, 3, 'leg')
    c.rect(2, 7, 28, 2, 'slat'); c.rect(2, 10, 28, 2, 'slat')
    c.rect(2, 3, 28, 2, 'back')
    c.rect(3, 4, 2, 6, 'leg'); c.rect(27, 4, 2, 6, 'leg')
    single('bench', c.render(), anchor=[16, 15])


def bikerack() -> None:
    parts = {'steel': P('tin', r=1, g='steel')}
    c = Cv(32, 16, parts)
    for x in (4, 11, 18, 25):
        c.ell(x + 1.5, 9, 3.2, 5, 'steel')
        c.ell(x + 1.5, 9.6, 1.6, 3.4, 'steel')
        c.clear(lambda xx, yy, x=x: abs(xx - (x + 1.5)) < 1.5 and 7 < yy < 12)
    c.rect(2, 14, 28, 1, 'steel')
    single('bikerack', c.render(), anchor=[16, 15])


def lamp() -> None:
    parts = {'pole': P('tin', r=1, g='pole'), 'head': P('chalk', r=2, g='head')}
    c = Cv(16, 32, parts)
    c.rect(7, 6, 2, 24, 'pole')
    c.rect(5, 29, 6, 2, 'pole')
    c.ell(8, 4.5, 4.4, 2.8, 'head')
    c.dots([7, 4, 8, 4], 'sunflower.4') if False else None
    single('lamp', c.render(), anchor=[8, 31])


def cafe() -> None:
    """Кафе-киоск 32×32: стеклянный павильон, полосатый тент в цветах бассейна."""
    parts = {'wall': P('chalk', r=2, g='wall'), 'glass': P('glass_dark', r=1, g='glass'), 'a': P('water', r=2, g='a'), 'b': P('chalk', r=2, g='b'),
             'counter': P('concrete', r=2, g='counter'), 'trim': P('tin', r=1, g='trim')}
    c = Cv(32, 32, parts)
    c.rect(3, 12, 26, 17, 'wall')
    c.rect(5, 15, 22, 8, 'glass')
    c.rect(3, 25, 26, 4, 'counter')
    c.rect(2, 29, 28, 2, 'trim')
    for i in range(7):
        c.rect(1 + i * 4.3, 6, 4.3, 7, 'a' if i % 2 == 0 else 'b')
    c.rect(1, 5, 30, 1.5, 'trim')
    c.dots([9, 19, 10, 19, 20, 19, 21, 19], 'glass_dark.4')
    single('cafe', c.render(), anchor=[16, 31])


def totem() -> None:
    """Инфо-стела «Mini-games» 32×32: белый корпус, цифровой экран с логотипом-каплей и строками."""
    parts = {'body': P('chalk', r=3, g='body'), 'screen': P('shade', r=2, g='screen'), 'base': P('tin', r=1, g='base')}
    c = Cv(32, 32, parts)
    c.rect(4, 29, 24, 2, 'base')
    c.rect(6, 3, 20, 26, 'body')
    c.rect(8, 5, 16, 16, 'screen')
    # экран: капля и строки меню
    c.ell(16, 11.5, 2.6, 2.6, 'screen')
    for y in range(7, 13):
        for x in range(13, 20):
            if ((x - 16) ** 2) / 4.0 + ((y - 10.4) ** 2) / 6.0 <= 1.0:
                c.dot(x, y, 'water.3')
    c.dot(16, 7, 'water.4'); c.dot(15, 8, 'water.4')
    c.hline(10, 22, 16, 'water.2'); c.hline(10, 19, 18, 'water.1'); c.hline(10, 21, 19, 'glass.3')
    c.rect(11, 23, 10, 3, 'body'); c.hline(12, 20, 24, 'tin.3')
    c.dots([9, 6, 22, 6], 'glass.4')
    single('totem', c.render(), anchor=[16, 31])


def sunbed() -> None:
    parts = {'frame': P('tin', r=1, g='frame'), 'mat': P('blanket', r=2, g='mat'), 'pil': P('pillow', r=1, g='pil'), 'leg': P('tin', r=1, g='leg')}
    c = Cv(32, 16, parts)
    c.rect(3, 13, 2, 2, 'leg'); c.rect(27, 13, 2, 2, 'leg')
    c.rect(2, 7, 28, 6, 'frame')
    c.rect(4, 6, 24, 5, 'mat')
    c.rect(4, 4, 7, 5, 'pil')
    for x in (13, 17, 21, 25):
        c.vline(x, 7, 10, 'blanket.3')
    single('sunbed', c.render(), anchor=[16, 15])


def umbrella() -> None:
    parts = {'pole': P('tin', r=1, g='pole'), 'a': P('water', r=2, g='a'), 'b': P('chalk', r=2, g='b'), 'base': P('concrete', r=2, g='base')}
    c = Cv(16, 32, parts)
    c.rect(7, 9, 2, 20, 'pole')
    c.rect(5, 29, 6, 2, 'base')
    for i, (x0, x1) in enumerate(((0, 3), (3, 6), (6, 10), (10, 13), (13, 16))):
        c.fill(lambda x, y, x0=x0, x1=x1: x0 <= x < x1 and ((x - 8) / 8) ** 2 + ((y - 9.5) / 6.5) ** 2 <= 1 and y < 10.5, 'a' if i % 2 == 0 else 'b')
    single('umbrella', c.render(), anchor=[8, 31])


# ───────────── рабочие места: стадии карточки ─────────────

def pod(stage: str) -> Cv:
    """Рабочее место 16×32 на клетке: белый стол, монитор на стойке. new — экран тёмный; started — включён;
    practiced — на экране график; mastered — зелёный экран с галочкой и значком на столе."""
    parts = {'desk': P('chalk', r=2, g='desk'), 'top': P('concrete', r=1, g='top'), 'mon': P('shade', r=1, g='mon'), 'stand': P('tin', r=1, g='stand'),
             'chair': P('tin', r=1, g='chair'), 'kb': P('tin', flat=3, g='kb')}
    c = Cv(16, 32, parts)
    c.rect(2, 24, 12, 3, 'desk')          # столешница (спереди)
    c.rect(3, 27, 2, 4, 'desk'); c.rect(11, 27, 2, 4, 'desk')   # ножки
    c.rect(3, 21, 10, 3, 'top')           # поверхность
    c.rect(7, 18, 2, 4, 'stand')          # стойка
    c.rect(2, 8, 12, 10, 'mon')           # рамка монитора
    # экран 10×8 внутри (x 3..12, y 9..16)
    base = {'new': 'shade.2', 'started': 'water.2', 'practiced': 'water.1', 'mastered': 'leaf.2'}[stage]
    for y in range(9, 17):
        for x in range(3, 13):
            c.dot(x, y, base)
    if stage == 'started':
        c.hline(4, 9, 11, 'water.4'); c.hline(4, 11, 13, 'water.3'); c.hline(4, 8, 15, 'water.3')
        c.dot(11, 10, 'glass.4')
    elif stage == 'practiced':
        for x, h in ((4, 2), (6, 3), (8, 5), (10, 6)):
            for yy in range(16 - h, 16):
                c.dot(x, yy, 'leaf.3'); c.dot(x + 1, yy, 'leaf.3')
        c.hline(4, 12, 15, 'glass.3')
        c.dots([5, 11, 7, 10, 9, 10, 11, 9], 'tomato.3')
    elif stage == 'mastered':
        for x, y in ((5, 13), (6, 14), (7, 15), (8, 14), (9, 13), (10, 12), (11, 11)):
            c.dot(x, y, 'chalk.4')
            c.dot(x, y - 1, 'chalk.4') if x in (6, 9) else None
        c.hline(3, 13, 9, 'leaf.4')
    else:
        c.dots([4, 10, 5, 10, 11, 15], 'shade.3')
    c.rect(5, 22.5, 6, 1, 'kb')
    if stage == 'mastered':
        c.ell(13, 21, 2.1, 2.1, 'top')
        c.dots([13, 20, 12, 21, 14, 21, 13, 22], 'sunflower.4')
        c.dot(13, 21, 'sunflower.3')
    return c


def icon(stage: str) -> Cv:
    """Иконка стадии 16×16 для DOM: монитор на ножке."""
    parts = {'mon': P('shade', r=1, g='mon'), 'stand': P('tin', r=1, g='stand')}
    c = Cv(16, 16, parts)
    c.rect(6, 11, 4, 3, 'stand'); c.rect(4, 13, 8, 2, 'stand')
    c.rect(1, 1, 14, 11, 'mon')
    col = {'new': 'shade.3', 'started': 'water.2', 'practiced': 'water.1', 'mastered': 'leaf.2'}[stage]
    for y in range(2, 11):
        for x in range(2, 14):
            c.dot(x, y, col)
    if stage == 'started':
        c.hline(3, 10, 5, 'water.4'); c.hline(3, 12, 7, 'water.3'); c.hline(3, 8, 9, 'water.3')
    elif stage == 'practiced':
        for x, h in ((3, 2), (6, 4), (9, 6)):
            for yy in range(10 - h, 10):
                c.dot(x, yy, 'leaf.3'); c.dot(x + 1, yy, 'leaf.3'); c.dot(x + 2, yy, 'leaf.3')
    elif stage == 'mastered':
        for x, y in ((4, 6), (5, 7), (6, 8), (7, 7), (8, 6), (9, 5), (10, 4), (11, 3)):
            c.dot(x, y, 'chalk.4'); c.dot(x, y + 1, 'chalk.4')
    return c


def badge() -> Cv:
    """Значок-награда 16×16: золотой круг с галочкой, лента."""
    parts = {'disc': P('gold', r=3, g='disc'), 'rib': P('water', r=1, g='rib')}
    c = Cv(16, 16, parts)
    c.poly([[4, 10], [7, 10], [5, 15], [3, 13]], 'rib'); c.poly([[9, 10], [12, 10], [13, 13], [11, 15]], 'rib')
    c.ell(8, 7, 6, 6, 'disc')
    for x, y in ((5, 7), (6, 8), (7, 9), (8, 8), (9, 7), (10, 6)):
        c.dot(x, y, 'chalk.4')
    return c


def spark() -> None:
    """Искра «нажатие / награда»: голубой крестик, второй кадр диагональный; мерцает."""
    a = [[None] * 16 for _ in range(16)]
    b = [[None] * 16 for _ in range(16)]
    for x, y in ((8, 5), (8, 6), (8, 10), (8, 11), (5, 8), (6, 8), (10, 8), (11, 8)):
        a[y][x] = 'water.3'
    for x, y in ((8, 7), (8, 9), (7, 8), (9, 8)):
        a[y][x] = 'chalk.4'
    a[8][8] = 'chalk.4'
    for x, y in ((5, 5), (11, 5), (5, 11), (11, 11), (6, 6), (10, 6), (6, 10), (10, 10)):
        b[y][x] = 'water.3'
    for x, y in ((7, 7), (9, 7), (7, 9), (9, 9), (8, 8)):
        b[y][x] = 'chalk.4'
    sh = Sheet('fx_spark', 16, 16, anchor=[8, 8], anims={'twinkle': [0, 1]})
    sh.add(a); sh.add(b)
    emit(sh)


def build() -> None:
    spark()
    tree_round('ctree', 'leaf')
    tree_round('ctree2', 'grass')
    bench(); bikerack(); lamp(); cafe(); totem(); sunbed(); umbrella()
    for st in ('new', 'started', 'practiced', 'mastered'):
        single(f'pod_{st}', pod(st).render(), anchor=[8, 31])
        single(f'icon_{st}', icon(st).render(), anchor=[8, 15])
    single('item_badge', badge().render(), anchor=[8, 15])
