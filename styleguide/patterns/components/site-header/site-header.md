---
title: Site header
---

The site's name, linking home, and its navigation, fixed to the top of the screen. Every layout has it through
the frame they share (`partials/base`), which passes on the page's `site` and `nav`.

**Fixed**: the header is `--site-header-size` tall (`styles/base/tokens.scss`). Pages leave that much room above
their content, and the page's scroll padding is the same, so a link to a heading or a focused element never ends
up under the header.

**The links** are the site's `main` navigation (`storefront.site.navigations.main` in the site's config: pages,
and links such as the style guide's), or every page where there is none. They sit in a row where the site's name
and every link fit on one line, and behind a **Menu** button where they don't: the list is a native popover the
button opens, which closes on a click outside or Escape. There's no breakpoint; the `site-header` script measures
the row (and is classic, right after the header, so the first paint already has the right layout). Without the
script, the menu is what shows, and works.

**The current page** is marked `aria-current="page"` and shown with a heavier underline, not by colour alone.

In the deck (`layouts/deck`) it sits over the waves on the same glass as the cards, above the paper that covers
them.
