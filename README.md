# Paul CRP website

Static portfolio and app catalog for [paulcrp.com](https://paulcrp.com), prepared for GitHub Pages and Cloudflare Pages.

## Local workflow

Requires Node.js 22 or newer.

```sh
npm ci
npm run validate
npm run preview -- --port 8788
```

`npm run validate` regenerates all app detail pages, builds `dist/`, checks every local asset reference and JSON-LD block, validates the sitemap and crawler directives, and runs HTML validation.

App data lives in `data/apps.json`. After changing it, run `npm run generate`. Optimized image variants are produced by `scripts/optimize-images.sh` and are committed so the deployment environment does not need image codecs.

## Cloudflare Pages

- Build command: `npm run build`
- Build output directory: `dist`
- Production branch: `main`
- Node version: 22 or newer

Security headers, cache policy, private-tool noindex rules, and CSP rules are defined in `_headers`; canonical redirects are in `_redirects`.

For intentionally permissive public AI access, keep Cloudflare Managed `robots.txt` disabled, set Search, AI Input/Agent, and AI Training crawler policies to **Allow**, disable the legacy Block AI Bots control, and do not enable AI Labyrinth. The repository's `robots.txt`, `llms.txt`, `llms-full.txt`, sitemap, and machine-readable profile then remain authoritative.

The YouBecome analytics and content tools are protected without a Zero Trust billing profile by the dedicated Basic Authentication Worker in `cloudflare/admin-auth/`. It covers `/youbecome_analytics*` and `/youbecome_content*`, stores only a SHA-256 credential digest as a Cloudflare secret, strips the `Authorization` header before forwarding to GitHub Pages, and keeps Workers logs enabled for denied requests and runtime errors. The existing noindex, no-store, and CSP rules remain as defense in depth.

Validate the Worker before deploying it:

```sh
npm run worker:check
```

Deploy with `npm run worker:deploy`. Set or rotate the credential digest with `npx wrangler secret put ADMIN_BASIC_AUTH_SHA256 --config cloudflare/admin-auth/wrangler.jsonc`; never commit the digest or plaintext credentials.
