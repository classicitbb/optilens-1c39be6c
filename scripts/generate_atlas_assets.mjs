// Writes the Atlas install manifest and its icons from src/features/atlas/config.ts.
// Run: npm run atlas:assets   (Node 22.18+ imports the .ts config directly).
// A unit test fails if public/atlas.webmanifest drifts from the config.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { ATLAS_CONFIG, buildAtlasManifest } = await import(pathToFileURL(path.join(root, "src/features/atlas/config.ts")).href);
const publicDir = path.join(root, "public");

const hex = (value) => [1, 3, 5].map((i) => Number.parseInt(value.slice(i, i + 2), 16));
const accent = hex(ATLAS_CONFIG.manifest.themeColor);
const background = hex(ATLAS_CONFIG.manifest.backgroundColor);

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buffer) => {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
};
const png = (size, pixels) => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
};

// A neutral mark: an accent ring around a diamond, on the brand background. No business logo.
const render = (size, { rounded }) => {
  const pixels = Buffer.alloc(size * size * 4);
  const samples = 4;
  const c = size / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const px = x + (sx + 0.5) / samples;
          const py = y + (sy + 0.5) / samples;
          const dx = px - c, dy = py - c;
          const dist = Math.hypot(dx, dy) / size;
          // Rounded-square mask for "any" icons; maskable icons are full-bleed.
          const qx = Math.abs(dx) - (0.5 - 0.18) * size, qy = Math.abs(dy) - (0.5 - 0.18) * size;
          const inside = !rounded || Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) <= 0.18 * size;
          if (!inside) continue;
          const ring = dist >= 0.2 && dist <= 0.29;
          const diamond = (Math.abs(dx) + Math.abs(dy)) / size <= 0.12;
          const colour = ring || diamond ? accent : background;
          r += colour[0]; g += colour[1]; b += colour[2]; a += 255;
        }
      }
      const n = samples * samples;
      const i = (y * size + x) * 4;
      const covered = a / 255 || 1;
      pixels[i] = Math.round(r / covered);
      pixels[i + 1] = Math.round(g / covered);
      pixels[i + 2] = Math.round(b / covered);
      pixels[i + 3] = Math.round(a / n);
    }
  }
  return png(size, pixels);
};

for (const icon of ATLAS_CONFIG.manifest.icons) {
  const size = Number.parseInt(icon.sizes, 10);
  fs.writeFileSync(path.join(publicDir, icon.src.replace(/^\//, "")), render(size, { rounded: icon.purpose !== "maskable" }));
}
fs.writeFileSync(path.join(publicDir, `${ATLAS_CONFIG.basePath.replace(/^\//, "")}.webmanifest`), `${JSON.stringify(buildAtlasManifest(), null, 2)}\n`);
console.log("Wrote the Atlas manifest and icons to public/.");
