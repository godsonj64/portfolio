// Night sky: a deep navy field, a violet Milky Way band with dark dust lanes, and four octaves of stars
// (dense dust, field stars, bright stars with a soft halo, a few with a faint cross).
out vec4 frag;

uniform vec4 uBand;     // Milky Way axis: from (x, y) to (z, w)
uniform float uBandW;   // half-width of the band
uniform vec2 uGlow;     // centre of the warm glow behind the rocket
uniform float uSeed;

float bandAt(vec2 p, out float along) {
  vec2 a = uBand.xy, b = uBand.zw, ab = b - a;
  float t = dot(p - a, ab) / dot(ab, ab);
  along = t;
  // the axis meanders a little
  vec2 q = a + ab * t;
  vec2 nrm = normalize(vec2(-ab.y, ab.x));
  float wob = (fbm(vec2(t * 3.0, uSeed), 3) - 0.5) * uBandW * 1.4;
  float dist = dot(p - q, nrm) - wob;
  float ends = smoothstep(-0.35, 0.15, t) * smoothstep(1.35, 0.85, t);
  return exp(-pow(dist / uBandW, 2.0)) * ends;
}

vec3 starLayer(vec2 pp, float cell, float prob, float bmin, float bmax, float sigma, float halo, float density) {
  vec3 acc = vec3(0);
  vec2 g = pp / cell;
  vec2 i0 = floor(g);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 id = i0 + vec2(x, y);
    vec3 h = hash32(id + uSeed * 13.0);
    if (h.z > prob * density) continue;
    vec2 sp = (id + hash22(id * 1.7 + 4.1)) * cell;
    float r = length(pp - sp);
    float br = mix(bmin, bmax, pow(hash12(id * 3.3 + 1.0), 6.0));
    float tcol = hash12(id * 7.9);
    vec3 c = tcol < 0.12 ? vec3(1.0, 0.72, 0.55) : tcol < 0.22 ? vec3(1.0, 0.66, 0.86) : tcol < 0.62 ? vec3(0.86, 0.9, 1.0) : vec3(0.72, 0.8, 1.0);
    float s = sigma * (0.7 + br * 0.8);
    float core = exp(-r * r / (2.0 * s * s));
    float hl = halo > 0.0 ? exp(-r / (halo * (0.5 + br))) * 0.22 : 0.0;
    acc += c * br * (core + hl);
    if (halo > 0.0 && br > 0.78) {
      vec2 dd = abs(pp - sp);
      float spike = exp(-dd.x / 0.6) * exp(-dd.y / (halo * 2.2)) + exp(-dd.y / 0.6) * exp(-dd.x / (halo * 2.2));
      acc += c * spike * 0.35 * br;
    }
  }
  return acc;
}

void main() {
  vec2 p = scenePos();
  vec2 pp = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);   // px, for star sampling
  float pxs = uRes.y / 1920.0;                                 // keep stars the same size at every bake size

  // base: near-black navy, a touch lighter low in the sky
  vec3 col = mix(vec3(0.016, 0.018, 0.060), vec3(0.040, 0.040, 0.125), smoothstep(0.0, 0.9, p.y));
  col = mix(col, vec3(0.012, 0.012, 0.040), smoothstep(0.55, 0.0, p.y) * smoothstep(0.35, 0.0, p.x / uAspect) * 0.6);

  float along;
  float band = bandAt(p, along);
  float n1 = fbm(p * 4.0 + uSeed, 6);
  float n2 = fbm(p * 9.0 - uSeed * 2.0, 5);
  float n3 = fbm(p * 22.0 + 7.0, 4);

  // broad blue haze around the band, violet clouds inside it, magenta knots in the brightest parts
  float haze = SAT(band * 1.2) * (0.55 + 0.6 * n1);
  col += vec3(0.06, 0.07, 0.26) * haze * 0.7;
  float neb = smoothstep(0.42, 0.9, n1 * 0.8 + band * 0.5) * band;
  col += vec3(0.17, 0.08, 0.32) * neb * (0.35 + 0.8 * n2);
  float knot = smoothstep(0.62, 0.95, n2 * 0.7 + neb * 0.6) * band;
  col += vec3(0.40, 0.18, 0.50) * knot * 0.3;
  // dust lanes: thin dark filaments through the band
  float lane = smoothstep(0.08, 0.0, abs(n2 - 0.5) - 0.02 * n3) * band;
  col *= 1.0 - lane * 0.45;
  // soft painterly mottling over the whole sky
  col *= 0.86 + 0.28 * n3;

  // warm violet glow behind the rocket
  float gl = exp(-pow(length((p - uGlow) * vec2(1.4, 0.9)) / 0.22, 2.0));
  col += vec3(0.24, 0.09, 0.36) * gl * 0.5;

  // stars, denser in the band
  float dens = 0.55 + 1.6 * band + 0.35 * smoothstep(0.4, 0.8, n1);
  vec2 sp = pp / pxs;
  col += starLayer(sp, 5.0, 0.30, 0.10, 0.45, 0.55, 0.0, dens);
  col += starLayer(sp, 11.0, 0.32, 0.25, 0.95, 0.75, 0.0, dens);
  col += starLayer(sp, 34.0, 0.38, 0.45, 1.25, 1.05, 3.0, dens);
  col += starLayer(sp, 120.0, 0.45, 0.7, 1.6, 1.35, 7.0, 0.6 + band);

  frag = vec4(col, 1.0);
}
