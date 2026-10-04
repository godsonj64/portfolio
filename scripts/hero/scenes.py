# Compositions. Scene units: y in [0, 1] top to bottom, x in [0, W/H]. Every size is relative to the
# frame height, so a composition bakes the same picture at any resolution.
import numpy as np
import cv2
import gl
from clouds import Clouds

SHADOW = (0.045, 0.06, 0.22)
LIT = (0.30, 0.42, 0.86)
INK = (0.07, 0.06, 0.20)
NAVY = (0.78, 0.84, 1.0)   # tint for the dark wisps in the sky


def silhouette_ink(img, H, width=1.7, strength=0.8):
    """Ink the outer silhouette of a cloud layer (premultiplied RGBA), like the reference's outline."""
    a = img[..., 3]
    r = max(1, int(round(width * H / 1920.0)))
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
    e = np.clip(a - cv2.erode(a, k), 0, 1)[..., None] * strength
    img[..., :3] = img[..., :3] * (1 - e) + np.array(INK, np.float32) * a[..., None] * e
    return img


def cloud_floor(img, H, floor, seed=0):
    """Cut a cloud layer along a hanging, scalloped base [(x, y), ...] and sink the base into shadow."""
    h, w = img.shape[:2]
    xs = (np.arange(w, dtype=np.float32) + 0.5) / H
    ys = (np.arange(h, dtype=np.float32) + 0.5) / H
    fx, fy = np.array(floor, np.float32).T
    base = np.interp(xs, fx, fy)
    u = xs / 0.042 + 0.6 * np.sin(xs * 9.0 + seed) + seed
    k = u - np.floor(u)
    size = 0.012 + 0.012 * (0.5 + 0.5 * np.sin(np.floor(u) * 12.9898 + seed) )
    base = base + np.sqrt(np.clip(1 - (2 * k - 1) ** 2, 0, 1)) * size
    dy = base[None, :] - ys[:, None]                      # > 0 above the base
    m = np.clip(dy * H / 1.2 + 0.5, 0, 1)
    shade = 0.42 + 0.58 * np.clip(dy / 0.09, 0, 1) ** 0.8
    img[..., :3] *= (m * shade)[..., None]
    img[..., 3] *= m
    return img


def cloud_layer(c, W, H, plume, hot=1.0, shadow=SHADOW, lit=LIT, floor=None):
    img = gl.instanced('puff.frag', 'puff.vert', W, H, c.array(), {
        'uPlume': plume, 'uShadow': shadow, 'uLit': lit, 'uInk': INK, 'uLinePx': 1.55 * H / 1920.0,
        'uHot': hot, 'uBounce': 0.16,
    })
    if floor:
        img = cloud_floor(img, H, floor)
    return silhouette_ink(img, H)


def over(top, bottom):
    return top + bottom * (1.0 - top[..., 3:4])


class Scene:
    """Shared builder: a composition sets positions, then fills its cloud groups."""

    def __init__(self, W, H, only, rocket, plume_len, base, horizon, band, seed=1, ss=2, fall=0.12):
        self.ss = ss
        self.W0, self.H0 = W, H
        W, H = W * ss, H * ss
        self.W, self.H, self.only = W, H, only
        self.rocket = rocket                      # (tank axis x, nose y, stack height)
        self.rocket_u = (*rocket, plume_len)
        self.base = base                          # where the plume meets the cloud tops
        self.plume = (rocket[0], rocket[1] + rocket[2] * 1.1, base[1] + 0.22, fall)
        self.horizon = horizon                    # (y, curvature, camera x, ground scale)
        self.band = band
        self.seed = seed
        self.out = {}

    def want(self, n):
        return self.only is None or n in self.only

    def put(self, name, img):
        """Store a layer, area-averaged down from the supersampled render (premultiplied, so edges stay clean)."""
        if self.ss > 1:
            img = cv2.resize(img, (self.W0, self.H0), interpolation=cv2.INTER_AREA)
        self.out[name] = img

    def sky(self, wisps):
        if not self.want('sky'):
            return
        img = gl.fullscreen('sky.frag', self.W, self.H, {
            'uBand': self.band[0], 'uBandW': self.band[1], 'uGlow': (self.rocket[0], self.rocket[1] + 0.12), 'uSeed': 3.7,
        })
        c = Clouds(self.seed + 1)
        wisps(c)
        w = cloud_layer(c, self.W, self.H, self.plume, hot=0.25, shadow=(0.025, 0.035, 0.11), lit=(0.12, 0.19, 0.48))
        self.put('sky', over(w, img))

    def earth(self):
        if self.want('earth'):
            self.put('earth', gl.fullscreen('earth.frag', self.W, self.H, {'uEarth': self.horizon, 'uLaunch': self.base, 'uSeed': 2.0, 'uSS': 2}))

    def clouds(self, name, build, seed, hot=1.0, floor=None):
        if self.want(name):
            c = Clouds(seed)
            build(c)
            self.put(name, cloud_layer(c, self.W, self.H, self.plume, hot=hot, floor=floor))

    def ship(self):
        if self.want('rocket'):
            self.put('rocket', gl.fullscreen('rocket.frag', self.W, self.H, {'uRocket': self.rocket_u, 'uInkPx': 1.4 * self.H / 1920.0, 'uSS': 3}))
        if self.want('glow'):
            self.put('glow', gl.fullscreen('glow.frag', self.W, self.H, {'uRocket': self.rocket_u, 'uBase': self.base, 'uGain': 1.0}))


