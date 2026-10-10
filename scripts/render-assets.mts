/**
 * Renders the app icons, splash marks, notification icon and the in-app brand marks from the QRX vector mark
 * (the same mark as web/public/images/brand/qrx-mark.svg in the main repo).
 *
 *   npm run assets
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const out = (...p: string[]) => path.join(root, 'assets', ...p);

const palette = {
  light: { bg: '#f6f5f2', ink: '#16171a', accent: '#2453d6' },
  dark: { bg: '#0d0e10', ink: '#edece8', accent: '#86a8ff' },
};

/** The QRX mark: three finder squares and an X, on a 17-unit grid. */
function mark({
  ink,
  accent,
  size,
  inset = 0,
  bg,
}: {
  ink: string;
  accent: string;
  size: number;
  inset?: number;
  bg?: string;
}) {
  // inset: fraction of the canvas left empty on each side
  const view = 17 / (1 - inset * 2);
  const offset = (view - 17) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-offset} ${-offset} ${view} ${view}" width="${size}" height="${size}">
  ${bg ? `<rect x="${-offset}" y="${-offset}" width="${view}" height="${view}" fill="${bg}"/>` : ''}
  <g fill="none" stroke="${ink}" stroke-width="1.5">
    <rect x="0.75" y="0.75" width="5.5" height="5.5" rx="1.6"/>
    <rect x="10.75" y="0.75" width="5.5" height="5.5" rx="1.6"/>
    <rect x="0.75" y="10.75" width="5.5" height="5.5" rx="1.6"/>
  </g>
  <g fill="${ink}">
    <rect x="2.25" y="2.25" width="2.5" height="2.5" rx="0.6"/>
    <rect x="12.25" y="2.25" width="2.5" height="2.5" rx="0.6"/>
    <rect x="2.25" y="12.25" width="2.5" height="2.5" rx="0.6"/>
  </g>
  <path d="M11.4 11.4L15.6 15.6M15.6 11.4L11.4 15.6" fill="none" stroke="${accent}" stroke-width="2.2" stroke-linecap="round"/>
</svg>`;
}

async function png(svg: string, file: string, opts: { flatten?: string } = {}) {
  let img = sharp(Buffer.from(svg));
  if (opts.flatten) img = img.flatten({ background: opts.flatten });
  await img.png().toFile(file);
  console.log('wrote', path.relative(root, file));
}

mkdirSync(out('images'), { recursive: true });
mkdirSync(out('brand'), { recursive: true });

const { light, dark } = palette;

// iOS: opaque light icon; dark and tinted variants on transparent backgrounds (iOS 18+ appearance)
await png(mark({ ...light, size: 1024, inset: 0.2, bg: light.bg }), out('images', 'icon.png'), { flatten: light.bg });
await png(mark({ ...dark, size: 1024, inset: 0.2 }), out('images', 'icon-dark.png'));
await png(mark({ ink: '#ffffff', accent: '#ffffff', size: 1024, inset: 0.2 }), out('images', 'icon-tinted.png'));

// Android adaptive icon: the system crops to the centre ~66%, so the mark sits well inside it
await png(mark({ ...light, size: 1024, inset: 0.3 }), out('images', 'android-icon-foreground.png'));
await png(
  mark({ ink: '#ffffff', accent: '#ffffff', size: 1024, inset: 0.3 }),
  out('images', 'android-icon-monochrome.png'),
);

// Splash marks and the Android notification icon (white silhouette)
await png(mark({ ...light, size: 384 }), out('images', 'splash-mark.png'));
await png(mark({ ...dark, size: 384 }), out('images', 'splash-mark-dark.png'));
await png(mark({ ink: '#ffffff', accent: '#ffffff', size: 96, inset: 0.08 }), out('images', 'notification-icon.png'));

// In-app marks, drawn by expo-image
writeFileSync(out('brand', 'qrx-mark.svg'), mark({ ...light, size: 512 }));
writeFileSync(out('brand', 'qrx-mark-dark.svg'), mark({ ...dark, size: 512 }));
console.log('wrote assets/brand/qrx-mark.svg, qrx-mark-dark.svg');
