// One instanced quad per cloud bulb. Instances are drawn in list order, so the list *is* the painter's order.
in vec2 aCorner;   // [-1, 1]^2
in vec4 iBulb;     // centre x, centre y, radius, seed
in vec4 iLump;     // parent lump centre x, y, radius, distance haze 0..1
in vec4 iMat;      // tint rgb, plume-light gain
in vec4 iExtra;    // ink strength, sky-fill gain, hatch probability, softness

out vec2 vP;
flat out vec4 vBulb;
flat out vec4 vLump;
flat out vec4 vMat;
flat out vec4 vExtra;

void main() {
  float pad = 3.0 / uRes.y;
  vec2 p = iBulb.xy + aCorner * (iBulb.z * vec2(1.8, 1.36) + pad);
  vP = p; vBulb = iBulb; vLump = iLump; vMat = iMat; vExtra = iExtra;
  gl_Position = vec4(p.x / uAspect * 2.0 - 1.0, 1.0 - p.y * 2.0, 0.0, 1.0);
}
