"""Герой: безымянный новичок (не реальный человек), 16×32, 4 стороны × 3 кадра, портрет 32×32.

Тёмные короткие волосы, без бороды, бирюзовая худи поверх белой футболки, серые брюки, белые кроссовки. Голова — одна группа (без швов), руки отдельной группой, ботинки отдельной.
Профиль (left, right = зеркало) нарисован вручную тонами палитры (HEAD_SIDE, TORSO_SIDE, ARM_SIDE, LEGS_SIDE): голова 3/4
в духе SDV, рука против ближней ноги, в шаге корпус опускается на 1 px.
"""
from __future__ import annotations

from art_core import Cv, Sheet, P, emit, single

PARTS = {
    'hair': P('hair', r=3, g='head'), 'skin': P('skin', r=2, g='head'),
    'shirt': P('shirt', r=2, g='torso'), 'hoodie': P('hoodie', r=3, g='torso'), 'belt': P('belt', r=1, g='torso'),
    'sleeve': P('hoodie', r=2, g='sleeve'), 'hand': P('skin', r=1, g='hand'),
    'trouser': P('trouser', r=3, g='legs'), 'boot': P('boot', r=1, g='boot'),
    'handf': P('skin', flat=2, g='hand'), 'can': P('tin', r=2, g='can'), 'tie': P('belt', flat=2, g='tie'),
}


def legs_front(c: Cv, step: int, cx: float = 8.0) -> None:
    """Штаны и ботинки спереди/сзади. step: -1 левая нога приподнята, +1 правая, 0 стоит."""
    for side, sx in ((-1, cx - 2.0), (1, cx + 2.0)):
        lift = 1.2 if step == side else 0
        c.rect(sx - 1.9, 23.0, 3.8, 6.9 - lift, 'trouser')
        c.ell(sx + side * 0.2, 30.2 - lift, 2.4, 1.4, 'boot')
    c.vline(8, 25, 30, 'trouser.1')


def arms_front(c: Cv, step: int) -> None:
    for side in (-1, 1):
        sw = -0.9 if step == -side else (0.6 if step == side else 0)
        x = 8 + side * 5.4
        c.cap(x, 16.2, x + side * 0.1, 21.6 + sw, 1.5, 'sleeve')
        c.ell(x + side * 0.1, 23.1 + sw, 1.3, 1.2, 'hand')


def head_front(c: Cv) -> None:
    c.ell(8, 9.2, 5.2, 5.4, 'skin')
    c.ell(2.9, 9.8, 0.9, 1.4, 'skin'); c.ell(13.1, 9.8, 0.9, 1.4, 'skin')
    c.ell(8, 5.6, 5.5, 4.5, 'hair')
    c.ell(8.8, 3.4, 4.0, 2.5, 'hair')
    c.fill(lambda x, y: ((x - 8) / 5.2) ** 2 + ((y - 9.2) / 5.4) ** 2 <= 1 and y > 7.2 and 4.7 < x < 11.3, 'skin', only=['hair'])
    c.dots([5, 9, 10, 9], 'ink')
    c.dots([7, 12, 8, 12], 'mouth')


def hero_down(step: int, arms=None, post=None) -> Cv:
    c = Cv(16, 32, PARTS)
    legs_front(c, step)
    c.rect(4.8, 22.0, 6.4, 1.8, 'belt')
    c.rect(4.2, 15.0, 7.6, 7.2, 'shirt')
    c.poly([[2.8, 16.2], [4.4, 14.6], [6.4, 14.6], [7.2, 20.4], [6.6, 23.9], [3.2, 23.9]], 'hoodie')
    c.poly([[13.2, 16.2], [11.6, 14.6], [9.6, 14.6], [8.8, 20.4], [9.4, 23.9], [12.8, 23.9]], 'hoodie')
    c.dot(8, 22.6, 'shirt.3')
    (arms or arms_front)(c, step)
    c.rect(6.2, 13.4, 3.6, 2.2, 'skin')
    head_front(c)
    if post:
        post(c)
    return c


