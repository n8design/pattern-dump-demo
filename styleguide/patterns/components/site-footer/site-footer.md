---
title: Site footer
---

The end of every page: what the site is built with and who made it, each linking to GitHub. Every layout has it
through the frame they share (`partials/base`), after the page's content. The links come from the site's shared
values (`storefront.site.footer` in the site's config); a part that isn't given is left out.

In the deck (`layouts/deck`) it sits over the waves on the same glass as the header and the cards; where the
cards are revealed out of the paper, it stays on screen at the bottom while they come and go (sticky), and still
takes its own place at the very end. On articles and narrow screens it is an ordinary footer at the end of the
page.
