import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { checkLinks } from './check-links.mjs';

async function fixture(files, run) {
  const root = await mkdtemp(join(tmpdir(), 'lingyuan-links-'));
  try {
    for (const [name, content] of Object.entries(files)) {
      const target = join(root, name);
      await mkdir(join(target, '..'), { recursive: true });
      await writeFile(target, content);
    }
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('accepts existing pages, assets, local anchors and external URLs', async () => {
  await fixture({
    'index.html': '<main id="top"><a href="/learn#lesson">Learn</a><a href="#top">Top</a><a href="https://example.org/">External</a><img src="/_astro/logo.webp"></main>',
    'learn/index.html': '<section id="lesson"><a href="../">Home</a></section>',
    '_astro/logo.webp': 'asset',
  }, async (root) => {
    assert.deepEqual(await checkLinks(root), []);
  });
});

test('reports missing pages, assets and anchors with source page', async () => {
  await fixture({
    'index.html': '<a href="/missing">Missing</a><a href="#nope">Anchor</a><img src="/lost.png">',
    'learn/index.html': '<a href="/#absent">Bad target anchor</a>',
  }, async (root) => {
    const errors = await checkLinks(root);
    assert.equal(errors.length, 4);
    assert.ok(errors.some((error) => error.includes('/missing') && error.includes('index.html')));
    assert.ok(errors.some((error) => error.includes('#nope') && error.includes('index.html')));
    assert.ok(errors.some((error) => error.includes('/lost.png') && error.includes('index.html')));
    assert.ok(errors.some((error) => error.includes('/#absent') && error.includes('learn/index.html')));
  });
});
