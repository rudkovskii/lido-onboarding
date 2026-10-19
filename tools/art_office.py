"""Спрайты офиса (open space): ресепшен (Handbook), стена значков (Learned), доска «My onboarding plan», колонка-радио, рабочие столы,
стеклянная переговорка, горшечные растения. Белый, светлый бетон, сталь, стекло."""
from __future__ import annotations

from art_core import Cv, P, single


def reception() -> None:
    """Ресепшен 48×32: длинная белая стойка, ноутбук, капля Lido на фасаде, маленькое растение."""
    parts = {'desk': P('chalk', r=3, g='desk'), 'top': P('concrete', r=2, g='top'), 'lap': P('tin', r=1, g='lap'), 'scr': P('shade', r=1, g='scr'),
             'pot': P('chalk', r=1, g='pot'), 'leaf': P('leaf', r=2, g='leaf'), 'base': P('tin', r=1, g='base')}
    c = Cv(48, 32, parts)
    c.rect(2, 29, 44, 2, 'base')
    c.rect(2, 14, 44, 15, 'desk')
    c.rect(1, 11, 46, 4, 'top')
    c.rect(8, 4, 11, 7, 'scr'); c.rect(7, 11, 13, 1, 'lap')
    for y in range(5, 10):
        for x in range(9, 18):
            c.dot(x, y, 'water.2')
    c.hline(10, 16, 6, 'water.4'); c.hline(10, 14, 8, 'water.3')
    c.rect(37, 9, 3, 3, 'pot')
    c.ell(38.5, 6, 3.4, 3.2, 'leaf')
    for y in range(17, 27):
        for x in range(20, 29):
            if ((x - 24) ** 2) / 9.0 + ((y - 22.4) ** 2) / 12.0 <= 1.0 or (y < 20 and abs(x - 24) <= (y - 16) * 0.8):
                c.dot(x, y, 'water.2')
    c.dot(23, 21, 'water.4'); c.dot(23, 22, 'water.4')
    single('reception', c.render(), anchor=[24, 31])


def badgewall() -> None:
    """Стена значков 32×32: тёмная панель, ряды круглых значков (золото, голубой, зелёный)."""
    parts = {'panel': P('glass_dark', r=3, g='panel'), 'frame': P('tin', r=1, g='frame')}
    c = Cv(32, 32, parts)
    c.rect(1, 2, 30, 28, 'frame')
    c.rect(3, 4, 26, 24, 'panel')
    cols = ('gold.3', 'water.3', 'leaf.3', 'gold.3', 'water.3', 'leaf.3')
    for r in range(3):
        for k in range(4):
            cx, cy = 6.5 + k * 6.3, 8.5 + r * 7.3
            col = cols[(r * 4 + k) % 6]
            for y in range(int(cy) - 2, int(cy) + 3):
                for x in range(int(cx) - 2, int(cx) + 3):
                    if (x - cx + 0.5) ** 2 + (y - cy + 0.5) ** 2 <= 6.2:
                        c.dot(x, y, col)
            c.dot(int(cx) - 1, int(cy) - 1, 'chalk.4')
    c.rect(1, 30, 30, 1, 'frame')
    single('badgewall', c.render(), anchor=[16, 31])


def whiteboard() -> None:
    """Доска «My onboarding plan» 32×32: белая поверхность, чек-лист, столбики прогресса, стальная рама."""
    parts = {'board': P('petal_white', r=2, g='board'), 'frame': P('tin', r=1, g='frame'), 'leg': P('tin', r=1, g='leg')}
    c = Cv(32, 32, parts)
    c.rect(2, 3, 28, 20, 'frame')
    c.rect(3, 4, 26, 18, 'board')
    c.rect(4, 22, 24, 2, 'frame')
    c.rect(5, 24, 2, 6, 'leg'); c.rect(25, 24, 2, 6, 'leg')
    for i in range(3):
        y = 7 + i * 4
        if i < 2:
            c.dots([6, y, 7, y + 1, 8, y], 'leaf.3')
        else:
            c.dots([6, y, 7, y], 'tin.2')
        c.hline(11, 20 - i * 2, y, 'tin.3')
    for x, h in ((22, 3), (24, 5), (26, 8)):
        for yy in range(19 - h, 19):
            c.dot(x, yy, 'water.3'); c.dot(x + 1, yy, 'water.3')
    single('whiteboard', c.render(), anchor=[16, 31])


