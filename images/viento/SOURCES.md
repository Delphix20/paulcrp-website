# Viento landing-page assets

- App and widget images: approved English US marketing screenshots, September 3, 2026, from `Viento Photos/Screenshots/iPhone/v1.1/English US`. These are illustrative forecast data, not live weather.
- App icon: `Viento Photos/Icon Composer Sources/VientoAppIcon-Dark.png`.
- Silver iPhone frame: the original transparent image in the Viento App Store Figma file, node `48:2`. The screenshot placement matches that file. No App Store slides were changed.
- App Store badge: Apple's official `https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg`.
- Footer Apple symbol: the unchanged Apple silhouette paths from that official badge, with a standalone viewBox for cross-platform rendering.
- Navigation icons: Lucide, from `https://github.com/lucide-icons/lucide/tree/main/icons`. See `lucide-license.txt`.
- Fonts: Avenir Next is used when installed on the visitor's device. The existing website's self-hosted Plus Jakarta Sans is the fallback. No commercial font file is redistributed.

`scripts/prepare-viento-assets.py` produces optimized WebP copies without changing the original screenshots. It is an optional asset-preparation utility, not a website build dependency.

## Matching website appearances

The full batch was imported on September 4, 2026, from `Viento Photos/Website images`. After visual verification, `IMG_0518.PNG` through `IMG_0524.PNG` were mapped to dark Hourly, 10 Days, Light, Wind, Air, Pressure, and Places respectively; `IMG_0525.PNG` through `IMG_0531.PNG` supply the matching light variants in the same order. Both appearances are now enabled. Original source files were left untouched.

In a DEBUG build on iPhone 17 Pro Simulator, use **Settings > Debug > Website screenshots > All 14**. Dark 7 and Light 7 can also be exported separately. Exports use the existing English US mock data, 8:33 status bar, 1206 x 2622 resolution, and real app page views. They do not change settings, subscriptions, saved places, or App Store exports.

PNGs are saved to Photos and remain in the app container's `Documents/Viento Website Exports/` with names such as `EN_US_Web_10_Days_Dark.png`. Use this Documents folder for importing, since exporting from Photos can rename files.

Run `python3 scripts/import-viento-website-screenshots.py "/path/to/Viento Website Exports"` with Pillow installed. It requires all 14 PNGs, validates dimensions before replacing anything, optimizes them, and updates `assets/js/viento-previews.js`. It also makes the hero's 10 Days and the static Daily/Places previews dark by default. No source PNG, widget, Conditions, or Next 12 asset is altered.

Until these new exports are imported, the catalog lists only existing screenshots. Missing appearance choices and Hourly are disabled, so visitors never get a blank or artificially recolored preview. Importing enables both appearances for all seven pages automatically. Run this importer after the legacy asset-preparation script if regenerating both sets.
