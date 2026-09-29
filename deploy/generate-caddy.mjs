import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../frontend/dist/', import.meta.url);
const template = new URL('./Caddyfile.template', import.meta.url);
const output = new URL('./Caddyfile', import.meta.url);
const hashes = new Set();
let htmlCount = 0;

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(path);
    } else if (entry.name.endsWith('.html')) {
      htmlCount++;
      const html = await readFile(path, 'utf8');
      for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        if (/\bsrc\s*=/.test(match[1]) || !match[2].trim()) continue;
        const digest = createHash('sha256').update(match[2]).digest('base64');
        hashes.add(`'sha256-${digest}'`);
      }
    }
  }
}

await visit(fileURLToPath(root));
if (!htmlCount || !hashes.size) throw new Error('Expected built HTML with inline Astro scripts');
const config = (await readFile(template, 'utf8')).replace(
  '__CSP_SCRIPT_HASHES__',
  [...hashes].sort().join(' '),
);
await writeFile(output, config);
console.log(`Generated CSP from ${htmlCount} HTML files and ${hashes.size} inline script hashes`);