def hero_up(step: int, arms=None, post=None) -> Cv:
    c = Cv(16, 32, PARTS)
    legs_front(c, step)
    c.poly([[2.8, 16.2], [4.4, 14.6], [11.6, 14.6], [13.2, 16.2], [12.8, 23.9], [3.2, 23.9]], 'hoodie')
    (arms or arms_front)(c, step)
    c.rect(6.2, 13.2, 3.6, 2.2, 'skin')
    c.ell(8, 9.2, 5.2, 5.4, 'skin')
    c.ell(2.9, 9.8, 0.9, 1.4, 'skin'); c.ell(13.1, 9.8, 0.9, 1.4, 'skin')
    c.ell(8, 7.6, 5.5, 6.4, 'hair')
    c.ell(8.0, 3.4, 4.2, 2.5, 'hair')
    c.rect(4.6, 11.6, 6.8, 2.2, 'skin', only=['hair'])
    c.vline(8, 17, 23, 'hoodie.1')
    if post:
        post(c)
    return c


class HCv(Cv):
    """Холст профиля: фигура, нарисованная поверх, снимает ручные тона (накладки) под собой."""

    def fill(self, test, part, only=None):
        for y in range(self.h):
            for x in range(self.w):
                i = y * self.w + x
                if test(x + 0.5, y + 0.5) and (only is None or self.m[i] in only):
                    self.m[i] = part
                    self.ov[i] = None
        return self


# Ручная раскладка тонов (профиль рисуется как пиксель-арт): буква → (часть для контура, тон палитры). '.' пусто.
TONES = {
    'k': ('hair', 'hair.4'), 'K': ('hair', 'hair.3'), 'H': ('hair', 'hair.2'), 'h': ('hair', 'hair.1'), 'D': ('hair', 'hair.0'),
    'l': ('skin', 'skin.4'), 'L': ('skin', 'skin.3'), 'S': ('skin', 'skin.2'), 's': ('skin', 'skin.1'), 'x': ('skin', 'skin.0'),
    'C': ('skin', 'cheek'), 'E': ('skin', 'ink'), 'W': ('skin', 'eye_white'), 'M': ('skin', 'mouth'),
    'n': ('skin', 'skin.3'), 'B': ('skin', 'skin.2'), 'b': ('skin', 'skin.1'), 'd': ('skin', 'skin.0'),
    't': ('hoodie', 'hoodie.4'), 'r': ('hoodie', 'hoodie.3'), 'e': ('hoodie', 'hoodie.2'), 'w': ('hoodie', 'hoodie.1'), 'q': ('hoodie', 'hoodie.0'),
    'v': ('shirt', 'shirt.4'), 'g': ('shirt', 'shirt.3'), 'f': ('shirt', 'shirt.2'),
    'P': ('trouser', 'trouser.4'), 'p': ('trouser', 'trouser.3'), 'o': ('trouser', 'trouser.2'), 'i': ('trouser', 'trouser.1'), 'u': ('trouser', 'trouser.0'),
    'G': ('boot', 'boot.3'), 'J': ('boot', 'boot.2'), 'j': ('boot', 'boot.1'), 'Y': ('boot', 'boot.0'),
    'V': ('belt', 'belt.2'), 'c': ('belt', 'belt.1'), 'Q': ('belt', 'shirt.3'),
}


def paint(c: Cv, rows: list[str], ox: int = 0, oy: int = 0) -> None:
    for y, row in enumerate(rows):
        assert len(row) == 16, row
        for x, ch in enumerate(row):
            if ch == '.':
                continue
            X, Y = x + ox, y + oy
            if 0 <= X < c.w and 0 <= Y < c.h:
                part, tone = TONES[ch]
                c.m[Y * c.w + X] = part
                c.ov[Y * c.w + X] = tone


