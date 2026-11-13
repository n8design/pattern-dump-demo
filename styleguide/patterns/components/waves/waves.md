---
title: Waves
preview: full
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

**The deck's cards** (elements marked `data-waves-card`, one per section) come out from under the paper. Each
lies between two layers: on the highest layer whose paper still overlaps it where it rests. Tucked, it is moved
right under the paper of the layers above until only its left edge shows; the script draws those layers again
over the card, clipped to it, and slides the card out (translate only) as its section comes in. At rest none of
them overlaps it, so it lies on top with nothing to switch. The deck layout (`layouts/deck`) says when this is on.

**Going from page to page** (a view transition, `base/transitions.scss`), the paper stays: the waves and the
paper over the cards hold still on layers of their own while the old page's content fades out. Then the new
page's cards start tucked and slide out over `--page-enter-duration`, with the same easing. A card marked
`data-waves-card="still"` (the page layout's article) rests where it is instead of in the middle of the screen:
it only slides out on arrival. On narrow screens, or where a card can't tuck, the cards fade in instead.

**Without WebGL 2**, without JavaScript, or with reduced motion, the SVG is the picture: the same artwork,
still.

Decorative only (`aria-hidden`).
