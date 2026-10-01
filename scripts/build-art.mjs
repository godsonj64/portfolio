// Encodes the wallpapers and app icons into web formats and writes a manifest the components read.
//
//   npm run art
//
// Wallpapers are used exactly as supplied (no upscaling, no retouching): this only produces AVIF + WebP
// at a few widths with content-hashed filenames, a tiny blurred placeholder and an average colour.
// ElectroPlate is a pixel-art piece, so every encode keeps full-resolution chroma (4:4:4) to preserve its checker cells.
import sharp from "sharp";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rm, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "assets-src");
const OUT = path.join(root, "public");
const WIDTHS = [480, 828, 1280, 1672]; // 1672 is the native width: never upscaled

const walls = ["cicada", "timbre", "electroplate", "axio", "talenta"];
const icons = ["cicada", "timbre", "electroplate", "axio", "talenta"];
const pixelArt = new Set(["electroplate"]);

const hash = (buf) => createHash("sha1").update(buf).digest("hex").slice(0, 8);

async function emit(dir, base, ext, buf) {
  const file = `${base}.${hash(buf)}.${ext}`;
  await writeFile(path.join(OUT, dir, file), buf);
  return `/${dir}/${file}`;
}

async function clean(dir) {
  await mkdir(path.join(OUT, dir), { recursive: true });
  for (const f of await readdir(path.join(OUT, dir))) await rm(path.join(OUT, dir, f));
}

async function main() {
  await clean("art");
  await clean("icons");
  const manifest = { walls: {}, icons: {} };

  for (const slug of walls) {
    const input = await readFile(path.join(SRC, "wallpapers", `${slug}.png`));
    const meta = await sharp(input).metadata();
    const px = pixelArt.has(slug);
    const variants = { avif: [], webp: [] };
    for (const w of WIDTHS) {
      const base = w === meta.width ? input : await sharp(input).resize({ width: w, kernel: px ? "nearest" : "lanczos3" }).png().toBuffer();
      const avif = await sharp(base)
        .avif({ quality: px ? 80 : 72, effort: 8, chromaSubsampling: "4:4:4", bitdepth: 10 })
        .toBuffer();
      const webp = await sharp(base)
        .webp(px ? { nearLossless: true, quality: 92, effort: 6 } : { quality: 90, effort: 6, smartSubsample: false })
        .toBuffer();
      variants.avif.push({ w, src: await emit("art", `${slug}-${w}`, "avif", avif), bytes: avif.length });
      variants.webp.push({ w, src: await emit("art", `${slug}-${w}`, "webp", webp), bytes: webp.length });
    }
    // placeholder: 24px wide, heavily blurred, inlined as a data URI (~400 B)
    const tiny = await sharp(input).resize({ width: 24 }).blur(1.2).webp({ quality: 55 }).toBuffer();
    const { channels } = await sharp(input).resize(1, 1, { fit: "cover" }).stats();
    const color = "#" + channels.slice(0, 3).map((c) => Math.round(c.mean).toString(16).padStart(2, "0")).join("");
    manifest.walls[slug] = {
      width: meta.width,
      height: meta.height,
      color,
      lqip: `data:image/webp;base64,${tiny.toString("base64")}`,
      variants,
    };
    const last = variants.avif.at(-1);
    console.log(`wall  ${slug.padEnd(13)} ${meta.width}x${meta.height}  avif@${last.w} ${(last.bytes / 1024).toFixed(0)}KB  ${color}`);
  }

  for (const slug of icons) {
    const svg = path.join(SRC, "icons", `${slug}.svg`);
    const png = path.join(SRC, "icons", `${slug}.png`);
    let input;
    try { input = await readFile(svg); } catch { input = await readFile(png); }
    const out = {};
    for (const s of [96, 192, 384]) {
      const buf = await sharp(input, { density: 384 }).resize(s, s, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toBuffer();
      out[s] = await emit("icons", `${slug}-${s}`, "webp", buf);
    }
    manifest.icons[slug] = out;
    console.log(`icon  ${slug.padEnd(13)} ${Object.values(out).length} sizes`);
  }

  // Open Graph card (1200x630): the five wallpapers as a cinematic strip.
  const cell = 240, h = 630;
  const strip = await Promise.all(
    walls.map(async (slug, i) => ({
      input: await sharp(path.join(SRC, "wallpapers", `${slug}.png`)).resize(cell, h, { fit: "cover", position: "centre" }).toBuffer(),
      left: i * cell,
      top: 0,
    })),
  );
  const shade = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset=".25" stop-color="#050507" stop-opacity="0"/><stop offset="1" stop-color="#050507" stop-opacity=".92"/></linearGradient></defs><rect width="1200" height="630" fill="url(#a)"/><text x="64" y="520" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="64" font-weight="300" fill="#f2f2f5" letter-spacing="-2">Software that runs on your machine.</text><text x="66" y="574" font-family="Menlo, monospace" font-size="20" fill="#9a9aa6" letter-spacing="3">GODSON JOHNSON  ·  PORTFOLIO + OPEN LAB</text></svg>`,
  );
  const og = await sharp({ create: { width: 1200, height: 630, channels: 3, background: "#050507" } })
    .composite([...strip, { input: shade, left: 0, top: 0 }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
  manifest.og = await emit("art", "og", "jpg", og);

  // Apple touch icon from the brand mark
  const mark = await readFile(path.join(SRC, "brand-mark.svg"));
  await writeFile(path.join(root, "src", "app", "apple-icon.png"), await sharp(mark, { density: 300 }).resize(180, 180).png().toBuffer());

  await writeFile(path.join(root, "src", "content", "art-manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("manifest written; og:", manifest.og);
}

main().catch((e) => { console.error(e); process.exit(1); });
