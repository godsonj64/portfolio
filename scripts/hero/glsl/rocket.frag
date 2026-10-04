// The shuttle stack and its exhaust: inked, cel-shaded SDF shapes, supersampled in-shader.
// Dorsal view (orbiter in front of the external tank, boosters either side), proportioned from the real
// stack. Local space: u right, v down, in units of the stack height (v = 0 at the tank's nose spike,
// v = 1 at the booster nozzle exits). Lighting: cool moonlight from the upper left, hot exhaust light
// from below, with cast and contact shadows between the parts.
out vec4 frag;

uniform vec4 uRocket;   // x of the stack axis, y of the nose, stack height, plume length below the nozzles
uniform float uInkPx;   // outline width in px
uniform int uSS;        // supersamples per axis

#define INKC vec3(0.045, 0.04, 0.12)
float PX;    // one output pixel, in local units
float W;     // outline width, in local units

const float SRBX = 0.122;

// ---- shapes ----------------------------------------------------------------------------------------
float sdBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float sdSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = SAT(dot(pa, ba) / dot(ba, ba)); return length(pa - ba * h); }
float sdEll(vec2 p, vec2 r) { float k0 = length(p / r), k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / max(k1, 1e-6); }
float sdPoly6(vec2 p, vec2 v[6]) {
  float d = dot(p - v[0], p - v[0]), s = 1.0;
  for (int i = 0, j = 5; i < 6; j = i, i++) {
    vec2 e = v[j] - v[i], w = p - v[i];
    vec2 b = w - e * SAT(dot(w, e) / dot(e, e));
    d = min(d, dot(b, b));
    bvec3 c = bvec3(p.y >= v[i].y, p.y < v[j].y, e.x * w.y > e.y * w.x);
    if (all(c) || all(not(c))) s = -s;
  }
  return s * sqrt(d);
}

// radius profiles of the bodies of revolution
float rET(float v) {
  if (v < 0.012) return 0.0035;
  float t = SAT((v - 0.012) / 0.205);
  float r = 0.085 * pow(SAT(1.0 - (1.0 - t) * (1.0 - t)), 0.6);
  if (v > 0.81) r = 0.085 * sqrt(SAT(1.0 - pow((v - 0.81) / 0.035, 2.0)));
  return max(r, 0.0035);
}
float rSRB(float v) {
  if (v < 0.15) return mix(0.003, 0.0235, pow(SAT((v - 0.099) / 0.051), 0.8));
  if (v < 0.176) return mix(0.0235, 0.037, (v - 0.15) / 0.026);
  if (v < 0.875) return 0.037;
  return mix(0.037, 0.05, SAT((v - 0.875) / 0.065));
}
float rFus(float v) {
  float t = SAT((v - 0.19) / 0.115);
  float r = 0.054 * pow(SAT(1.0 - (1.0 - t) * (1.0 - t)), 0.5);
  return r - 0.004 * smoothstep(0.80, 0.845, v);
}
float prof(int which, float v) { return which == 0 ? rET(v) : which == 1 ? rSRB(v) : rFus(v); }

// distance to a body of revolution about u = cx between v0 and v1, plus its normal (y up, z to viewer)
float rev(vec2 p, float cx, float v0, float v1, int which, out vec3 n, out float k) {
  float r = prof(which, p.y);
  float slope = (prof(which, p.y + 0.002) - r) / 0.002;
  k = clamp((p.x - cx) / max(r, 1e-4), -1.0, 1.0);
  float z = sqrt(max(0.0, 1.0 - k * k));
  n = normalize(vec3(k, slope * z * 0.9, z + 0.05));
  float d = (abs(p.x - cx) - r) / sqrt(1.0 + slope * slope);
  return max(d, max(v0 - p.y, p.y - v1));
}

// ---- light ------------------------------------------------------------------------------------------
vec3 light(vec3 alb, vec3 n, float v, float spec, float gloss) {
  vec3 L1 = normalize(vec3(-0.86, 0.32, 0.44));          // moon, from the left and a little above
  vec3 L2 = normalize(vec3(0.10, -0.86, 0.50));          // exhaust, below
  float d1 = dot(n, L1);
  float cel = smoothstep(-0.04, 0.1, d1);                // the inked tone step of the illustration
  float diff = mix(SAT(d1 * 0.6 + 0.4), cel, 0.6);
  float I2 = 0.12 + 1.35 * smoothstep(0.42, 1.0, v);
  vec3 c = alb * (vec3(0.20, 0.22, 0.40) + vec3(0.80, 0.86, 1.0) * diff * 0.85 + vec3(1.0, 0.56, 0.30) * SAT(dot(n, L2) + 0.15) * I2);
  vec3 h = normalize(L1 + vec3(0.0, 0.0, 1.0));
  c += vec3(0.85, 0.9, 1.0) * pow(SAT(dot(n, h)), gloss) * spec * cel;
  return c;
}