def smoke(c, path, r0, r1, **kw):
    """A drifting chain of dark, moonlit cloud along `path`, thinning from r0 to r1."""
    o = dict(tint=NAVY, plume=0.0, ink=0.6, nest=0.8, haze=0.15, fill=0.6)
    o.update(kw)
    pts = np.array(path, np.float32)
    seg = np.cumsum(np.r_[0, np.hypot(*np.diff(pts, axis=0).T)])
    t = 0.0
    while t < seg[-1]:
        k = t / seg[-1]
        x = float(np.interp(t, seg, pts[:, 0])); y = float(np.interp(t, seg, pts[:, 1]))
        R = r0 + (r1 - r0) * k
        RR = R * c.rng.uniform(0.6, 1.4)
        c.queue(x + c.rng.uniform(-0.3, 0.3) * R, y + c.rng.uniform(-0.45, 0.45) * R, RR, bulb=max(0.009, RR * 0.34),
                shade=(x, y + R * 1.1, R * 2.4), **o)
        t += R * c.rng.uniform(0.55, 0.8)


# ---- wide (desktop / landscape) -----------------------------------------------------------------
# Copy sits on the left 55%; the launch is at ~66% of a 16:10 viewport, framed by towering cumulus on the
# right, a lit bank on its left, and low, darker cloud behind the copy.
def build_wide(W, H, only=None):
    rx = 1.18
    s = Scene(W, H, only, rocket=(rx, 0.13, 0.2), plume_len=2.6, base=(rx, 0.58),
              horizon=(0.80, 0.02, rx, 5.0), band=((0.98, -0.12, 1.22, 0.62), 0.2))

    def wisps(c):
        smoke(c, [(-0.04, 0.36), (0.04, 0.30), (0.13, 0.27), (0.22, 0.255), (0.30, 0.26)], 0.038, 0.016)
        smoke(c, [(0.36, 0.17), (0.42, 0.155), (0.47, 0.16)], 0.018, 0.01)
        smoke(c, [(1.48, 0.10), (1.58, 0.075), (1.70, 0.07), (1.82, 0.05), (1.92, 0.06)], 0.034, 0.024)
        smoke(c, [(0.86, 0.10), (0.92, 0.085), (0.97, 0.09)], 0.016, 0.01)

    def back(c):
        far = lambda x, y: {'haze': float(np.clip(0.75 - x * 0.5, 0.0, 0.75)), 'fill': float(np.clip(0.4 + x * 0.5, 0.4, 1.0))}
        # low cloud behind the copy
        c.mass([(-0.08, 0.66), (0.12, 0.62), (0.3, 0.66), (0.48, 0.60), (0.66, 0.63), (0.8, 0.58)], 0.84, 0.06, 0.1, style=far)
        c.tower(0.18, 0.84, 0.55, 0.1, 0.05, style=far)
        c.tower(0.56, 0.84, 0.53, 0.1, 0.05, style=far)
        # the lit bank left of the launch
        c.tower(0.86, 0.86, 0.47, 0.11, 0.05, lean=0.05)
        c.tower(0.99, 0.86, 0.40, 0.11, 0.045, lean=0.04)
        c.mass([(0.74, 0.62), (0.86, 0.52), (0.98, 0.46), (1.08, 0.52)], 0.86, 0.06, 0.11)
        # the towering cumulus on the right
        c.tower(1.40, 0.92, 0.33, 0.13, 0.05, lean=-0.06)
        c.tower(1.57, 0.92, 0.16, 0.16, 0.06, lean=-0.05)
        c.tower(1.75, 0.95, 0.21, 0.17, 0.065)
        c.mass([(1.30, 0.52), (1.42, 0.40), (1.55, 0.26), (1.70, 0.22), (1.86, 0.26)], 0.92, 0.07, 0.14)

    def front(c):
        # exhaust billows the plume runs into
        c.tower(1.08, 0.84, 0.56, 0.09, 0.04, lean=0.08)
        c.tower(1.29, 0.84, 0.57, 0.09, 0.04, lean=-0.08)
        c.mass([(1.0, 0.64), (1.09, 0.585), (1.18, 0.6), (1.27, 0.585), (1.38, 0.64)], 0.82, 0.045, 0.09)
        # darker, nearer cloud along the bottom
        c.mass([(0.55, 0.8), (0.8, 0.76), (1.05, 0.74), (1.3, 0.75), (1.55, 0.72), (1.86, 0.70)], 0.84, 0.06, 0.1, plume=0.8)

    def fore(c):
        c.mass([(1.50, 0.93), (1.62, 0.89), (1.74, 0.86), (1.86, 0.85)], 1.04, 0.05, 0.09, plume=0.6)

    s.sky(wisps)
    s.earth()
    s.clouds('back', back, 11, floor=[(0.0, 0.80), (0.6, 0.82), (1.2, 0.84), (1.9, 0.85)])
    s.ship()
    s.clouds('front', front, 23, floor=[(0.4, 0.84), (1.0, 0.86), (1.9, 0.87)])
    s.clouds('fore', fore, 31)
    return s.out