def speaker() -> None:
    """Колонка-радио 16×32: белая цилиндрическая колонка на тонкой стойке."""
    parts = {'body': P('chalk', r=3, g='body'), 'stand': P('tin', r=1, g='stand')}
    c = Cv(16, 32, parts)
    c.rect(6, 22, 4, 8, 'stand'); c.rect(3, 29, 10, 2, 'stand')
    c.rect(3, 6, 10, 17, 'body')
    c.ell(8, 7, 5, 2, 'body')
    for y in range(10, 21, 2):
        for x in range(5, 12, 2):
            c.dot(x, y, 'tin.2')
    c.dot(8, 8, 'water.3')
    single('speaker', c.render(), anchor=[8, 31])


def odesk() -> None:
    """Рабочий стол офиса 32×32: белая столешница, монитор с экраном, клавиатура."""
    parts = {'desk': P('chalk', r=3, g='desk'), 'top': P('concrete', r=2, g='top'), 'mon': P('shade', r=1, g='mon'), 'stand': P('tin', r=1, g='stand'),
             'kb': P('tin', flat=3, g='kb')}
    c = Cv(32, 32, parts)
    c.rect(2, 22, 28, 6, 'desk')
    c.rect(3, 28, 2, 3, 'desk'); c.rect(27, 28, 2, 3, 'desk')
    c.rect(1, 18, 30, 5, 'top')
    c.rect(14, 15, 4, 4, 'stand')
    c.rect(8, 4, 16, 12, 'mon')
    for y in range(5, 15):
        for x in range(9, 23):
            c.dot(x, y, 'water.2')
    c.hline(10, 18, 7, 'water.4'); c.hline(10, 21, 9, 'water.3'); c.hline(10, 16, 11, 'water.3')
    for x, h in ((17, 2), (19, 3), (21, 4)):
        for yy in range(13 - h, 13):
            c.dot(x, yy, 'leaf.3')
    c.rect(11, 19.5, 10, 1.5, 'kb')
    single('odesk', c.render(), anchor=[16, 31])


def glassroom() -> None:
    """Стеклянная переговорка 64×48: стальные рамы, стеклянные стены, стол и стулья внутри."""
    parts = {'frame': P('tin', r=1, g='frame'), 'glass': P('glass', r=1, g='glass'), 'table': P('chalk', r=2, g='table'), 'chair': P('shade', r=1, g='chair'),
             'floor': P('concrete', r=1, g='floor')}
    c = Cv(64, 48, parts)
    c.rect(1, 44, 62, 3, 'frame')
    c.rect(1, 6, 62, 38, 'frame')
    c.rect(3, 8, 58, 33, 'glass')
    c.rect(3, 33, 58, 8, 'floor')
    c.rect(16, 24, 32, 6, 'table'); c.rect(18, 30, 2, 4, 'table'); c.rect(44, 30, 2, 4, 'table')
    for x in (19, 27, 35, 43):
        c.rect(x, 18, 5, 5, 'chair')
    for x in (21, 31, 41):
        c.rect(x, 33, 5, 4, 'chair')
    c.rect(31, 6, 2, 38, 'frame')
    for k in range(4):
        c.dot(8 + k, 10 + k, 'glass.4'); c.dot(40 + k, 10 + k, 'glass.4')
    single('glassroom', c.render(), anchor=[32, 47])


def opot() -> None:
    """Растение в горшке (офисный декор) 16×32."""
    parts = {'pot': P('chalk', r=2, g='pot'), 'leaf': P('leaf', r=3, g='leaf')}
    c = Cv(16, 32, parts)
    c.rect(4, 23, 8, 8, 'pot')
    c.ell(8, 14, 6.5, 8.5, 'leaf')
    c.dots([6, 10, 9, 8, 10, 13, 5, 15], 'leaf.4')
    c.rect(3, 22, 10, 2, 'pot')
    single('opot', c.render(), anchor=[8, 31])


def build() -> None:
    reception(); badgewall(); whiteboard(); speaker(); odesk(); glassroom(); opot()
