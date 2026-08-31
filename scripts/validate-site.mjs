import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = path.resolve(scriptDirectory, '..');
const outputDirectory = path.join(repositoryDirectory, 'dist');
const failures = [];

function fail(message) {
  failures.push(message);
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else files.push(fullPath);
  }
  return files;
}

function localTarget(documentPath, rawValue) {
  const value = rawValue.trim().replace(/^['"]|['"]$/g, '');
  if (!value || value.startsWith('#') || /^(?:[a-z]+:|\/\/)/i.test(value)) return null;
  const withoutFragment = value.split('#')[0].split('?')[0];
  if (!withoutFragment) return null;
  const resolved = withoutFragment.startsWith('/')
    ? path.join(outputDirectory, withoutFragment)
    : path.resolve(path.dirname(documentPath), withoutFragment);
  return resolved.endsWith(path.sep) ? path.join(resolved, 'index.html') : resolved;
}

const requiredFiles = [
  'index.html', '404.html', 'robots.txt', 'sitemap.xml', 'llms.txt', 'llms-full.txt',
  'ai/site-profile.md', '_headers', '_redirects', 'favicon.ico', 'site.webmanifest'
];
for (const file of requiredFiles) {
  if (!await exists(path.join(outputDirectory, file))) fail(`Missing required build output: ${file}`);
}

const apps = JSON.parse(await readFile(path.join(repositoryDirectory, 'data', 'apps.json'), 'utf8'));
for (const app of apps) {
  const page = path.join(outputDirectory, 'apps', app.slug, 'index.html');
  if (!await exists(page)) fail(`Missing generated app page: ${app.slug}`);
}

const files = await walk(outputDirectory);
const htmlFiles = files.filter(file => file.endsWith('.html'));
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const relative = path.relative(outputDirectory, file);

  if (!/<html\b[^>]*\blang=/i.test(html)) fail(`${relative}: missing html lang attribute`);
  if (/user-scalable\s*=\s*no/i.test(html)) fail(`${relative}: disables browser zoom`);

  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      fail(`${relative}: invalid JSON-LD (${error.message})`);
    }
  }

  const attributeValues = [];
  for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) attributeValues.push(match[1]);
  for (const match of html.matchAll(/\bsrcset=["']([^"']+)["']/gi)) {
    for (const candidate of match[1].split(',')) attributeValues.push(candidate.trim().split(/\s+/)[0]);
  }

  for (const value of attributeValues) {
    const target = localTarget(file, value);
    if (!target) continue;
    let candidate = target;
    if (!path.extname(candidate) && await exists(path.join(candidate, 'index.html'))) candidate = path.join(candidate, 'index.html');
    if (!await exists(candidate)) fail(`${relative}: missing local reference ${value}`);
  }

  for (const match of html.matchAll(/\bhref=["']#([^"']+)["']/gi)) {
    const id = match[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!new RegExp(`\\bid=["']${id}["']`, 'i').test(html)) fail(`${relative}: missing fragment target #${match[1]}`);
  }
}

const index = await readFile(path.join(outputDirectory, 'index.html'), 'utf8');
for (const marker of [
  '<link rel="canonical" href="https://paulcrp.com/"',
  'name="description"',
  'property="og:image"',
  'name="twitter:card"',
  'type="application/ld+json"',
  'id="main-content"'
]) {
  if (!index.includes(marker)) fail(`Homepage missing required marker: ${marker}`);
}
if (/<script(?![^>]*\bsrc=)(?![^>]*type=["']application\/ld\+json["'])/i.test(index)) fail('Homepage contains executable inline JavaScript');
if (/<style\b/i.test(index)) fail('Homepage contains an inline style block');
if (/fonts\.googleapis\.com|fontawesome/i.test(index)) fail('Homepage still references a render-blocking external font or Font Awesome');

const robots = await readFile(path.join(outputDirectory, 'robots.txt'), 'utf8');
for (const signal of ['search=yes', 'ai-input=yes', 'ai-train=yes', 'use=full', 'Allow: /']) {
  if (!robots.includes(signal)) fail(`robots.txt missing permissive directive: ${signal}`);
}

const sitemap = await readFile(path.join(outputDirectory, 'sitemap.xml'), 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
if (sitemapUrls.length !== apps.length + 1) fail(`Sitemap contains ${sitemapUrls.length} URLs; expected ${apps.length + 1}`);
for (const app of apps) {
  if (!sitemapUrls.includes(`https://paulcrp.com/apps/${app.slug}/`)) fail(`Sitemap missing app: ${app.slug}`);
}

const headers = await readFile(path.join(outputDirectory, '_headers'), 'utf8');
for (const header of ['Strict-Transport-Security', 'Content-Security-Policy', 'Permissions-Policy', 'X-Content-Type-Options', 'X-Robots-Tag']) {
  if (!headers.includes(header)) fail(`_headers missing ${header}`);
}

if (await exists(path.join(outputDirectory, 'generic.html'))) fail('generic.html should not be deployed');
if (await exists(path.join(outputDirectory, 'elements.html'))) fail('elements.html should not be deployed');
if (await exists(path.join(outputDirectory, 'assets', 'sass'))) fail('Sass source should not be deployed');
if (files.some(file => /fontawesome|fa-(?:brands|regular|solid)/i.test(file))) fail('Obsolete Font Awesome assets are still deployed');

for (const adminFile of ['youbecome_analytics.html', 'youbecome_content.html']) {
  const admin = await readFile(path.join(outputDirectory, adminFile), 'utf8');
  if (!/name="robots" content="noindex,nofollow,noarchive,nosnippet"/.test(admin)) fail(`${adminFile}: missing noindex protection`);
}

if (failures.length) {
  console.error(`Validation failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Validated ${htmlFiles.length} HTML files, ${apps.length} app pages, ${sitemapUrls.length} sitemap URLs, and all local asset references.`);
