---
title: Waves artwork
preview: full
---

The Sunset waves as one SVG, built from Stefan's `sunset-waves.svg` (in `assets/styleguide/`): the ground gradient
and 30 wave layers, each a frame with a wave-shaped hole that shows the layers beneath, aubergine at the back to sand
at the front. The shapes are global data (`data/sunset-waves.json`), and so is the artwork's own shadow: 14
shifted copies of every layer, tinted from white towards its colour and multiplied over what lies behind it, as
Illustrator draws them. The colours are the export's as Illustrator shows them, as OKLCH.

**Not placed on pages.** Inline, the artwork was 100 KB of every page. It is written out once as two files,
`media/images/waves.svg` (this) and `waves-fanned.svg` (the `fanned` variant: each layer moved right by its own
amount, where the waves script starts at the top of a page). Every page shows one of them as the background of
`components/waves`, and the browser caches it across pages. Each file carries this component's CSS inside, so it
looks the same as an image as it does here.

**After a change** to this component, its styles or the data, write the files again from the repository's root:

```bash
npm run waves-svg
```
