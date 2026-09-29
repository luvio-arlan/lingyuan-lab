import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';

const packages = [
  ['inter', '@fontsource-variable/inter/wght.css'],
  ['noto-serif-sc', '@fontsource-variable/noto-serif-sc/wght.css'],
  ['instrument-serif-normal', '@fontsource/instrument-serif/400.css'],
  ['instrument-serif-italic', '@fontsource/instrument-serif/400-italic.css'],
  ['geist-mono', '@fontsource-variable/geist-mono/wght.css'],
];
const destination = new URL('../public/fonts/', import.meta.url);
await mkdir(destination, { recursive: true });
const styles = [];
const files = [];

for (const [name, packagePath] of packages) {
  const source = new URL(`../node_modules/${packagePath}`, import.meta.url);
  const css = await readFile(source, 'utf8');
  files.push(copyFile(new URL('LICENSE', source), new URL(`${name}-LICENSE.txt`, destination)));
  const rewritten = css.replace(/url\(\.\/files\/([^)]+)\)/g, (_match, file) => {
    const output = `${name}-${basename(file)}`;
    files.push(copyFile(new URL(`./files/${file}`, source), new URL(output, destination)));
    return `url(/fonts/${output})`;
  });
  if (rewritten.includes('url(./')) throw new Error(`Unresolved font URL in ${packagePath}`);
  styles.push(rewritten);
}

await Promise.all(files);
await writeFile(new URL('../public/fonts.css', import.meta.url), styles.join('\n'));
console.log(`Prepared ${files.length - packages.length} fonts and ${packages.length} license files`);
