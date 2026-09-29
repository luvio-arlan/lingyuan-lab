import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = 'https://lingyuan-link-check.invalid';
const TAG = /<[a-z][^>]*>/gi;
const REF = /\b(?:href|src)\s*=\s*(["'])(.*?)\1/gi;
const ID = /\bid\s*=\s*(["'])(.*?)\1/gi;

function decodeHtml(value) {
  return value.replace(/&(#(?:x[0-9a-f]+|\d+)|amp|quot|apos|lt|gt);/gi, (_, entity) => {
    if (entity[0] === '#') {
      const hex = entity[1]?.toLowerCase() === 'x';
      return String.fromCodePoint(parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10));
    }
    return { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' }[entity.toLowerCase()];
  });
}

async function htmlFiles(root) {
  const files = [];
  async function visit(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && entry.name.endsWith('.html')) files.push(path);
    }
  }
  await visit(root);
  return files;
}

async function exists(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function targetFile(root, pathname) {
  const decoded = decodeURIComponent(pathname);
  const base = resolve(root, `.${decoded}`);
  if (base !== root && !base.startsWith(`${root}${sep}`)) return undefined;
  const candidates = decoded.endsWith('/')
    ? [join(base, 'index.html')]
    : [base, join(base, 'index.html'), `${base}.html`];
  for (const candidate of candidates) if (await exists(candidate)) return candidate;
  return undefined;
}

export async function checkLinks(directory) {
  const root = resolve(directory);
  const files = await htmlFiles(root);
  const errors = [];
  const htmlCache = new Map();

  async function idsFor(path) {
    if (!htmlCache.has(path)) {
      const html = await readFile(path, 'utf8');
      const ids = new Set();
      for (const tag of html.match(TAG) ?? []) {
        for (const match of tag.matchAll(ID)) ids.add(decodeHtml(match[2]));
      }
      htmlCache.set(path, ids);
    }
    return htmlCache.get(path);
  }

  for (const file of files) {
    const source = relative(root, file).split(sep).join('/');
    const route = source === 'index.html' ? '/' : `/${source.replace(/index\.html$/, '')}`;
    const html = await readFile(file, 'utf8');
    for (const tag of html.match(TAG) ?? []) {
      for (const match of tag.matchAll(REF)) {
        const raw = decodeHtml(match[2]);
        let url;
        try {
          url = new URL(raw, `${ORIGIN}${route}`);
        } catch {
          errors.push(`${source}: invalid URL ${raw}`);
          continue;
        }
        if (url.origin !== ORIGIN) continue;
        let target;
        try {
          target = await targetFile(root, url.pathname);
        } catch {
          errors.push(`${source}: invalid path ${raw}`);
          continue;
        }
        if (!target) {
          errors.push(`${source}: missing target ${raw}`);
          continue;
        }
        if (url.hash && target.endsWith('.html')) {
          let id;
          try {
            id = decodeURIComponent(url.hash.slice(1));
          } catch {
            errors.push(`${source}: invalid anchor ${raw}`);
            continue;
          }
          if (id && !(await idsFor(target)).has(id)) errors.push(`${source}: missing anchor ${raw}`);
        }
      }
    }
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
  const errors = await checkLinks(directory);
  if (errors.length) {
    for (const error of errors) console.error(error);
    console.error(`check:links: ${errors.length} broken reference(s)`);
    process.exitCode = 1;
  } else {
    console.log('check:links: all internal href/src targets and anchors exist');
  }
}
