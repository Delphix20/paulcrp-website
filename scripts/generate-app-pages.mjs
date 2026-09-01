import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = path.resolve(scriptDirectory, '..');
const apps = JSON.parse(await readFile(path.join(repositoryDirectory, 'data', 'apps.json'), 'utf8'));

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function safeJson(value) {
  return JSON.stringify(value, null, 2).replaceAll('<', '\\u003c');
}

for (const app of apps) {
  const canonicalUrl = `https://paulcrp.com/apps/${app.slug}/`;
  const imageVersion = app.imageVersion ? `?v=${encodeURIComponent(app.imageVersion)}` : '';
  const imagePath = (size, format) => `/images/optimized/${app.image}-${size}.${format}${imageVersion}`;
  const imageUrl = `https://paulcrp.com${imagePath(256, 'png')}`;
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': `${canonicalUrl}#app`,
        name: app.name,
        description: app.description,
        url: canonicalUrl,
        sameAs: [app.appStoreUrl, ...(app.websiteUrl ? [app.websiteUrl] : [])],
        image: imageUrl,
        operatingSystem: 'iOS',
        applicationCategory: app.category,
        genre: app.genre,
        author: { '@id': 'https://paulcrp.com/#person' },
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          url: app.appStoreUrl
        }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Paul CRP', item: 'https://paulcrp.com/' },
          { '@type': 'ListItem', position: 2, name: app.name, item: canonicalUrl }
        ]
      },
      {
        '@type': 'Person',
        '@id': 'https://paulcrp.com/#person',
        name: 'Paul Crăpătureanu',
        alternateName: 'Paul CRP',
        url: 'https://paulcrp.com/',
        jobTitle: 'App Developer',
        sameAs: ['https://x.com/DevPaulCrp', 'https://www.instagram.com/devpaulcrp/']
      }
    ]
  };
  const websiteAction = app.websiteUrl
    ? `\n          <a href="${escapeHtml(app.websiteUrl)}" target="_blank" rel="noopener noreferrer"><img src="/images/visitwebsite-button.png" class="app-store-badge" alt="Visit the ${escapeHtml(app.name)} website" width="180" height="60" decoding="async" /></a>`
    : '';

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(app.name)} | Paul CRP</title>
    <meta name="description" content="${escapeHtml(app.description)}" />
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
    <link rel="canonical" href="${canonicalUrl}" />
    <link rel="icon" href="/images/favicon.svg" type="image/svg+xml" />
    <link rel="alternate icon" href="/favicon.ico" sizes="any" />
    <link rel="apple-touch-icon" href="/images/favicon-64.png" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Paul CRP" />
    <meta property="og:title" content="${escapeHtml(app.name)} | Paul CRP" />
    <meta property="og:description" content="${escapeHtml(app.description)}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="256" />
    <meta property="og:image:height" content="256" />
    <meta property="og:image:alt" content="${escapeHtml(app.name)} app icon" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(app.name)} | Paul CRP" />
    <meta name="twitter:description" content="${escapeHtml(app.description)}" />
    <meta name="twitter:image" content="${imageUrl}" />
    <meta name="theme-color" content="#c7d8ff" />
    <link rel="preload" href="/assets/fonts/plus-jakarta-sans-latin.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="stylesheet" href="/assets/css/main.css" />
    <link rel="stylesheet" href="/assets/css/site.css" />
    <link rel="stylesheet" href="/assets/css/app-detail.css" />
    <script type="application/ld+json">${safeJson(graph)}</script>
    <script src="/assets/js/analytics.js" defer></script>
  </head>
  <body class="landing">
    <div id="page-wrapper">
      <nav class="app-detail-nav" aria-label="App navigation">
        <a href="/" aria-label="Paul CRP homepage">PAUL CRP</a>
        <a href="/#apps" class="app-detail-home">All apps</a>
      </nav>
      <main class="app-detail-shell">
        <article class="game-card app-detail-card">
          <picture>
            <source type="image/avif" srcset="${imagePath(128, 'avif')} 128w, ${imagePath(256, 'avif')} 256w" sizes="160px" />
            <source type="image/webp" srcset="${imagePath(128, 'webp')} 128w, ${imagePath(256, 'webp')} 256w" sizes="160px" />
            <img src="${imagePath(256, 'png')}" class="app-icon" width="160" height="160" alt="${escapeHtml(app.name)} app icon" fetchpriority="high" decoding="async" />
          </picture>
          <h1>${escapeHtml(app.name)}</h1>
          <p class="app-detail-description">${escapeHtml(app.description)}</p>
          <div class="app-detail-actions">
            <a href="${escapeHtml(app.appStoreUrl)}" target="_blank" rel="noopener noreferrer"><img src="/images/downloadappstore-button.png" class="app-store-badge" alt="Download ${escapeHtml(app.name)} on the App Store" width="180" height="60" decoding="async" /></a>${websiteAction}
          </div>
          <p class="app-detail-meta">Available for iOS · Free download</p>
        </article>
      </main>
      <footer class="app-detail-footer"><p>&copy; 2026 Paul CRP</p></footer>
    </div>
  </body>
</html>
`;

  const outputDirectory = path.join(repositoryDirectory, 'apps', app.slug);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, 'index.html'), html);
}

console.log(`Generated ${apps.length} crawlable app pages.`);
