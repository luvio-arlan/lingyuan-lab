// Derives web-ready copies of the official logo. The source file in
// assets/logo/ is never modified; only transparent padding is trimmed.
import { mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, '../assets/logo/lingyuan-logo.png');
const outDir = resolve(root, 'src/assets/brand');
const trimmed = resolve(outDir, 'lingyuan-logo-trim.png');
const favicon = resolve(root, 'public/favicon.png');

async function isFresh(target) {
  try {
    const [src, out] = await Promise.all([stat(source), stat(target)]);
    return out.mtimeMs >= src.mtimeMs;
  } catch {
    return false;
  }
}

await mkdir(outDir, { recursive: true });
await mkdir(dirname(favicon), { recursive: true });

if (!(await isFresh(trimmed))) {
  const info = await sharp(source)
    .trim({ threshold: 1 })
    .png({ compressionLevel: 9 })
    .toFile(trimmed);
  console.log(`brand: trimmed logo → ${info.width}×${info.height}`);
}

if (!(await isFresh(favicon))) {
  const { data, info } = await sharp(source).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
  // Favicon shows the leading "L" of the wordmark, unaltered, centered on white.
  const height = Math.round(info.height * 0.78);
  const width = Math.round(info.width * 0.235);
  const crop = await sharp(data).extract({ left: 0, top: 0, width, height }).toBuffer();
  const pad = Math.round(height * 0.06);
  const side = Math.round((height - width) / 2) + pad;
  const square = await sharp(crop)
    .extend({ top: pad, bottom: pad, left: side, right: side, background: '#ffffff' })
    .flatten({ background: '#ffffff' })
    .toBuffer();
  await sharp(square).resize(128, 128).png().toFile(favicon);
  console.log('brand: favicon generated');
}
