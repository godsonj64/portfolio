# Cloud geometry: groups of lumps (from masses and towers) -> bulbs. The output is an instance list for
# puff.vert, already in painter's order.
import math
import numpy as np


class Clouds:
    def __init__(self, seed):
        self.rng = np.random.default_rng(seed)
        self.rows = []
        self.pending = []

    # ---- lumps -------------------------------------------------------------------------------------
    # A lump: its base disc, a scalloped crown along its upper edge and a Poisson fill of bulbs with
    # varied sizes, sorted top to bottom so every bulb hides most of the one above it.
    def lump(self, cx, cy, R, tint=None, plume=1.0, haze=0.0, bulb=None, ink=1.0, fill=1.0, nest=1.0, ao=0.0, crown=1.0, size=0.19, shade=None):
        rng = self.rng
        rb = bulb if bulb else float(np.clip(R * size, 0.011, 0.03))
        if tint is None:   # neutral, bluer or rosier washes, like the reference
            k = rng.random()
            tint = (0.96, 0.97, 1.0) if k < 0.55 else (0.9, 0.96, 1.05) if k < 0.85 else (1.03, 0.95, 1.0)
            tint = tuple(t * rng.uniform(0.97, 1.03) for t in tint)
        lump = (*(shade or (cx, cy, R)), haze)   # the volume used for shading (a chain may share one)
        mat = (*tint, plume)
        ext = (ink, fill, nest, ao)
        bulbs = []
        # crown: left flank, over the top, right flank (y down, so "up" is sin < 0)
        n = max(3, int(R * math.pi * 1.15 / (rb * 1.3) * crown))
        for k in range(n):
            t = (k + rng.uniform(-0.3, 0.3)) / max(n - 1, 1)
            th = math.pi * 0.9 + t * math.pi * 1.2
            r = rb * math.exp(rng.normal(0, 0.3))
            rr = R - r * rng.uniform(0.35, 0.8)
            bulbs.append((cx + rr * math.cos(th), cy + rr * math.sin(th), r))
        # interior: dart throwing with varied radii, overlapping heavily (tighter vertically)
        tries = int(30 * (R / rb) ** 2) + 20
        pts = []
        cell = rb * 1.2
        grid = {}
        for _ in range(tries):
            a = rng.uniform(0, 2 * math.pi); u = math.sqrt(rng.random()) * R
            x, y = cx + u * math.cos(a), cy + u * math.sin(a)
            r = rb * 1.1 * math.exp(rng.normal(0, 0.45)) * (1.0 + 0.25 * (y - cy) / R)
            gx, gy = int(x // cell), int(y // cell)
            ok = True
            for ix in range(gx - 3, gx + 4):
                for iy in range(gy - 3, gy + 4):
                    for (px_, py_, pr) in grid.get((ix, iy), ()):
                        if ((x - px_) * 0.75) ** 2 + ((y - py_) * 1.45) ** 2 <= (0.46 * (r + pr)) ** 2:
                            ok = False; break
                    if not ok: break
                if not ok: break
            if ok:
                pts.append((x, y, r)); grid.setdefault((gx, gy), []).append((x, y, r))
        bulbs += pts
        bulbs.sort(key=lambda b: b[1] - b[2] * 0.35)
        # the base disc is flagged with a negative seed
        self.rows.append((cx, cy, R, -1.0, *lump, *mat, *ext))
        self.rows += [(x, y, r, rng.random() * 97.0, *lump, *mat, *ext) for x, y, r in bulbs]

    # ---- groups ------------------------------------------------------------------------------------
    # Lumps are queued by mass(), tower() and queue(), then flush() sorts the group top to bottom so
    # lumps lower on screen overlap the ones above them.
    def queue(self, x, y, R, **kw):
        self.pending.append((x, y, R, kw))

    def mass(self, profile, ybot, rtop, rbot, style=None, density=1.0, **kw):
        """Lumps whose tops follow `profile` [(x, ytop), ...], filled down to `ybot`, growing from rtop to rbot."""
        rng = self.rng
        xs = np.array([p[0] for p in profile]); ys = np.array([p[1] for p in profile])
        top = lambda x: float(np.interp(x, xs, ys))
        span = max(ybot - min(ys), 1e-3)
        found = []
        x = xs[0]
        while x <= xs[-1]:
            R = rtop * rng.uniform(0.75, 1.3)
            found.append((x, top(x) + R * rng.uniform(0.7, 0.95), R))
            x += R * rng.uniform(0.95, 1.4) / density
        y = min(ys) + rtop
        while y < ybot:
            x = xs[0] + rng.uniform(0, rbot)
            while x <= xs[-1]:
                yt = top(x)
                depth = y - yt
                if depth > rtop * 1.4:
                    k = min(1.0, depth / max(ybot - yt, 1e-3))
                    R = (rtop + (rbot - rtop) * k) * rng.uniform(0.8, 1.2)
                    found.append((x, y + rng.uniform(-0.3, 0.3) * R, R))
                    x += R * rng.uniform(1.1, 1.6) / density
                else:
                    x += rtop * 0.8
            y += (rtop + rbot) * 0.5 * 0.85 / density
        for (lx, ly, R) in found:
            o = dict(kw)
            o.setdefault('ao', float(np.clip((ly - top(lx)) / span, 0, 1)))
            if style:
                o.update(style(lx, ly) or {})
            self.queue(lx, ly, R, **o)

    def tower(self, x, ybase, ytop, r0, r1, lean=0.0, style=None, **kw):
        """A billowing column: lumps from radius r0 at the base to r1 at the crest."""
        rng = self.rng
        y = ybase
        while y > ytop + r1 * 0.8:
            k = (ybase - y) / max(ybase - ytop, 1e-3)
            R = (r0 + (r1 - r0) * k) * rng.uniform(0.85, 1.15)
            cx = x + lean * (ybase - y) + rng.uniform(-0.3, 0.3) * R
            sides = (-1, 1) if R > 0.05 and rng.random() < 0.7 else (0,)
            for j in sides:
                o = dict(kw)
                o.setdefault('ao', float(np.clip(1.0 - k, 0, 1)) * 0.7)
                if style:
                    o.update(style(cx, y) or {})
                self.queue(cx + j * R * rng.uniform(0.35, 0.6), y + rng.uniform(-0.1, 0.1) * R, R * (0.8 if j else 1.0), **o)
            y -= R * rng.uniform(0.75, 1.0)

    def flush(self):
        self.pending.sort(key=lambda l: l[1] + l[2] * 0.3)
        for (x, y, R, kw) in self.pending:
            self.lump(x, y, R, **kw)
        self.pending = []

    def array(self):
        self.flush()
        return np.array(self.rows, np.float32)
