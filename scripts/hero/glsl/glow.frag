// Light that spills from the exhaust, on black: composited with a screen blend (black = no change).
// A tight hot halo along the plume, a wide warm bloom where it hits the clouds and flares at the nozzles.
out vec4 frag;

uniform vec4 uRocket;   // same as rocket.frag: tank axis x, nose y, stack height, plume length
uniform vec2 uBase;     // where the plume meets the cloud tops
uniform float uGain;

void main() {
  vec2 p = scenePos();
  float s = uRocket.z;
  float y0 = uRocket.y + 1.0 * s;
  float y1 = uBase.y + 0.05;
  float yy = clamp(p.y, y0, y1);
  float t = SAT((yy - y0) / max(y1 - y0, 1e-3));
  float halfw = mix(0.02, 0.05, t);
  float dx = max(abs(p.x - uRocket.x) - halfw * 0.6, 0.0);
  float d = length(vec2(dx, p.y - yy));
  vec3 c = vec3(0);
  c += vec3(1.0, 0.72, 0.42) * exp(-d / 0.018) * 0.55;
  c += vec3(0.95, 0.42, 0.40) * exp(-d / 0.07) * 0.32;
  c += vec3(0.50, 0.20, 0.55) * exp(-d / 0.2) * 0.22;
  // bloom on the clouds at the base of the plume
  float b = length((p - uBase) * vec2(0.8, 1.3));
  c += vec3(1.0, 0.62, 0.32) * exp(-b / 0.09) * 0.45;
  c += vec3(0.9, 0.35, 0.35) * exp(-b / 0.25) * 0.18;
  // nozzle flares
  for (int i = -1; i <= 1; i += 2) {
    vec2 n = vec2(uRocket.x + float(i) * 0.122 * s, uRocket.y + 1.0 * s);
    float r = length((p - n) * vec2(1.0, 0.6));
    c += vec3(1.0, 0.92, 0.7) * exp(-r / (0.012)) * 0.6;
  }
  frag = vec4(c * uGain, 1.0);
}
