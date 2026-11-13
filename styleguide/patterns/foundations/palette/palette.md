---
title: Palette
---

How a candidate palette is shown: a sample (its ground, type and kicker, with every seed as a stripe), then
a ramp per colour. Each palette under `foundations/colors` is this pattern with its own data:

```handlebars
{{> foundations-palette }}
```

**Ramps.** Every seed grows into eleven steps, from 50 (lightest) to 950 (darkest). A step has a fixed
OKLCH lightness, so 600 is equally dark in every hue; the outlined first swatch is the seed itself, since the
steps don't always contain it.

**Reading a swatch.** Its OKLCH value (lightness, chroma, hue) and its contrast with white (W) and black (B).
Text needs 4.5 : 1 against its background (WCAG AA), large text 3 : 1. The ratios under a sample's headline
are its headline's and kicker's contrast with the ground.

**Where it lives.** Seeds and the ramp maths: `styles/base/_palettes.scss`. The swatch colours: one
`@include swatches.palette(…)` in each palette's stylesheet (`styles/foundations/colors/<name>.scss`), which
also names its sample's ground, type and kicker. Once a palette is chosen, its ramps become tokens and the
others go.
