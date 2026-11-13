---
title: Site header
---

The site's name, linking home, and its navigation, fixed to the top of the screen. Every layout has it through
the frame they share (`partials/base`), which passes on the page's `site` and `nav`.

**Fixed**: the header is `--site-header-size` tall (`styles/base/tokens.scss`). Pages leave that much room above
their content, and the page's scroll padding is the same, so a link to a heading or a focused element never ends
up under the header.

**The current page** is marked `aria-current="page"` and shown with a heavier underline, not by colour alone.

In the deck (`layouts/deck`) it sits over the waves on the same glass as the cards, above the paper that covers
them.
