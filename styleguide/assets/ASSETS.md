# Asset origins

Every asset in this style guide is made or supplied by Stefan Bauer. One entry per file.

| File | Origin | Date |
|---|---|---|
| `styleguide/sunset-waves.svg` | Supplied by Stefan Bauer as `Artboard 1.svg` (Illustrator export), copied unchanged. | 2026-11-13 |
| `background.svg` | Supplied by Stefan Bauer (Illustrator export): the same 30 wave shapes as `sunset-waves.svg`, at one decimal of precision. Kept as supplied; the `waves` component is built from `sunset-waves.svg`. | 2026-11-13 |
| `../media/images/placeholder-16x9.png`, `../media/images/placeholder-4x3.png` | Placeholders, made in this project (a labelled grid in the deck's colours, drawn with Python's Pillow); stand-ins until real images are chosen. | 2026-11-13 |
| `../media/images/favicon.ico` | Made in this project: three wave bands in the deck's colours on the night aubergine, drawn with Python's Pillow (16, 32 and 48 px). Moved from the site project; linked from every page by `partials/head`. | 2026-11-13 |
| `../media/images/og-image.png` | Rendered from Stefan Bauer's background artwork: the `og-image` component (the Sunset waves from `data/sunset-waves.json`, built from `styleguide/sunset-waves.svg`, crop `26 12 48 25.2`, with the deck's glass card and type), screenshotted with Playwright's Chromium at exactly 1200 × 630. The site's link-preview image. | 2026-11-14 |
| `../media/images/waves.svg`, `../media/images/waves-fanned.svg` | Generated from Stefan Bauer's artwork (`styleguide/sunset-waves.svg`, via `data/sunset-waves.json`): the `waves-art` component and its `fanned` variant as the style guide's build renders them, with the component's CSS inside, written by `scripts/waves-svg.mjs` (`npm run waves-svg`). The pages' waves background. | 2026-11-14 |
