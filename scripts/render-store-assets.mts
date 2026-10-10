/**
 * Renders the Play Store icon (512×512) and feature graphic (1024×500) into store/assets/, from the app icon and three
 * of QRX's own showcase codes. No text: Play shows the app name next to the graphic, and text would need translating.
 *
 *   npm run store:assets
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'store', 'assets');
mkdirSync(out, { recursive: true });

await sharp(path.join(root, 'assets/images/icon.png'))
  .resize(512, 512)
  .png()
  .toFile(path.join(out, 'play-icon-512.png'));

const W = 1024;
const H = 500;
const bg = '#f6f5f2';

/** A code picture with rounded corners and a hairline, as the app shows them. */
async function tile(file: string, size: number) {
  const r = Math.round(size * 0.09);
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" fill="#fff"/></svg>`,
  );
  const border = Buffer.from(
    `<svg width="${size}" height="${size}"><rect x="1" y="1" width="${size - 2}" height="${size - 2}" rx="${r}" fill="none" stroke="#e3e1db" stroke-width="2"/></svg>`,
  );
  return sharp(path.join(root, 'assets/mock/codes', file))
    .resize(size, size)
    .composite([
      { input: mask, blend: 'dest-in' },
      { input: border, blend: 'over' },
    ])
    .png()
    .toBuffer();
}

/** A soft shadow under a tile. */
function shadow(size: number, blur = 22) {
  const pad = blur * 3;
  return (
    sharp({
      create: {
        width: size + pad * 2,
        height: size + pad * 2,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: Buffer.from(
            `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * 0.09}" fill="rgba(0,0,0,0.28)"/></svg>`,
          ),
          top: pad,
          left: pad,
        },
      ])
      .png()
      .toBuffer()
      // sharp composites after its other operations, so blur in a second pass
      .then((flat) => sharp(flat).blur(blur).png().toBuffer())
      .then((buffer) => ({ buffer, pad }))
  );
}

const big = 330;
const small = 270;
const tiles = [
  { file: '06-red-fox-birches.jpg', size: small, left: 175, top: 115 },
  { file: '16-neon-koi-pond.jpg', size: small, left: W - 175 - small, top: 115 },
  { file: 'hv8551.jpg', size: big, left: Math.round((W - big) / 2), top: Math.round((H - big) / 2) },
];

const layers: sharp.OverlayOptions[] = [];
for (const t of tiles) {
  const s = await shadow(t.size);
  layers.push({ input: s.buffer, left: t.left - s.pad, top: t.top - s.pad + 12 });
  layers.push({ input: await tile(t.file, t.size), left: t.left, top: t.top });
}
// the mark, bottom left
const mark = await sharp(path.join(root, 'assets/images/splash-mark.png')).resize(84, 84).png().toBuffer();
layers.push({ input: mark, left: 56, top: H - 84 - 48 });

await sharp({ create: { width: W, height: H, channels: 4, background: bg } })
  .composite(layers)
  .flatten({ background: bg })
  .png()
  .toFile(path.join(out, 'feature-graphic-1024x500.png'));

console.log('wrote store/assets/play-icon-512.png, feature-graphic-1024x500.png');
