// Ink-and-wash cumulus bulb, after the reference's line work:
//  * each bulb is a "petal": a dome drawn with one open, tapered ink stroke over its top (never a closed
//    circle), with 0-3 smaller strokes nested inside it, offset downward like cabbage leaves;
//  * colour is near-flat per petal (lit petals cream/peach, shaded ones lavender/indigo) with a soft wash
//    inside, so neighbouring petals read as separate painted shapes;
//  * bulbs lower on screen are drawn later and cover most of the ones above, leaving only dome caps,
//    and each throws a soft contact shadow just above its dome onto the petal behind.
in vec2 vP;
flat in vec4 vBulb;
flat in vec4 vLump;
flat in vec4 vMat;
flat in vec4 vExtra;
out vec4 frag;

uniform vec4 uPlume;     // x, top y, bottom y, falloff
uniform vec3 uShadow;    // unlit cloud colour
uniform vec3 uLit;       // cloud colour fully lit by the sky
uniform vec3 uInk;       // base ink colour
uniform float uLinePx;   // ink width in px for a mid-size bulb
uniform float uHot;      // strength of the plume light
uniform float uBounce;   // reach of the soft rose bounce around the plume

// Light colour by distance from the plume: white-hot, cream, peach, orange, coral, rose, violet.
vec3 plumeRamp(float t) {
  vec3 c[7] = vec3[7](vec3(1.00, 0.95, 0.82), vec3(1.00, 0.84, 0.58), vec3(1.00, 0.60, 0.28), vec3(0.98, 0.42, 0.20),
                      vec3(0.92, 0.32, 0.30), vec3(0.68, 0.26, 0.50), vec3(0.40, 0.24, 0.60));
  float x = SAT(t) * 6.0; int i = int(min(floor(x), 5.0));
  return mix(c[i], c[i + 1], smoothstep(0.0, 1.0, x - float(i)));
}

// Filmic shoulder: values above t roll off toward 1, so hot areas bleach to cream instead of clipping.
vec3 shoulder(vec3 c) {
  const float t = 0.62;
  return mix(c, t + (1.0 - t) * (1.0 - exp(-(c - t) / (1.0 - t))), step(t, c));
}

// Lit colour of the cloud at scene point p with lump normal nl (y up). lip: 0 low in the petal, 1 under its dome.
vec3 shadeAt(vec2 p, vec3 n, vec3 nl, float lip) {
  float haze = vLump.w, ao = vExtra.w;
  float occ = 1.0 - ao * 0.78;
  // moon / sky fill: cool, from the upper left, with a silver lining on the tops
  vec3 moonDir = normalize(vec3(-0.38, 0.84, 0.38));
  float md = dot(n, moonDir);
  float moon = smoothstep(-0.2, 0.92, md) * occ * mix(0.86, 1.0, lip) * vExtra.y;
  vec3 col = mix(uShadow, uLit, SAT(moon)) * vMat.rgb;
  col += vec3(0.62, 0.72, 1.0) * pow(SAT(md), 6.0) * 0.22 * occ * vExtra.y;

  // key: the exhaust, a hot vertical emitter (HDR, wrapped, with a long tail)
  float ly = clamp(p.y, uPlume.y, uPlume.z);
  vec2 L = vec2(uPlume.x - p.x, -(ly - p.y));
  float dist = length(L);
  vec3 Ld = normalize(vec3(L, 0.04 + dist * 0.3));
  float wrap = SAT((dot(n, Ld) + 0.3) / 1.3) * mix(0.8, 1.05, lip);
  // close to the exhaust the cloud is lit from within (in-scatter): orientation stops mattering
  float vol = exp(-dist / 0.07) * vMat.a * uHot;
  wrap = mix(wrap, mix(0.9, 1.05, lip), SAT(vol * 0.9));
  float fall = exp(-dist / uPlume.w) + 0.3 / (1.0 + pow(dist / (uPlume.w * 2.4), 2.0));
  float I = fall * vMat.a * uHot * (1.0 - haze * 0.75) * mix(0.55, 1.0, occ);
  vec3 pc = plumeRamp(dist / (uPlume.w * 2.2));
  // strong light replaces the night colour rather than washing over it, so hues stay saturated
  col *= 1.0 - SAT(I * wrap * 1.2) * 0.85;
  vec3 key = pc * I * wrap * 1.45;
  // rim: lump edges that face the exhaust catch a bright line of light
  float edge = pow(1.0 - SAT(nl.z), 2.2);
  float facing = SAT(dot(normalize(nl.xy + vec2(1e-4)), normalize(L)));
  key += pc * I * edge * facing * 1.0;
  col += key * 0.95 + pc * vol * 0.35;
  // rose bounce in the shadows near the launch
  col += vec3(0.12, 0.04, 0.12) * exp(-dist / uBounce) * vMat.a * (1.0 - haze) * (1.0 - wrap * 0.6);
  col = mix(col, uShadow * 0.8 + vec3(0.0, 0.01, 0.04), haze * 0.72);
  return shoulder(col);
}

// Open, tapered stroke along a circle of radius r (in petal units) centred at c, around angle a0 (y up).
// edge = 1: the stroke hugs the outside of the circle (the petal's own rim); 0: a free stroke inside.
float stroke(vec2 d, vec2 c, float r, float a0, float span, float w, float px, float edge) {
  vec2 q = d - c;
  float rq = length(q);
  float ang = atan(-q.y, q.x);
  float da = abs(mod(ang - a0 + PI, 2.0 * PI) - PI);
  float taper = 1.0 - smoothstep(span * 0.45, span, da);
  float ww = w * (0.1 + 0.9 * taper);
  float m = step(da, span);
  if (edge > 0.5) return smoothstep(r - ww - px, r - ww, rq) * m;
  return (1.0 - smoothstep(ww * 0.5, ww * 0.5 + px, abs(rq - r))) * m;
}