# ---- tall (phones / portrait) -------------------------------------------------------------------
# The reference's own portrait framing: the launch climbing out of a gap between two banks, the exhaust
# billowing below it, the lit Earth under the cloud deck. The stack sits right of centre, clear of the
# notch, and high, above the headline.
def build_tall(W, H, only=None):
    rx = 0.34
    s = Scene(W, H, only, rocket=(rx, 0.06, 0.115), plume_len=3.8, base=(rx, 0.43),
              horizon=(0.73, 0.06, rx, 9.0), band=((0.30, -0.06, 0.37, 0.48), 0.14), fall=0.1)

    def wisps(c):
        smoke(c, [(-0.03, 0.20), (0.03, 0.165), (0.10, 0.145), (0.17, 0.14)], 0.026, 0.012)
        smoke(c, [(0.44, 0.07), (0.49, 0.055), (0.55, 0.05)], 0.022, 0.016)
        smoke(c, [(0.02, 0.33), (0.07, 0.31), (0.12, 0.315)], 0.018, 0.01)

    def back(c):
        # the lit bank on the left
        c.tower(0.05, 0.74, 0.40, 0.075, 0.035, lean=0.04)
        c.tower(0.17, 0.74, 0.45, 0.07, 0.03, lean=0.05)
        c.mass([(-0.05, 0.50), (0.07, 0.43), (0.19, 0.47), (0.27, 0.53)], 0.72, 0.04, 0.075)
        # the towering bank on the right
        c.tower(0.46, 0.76, 0.24, 0.09, 0.04, lean=-0.04)
        c.tower(0.54, 0.76, 0.30, 0.09, 0.04)
        c.mass([(0.38, 0.47), (0.43, 0.37), (0.48, 0.28), (0.57, 0.31)], 0.74, 0.04, 0.08)

    def front(c):
        c.tower(0.28, 0.70, 0.44, 0.06, 0.03, lean=0.06)
        c.tower(0.41, 0.70, 0.45, 0.06, 0.03, lean=-0.06)
        c.mass([(0.22, 0.51), (0.29, 0.45), (0.34, 0.46), (0.40, 0.45), (0.47, 0.51)], 0.70, 0.032, 0.06)
        c.mass([(-0.05, 0.66), (0.10, 0.63), (0.25, 0.62), (0.40, 0.61), (0.57, 0.59)], 0.72, 0.045, 0.07, plume=0.8)

    def fore(c):
        c.mass([(0.36, 0.91), (0.44, 0.87), (0.52, 0.85), (0.57, 0.85)], 1.03, 0.035, 0.06, plume=0.6)

    s.sky(wisps)
    s.earth()
    s.clouds('back', back, 12, floor=[(0.0, 0.73), (0.52, 0.75)])
    s.ship()
    s.clouds('front', front, 24, floor=[(0.0, 0.76), (0.52, 0.775)])
    s.clouds('fore', fore, 32)
    return s.out


ORDER = ['sky', 'earth', 'back', 'rocket', 'glow', 'front', 'fore']
COMPOSITIONS = {
    'wide': {'size': (3456, 1920), 'build': build_wide, 'order': ORDER},
    'tall': {'size': (1320, 2560), 'build': build_tall, 'order': ORDER},
}
