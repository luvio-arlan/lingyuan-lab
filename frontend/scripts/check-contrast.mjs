import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Text tokens against the surfaces they are allowed to sit on. Graphic hues and faint lines are not text. */
export const PAIRS = [
  ...['--c-ink', '--c-ink-2', '--c-ink-3', '--c-ink-4'].flatMap((ink) =>
    ['--c-bg', '--c-mist', '--c-mist-2', '--c-mist-3'].map((surface) => [ink, surface]),
  ),
  ['--c-blue-ink', '--c-bg'],
  ['--c-blue-ink', '--c-blue-soft'],
  ['--c-violet-ink', '--c-bg'],
  ['--c-violet-ink', '--c-violet-soft'],
  ['--c-teal-ink', '--c-bg'],
  ['--c-teal-ink', '--c-teal-soft'],
  ['--c-orange-ink', '--c-bg'],
  ['--c-orange-ink', '--c-orange-soft'],
];

const MIN_RATIO = 4.5;

function channel(value) {
  const scaled = value / 255;
  return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function parseHex(hex) {
  const raw = hex.slice(1);
  const full = raw.length === 3 ? [...raw].map((c) => c + c).join('') : raw.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

function luminance([r, g, b]) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(foreground, background) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

export function readColors(css) {
  const root = css.match(/:root\s*\{([\s\S]*?)\n\}/);
  if (!root) throw new Error('tokens.css has no :root block');
  const colors = new Map();
  for (const match of root[1].matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    colors.set(match[1], parseHex(match[2]));
  }
  return colors;
}

export function checkContrast(css, pairs = PAIRS) {
  const colors = readColors(css);
  const failures = [];
  for (const [ink, surface] of pairs) {
    const foreground = colors.get(ink);
    const background = colors.get(surface);
    if (!foreground || !background) {
      failures.push(`${ink} on ${surface}: missing color`);
      continue;
    }
    const ratio = contrastRatio(foreground, background);
    if (ratio < MIN_RATIO) {
      failures.push(`${ink} on ${surface}: ${ratio.toFixed(2)}:1`);
    }
  }
  return failures;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const file = join(dirname(fileURLToPath(import.meta.url)), '../src/styles/tokens.css');
  const failures = checkContrast(await readFile(file, 'utf8'));
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exit(1);
  }
  console.log(`Contrast passed: ${PAIRS.length} text/background pairs are at least ${MIN_RATIO}:1`);
}
