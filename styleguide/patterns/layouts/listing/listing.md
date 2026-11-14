---
title: Listing
preview: full
---

The page of a folder that lists its pages: the articles. A folder's `index.md` uses it with `layout: listing`, and
`sort: date` to put the newest first. On the same glass as a page (`layouts/page`): an eyebrow, the headline, a
standfirst and the `index.md`'s own text, then one article card (`components/article-card`) per page in the folder.

Nothing to keep up to date by hand: a markdown file added to the folder, with a `date`, shows up in the list.
