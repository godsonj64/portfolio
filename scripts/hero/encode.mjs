// Encodes the baked hero layers (.hero-bake/<composition>/<layer>.png, from scripts/hero/bake.py) into
// AVIF + WebP at a few widths with content-hashed names in public/hero, and writes
// src/content/hero-manifest.json for the HeroArt component.
//
//   npm run hero          # bake + encode
//   node scripts/hero/encode.mjs
import sharp from "sharp";
import { createHash } from "node:crypto";
import { mkdir, readdir, rm, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = path.join(root, ".hero-bake");
const OUT = path.join(root, "public", "hero");

// back to front; "glow" is light on black, composited with a screen blend
const ORDER = ["sky", "earth", "back", "rocket", "glow", "front", "fore"];
const COMPS = {
  wide: { widths: [1280, 1920, 2560, 3456], focus: [66, 42] },
  tall: { widths: [640, 960, 1320], focus: [66, 38] },
};
// per-layer AVIF quality: stars and ink need more bits than smooth light
const Q = { sky: 66, earth: 58, back: 62, front: 62, fore: 60, rocket: 70, glow: 50 };

const hash = (buf) => createHash("sha1").update(buf).digest("hex").slice(0, 8);

async function emit(base, ext, buf) {
  const file = `${base}.${hash(buf)}.${ext}`;
  await writeFile(path.join(OUT, file), buf);
  return `/hero/${file}`;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  for (const f of await readdir(OUT)) await rm(path.join(OUT, f));
  const manifest = {};
  for (const [comp, cfg] of Object.entries(COMPS)) {
    const dir = path.join(SRC, comp);
    await access(path.join(dir, "sky.png"));
    const meta = await sharp(path.join(dir, "sky.png")).metadata();
    const layers = {};
    let total = 0;
    for (const name of ORDER) {
      const file = path.join(dir, `${name}.png`);
      const opaque = name === "sky" || name === "glow";
      const variants = { avif: [], webp: [] };
      for (const w of cfg.widths) {
        let img = sharp(file).resize({ width: w, kernel: "lanczos3" });
        if (opaque) img = img.removeAlpha();
        const base = await img.png().toBuffer();
        const avif = await sharp(base).avif({ quality: Q[name], effort: 8, chromaSubsampling: "4:4:4", bitdepth: 10 }).toBuffer();
        const webp = await sharp(base).webp({ quality: Q[name] + 22, alphaQuality: 90, effort: 6, smartSubsample: true }).toBuffer();
        variants.avif.push({ w, src: await emit(`${comp}-${name}-${w}`, "avif", avif), bytes: avif.length });
        variants.webp.push({ w, src: await emit(`${comp}-${name}-${w}`, "webp", webp), bytes: webp.length });
      }
      layers[name] = variants;
      const top = variants.avif.at(-1), mid = variants.avif.at(-2);
      total += mid.bytes;
      console.log(`${comp}/${name.padEnd(7)} avif@${mid.w} ${(mid.bytes / 1024).toFixed(0)}KB  @${top.w} ${(top.bytes / 1024).toFixed(0)}KB`);
    }
    // a tiny blurred composite to paint while the layers load
    const small = 32;
    const sh = Math.round((small * meta.height) / meta.width);
    const parts = [];
    for (const name of ORDER.slice(1)) {
      parts.push({ input: await sharp(path.join(dir, `${name}.png`)).resize(small, sh).png().toBuffer(), blend: name === "glow" ? "screen" : "over" });
    }
    const tiny = await sharp(path.join(dir, "sky.png")).resize(small, sh).composite(parts).removeAlpha().blur(1).webp({ quality: 60 }).toBuffer();
    manifest[comp] = {
      width: meta.width,
      height: meta.height,
      focus: cfg.focus,
      lqip: `data:image/webp;base64,${tiny.toString("base64")}`,
      layers,
    };
    console.log(`${comp}: ~${(total / 1024).toFixed(0)}KB at the second-largest width`);
  }
  await writeFile(path.join(root, "src", "content", "hero-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log("wrote src/content/hero-manifest.json");
}

main().catch((e) => { console.error(e); process.exit(1); });
