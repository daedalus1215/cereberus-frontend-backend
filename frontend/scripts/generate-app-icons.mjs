import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Sources for the Tauri desktop and Android app icons, all drawn from the logo
 * (public/cerberus.svg). `npm run generate-app-icons` hands app-icon.json to
 * `tauri icon`, which cuts every size and density from the images, writes the
 * adaptive icon with its background, foreground and monochrome layers, and
 * uses app-icon.png for the desktop app (and pre-8.0 Android). It writes iOS
 * icons too, which the npm script deletes: Cereberus has no iOS app.
 *
 * Laid out on Android's 108dp adaptive icon grid, where launchers show the
 * central 72dp and, whatever shape they mask it to, keep the central 66dp
 * circle.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const srcTauriDir = join(__dirname, '..', 'src-tauri');

const logo = readFileSync(join(__dirname, '..', 'public', 'cerberus.svg'), 'utf8');
const logoPaths = logo.match(/<path[\s\S]*?\/>/g).join('');

// The logo's 1024-unit canvas is centred on (512, 512), and nothing in it
// reaches further than 448 units from there. It could fill the 66dp circle, but
// that crowds the tile, so this matches the size of the marks on our other apps.
const LOGO_SCALE = 27 / 448;

// At that size the logo's thinner lines get faint, so they're thickened a little.
// In the units of its paths, which are tenths of the canvas's.
const LOGO_STROKE = 30;

// The app's dark background (src/main.tsx), lifted a little at the top left.
const TILE_STOPS = [
  [0, '#1f1f24'],
  [1, '#000000'],
];

const stops = TILE_STOPS.map(
  ([offset, color]) => `<stop offset="${offset}" stop-color="${color}"/>`
).join('');

/** Corner to corner of the visible 72dp. */
const tileGradient = `<linearGradient id="tile" gradientUnits="userSpaceOnUse" x1="18" y1="18" x2="90" y2="90">${stops}</linearGradient>`;

/** The logo's own transform flips potrace's y-up coordinates. */
const mark = (color) =>
  `<g transform="translate(54 54) scale(${LOGO_SCALE}) translate(-512 -512)">` +
  `<g transform="translate(0,1024) scale(0.1,-0.1)" fill="${color}" stroke="${color}" stroke-width="${LOGO_STROKE}" stroke-linejoin="round">${logoPaths}</g></g>`;

const background = `<defs>${tileGradient}</defs><rect width="108" height="108" fill="url(#tile)"/>`;

// macOS's icon grid, the tile 824 of 1024 across, which sits well among
// Linux launcher icons too. A faint edge keeps the dark tile from melting
// into a dark desktop.
const desktopSpan = (72 * 1024) / 824;
const desktopOrigin = 54 - desktopSpan / 2;
const desktop =
  `<defs>${tileGradient}</defs>` +
  '<rect x="18" y="18" width="72" height="72" rx="16" fill="url(#tile)"/>' +
  '<rect x="18.4" y="18.4" width="71.2" height="71.2" rx="15.6" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="0.8"/>' +
  mark('#ffffff');

const art = {
  /** With a margin, as desktop icons have. */
  'app-icon.png': {
    viewBox: `${desktopOrigin} ${desktopOrigin} ${desktopSpan} ${desktopSpan}`,
    body: desktop,
  },
  'app-icon-background.png': { viewBox: '0 0 108 108', body: background },
  'app-icon-foreground.png': { viewBox: '0 0 108 108', body: mark('#ffffff') },
  /** Android draws only the alpha of themed icons, so white on transparent. */
  'app-icon-monochrome.png': { viewBox: '0 0 108 108', body: mark('#ffffff') },
};

// Sized in the SVG itself: sharp rasterizes at the SVG's own size, so
// resizing afterwards would blur it.
const size = 1024;
for (const [name, { viewBox, body }] of Object.entries(art)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${size}" height="${size}">${body}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(join(srcTauriDir, name));
  console.log(`Generated src-tauri/${name} (${size}x${size})`);
}

writeFileSync(
  join(srcTauriDir, 'app-icon.json'),
  JSON.stringify(
    {
      default: 'app-icon.png',
      android_bg: 'app-icon-background.png',
      android_fg: 'app-icon-foreground.png',
      // The layers are drawn on the full 108dp grid already.
      android_fg_scale: 100,
      android_monochrome: 'app-icon-monochrome.png',
    },
    null,
    2
  ) + '\n'
);
console.log('Generated src-tauri/app-icon.json');
