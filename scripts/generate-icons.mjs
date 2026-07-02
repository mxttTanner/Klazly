/**
 * Generate the full app-icon set from src/app/icon.svg (the brand mark).
 *
 * Outputs:
 *   src/app/favicon.ico        16+32+48 (PNG-compressed ICO) — Google Search favicon
 *   src/app/apple-icon.png     180×180 — iOS Add-to-Home-Screen
 *   public/icon-192.png        Android/PWA
 *   public/icon-512.png        Android/PWA splash
 *   public/icon-512-maskable.png  20% safe-zone padding on brand emerald
 *
 * Run: node scripts/generate-icons.mjs
 * Re-run whenever the brand mark in src/app/icon.svg changes.
 */
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SVG = path.join(ROOT, "src", "app", "icon.svg");
const EMERALD = "#10b981";

const svg = await readFile(SVG);

async function png(size) {
  return sharp(svg, { density: 72 * (size / 48) })
    .resize(size, size)
    .png()
    .toBuffer();
}

// Plain square exports.
await writeFile(path.join(ROOT, "src", "app", "apple-icon.png"), await png(180));
await writeFile(path.join(ROOT, "public", "icon-192.png"), await png(192));
await writeFile(path.join(ROOT, "public", "icon-512.png"), await png(512));

// Maskable: Android crops up to ~20% per edge, so render the mark at 80%
// centred on a full-bleed emerald square (the mark's own rounded corners
// disappear into the background).
{
  const inner = await png(410);
  const maskable = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: EMERALD,
    },
  })
    .composite([{ input: inner, gravity: "center" }])
    .png()
    .toBuffer();
  await writeFile(path.join(ROOT, "public", "icon-512-maskable.png"), maskable);
}

// favicon.ico — ICO container with PNG-compressed images (supported by
// every modern browser and by Google's favicon crawler).
{
  const sizes = [16, 32, 48];
  const images = await Promise.all(sizes.map((s) => png(s)));
  const HEADER = 6;
  const DIR_ENTRY = 16;
  let offset = HEADER + DIR_ENTRY * sizes.length;
  const header = Buffer.alloc(HEADER);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(sizes.length, 4);
  const entries = [];
  for (let i = 0; i < sizes.length; i++) {
    const e = Buffer.alloc(DIR_ENTRY);
    e.writeUInt8(sizes[i] === 256 ? 0 : sizes[i], 0); // width
    e.writeUInt8(sizes[i] === 256 ? 0 : sizes[i], 1); // height
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bpp
    e.writeUInt32LE(images[i].length, 8);
    e.writeUInt32LE(offset, 12);
    offset += images[i].length;
    entries.push(e);
  }
  await writeFile(
    path.join(ROOT, "src", "app", "favicon.ico"),
    Buffer.concat([header, ...entries, ...images]),
  );
}

console.log("✓ generated favicon.ico, apple-icon.png, icon-192/512(+maskable).png");
