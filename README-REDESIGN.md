# PAUL CRP redesign

This is the PAUL CRP redesign, prepared for publication on 2026-09-24. The original site remains in the sibling `paulcrp-website-repo` folder.

## Preview locally

```sh
npm ci
npm run validate
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:4173/. Use an HTTP server; pages use root-relative URLs.

## Edit the redesign

- `data/apps.json`: app names, descriptions, App Store links, and external websites.
- `scripts/generate-app-pages.mjs`: homepage, app pages, concise catalog copy, icon showcase, and shared header/footer.
- `assets/css/redesign.css`: visual design and responsive layouts.
- `assets/js/redesign.js`: catalog filters, paced anchor scrolling, and mobile navigation.
- `images/showcase/sources.json`: provenance for the four public App Store preview images. Viento uses its existing local screenshot.

`npm run build` regenerates the homepage and all 18 app pages, then creates `dist/`. Edit the generator rather than generated HTML.

The original app URLs, policy pages, utility pages, app-ads.txt, and domain file are retained. The Viento landing page continues to identify vientoweather.com as its canonical location. The old validation assertions were updated to reflect that existing migration.

The new branding uses PAUL CRP, including public metadata and machine-readable profiles. Local previews do not send visits to production Google Analytics.

## Publication and rollback

GitHub Pages publishes the repository root on `main` at https://paulcrp.com/ through the existing Cloudflare routing. The build and validation commands generate the committed HTML pages; `dist/` is the local preview artifact.

The previous production commit is `b140d85fae849db14a584c57489af949e7bbdd66`, preserved by the `pre-redesign-2026-09-24` tag. To roll back, revert the redesign release commit on `main` and let GitHub Pages redeploy. The original sibling `paulcrp-website-repo` folder is also preserved.

Existing CalBar pages, privacy policies, domain configuration, Cloudflare Worker protection, and utility files are retained.

## Current design

Cool white and graphite surfaces, navy accents, and black primary buttons. The header Download action links to the verified App Store developer page at https://apps.apple.com/developer/id1818750485. The homepage presents all 18 clickable app icons in a carousel matching the navy hero text with seven visible on desktop in a straight horizontal row, edge-hover browsing, arrow controls, and touch swiping; all 18 products remain available in open app and game rows. App detail pages retain their real screenshots.
