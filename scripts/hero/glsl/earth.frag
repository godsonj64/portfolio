// Earth at night from altitude: a ground plane in perspective below a curved horizon. Dark land broken
// into angular, brush-like flakes; mottled cyan water; amber city lights on street grids with glowing
// cores; a warm wash from the launch near the horizon. Alpha is 0 above the horizon.
out vec4 frag;

uniform vec4 uEarth;    // horizon y at the centre, horizon curvature, camera x, ground scale
uniform vec2 uLaunch;   // screen position of the launch glow (for the warm wash)
uniform float uSeed;
uniform int uSS;

vec4 ground(vec2 sp, float px) {
  float hy = uEarth.x + uEarth.y * pow(sp.x - uEarth.z, 2.0);
  float dy = sp.y - hy;
  if (dy <= 0.0) return vec4(0);
  float z = 0.06 / (dy + 0.004);                          // distance along the ground
  vec2 g = vec2((sp.x - uEarth.z) * z * 1.4, z) * uEarth.w + uSeed;
  // ground units per pixel, across and along the view (for filtering lines and sizing lights)
  float fw = max(z * px * uEarth.w * 1.4, px * 0.06 / pow(dy + 0.004, 2.0) * uEarth.w);

  // continents and coasts, domain-warped
  vec2 gw = g + (vec2(fbm(g * 0.7, 4), fbm(g * 0.7 + 5.2, 4)) - 0.5) * 1.6;
  float cont = fbm(gw * 0.45, 5);
  float coast = fbm(gw * 2.4 + 3.0, 4);
  float landF = cont + (coast - 0.5) * 0.3;
  float land = smoothstep(0.475, 0.5, landF);

  // brush flakes: warped Voronoi at two scales, each flake a slightly different value
  vec4 v1 = voronoi(gw * vec2(2.6, 4.4));
  vec4 v2 = voronoi(gw * vec2(6.0, 10.0) + 3.0);
  float f1 = hash12(v1.zw), f2 = hash12(v2.zw);
  float crack1 = smoothstep(0.0, 0.05 + fw * 4.0, v1.y - v1.x);
  float crack2 = smoothstep(0.0, 0.05 + fw * 9.0, v2.y - v2.x);
  vec3 landc = mix(vec3(0.028, 0.040, 0.110), vec3(0.070, 0.085, 0.190), f1 * 0.7 + f2 * 0.3);
  landc = mix(landc, vec3(0.12, 0.09, 0.19), smoothstep(0.8, 1.0, f1) * 0.45);          // plum flakes
  landc *= mix(0.6, 1.0, crack1) * mix(0.85, 1.0, crack2);
  // water: deep teal with bright cyan sheets and dark drifting flakes
  float wv = f1 * 0.55 + f2 * 0.45;
  vec3 water = mix(vec3(0.030, 0.17, 0.32), vec3(0.10, 0.46, 0.68), smoothstep(0.3, 0.85, wv));
  water = mix(water, vec3(0.32, 0.80, 0.96), smoothstep(0.84, 0.97, wv) * 0.75);
  water = mix(water, vec3(0.018, 0.06, 0.15), smoothstep(0.32, 0.05, wv) * 0.85);
  water *= mix(0.72, 1.0, crack2);
  float shore = smoothstep(0.03, 0.0, abs(landF - 0.4875));
  vec3 col = mix(water, landc, land);
  col += vec3(0.10, 0.35, 0.45) * shore * 0.25;

  // city lights: dense grids around cores, sparse sprawl elsewhere, plus road strings
  float city = smoothstep(0.5, 0.68, fbm(g * 0.8 + 21.0, 4)) * land;
  float sprawl = smoothstep(0.42, 0.62, fbm(g * 1.6 + 5.0, 3)) * land;
  vec2 cell = g * 8.0;
  vec2 ci = floor(cell);
  vec3 lights = vec3(0);
  float pxg = fw * 8.0;                                   // grid cells per pixel
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 id = ci + vec2(x, y);
    vec3 h = hash32(id + 7.0);
    float pr = city * 0.85 + sprawl * 0.18;
    if (h.x > pr) continue;
    vec2 lp = id + 0.5 + (hash22(id * 1.9) - 0.5) * 0.6;
    float r = length(cell - lp) / max(pxg, 1e-5);       // distance in px
    float br = mix(0.6, 1.6, h.y * h.y);
    vec3 lc = h.z < 0.18 ? vec3(1.0, 0.86, 0.62) : vec3(1.0, 0.66, 0.30);
    lights += lc * br * (exp(-r * r / 1.6) * 1.4 + exp(-r / 2.2) * 0.12);
  }
  float road = 0.0;
  for (int k = 0; k < 3; k++) {
    float a = k == 0 ? 0.55 : k == 1 ? -0.95 : 1.6;
    vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * g * (1.1 + float(k) * 0.3) + float(k) * 4.0;
    float l = abs(fract(q.x) - 0.5) / max(fw * 1.2, 1e-5);
    float dots = 0.55 + 0.45 * smoothstep(0.4, 0.9, vnoise(q * vec2(1.0, 40.0)));
    road += exp(-l * l * 1.4) * dots * smoothstep(0.5, 0.75, fbm(q * 0.6 + 2.0, 3)) * (city * 0.9 + sprawl * 0.25);
  }
  lights += vec3(1.0, 0.70, 0.34) * road * 0.45;
  // toward the horizon single lights shrink below a pixel: fade them into a soft amber haze instead
  float resolve = smoothstep(0.012, 0.06, dy);
  col += lights * resolve + vec3(1.0, 0.6, 0.28) * (city * 0.5 + sprawl * 0.12) * (1.0 - resolve) * 0.35;
  // the glow over each city core, scattered in the night air
  col += vec3(1.0, 0.52, 0.20) * pow(city, 2.5) * 0.12;

  // atmosphere: warm wash from the launch near the horizon, blue haze along it, deeper night up close
  float w = exp(-length((sp - uLaunch) * vec2(0.9, 2.6)) / 0.35);
  col += vec3(0.42, 0.20, 0.16) * w * smoothstep(0.25, 0.0, dy) * 0.6;
  col = mix(vec3(0.09, 0.14, 0.32), col, smoothstep(0.0, 0.07, dy));
  col *= mix(1.0, 0.82, SAT(dy * 3.0));
  float a = smoothstep(0.0, px * 1.5, dy);
  return vec4(col, a);
}

void main() {
  vec2 frag0 = gl_FragCoord.xy;
  float H = uRes.y;
  float px = 1.0 / H;
  vec4 sum = vec4(0);
  for (int j = 0; j < 4; j++) for (int i = 0; i < 4; i++) {
    if (i >= uSS || j >= uSS) continue;
    vec2 fc = frag0 - 0.5 + (vec2(i, j) + 0.5) / float(uSS);
    vec2 sp = vec2(fc.x, H - fc.y) / H;
    vec4 c = ground(sp, px);
    sum += vec4(c.rgb * c.a, c.a);
  }
  frag = sum / float(uSS * uSS);
}
