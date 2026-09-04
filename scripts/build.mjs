import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = path.resolve(scriptDirectory, '..');
const outputDirectory = path.join(repositoryDirectory, 'dist');

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

const rootFiles = [
  '.nojekyll',
  '404.html',
  '_headers',
  '_redirects',
  'app-ads.txt',
  'favicon.ico',
  'index.html',
  'llms-full.txt',
  'llms.txt',
  'robots.txt',
  'site.webmanifest',
  'sitemap.xml',
  'youbecome_content_manifest.webmanifest',
  'youbecome_content_renderer.js',
  'youbecome_content_sw.js',
  'youbecome_content_version.json'
];

const rootEntries = await readdir(repositoryDirectory, { withFileTypes: true });
for (const entry of rootEntries) {
  if (entry.isFile() && entry.name.endsWith('.html') && !rootFiles.includes(entry.name)) {
    rootFiles.push(entry.name);
  }
}

for (const file of rootFiles) {
  await cp(path.join(repositoryDirectory, file), path.join(outputDirectory, file));
}

for (const directory of ['ai', 'apps', 'assets', 'images', 'viento']) {
  await cp(path.join(repositoryDirectory, directory), path.join(outputDirectory, directory), {
    recursive: true,
    filter: (source) => !source.includes(`${path.sep}assets${path.sep}sass`)
  });
}

console.log(`Built static site in ${outputDirectory}`);
