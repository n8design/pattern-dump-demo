---
title: Page
preview: full
---

A page of text over the Sunset waves (`components/waves`), on the same glass as the deck's cards: an eyebrow, the
headline and a standfirst from the page's frontmatter, then the page's markdown. A page uses it with
`layout: page` in its frontmatter.

**Arriving from another page**, the article slides out from under the paper as one piece, like the deck's
cards (`components/waves`); on narrow screens it fades in.

**The text** keeps a readable line length (`--measure`) inside the glass. Headings, lists, quotations, code and
links follow the type scale, in the deck's cream with apricot accents.

**Images** in the markdown are served as WebP variants at the widths the layout declares (`x-pd-prose-images`
in its schema), each with its width and height. An emphasised line right under an image, in the same paragraph,
is its caption:

```md
![What the image shows](/assets/images/placeholder-16x9.png)
*The caption.*
```

The sample uses lorem ipsum and the placeholders in `media/images`.
