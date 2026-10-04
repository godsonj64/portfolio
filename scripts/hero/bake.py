# Bakes the home-page hero: a night launch through cumulus, painted procedurally in GLSL and rendered
# offline into separate parallax layers (same approach as a game backdrop bake).
#
#   python3 scripts/hero/bake.py                 # both compositions, full size
#   python3 scripts/hero/bake.py wide --scale 0.5 --preview
#
# Writes RGBA PNG masters to .hero-bake/<composition>/<layer>.png (git-ignored); `npm run hero`
# then encodes them into public/hero and src/content/hero-manifest.json.
import os, sys, time
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gl
import scenes

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, '.hero-bake')


def over(top, bottom):
    """Premultiplied 'over'."""
    return top + bottom * (1.0 - top[..., 3:4])


def unpremul(img):
    a = img[..., 3:4]
    rgb = np.where(a > 1e-6, img[..., :3] / np.maximum(a, 1e-6), 0.0)
    return np.concatenate([rgb, a], -1)


def save(img, path, premultiplied=True):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    x = unpremul(img) if premultiplied else img
    h, w = x.shape[:2]
    dither = ((np.arange(h * w).reshape(h, w) * 7919 % 97) / 97 - 0.5)[..., None] / 255.0
    x = np.clip(np.round((x + dither) * 255), 0, 255).astype(np.uint8)
    Image.fromarray(x, 'RGBA').save(path, optimize=False, compress_level=6)


def bloom(layers, order, H):
    """Light that blooms off the brightest parts of the finished picture (exhaust, white-hot cloud), on black."""
    import cv2
    acc = None
    for n in order:
        if n in layers and n != 'glow':
            acc = layers[n].copy() if acc is None else over(layers[n], acc)
    rgb = acc[..., :3]
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    hot = rgb * np.clip((lum - 0.62) / 0.38, 0, 1)[..., None]
    out = np.zeros_like(rgb)
    for sigma, gain in ((0.006, 0.35), (0.025, 0.3), (0.07, 0.22)):
        out += cv2.GaussianBlur(hot, (0, 0), sigma * H) * gain
    return out


def bake(name, scale=1.0, preview=False, only=None):
    comp = scenes.COMPOSITIONS[name]
    W, H = int(round(comp['size'][0] * scale)), int(round(comp['size'][1] * scale))
    t0 = time.time()
    layers = comp['build'](W, H, only)
    if 'glow' in layers and all(n in layers for n in comp['order']):
        g = layers['glow']
        g[..., :3] = 1 - (1 - np.clip(g[..., :3], 0, 1)) * (1 - np.clip(bloom(layers, comp['order'], H), 0, 1))
    for lname, img in layers.items():
        save(img, os.path.join(OUT, name, f'{lname}.png'))
        print(f'  {name}/{lname}: {W}x{H}', flush=True)
    if preview:
        order = comp['order']
        acc = np.zeros((H, W, 4), np.float32)
        for lname in order:
            if lname not in layers:
                continue
            L = layers[lname]
            if lname == 'glow':   # screen blend
                acc[..., :3] = 1 - (1 - acc[..., :3]) * (1 - np.clip(L[..., :3], 0, 1))
            else:
                acc = over(L, acc)
        save(acc, os.path.join(OUT, f'{name}-preview.png'))
    print(f'{name}: {time.time() - t0:.1f}s', flush=True)


if __name__ == '__main__':
    args = sys.argv[1:]
    scale = 1.0
    only = None
    if '--scale' in args:
        i = args.index('--scale'); scale = float(args[i + 1]); del args[i:i + 2]
    if '--only' in args:
        i = args.index('--only'); only = set(args[i + 1].split(',')); del args[i:i + 2]
    preview = '--preview' in args
    args = [a for a in args if not a.startswith('--')]
    for n in (args or list(scenes.COMPOSITIONS)):
        bake(n, scale, preview, only)