# Профиль (смотрит влево). Голова y=0…14: зачёс вверх-назад, бровь, глаз, нос 1 px, ухо, бакенбард переходит
# в короткую бороду по линии челюсти, усы.
HEAD_SIDE = [
    '................',
    '.....KKKHH......',
    '...KKKHHHHh.....',
    '..KKHKHHhHHh....',
    '..KHHHKHHHHhh...',
    '..HHhHHhHHHhh...',
    '..LLSShHhHHhh...',
    '..SSSSShhHHhh...',
    '..hhSSSbhHhhh...',
    '..SESSSbLShhh...',
    '.SSSSSnbSshh....',
    '..nnSBBbSsh.....',
    '..MBBBBbbSs.....',
    '...nBBbbsSs.....',
    '....bbb.........',
]
# Корпус y=14…23 без руки: воротник рубашки и шея, грудь с полосой рубашки, лацкан, ремень с пряжкой спереди, спина.
TORSO_SIDE = [
    '.......gSse.....',
    '....gfrrrrew....',
    '....gerrreew....',
    '....ferreeew....',
    '....fweeeeew....',
    '....fewreeew....',
    '....feeeeeew....',
    '....fewwweew....',
    '....Qceeeeew....',
    '....wwwwwwqw....',
]
# Ближняя рука y=15…23: 0 висит, 1 отведена назад, -1 вынесена вперёд.
ARM_SIDE = {
    0: [
        '.......rre......',
        '......wreeq.....',
        '......wreeq.....',
        '......wreeq.....',
        '......wreeq.....',
        '......wrewq.....',
        '......qwwwq.....',
        '......qLSq......',
        '.......Ss.......',
    ],
    1: [
        '.......rre......',
        '.......reew.....',
        '.......wreeq....',
        '........wreeq...',
        '........wreeq...',
        '.........wreq...',
        '.........qwwwq..',
        '..........LSq...',
        '..........Ss....',
    ],
    -1: [
        '.......rre......',
        '......rreew.....',
        '......rreeq.....',
        '.....wreeq......',
        '.....wreeq......',
        '....wreeq.......',
        '....qwwwq.......',
        '....qLSq........',
        '.....Ss.........',
    ],
}
# Ноги y=24…31 (в шаге корпус опускается на 1 px, ноги с y=25). 0 стоит; -1 ближняя нога впереди; +1 ближняя сзади.
LEGS_SIDE = {
    0: [
        '.....pooooi.....',
        '.....poouii.....',
        '.....poouii.....',
        '.....poouii.....',
        '.....poouii.....',
        '....GJJjYjj.....',
        '...GJJJjjYjj....',
        '...YYYYYYYYY....',
    ],
    -1: [
        '.....pooouii....',
        '....pooo.uii....',
        '...pooo..uii....',
        '...poo...uiii...',
        '..GJJj....uii...',
        '.GJJJjj..YYjjj..',
        '.YYYYYY..YYYY...',
    ],
    1: [
        '.....iiooop.....',
        '....iii.pooo....',
        '...iii..pooo....',
        '...iii...pooo...',
        '..Yjj.....GJJj..',
        '.Yjjjj...GJJjjj.',
        '.YYYYY...YYYYY..',
    ],
}


def hero_left(step: int, arms=None, post=None) -> Cv:
    c = HCv(16, 32, PARTS)
    dy = 1 if step != 0 else 0
    paint(c, LEGS_SIDE[step], 0, 24 + dy)
    paint(c, TORSO_SIDE, 0, 14 + dy)
    if arms:
        arms(c, step)
    else:
        paint(c, ARM_SIDE[-step], 0, 15 + dy)  # рука против ближней ноги
    paint(c, HEAD_SIDE, 0, dy)
    if post:
        post(c)
    return c


def portrait() -> Cv:
    """32×32: голова и плечи для UI."""
    c = Cv(32, 32, PARTS)
    c.poly([[1, 32], [3, 25.4], [8, 22.6], [24, 22.6], [29, 25.4], [31, 32]], 'hoodie')
    c.poly([[12, 22.6], [20, 22.6], [17.6, 32], [14.4, 32]], 'shirt')
    c.rect(12.4, 19.6, 7.2, 4.0, 'skin')
    c.ell(16, 13.2, 9.4, 9.8, 'skin')
    c.ell(6.8, 14.0, 1.8, 2.8, 'skin'); c.ell(25.2, 14.0, 1.8, 2.8, 'skin')
    c.ell(16, 8.0, 10.2, 8.0, 'hair')
    c.ell(17.6, 3.4, 8.0, 3.2, 'hair')
    c.fill(lambda x, y: ((x - 16) / 9.4) ** 2 + ((y - 13.2) / 9.8) ** 2 <= 1 and y > 10.6 and 8.4 < x < 23.6, 'skin', only=['hair'])
    c.orect(10, 13, 4, 2, 'eye_white'); c.orect(18, 13, 4, 2, 'eye_white')
    c.orect(11, 13, 2, 2, 'ink'); c.orect(19, 13, 2, 2, 'ink')
    c.orect(10, 11, 4, 1, 'hair.1'); c.orect(18, 11, 4, 1, 'hair.1')
    c.orect(15, 20, 2, 1, 'mouth')
    return c


