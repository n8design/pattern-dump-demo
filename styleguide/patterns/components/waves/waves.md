---
title: Waves
requireScript: waves
---

The Sunset waves, as a fixed background behind the whole page: a ground gradient and 30 wave layers, from
aubergine at the back to sand at the front. Built from Stefan's `sunset-waves.svg` (in `assets/styleguide/`).

**As in Illustrator.** The shapes are the artwork's, kept as global data (`data/sunset-waves.json`), and so is
its shadow: every layer casts 14 shifted copies of itself, tinted from white towards its colour and multiplied
over the layers behind it, which is how the artwork draws its soft edges. The colours are the export's values as
Illustrator shows them (a little wider than sRGB), as OKLCH.

**On scroll**, every layer moves on its own: at the top of the page the layers are fanned out to the right in
equal steps, the front one furthest, and the dark layers fill the screen; by the end of the page every layer is
back where the artwork has it. The script `waves` draws this with WebGL on a canvas over the SVG, reading the
shapes, colours and shadow recipe from the SVG itself. Here, with no page to scroll, it shows the artwork as it
is.

**Without WebGL 2**, without JavaScript, or with reduced motion, the SVG is the picture: the same artwork,
still.

Decorative only (`aria-hidden`).
