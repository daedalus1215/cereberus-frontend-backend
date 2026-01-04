import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');
const svgPath = join(publicDir, 'cerberus.svg');

const sizes = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 }
];

const svgBuffer = readFileSync(svgPath);

for (const { name, size } of sizes) {
  const outputPath = join(publicDir, name);
  await sharp(svgBuffer)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
    .png()
    .toFile(outputPath);
  console.log(`Generated ${name} (${size}x${size})`);
}

console.log('All icons generated successfully!');

