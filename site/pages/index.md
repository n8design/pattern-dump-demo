---
title: Pattern Dump
layout: deck
eyebrow: A tour in eleven slides
description: How Pattern Dump turns components and markdown pages into a checked website.
---

<pd-components-slide eyebrow="01 · The problem" heading="Design systems and websites drift apart">
The design system lives in one tool, the website in another. Components get copied, renamed and half
updated. Nobody can say which page still uses the old card, or whether the values it was given still fit.
</pd-components-slide>

<pd-components-slide eyebrow="02 · One component, one schema" heading="A component is a folder">
```text
patterns/components/card/
  card.hbs            the markup, in Handlebars
  card.json           sample data
  card~wide.json      a variant
  card.schema.json    what the component accepts
  card.md             its documentation
styles/components/card.scss
```

The schema is the contract: every value the component takes, its type, and what is required. The
workbench shows it, the checks test data against it, and pages that place the component are held to it.
</pd-components-slide>

<pd-components-slide eyebrow="03 · The workbench" heading="Every component, in every state">
`pd dev` opens the workbench: each component with its variants, its docs and its source, in every theme.
Save a template or a stylesheet, and the open preview updates in place.
</pd-components-slide>

<pd-components-slide eyebrow="04 · Docs with live examples" heading="Documentation that can't go stale">
A component's docs are markdown. A `pattern` fence shows the real component, rendered from the same
template the website uses; on a website page it sits in a frame of its own, styled only by its own CSS.
There are no screenshots to keep up to date.
</pd-components-slide>

<pd-components-slide eyebrow="05 · The storefront" heading="The website is markdown, too">
Every markdown file in `pages/` is a page, at the address its path names. Its look is a layout from the
design system, and its frontmatter is checked against that layout's schema.

A page places a component with values of its own, written as a `pd-` tag. Every slide on this page is one.
</pd-components-slide>

<pd-components-slide eyebrow="06 · The process" heading="From a save to a page">
1. You save a template, a stylesheet or a page.
2. `pd dev` sees the change and works out what it touches.
3. It checks the values against their schemas.
4. The open workbench and website update, with no manual reload.
5. `pd build` writes the website and the workbench as plain files, for any static host.
</pd-components-slide>

<pd-components-slide eyebrow="07 · Checks" heading="A broken page doesn't ship">
Before `pd build` writes anything, it checks:

- every value against its component's schema, naming the file, line and column;
- every link, anchor and image on every page;
- that every image has its width and height, and every raster image its WebP variants;
- accessibility with axe: one `<main>`, one `<h1>`, alt text, names, the page's language.

One error, and nothing is written.
</pd-components-slide>

<pd-components-slide eyebrow="08 · This page itself" heading="You are looking at the demo">
This website is two projects. `styleguide/` holds the components, the layout and the styles, as a pattern
package. `site/` holds only pages, and uses the style guide through a `file:` dependency.

Each slide here is one component, `components/slide`, from the style guide. Change it there, and this page
changes with it.
</pd-components-slide>

<pd-components-slide eyebrow="09 · Getting started" heading="Two commands">
```bash
npx pattern-dump init --storefront
npm run dev
```

`pd dev` serves the website and its workbench side by side, with a starter skin and two pages to change.
</pd-components-slide>

<pd-components-slide eyebrow="10 · Lineage" heading="Ten years of the same idea">
PatternLab made pattern libraries a habit. In 2016, generator-simplestyle kept Handlebars patterns in
atomic folders, watched by Gulp, for SharePoint and Office 365. Pattern Dump keeps the idea and adds what
was missing: schemas, checks, and a website built from the same components.
</pd-components-slide>

<pd-components-slide eyebrow="11 · Try it" heading="Start one, then break it">
Start a project, then break a `pd-` tag on purpose: give it a value its schema doesn't allow, and save.
The page tells you what is wrong, and where.

[Pattern Dump on GitHub](https://github.com/n8design/pattern-dump)
</pd-components-slide>
