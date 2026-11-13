---
title: Slide
---

One idea on one screen: an eyebrow, a headline and its content, on a scrim that keeps the text legible over the
moving waves. The deck layout (`layouts/deck`) stacks slides one per screen; a page places each with values of
its own:

```md
<pd-components-slide eyebrow="02 · One component, one schema" heading="A component is a folder">
Content, in **markdown**.
</pd-components-slide>
```

**On scroll**, the panel fades in as the slide enters the screen, and the eyebrow, headline and content rise
into place one after the other. Each part follows its own position on the screen, so the order holds at any
height. Without scroll-driven animation support, or with reduced motion, everything is simply there.
