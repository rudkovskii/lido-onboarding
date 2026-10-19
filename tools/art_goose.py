"""Гусь (спутник новичка): 16×16, 4 стороны, ходьба, сидит, чистит перья, спит, клюёт землю, вытягивает шею, взмахивает крыльями, лежит.

Белое тело (`petal_white`), оранжевые клюв и лапы (`cat`), чёрный глаз. Набор кадров и имена анимаций те же, что были у кота:
`world/catLife.ts` выбирает их по режимам `follow / sit / wash / sleep / sniff / crouch / lie / pounce`
(wash = чистит перья, sniff = клюёт землю, crouch = вытянул шею, pounce = взмах крыльями). Новых материалов нет.
"""
from __future__ import annotations

from art_core import Cv, Sheet, P, emit

PARTS = {
    'body': P('petal_white', r=3, g='body'), 'head': P('petal_white', r=2, g='body'), 'wing': P('petal_white', r=2, g='body'),
    'tail': P('petal_white', r=1, g='body'), 'beak': P('cat', r=1, g='beak'), 'foot': P('cat', r=1, g='foot'),
}
EYE = 'ink'
SH = 'petal_white.1'  # линия крыла: тёплая тень, а не тёмный шов (гусь остаётся белым)


def wings_front(c: Cv, y0: float = 8.0, y1: float = 12.4) -> None:
    c.vline(6, y0, y1, SH); c.vline(9, y0, y1, SH)


def face_front(c: Cv, cx: float = 8.0, y: float = 4.2) -> None:
    c.ell(cx, y, 2.3, 2.1, 'head')
    c.ell(cx, y + 1.5, 1.4, 1.0, 'beak')
    c.dots([cx - 1.8, y - 1.1, cx + 1.5, y - 1.1], EYE)


def feet_front(c: Cv, step: int, y: float = 13.6) -> None:
    for s in (-1, 1):
        lift = 1.0 if step == s else 0
        c.rect(8 + s * 2.0 - 0.6, y - lift - 0.4, 1.2, 1.4, 'foot')
        c.rect(8 + s * 2.0 - 1.5, y + 0.8 - lift, 3.0, 1.0, 'foot')


def goose_down(step: int) -> Cv:
    c = Cv(16, 16, PARTS)
    feet_front(c, step)
    c.ell(8, 10.6, 4.4, 3.6, 'body')
    c.ell(4.7, 10.2, 1.6, 2.9, 'wing'); c.ell(11.3, 10.2, 1.6, 2.9, 'wing')
    c.cap(8, 9.2, 8, 5.2, 1.5, 'body')
    face_front(c)
    wings_front(c)
    return c


def goose_up(step: int) -> Cv:
    c = Cv(16, 16, PARTS)
    feet_front(c, step, 13.8)
    c.poly([[5.8, 13.0], [10.2, 13.0], [8, 15.6]], 'tail')
    c.ell(8, 10.6, 4.4, 3.6, 'body')
    c.ell(4.7, 10.2, 1.6, 2.9, 'wing'); c.ell(11.3, 10.2, 1.6, 2.9, 'wing')
    c.cap(8, 9.2, 8, 5.4, 1.5, 'body')
    c.ell(8, 4.4, 2.3, 2.1, 'head')
    wings_front(c)
    return c


def side_feet(c: Cv, step: int, lift_k: float = 1.0) -> None:
    for k, lx in enumerate((6.2, 9.4)):
        off = step * (1 if k % 2 == 0 else -1) * 1.2
        lift = 0.8 * lift_k if (step and off > 0) else 0
        c.rect(lx + off - 0.5, 12.6, 1.2, 1.8 - lift, 'foot')
        c.rect(lx + off - 0.9, 14.2 - lift, 3.0, 1.0, 'foot')


def head_side(c: Cv, hx: float, hy: float) -> None:
    c.ell(hx, hy, 2.0, 1.8, 'head')
    c.poly([[hx + 1.4, hy - 0.8], [16, hy - 0.1], [16, hy + 1.0], [hx + 1.4, hy + 1.2]], 'beak')
    c.dot(hx + 0.2, hy - 0.7, EYE)