# ───────────────────────────── рабочая поза: печатает на планшете ─────────────────────────────

def sleeve(c: Cv, x0, y0, x1, y1, r: float = 1.5) -> None:
    c.cap(x0, y0, x1, y1, r, 'sleeve')


def hand(c: Cv, x, y, rx: float = 1.3, ry: float = 1.2) -> None:
    c.ell(x, y, rx, ry, 'handf')
    c.dot(x - rx * 0.4, y - ry * 0.4, 'skin.3')


def tablet(c: Cv, x0: float, y0: float, w: float, h: float, tap: bool) -> None:
    """Планшет в руках: светлая рамка, голубой экран; в кадре «нажатие» вспыхивает точка."""
    c.rect(x0, y0, w, h, 'can')
    for yy in range(int(y0) + 1, int(y0 + h) - 1):
        for xx in range(int(x0) + 1, int(x0 + w) - 1):
            c.dot(xx, yy, 'water.2')
    c.dot(int(x0) + 1, int(y0) + 1, 'water.4')
    if tap:
        c.dots([int(x0 + w / 2), int(y0 + h / 2), int(x0 + w / 2) + 1, int(y0 + h / 2)], 'chalk.4')


# работа с карточкой: стоит лицом к рабочему месту и печатает / листает на планшете
def work_front(frame: int):
    def arms(c, step):
        sleeve(c, 2.9, 16.4, 4.8, 21.0); sleeve(c, 13.1, 16.4, 11.2, 21.0)

    def post(c):
        tablet(c, 4.0, 19.6, 8.0, 4.6, frame == 1)
        hand(c, 4.2, 22.8); hand(c, 11.8, 22.8 + (0.6 if frame else 0))
    return arms, post


def work_up(frame: int):
    def arms(c, step):
        sleeve(c, 2.9, 16.4, 4.6, 20.2); sleeve(c, 13.1, 16.4, 11.4, 20.2)

    def post(c):
        hand(c, 5.0, 21.0 + (0.5 if frame else 0)); hand(c, 11.0, 21.0)
    return arms, post


def work_left(frame: int):
    def arms(c, step):
        sleeve(c, 8.0, 16.4, 5.4, 21.0)

    def post(c):
        tablet(c, 1.8, 19.4, 4.6, 5.0, frame == 1)
        hand(c, 5.8, 22.0 + (0.5 if frame else 0))
    return arms, post


def build() -> None:
    sh = Sheet('hero', 16, 32, anchor=[8, 31], anims={})
    idx = {}
    for d, fn in (('down', hero_down), ('up', hero_up), ('left', hero_left)):
        idx[d] = [sh.add(fn(s).render()) for s in (0, -1, 1)]
    idx['right'] = [sh.flip_of(i) for i in idx['left']]
    for d, (a, b, c) in idx.items():
        sh.anims[f'idle_{d}'] = [a]
        sh.anims[f'walk_{d}'] = [b, a, c, a]

    # новые кадры только в конец листа
    fn = {'down': hero_down, 'up': hero_up, 'left': hero_left}

    def add_pose(name: str, frames: dict) -> None:
        """frames: {сторона: [(step, arms, post), ...]}; right = зеркало left."""
        ids = {}
        for d in ('down', 'up', 'left'):
            ids[d] = [sh.add(fn[d](step, arms, post).render()) for step, arms, post in frames[d]]
        ids['right'] = [sh.flip_of(i) for i in ids['left']]
        for d, lst in ids.items():
            sh.anims[f'{name}_{d}'] = lst

    def two(down, up, left):
        return {'down': [(0, *down(0)), (0, *down(1))], 'up': [(0, *up(0)), (0, *up(1))],
                'left': [(0, *left(0)), (0, *left(1))]}

    add_pose('work', two(work_front, work_up, work_left))
    emit(sh)
    single('hero_portrait', portrait().render(), anchor=[16, 31])