// ---- painting helpers -------------------------------------------------------------------------------
float cover(float d) { return 1.0 - smoothstep(-PX * 0.5, PX * 0.5, d); }
void paint(inout vec4 acc, float d, vec3 col, float w) {
  float a = cover(d);
  float line = 1.0 - smoothstep(w - PX * 0.5, w + PX * 0.5, -d);
  acc.rgb = mix(acc.rgb, mix(col, INKC, line), a);
  acc.a = max(acc.a, a);
}
void line(inout vec4 acc, float d, float w, float strength) {   // ink along d = 0
  float l = (1.0 - smoothstep(w * 0.5, w * 0.5 + PX, abs(d))) * strength;
  acc.rgb = mix(acc.rgb, INKC, l);
}
void tone(inout vec4 acc, float m, vec3 c) { acc.rgb = mix(acc.rgb, c, m); }

// ---- the orbiter's outline pieces (also used for its cast shadow) ------------------------------------
float wingSd(vec2 p) {
  vec2 q = vec2(abs(p.x), p.y);
  vec2 v[6] = vec2[6](vec2(0.040, 0.405), vec2(0.112, 0.588), vec2(0.236, 0.748), vec2(0.241, 0.778), vec2(0.222, 0.797), vec2(0.040, 0.803));
  return sdPoly6(q, v);
}
float omsSd(vec2 p) { return sdEll(vec2(abs(p.x) - 0.041, p.y - 0.786), vec2(0.022, 0.07)); }
float orbiterSd(vec2 p) {
  vec3 n; float k;
  float f = rev(p, 0.0, 0.19, 0.848, 2, n, k);
  return min(min(f, wingSd(p)), omsSd(p));
}