def goose_side(step: int) -> Cv:
    """Смотрит вправо; влево — зеркало."""
    c = Cv(16, 16, PARTS)
    side_feet(c, step)
    c.poly([[3.8, 8.6], [0.8, 7.0], [1.4, 10.4], [3.4, 11.4]], 'tail')
    c.ell(7.4, 10.0, 5.2, 3.4, 'body')
    c.ell(6.4, 9.6, 3.4, 2.1, 'wing')
    c.cap(11.2, 8.4, 12.2, 4.4, 1.5, 'body')
    head_side(c, 12.8, 3.6)
    c.hline(4, 9, 11, SH); c.dots([9, 10, 10, 9], SH)
    return c


def goose_sit() -> Cv:
    c = Cv(16, 16, PARTS)
    c.ell(8, 11.4, 4.9, 3.6, 'body')
    c.ell(4.3, 11.0, 1.7, 2.6, 'wing'); c.ell(11.7, 11.0, 1.7, 2.6, 'wing')
    c.rect(5.6, 14.0, 1.8, 1.2, 'foot'); c.rect(8.8, 14.0, 1.8, 1.2, 'foot')
    c.cap(8, 9.4, 8, 5.2, 1.5, 'body')
    face_front(c)
    wings_front(c, 8.6, 13)
    return c


def goose_preen(frame: int) -> Cv:
    """Сидит, голова повёрнута к крылу: чистит перья (2 кадра: голова чуть ходит)."""
    c = Cv(16, 16, PARTS)
    dy = 0.8 if frame else 0
    c.ell(8, 11.4, 4.9, 3.4, 'body')
    c.ell(4.3, 11.0, 1.7, 2.6, 'wing'); c.ell(11.7, 11.0, 1.7, 2.6, 'wing')
    c.rect(5.6, 14.0, 1.8, 1.2, 'foot'); c.rect(8.8, 14.0, 1.8, 1.2, 'foot')
    c.cap(8, 9.6, 6.4, 8.0 + dy, 1.4, 'body')
    c.ell(5.8, 8.2 + dy, 2.0, 1.8, 'head')
    c.ell(4.2, 10.0 + dy * 1.2, 1.5, 1.0, 'beak')
    c.dot(5.5, 7.6 + dy, EYE)
    return c


def goose_sleep(frame: int) -> Cv:
    """Спит, голова под крылом, дышит."""
    c = Cv(16, 16, PARTS)
    b = 0.5 if frame else 0
    c.ell(8.4, 11.6 - b * 0.5, 5.8, 3.6 + b, 'body')
    c.ell(9.2, 11.2, 3.6, 2.4 + b * 0.5, 'wing')
    c.poly([[13.4, 10.6], [15.6, 9.8], [15.2, 12.6]], 'tail')
    c.ell(5.0, 9.4, 2.0, 1.8, 'head')
    c.rect(2.6, 9.6, 1.8, 1.1, 'beak')
    c.hline(4, 6, 9, EYE)
    return c


def goose_peck(frame: int) -> Cv:
    """Профиль вправо, шея вниз: клюёт землю."""
    c = Cv(16, 16, PARTS)
    b = 0.8 if frame else 0
    side_feet(c, 0)
    c.poly([[3.6, 8.6], [0.8, 7.6], [1.4, 10.4], [3.4, 11.4]], 'tail')
    c.ell(6.6, 10.0, 5.0, 3.3, 'body')
    c.ell(5.6, 9.6, 3.2, 2.0, 'wing')
    c.cap(10.2, 8.4, 13.0, 11.6 + b, 1.4, 'body')
    c.ell(13.4, 12.4 + b, 1.8, 1.5, 'head')
    c.poly([[14.4, 12.0 + b], [16, 13.2 + b], [14.6, 14.2 + b]], 'beak')
    c.dot(13.0, 11.9 + b, EYE)
    return c


