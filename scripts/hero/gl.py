# Headless GPU helpers for the hero bake (moderngl standalone context, OpenGL 4.1 core).
import os
import numpy as np
import moderngl

HERE = os.path.dirname(os.path.abspath(__file__))
_ctx = None
_progs = {}


def ctx():
    global _ctx
    if _ctx is None:
        _ctx = moderngl.create_standalone_context(require=410)
    return _ctx


def _src(name):
    with open(os.path.join(HERE, 'glsl', name)) as f:
        return f.read()


def program(frag, vert=None):
    key = (frag, vert)
    if key in _progs:
        return _progs[key]
    head = '#version 410 core\n' + _src('common.glsl') + '\n'
    vs = head + _src(vert) if vert else '#version 410 core\nin vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }'
    p = ctx().program(vertex_shader=vs, fragment_shader=head + _src(frag))
    _progs[key] = p
    return p


def _set(p, uniforms):
    for k, v in uniforms.items():
        if k in p:
            p[k].value = v


def _target(w, h):
    c = ctx()
    tex = c.texture((w, h), 4, dtype='f4')
    fb = c.framebuffer([tex])
    fb.use()
    c.viewport = (0, 0, w, h)
    fb.clear(0, 0, 0, 0)
    return tex, fb


def _read(fb, w, h):
    px = np.frombuffer(fb.read(components=4, dtype='f4'), np.float32).reshape(h, w, 4)
    return px[::-1].copy()   # top-down


def fullscreen(frag, w, h, uniforms=None, tile=1024):
    """Run a full-frame fragment shader in tiles (keeps each GPU submit short). Returns float32 RGBA, top-down."""
    c = ctx()
    p = program(frag)
    quad = c.buffer(np.array([-1, -1, 1, -1, -1, 1, 1, 1], 'f4').tobytes())
    vao = c.vertex_array(p, [(quad, '2f', 'aPos')])
    tex, fb = _target(w, h)
    _set(p, {'uRes': (float(w), float(h)), 'uAspect': w / h, **(uniforms or {})})
    c.disable(moderngl.BLEND)
    for y in range(0, h, tile):
        for x in range(0, w, tile):
            c.scissor = (x, y, min(tile, w - x), min(tile, h - y))
            vao.render(moderngl.TRIANGLE_STRIP)
            c.finish()
    c.scissor = None
    out = _read(fb, w, h)
    for o in (vao, quad, fb, tex):
        o.release()
    return out


def instanced(frag, vert, w, h, inst, uniforms=None, layout='4f 4f 4f 4f/i', names=('iBulb', 'iLump', 'iMat', 'iExtra'), chunk=4000):
    """Draw instanced quads in list order with premultiplied-alpha 'over' blending. Returns float32 RGBA (premultiplied), top-down."""
    c = ctx()
    p = program(frag, vert)
    corners = c.buffer(np.array([-1, -1, 1, -1, -1, 1, 1, 1], 'f4').tobytes())
    tex, fb = _target(w, h)
    _set(p, {'uRes': (float(w), float(h)), 'uAspect': w / h, **(uniforms or {})})
    c.enable(moderngl.BLEND)
    c.blend_func = (moderngl.ONE, moderngl.ONE_MINUS_SRC_ALPHA)
    inst = np.asarray(inst, np.float32)
    for i in range(0, len(inst), chunk):
        part = inst[i:i + chunk]
        buf = c.buffer(part.tobytes())
        vao = c.vertex_array(p, [(corners, '2f', 'aCorner'), (buf, layout, *names)])
        vao.render(moderngl.TRIANGLE_STRIP, instances=len(part))
        c.finish()
        vao.release(); buf.release()
    c.disable(moderngl.BLEND)
    out = _read(fb, w, h)
    for o in (corners, fb, tex):
        o.release()
    return out