vec4 shuttle(vec2 p) {
  vec4 acc = vec4(0);
  vec3 n; float k;
  float fx = fbm(p * 140.0, 3);

  // external tank
  float dT = rev(p, 0.0, 0.0, 0.845, 0, n, k);
  if (dT < W * 2.0) {
    vec3 alb = vec3(0.60, 0.11, 0.09) * (0.92 + 0.16 * fx);
    alb = mix(alb, vec3(0.50, 0.14, 0.08), smoothstep(0.30, 0.302, p.y) * (1.0 - smoothstep(0.40, 0.402, p.y)));   // intertank
    vec3 c = light(alb, n, p.y, 0.55, 18.0);
    // cast shadow of the orbiter, thrown right and down by the moon
    float cs = cover(orbiterSd(p - vec2(0.016, 0.010)) + 0.004);
    c *= 1.0 - cs * 0.55;
    // contact darkening beside the boosters
    c *= 1.0 - 0.35 * (1.0 - smoothstep(0.0, 0.02, abs(abs(p.x) - 0.085)));
    paint(acc, dT, c, W);
    float ii = step(0.30, p.y) * step(p.y, 0.40);
    line(acc, mod(p.x + 0.004, 0.0085) - 0.00425, W * 0.32, 0.35 * ii * cover(dT + W));   // intertank stringers
    line(acc, p.y - 0.30, W * 0.55, 0.7 * cover(dT + W));
    line(acc, p.y - 0.40, W * 0.55, 0.7 * cover(dT + W));
    line(acc, p.y - 0.215, W * 0.4, 0.35 * cover(dT + W));                             // ogive / barrel weld
    line(acc, sdSeg(p, vec2(0.066, 0.40), vec2(0.066, 0.86)), W * 0.9, 0.55 * cover(dT + W));   // LO2 feedline
    line(acc, sdSeg(p, vec2(-0.071, 0.06), vec2(-0.071, 0.86)), W * 0.6, 0.4 * cover(dT + W));  // cable tray
  }

  // solid rocket boosters
  for (int s = -1; s <= 1; s += 2) {
    float cx = float(s) * SRBX;
    float dS = rev(p, cx, 0.099, 0.94, 1, n, k);
    if (dS < W * 2.0) {
      vec3 alb = vec3(0.93, 0.94, 0.97) * (0.96 + 0.06 * fx);
      vec3 c = light(alb, n, p.y, 0.35, 22.0);
      c *= 1.0 - 0.3 * (1.0 - smoothstep(0.0, 0.016, abs(p.x - float(s) * 0.085))) * step(0.2, p.y);
      paint(acc, dS, c, W);
      float in_ = cover(dS + W);
      tone(acc, in_ * step(0.166, p.y) * step(p.y, 0.181), light(vec3(0.16, 0.16, 0.2), n, p.y, 0.3, 20.0));   // forward skirt band
      line(acc, p.y - 0.166, W * 0.5, in_);
      line(acc, p.y - 0.181, W * 0.5, in_);
      line(acc, p.y - 0.15, W * 0.4, 0.7 * in_);
      for (int j = 0; j < 4; j++) {                                                    // field joints
        float y = 0.30 + float(j) * 0.125;
        line(acc, p.y - y, W * 0.5, 0.85 * in_);
        line(acc, p.y - y - 0.006, W * 0.3, 0.35 * in_);
      }
      line(acc, p.y - 0.875, W * 0.6, in_);                                            // aft skirt
      line(acc, p.y - 0.84, W * 0.4, 0.6 * in_);                                       // aft attach ring
      line(acc, abs(k) - 0.55, W * 0.4, 0.45 * in_ * step(0.885, p.y));               // hold-down posts
      float tunnel = p.x - cx - float(s) * 0.028;                                       // systems tunnel
      line(acc, tunnel, W * 0.35, 0.5 * in_ * step(0.19, p.y) * step(p.y, 0.86));
      line(acc, tunnel - float(s) * 0.005, W * 0.35, 0.5 * in_ * step(0.19, p.y) * step(p.y, 0.86));
    }
    // nozzle bell
    float bt = SAT((p.y - 0.94) / 0.06);
    float bw = 0.022 + 0.018 * bt * bt;
    float dN = max(abs(p.x - cx) - bw, max(0.94 - p.y, p.y - 1.0));
    vec3 nn = normalize(vec3((p.x - cx) / bw, -0.3, 0.8));
    vec3 nc = light(vec3(0.34, 0.33, 0.38), nn, p.y, 0.6, 14.0);
    nc = mix(nc, vec3(1.0, 0.66, 0.34), smoothstep(0.97, 1.0, p.y) * 0.85);
    paint(acc, dN, nc, W);
  }

  // orbiter: wings, fuselage, OMS pods, tail, body flap, engines
  float dW = wingSd(p);
  if (dW < W * 2.0) {
    vec3 wn = normalize(vec3(sign(p.x) * 0.22, 0.18, 0.96));
    vec3 c = light(vec3(0.92, 0.93, 0.97) * (0.97 + 0.05 * fx), wn, p.y, 0.25, 30.0);
    c = mix(c, c * vec3(0.86, 0.88, 0.96), smoothstep(0.6, 0.8, p.y) * 0.5);
    // the fuselage shades the right wing root
    vec3 tn; float tk;
    float fs = rev(p - vec2(-0.018, -0.006), 0.0, 0.19, 0.848, 2, tn, tk);
    c *= 1.0 - cover(fs) * step(0.0, p.x) * 0.4;
    paint(acc, dW, c, W);
    float in_ = cover(dW + W * 0.5);
    vec2 q = vec2(abs(p.x), p.y);
    // black RCC leading edge
    float le = min(sdSeg(q, vec2(0.040, 0.405), vec2(0.112, 0.588)), sdSeg(q, vec2(0.112, 0.588), vec2(0.236, 0.748)));
    tone(acc, in_ * (1.0 - smoothstep(0.006, 0.006 + PX, le)), light(vec3(0.13, 0.13, 0.17), wn, p.y, 0.5, 30.0));
    line(acc, le - 0.006, W * 0.45, in_);
    // elevons and their split, wing-tip
    line(acc, sdSeg(q, vec2(0.058, 0.781), vec2(0.226, 0.776)), W * 0.45, 0.85 * in_);
    line(acc, sdSeg(q, vec2(0.140, 0.778), vec2(0.140, 0.800)), W * 0.4, 0.8 * in_);
    line(acc, sdSeg(q, vec2(0.112, 0.588), vec2(0.07, 0.6)), W * 0.35, 0.45 * in_);    // glove
    line(acc, sdSeg(q, vec2(0.06, 0.70), vec2(0.17, 0.70)), W * 0.3, 0.25 * in_);
  }

  float dF = rev(p, 0.0, 0.19, 0.848, 2, n, k);
  if (dF < W * 2.0) {
    vec3 c = light(vec3(0.94, 0.95, 0.98) * (0.97 + 0.05 * fx), n, p.y, 0.4, 26.0);
    paint(acc, dF, c, W);
    float in_ = cover(dF + W);
    // black thermal tiles: nose cap and the chines along the forward fuselage
    tone(acc, in_ * (1.0 - smoothstep(0.205, 0.207, p.y)), light(vec3(0.10, 0.10, 0.13), n, p.y, 0.7, 24.0));
    tone(acc, in_ * smoothstep(0.80, 0.86, abs(k)) * step(0.205, p.y) * (1.0 - smoothstep(0.40, 0.43, p.y)), light(vec3(0.12, 0.12, 0.15), n, p.y, 0.5, 24.0));
    // windscreen: six panes on an arc, overhead windows behind
    float arc = p.y - 0.237 - 0.010 * pow(p.x / 0.034, 2.0);
    float band = max(abs(arc - 0.008) - 0.0075, abs(p.x) - 0.033);
    float panes = abs(mod(p.x + 0.033, 0.011) - 0.0055) - 0.0042;
    float win = max(band, panes);
    vec3 glass = mix(vec3(0.06, 0.08, 0.18), vec3(0.34, 0.42, 0.72), smoothstep(0.004, -0.004, arc - 0.004) * smoothstep(0.02, -0.02, p.x));
    paint(acc, win, glass, W * 0.4);
    float ov = sdBox(vec2(abs(p.x) - 0.011, p.y - 0.268), vec2(0.005, 0.0045));
    paint(acc, ov, vec3(0.07, 0.09, 0.2), W * 0.35);
    // forward RCS ports
    for (int i = 0; i < 3; i++) {
      float rc = sdBox(vec2(abs(p.x) - 0.026 - float(i) * 0.006, p.y - 0.218), vec2(0.0018, 0.0022));
      tone(acc, cover(rc) * in_, vec3(0.1, 0.1, 0.14));
    }
    // payload bay doors: centre seam, hinge lines, panel joints, radiator panels
    float bay = step(0.33, p.y) * step(p.y, 0.70);
    tone(acc, in_ * bay * step(abs(p.x), 0.037) * 0.25, vec3(0.80, 0.84, 0.96));
    line(acc, p.x, W * 0.38, 0.75 * in_ * bay);
    line(acc, abs(p.x) - 0.038, W * 0.38, 0.75 * in_ * bay);
    for (int i = 0; i < 5; i++) line(acc, p.y - (0.33 + float(i) * 0.0925), W * 0.3, 0.55 * in_ * step(abs(p.x), 0.038));
    line(acc, p.y - 0.30, W * 0.35, 0.45 * in_);
    line(acc, abs(p.x) - 0.046, W * 0.3, 0.3 * in_ * step(0.3, p.y) * step(p.y, 0.75));
  }

  float dO = omsSd(p);
  if (dO < W * 2.0) {
    vec3 on = normalize(vec3((abs(p.x) - 0.041) / 0.022 * sign(p.x), 0.1, 0.8));
    paint(acc, dO, light(vec3(0.93, 0.94, 0.98), on, p.y, 0.35, 24.0), W);
    line(acc, p.y - 0.75, W * 0.35, 0.5 * cover(dO + W));
  }
  // vertical tail, edge-on: a slim fin with a black leading edge and the rudder split
  vec2 tv[6] = vec2[6](vec2(-0.003, 0.606), vec2(0.003, 0.606), vec2(0.0115, 0.846), vec2(0.0115, 0.848), vec2(-0.0115, 0.848), vec2(-0.0115, 0.846));
  float dTail = sdPoly6(p, tv);
  if (dTail < W * 2.0) {
    vec3 tn2 = normalize(vec3(sign(p.x) * 0.6, 0.2, 0.75));
    paint(acc, dTail, light(vec3(0.93, 0.94, 0.98), tn2, p.y, 0.4, 24.0), W * 0.8);
    line(acc, p.x, W * 0.5, 0.8 * cover(dTail + W * 0.5) * step(p.y, 0.70));
    line(acc, p.y - 0.73, W * 0.4, 0.7 * cover(dTail + W * 0.5));
  }
  // body flap
  float dB = sdBox(p - vec2(0.0, 0.856), vec2(0.044, 0.009)) - 0.002;
  paint(acc, dB, light(vec3(0.82, 0.83, 0.88), vec3(0.0, -0.3, 0.95), p.y, 0.2, 20.0), W);
  // OMS nozzles and the three main engines, glowing inside
  for (int i = 0; i < 5; i++) {
    vec2 e = i == 0 ? vec2(0.0, 0.858) : i == 1 ? vec2(-0.024, 0.873) : i == 2 ? vec2(0.024, 0.873) : i == 3 ? vec2(-0.041, 0.852) : vec2(0.041, 0.852);
    float big = i < 3 ? 1.0 : 0.55;
    float hgt = 0.036 * big;
    float bw = (0.007 + (p.y - e.y) * 0.42) * big;
    float dE = max(abs(p.x - e.x) - bw, max(e.y - p.y, p.y - e.y - hgt));
    vec3 en = normalize(vec3((p.x - e.x) / max(bw, 1e-4), -0.2, 0.8));
    vec3 ec = light(vec3(0.42, 0.40, 0.46), en, p.y, 0.8, 16.0);
    ec = mix(ec, vec3(1.0, 0.42, 0.22), smoothstep(e.y + hgt * 0.45, e.y + hgt, p.y) * 0.75);
    paint(acc, dE, ec, W * 0.8);
    line(acc, p.y - e.y - hgt * 0.4, W * 0.3, 0.6 * cover(dE + W * 0.5));
  }
  return acc;
}

