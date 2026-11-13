---
title: Deck
---

A page as a slide deck. A cover (eyebrow, headline, standfirst from the page's frontmatter), then the page's
slides (`components/slide`), one per screen, over the Sunset waves (`components/waves`). A page uses it with
`layout: deck` in its frontmatter.

**Scrolling** snaps to each card in the middle of the screen; the arrow keys, Page Down and the space bar move
through the slides as they scroll any page. As the page scrolls, the waves drift back into place and each slide's
content rises in.

**Revealed out of the paper**, where the waves script draws (WebGL 2, motion welcome): each slide, and the
cover, becomes four screens tall and its card stays in the middle of the screen while the slide is active. The
paper stays where it is; the card starts tucked under the edge of a layer in front, with only its left edge
showing, slides out to the middle over a long stretch of scrolling, settling like paper, rests on top and holds still
while it is read, and slides back under as the slide leaves. Snapping is off while the cards are revealed, so
the movement follows the scroll. Every movement follows the scroll position, so scrolling back plays it in reverse. The first
card starts out and the last stays out. The reveal is on only where every card can tuck with its edge on screen
(not below 48rem, and not on screens whose proportions leave too little of the artwork); otherwise, and without
the script, each slide is one screen and the cards simply scroll past.