def goose_stretch(frame: int) -> Cv:
    """Профиль вправо, низко, шея вытянута вперёд: шипит."""
    c = Cv(16, 16, PARTS)
    t = 1 if frame else 0
    c.rect(4.4, 13.0, 1.2, 1.4, 'foot'); c.rect(3.6, 14.2, 3.0, 1.0, 'foot')
    c.rect(8.4, 13.0, 1.2, 1.4, 'foot'); c.rect(7.6, 14.2, 3.0, 1.0, 'foot')
    c.poly([[3.2, 10.6 - t], [0.6, 9.6 - t], [1.2, 12.2], [3.0, 12.6]], 'tail')
    c.ell(6.8, 11.4, 5.0, 2.7, 'body')
    c.ell(6.0, 11.0, 3.2, 1.7, 'wing')
    c.cap(10.4, 10.2, 13.6, 8.4, 1.2, 'body')
    c.ell(13.6, 8.0, 1.8, 1.5, 'head')
    c.poly([[14.8, 7.4], [16, 8.0], [16, 9.0], [14.8, 9.2]], 'beak')
    c.dot(13.2, 7.4, EYE)
    return c


def goose_flap() -> Cv:
    """Профиль вправо, в воздухе: крылья вскинуты."""
    c = Cv(16, 16, PARTS)
    c.rect(6.0, 11.4, 1.1, 2.4, 'foot'); c.rect(5.2, 13.6, 2.8, 0.9, 'foot')
    c.rect(8.6, 11.4, 1.1, 2.4, 'foot'); c.rect(7.8, 13.6, 2.8, 0.9, 'foot')
    c.poly([[3.6, 8.4], [1.2, 7.4], [1.8, 10.0], [3.4, 10.6]], 'tail')
    c.ell(7.2, 8.8, 4.8, 3.0, 'body')
    c.poly([[2.6, 8.0], [1.6, 2.6], [5.0, 3.0], [8.4, 7.6]], 'wing')
    c.poly([[5.4, 7.6], [6.4, 0.8], [10.0, 1.8], [9.8, 7.6]], 'wing')
    c.cap(10.8, 7.2, 12.4, 4.0, 1.3, 'body')
    head_side(c, 12.8, 3.2)
    return c


def goose_lie(frame: int) -> Cv:
    """Профиль вправо, лежит на брюхе, шея прямо: дремлет."""
    c = Cv(16, 16, PARTS)
    b = 0.5 if frame else 0
    c.poly([[3.0, 11.6], [0.6, 10.6], [1.0, 13.4], [2.8, 13.8]], 'tail')
    c.ell(7.2, 12.0 - b * 0.5, 5.8, 2.9 + b, 'body')
    c.ell(6.4, 11.6, 3.6, 1.8, 'wing')
    c.cap(11.6, 10.6, 12.4, 6.6, 1.4, 'body')
    head_side(c, 12.8, 5.6)
    return c


def build() -> None:
    sh = Sheet('goose', 16, 16, anchor=[8, 15])
    d = [sh.add(goose_down(s).render()) for s in (0, -1, 1)]
    u = [sh.add(goose_up(s).render()) for s in (0, -1, 1)]
    r = [sh.add(goose_side(s).render()) for s in (0, -1, 1)]
    l = [sh.flip_of(i) for i in r]
    for name, (a, b, c) in {'down': d, 'up': u, 'right': r, 'left': l}.items():
        sh.anims[f'idle_{name}'] = [a]
        sh.anims[f'walk_{name}'] = [b, a, c, a]
    sh.anims['sit'] = [sh.add(goose_sit().render())]
    sh.anims['wash'] = [sh.add(goose_preen(0).render()), sh.add(goose_preen(1).render())]
    sh.anims['sleep'] = [sh.add(goose_sleep(0).render()), sh.add(goose_sleep(1).render())]
    for name, fn, n in (('sniff', goose_peck, 2), ('crouch', goose_stretch, 2), ('lie', goose_lie, 2), ('pounce', lambda _=0: goose_flap(), 1)):
        rs = [sh.add(fn(k).render()) for k in range(n)]
        ls = [sh.flip_of(i) for i in rs]
        sh.anims[f'{name}_right'] = rs
        sh.anims[f'{name}_left'] = ls
    emit(sh)