// exhaust: two opaque, white-hot jets from the boosters that stay apart for a while, then merge into one
// widening column that runs down into the clouds; a short blue-white flame under the main engines
vec4 plume(vec2 p) {
  float len = uRocket.w;
  float y = p.y - 1.0;
  float glowE = exp(-pow(abs(p.x) / 0.03, 2.0)) * exp(-max(p.y - 0.9, 0.0) / 0.03) * step(0.88, p.y);
  if (y < 0.0) return vec4(vec3(1.0, 0.9, 0.85), glowE * 0.9 * step(0.9, p.y));
  float t = y / len;
  float tw = fbm(vec2(p.x * 18.0, y * 2.6 - 0.7), 4);
  float jw = (0.03 + y * 0.055) * (0.88 + 0.28 * tw);
  float jl = abs(p.x + SRBX) / jw, jr = abs(p.x - SRBX) / jw;
  float jets = max(1.0 - smoothstep(0.55, 1.0, jl), 1.0 - smoothstep(0.55, 1.0, jr));
  float cw = (0.07 + 0.12 * pow(t, 0.75)) * (0.9 + 0.25 * tw);
  float column = (1.0 - smoothstep(0.6, 1.0, abs(p.x) / cw)) * smoothstep(0.9, 1.8, y);
  float m = max(jets, column);
  float coreJ = max(1.0 - smoothstep(0.0, 0.6, jl), 1.0 - smoothstep(0.0, 0.6, jr));
  float coreC = (1.0 - smoothstep(0.0, 0.7, abs(p.x) / cw)) * smoothstep(1.2, 2.2, y);
  float core = max(coreJ, coreC);
  float streak = fbm(vec2(p.x * 60.0, y * 3.0), 3);
  float shock = 0.5 + 0.5 * cos(y * 70.0) * exp(-y / 0.22);
  vec3 edge = vec3(1.0, 0.70, 0.40), body = vec3(1.0, 0.92, 0.70), hot = vec3(1.0, 0.99, 0.95);
  vec3 c = mix(edge, body, smoothstep(0.0, 0.5, m));
  c = mix(c, hot, SAT(core * (0.85 + 0.25 * streak)));
  c = mix(c, vec3(1.0, 1.0, 0.9), coreJ * shock * 0.3);
  float a = SAT(m * 1.15) * smoothstep(0.0, 0.01, y) * (1.0 - smoothstep(0.88, 1.0, t));
  a = max(a, glowE * 0.9);
  return vec4(c, a);
}

void main() {
  vec2 frag0 = gl_FragCoord.xy;
  float H = uRes.y;
  float scale = uRocket.z;
  PX = 1.0 / (H * scale);
  W = uInkPx * PX;
  vec2 pc = (vec2(frag0.x, H - frag0.y) / H - uRocket.xy) / scale;
  if (abs(pc.x) > 0.6 || pc.y < -0.03 || pc.y > 1.0 + uRocket.w) { frag = vec4(0); return; }
  vec4 sum = vec4(0);
  int n = uSS;
  for (int j = 0; j < 8; j++) for (int i = 0; i < 8; i++) {
    if (i >= n || j >= n) continue;
    vec2 fc = frag0 - 0.5 + (vec2(i, j) + 0.5) / float(n);
    vec2 sp = vec2(fc.x, H - fc.y) / H;
    vec2 p = (sp - uRocket.xy) / scale;
    vec4 pl = plume(p);
    vec4 sh = shuttle(p);
    vec3 c = mix(pl.rgb, sh.rgb, sh.a);
    float a = sh.a + pl.a * (1.0 - sh.a);
    sum += vec4(c * a, a);
  }
  frag = sum / float(n * n);   // premultiplied
}
