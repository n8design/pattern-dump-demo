---
title: Type scale
---

Every size of text in the style guide, from fine print to display. Make the preview narrower or wider to
see the scale move.

**How it works.** The scale is fluid and modular. On a 360px screen each step is 1.2 times the one below
it (a minor third), so headlines don't crowd a narrow column. On a 1440px screen the ratio is 1.333 (a
perfect fourth), so the hierarchy opens up as the page does. Body text grows from 17px to 20px over the
same range. Between the two widths every step grows smoothly; outside them it stays put. Steps below body
text keep the gentle ratio at both ends, so captions and fine print never get smaller on a wide screen.

**Accessibility.** Every step is set in `rem`, so the reader's own browser font size scales it. The largest
size of a step is never more than 2.5 times its smallest, so browser zoom can still take text to 200%. The
build stops if a change to the scale breaks that rule.

**Where it lives.** The numbers are in `styles/base/_scale.scss`, and the tokens (`--step--2` to
`--step-6`, fonts, leading, tracking, `--measure`) in `styles/base/tokens.scss`. Elements and the editorial
roles that use them are in `styles/base/typography.scss`; `foundations/article` shows the roles together.
