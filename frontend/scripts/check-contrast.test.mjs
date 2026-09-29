import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { checkContrast } from './check-contrast.mjs';

const tokens = join(dirname(fileURLToPath(import.meta.url)), '../src/styles/tokens.css');

test('current tokens meet 4.5:1 for text on surfaces', async () => {
  assert.deepEqual(checkContrast(await readFile(tokens, 'utf8')), []);
});

test('a pale ink on white fails', () => {
  const css = `:root {\n  --c-ink: #cccccc;\n  --c-bg: #ffffff;\n}\n`;
  const failures = checkContrast(css, [['--c-ink', '--c-bg']]);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /--c-ink on --c-bg/);
});