void main() {
  float seed = vBulb.w;
  float isBase = step(seed, -0.5);                       // the lump's own base disc
  float sx = isBase > 0.5 ? 1.0 : 1.2 + 0.6 * hash11(seed * 6.1);   // petals are wider than tall
  vec2 d = (vP - vBulb.xy) / vBulb.z;
  d.x /= sx;
  float ang = atan(d.y, d.x);
  float wob = 1.0 + 0.05 * (vnoise(vec2(ang * 2.0 + seed, seed * 3.1)) - 0.5) * 2.0;   // hand-drawn wobble
  float rho = length(d) / wob;
  float px = 1.0 / (vBulb.z * uRes.y);
  vec2 dl = (vP - vLump.xy) / vLump.z;
  float inLump = 1.0 - smoothstep(0.93, 0.99, length(dl));
  float haze = vLump.w;

  // contact shadow just outside the dome, on the petal behind (only over this lump, never on the sky)
  float above = SAT(-d.y * 1.6 + 0.25);
  float sh = (1.0 - smoothstep(1.0, 1.0 + 0.26 + 3.0 * px, rho)) * step(1.0 - px, rho) * above * inLump * 0.3 * (1.0 - haze * 0.6) * (1.0 - isBase);
  float cov = 1.0 - smoothstep(1.0 - px, 1.0 + px * 0.5, rho);
  if (cov <= 0.001) {
    if (sh <= 0.002) discard;
    frag = vec4(0.0, 0.0, 0.0, sh); return;
  }

  // colour: mostly flat per petal (lit at the petal's crown), with a little of the per-pixel light
  vec2 crown = vBulb.xy - vec2(0.0, vBulb.z * 0.45);
  vec2 dlc = (crown - vLump.xy) / vLump.z;
  vec3 nlc = vec3(dlc.x, -dlc.y, sqrt(max(0.08, 1.0 - dot(dlc, dlc))));
  vec3 nl = vec3(dl.x, -dl.y, sqrt(max(0.08, 1.0 - dot(dl, dl))));
  float lip = smoothstep(0.8, -0.6, d.y);
  vec3 flat_ = shadeAt(crown, normalize(nlc + vec3(0, 0.25, 0)), nlc, 1.0);
  vec3 smooth_ = shadeAt(vP, normalize(nl + vec3(d.x, -d.y, 0.0) * 0.12), nl, lip);
  vec3 col = isBase > 0.5 ? flat_ : mix(smooth_, flat_, 0.6);
  col *= mix(0.92, 1.03, lip);                              // a soft wash: light under the dome, darker low

  // watercolour: blooms and pigment granulation
  float w = fbm(vP * 26.0 + seed * 0.01, 3);
  float w2 = fbm(vP * 6.0 + 4.0, 3);
  float bloom = smoothstep(0.52, 0.7, fbm(vP * 14.0 + seed, 3));
  col *= 0.9 + 0.18 * w;
  col *= 1.0 - bloom * 0.1;
  col = mix(col, col * vec3(0.9, 0.98, 1.14), SAT(w2 - 0.5) * 1.3);
  col = mix(col, col * vec3(1.1, 0.93, 1.0), SAT(0.5 - w2) * 1.3);

  // ink: the dome stroke plus nested petal strokes
  float sizeK = clamp(vBulb.z * uRes.y / 28.0, 0.6, 1.15);
  float lw = uLinePx * sizeK * px;                           // full stroke width in petal units
  float a0 = PI * 0.5 + (hash11(seed * 2.3) - 0.5) * 1.1;
  float span = mix(1.25, 1.9, hash11(seed * 4.1));
  vec2 dw = d / wob;
  float ink = isBase > 0.5 ? stroke(dw, vec2(0), 1.0, PI * 0.5, 1.2, lw, px, 1.0) * 0.3
                           : stroke(dw, vec2(0), 1.0, a0, span, lw, px, 1.0);
  int nests = int(floor(hash11(seed * 8.3) * 3.4 * vExtra.z));
  for (int k = 1; k <= 3; k++) {
    if (k > nests || isBase > 0.5) break;
    float fk = float(k);
    float side = hash11(seed * 4.9) < 0.5 ? -1.0 : 1.0;      // petals fan out from one side
    float rr = mix(0.45, 0.85, hash11(seed * 3.7 + fk)) * (1.0 - fk * 0.1);
    vec2 c = vec2(side * (1.0 - rr) * mix(0.3, 0.95, hash11(seed * 5.3 + fk)), (1.0 - rr) * mix(0.2, 0.9, hash11(seed * 1.3 + fk)));
    float a = PI * 0.5 - side * mix(0.0, 0.9, hash11(seed * 9.1 + fk));
    float sp = mix(0.75, 1.5, hash11(seed * 2.9 + fk));
    ink = max(ink, stroke(d, c, rr, a, sp, lw * mix(0.6, 0.9, hash11(seed * 7.1 + fk)), px, 0.0) * 0.9);
  }
  // ink takes the local colour: navy in the night, a warm sepia inside the glow
  vec3 inkCol = mix(col * 0.3, uInk, mix(0.55, 0.15, SAT(luma(col) * 1.4 - 0.45)));
  col = mix(col, inkCol, ink * vExtra.x * (1.0 - haze * 0.45));

  frag = vec4(col * cov, cov + sh * (1.0 - cov));
}
