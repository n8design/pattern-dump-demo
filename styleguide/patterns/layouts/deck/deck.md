---
title: Deck
preview: full
requireScript: deck
---

A page as a slide deck. A cover (eyebrow, headline, standfirst from the page's frontmatter), then the page's
slides (`components/slide`), one per screen, over the Sunset waves (`components/waves`). A page uses it with
`layout: deck` in its frontmatter.

**Scrolling** snaps to each card in the middle of the screen; the arrow keys, Page Down and the space bar move
through the slides as they scroll any page. As the page scrolls, the waves drift back into place and each slide's
content rises in.

**Revealed out of the paper**, where the waves script draws (WebGL 2, motion welcome): each slide, and the
cover, becomes `--reveal-length` screens tall (3 by default) and its card stays in the middle of the screen while the slide is active. The
paper stays where it is; the card starts tucked under the edge of a layer in front, with only its left edge
showing, slides out to the middle over a long stretch of scrolling, settling like paper, rests on top and holds still
while it is read, and slides back under as the slide leaves. Snapping is off while the cards are revealed, so
the movement follows the scroll. Every movement follows the scroll position, so scrolling back plays it in reverse. The first
card starts out and the last stays out. The reveal is on only where every card can tuck with its edge on screen
(not below 48rem, and not on screens whose proportions leave too little of the artwork); otherwise, and without
the script, each slide is one screen and the cards simply scroll past.

**Tuning**: two custom properties in `styles/base/tokens.scss`. `--reveal-length` is the screen heights of
scrolling per slide; `--reveal-damping` is how the card follows the scroll, the share of the remaining distance it
closes per frame (1 follows exactly; 0.1 to 0.2 trails softly and settles after the scroll stops, the same at 60
and 120 Hz). Both can be changed live in the browser's dev tools, on `:root`.

**Learn more**: with `more` (the link's text) and `moreTarget` (a slide's `anchor`) in the frontmatter, the cover
gets a link to that slide. Without JavaScript it is an ordinary link to the slide's headline (smooth only where
motion is welcome). With the `deck` script it starts a tour through that slide and every one after it. It
scrolls to where each card rests, over `--learn-more-duration` (tokens.scss) with an ease-in-out, so the card
slides out at its own pace. It then waits as long as reading the card takes, a second plus its words at
`--reading-speed` (238 words a minute, the average for silent reading of non-fiction), and moves on; it ends on
the last card. The first stop also updates the address. While it plays, a "Stop tour" button shows below the
header (after it in the page's order); the button, Escape, any wheel, touch, pointer or key input, or leaving
the tab stops the tour and hands the scroll back. The focus stays where it is during the tour, so a screen reader
isn't interrupted at every card; when the tour ends or stops, the headline of the card it last reached takes it
(without a second scroll). With reduced motion it jumps to the first slide and nothing moves on by itself.
