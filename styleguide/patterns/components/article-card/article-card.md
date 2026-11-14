---
title: Article card
---

One article in a listing (`layouts/listing`): its title, linking to it, its date, a teaser of three lines at
most, and its tags. The whole card is the link's target area, but only the title is a link, so a screen reader
reads one link per article. The listing passes each entry of `page.children` as it is; the `example` variant shows
one filled in.

**The teaser** is the article's `description`, or its first paragraph. It is never shortened in the data: the card
shows three lines and cuts off the rest.
