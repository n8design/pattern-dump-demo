---
title: Why style guides matter
layout: page
eyebrow: Article
description: A living style guide keeps a design system and the website built from it in step. What the numbers say, where style guides break down, and what Pattern Dump does about it.
---

A style guide used to be a document: a PDF of colours, type and logos, written once and slowly forgotten. A
living style guide is different. It shows the real components, built from the same code the product uses, so
it can't drift away from what users actually see. That difference is what makes it worth the effort.

![Placeholder image, to be replaced: a component shown in the workbench with its variants](/assets/content/placeholder-16x9.png)
*Placeholder: the workbench, with a component and its variants.*

## Faster work, measured

In 2019, Figma's data science team measured how much a design system saves. Designers each did two tasks,
one with a design system and one with only older design files, in alternating order. With the design system
they finished **34 % faster** ([Figma, 2019](https://www.figma.com/blog/measuring-the-value-of-design-systems/)).
It is a single in-house study, and the post doesn't say how many designers took part, but it measured the
same people with and without a system, which is more than most claims rest on.

## Accessibility, fixed once

The [WebAIM Million](https://webaim.org/projects/million/) tests the home pages of the top one million
websites every year. In its 2026 report, **95.9 %** of them had detectable WCAG 2 failures, with **56.1**
errors per page on average. The most common were low-contrast text (83.9 % of pages), images without
alternative text (53.1 %), form inputs without labels (51 %) and empty links (46.3 %).

Almost all of these live in shared parts: a button, a form field, a card. Fix the component in the style
guide, and every page that uses it is fixed at the same time. Fix it on one page, and the next copy of it
still has the problem.

## Where style guides break down

A style guide only helps while it stays true, and that takes care. In Sparkbox's
[2020 Design Systems Survey](https://designsystemssurvey.seesparkbox.com/2020), only 44 % of teams with a
design system younger than a year had a process for maintaining it, against 77 % of those whose system was a
year or older. In the [2022 survey](https://designsystemssurvey.seesparkbox.com/2022), only 16 % of those who
answered the question said they track metrics for their system.

The common failure is drift: the website copies a component, changes it a little, and from then on two
versions exist. Nobody can say which pages still use the old one, or whether the values given to it still
fit.

## What Pattern Dump does

Pattern Dump builds on an idea that [Pattern Lab](https://patternlab.io/) made common, and that Brad Frost
described in [*Atomic Design*](https://atomicdesign.bradfrost.com/) (2016): build the interface from small,
documented components, and keep them in one place. It adds what keeps such a place honest.

- **A contract per component.** Each component is a folder: its template, sample data, variants, docs and a
  schema of the values it accepts. The workbench shows every component and variant, in every theme, and
  updates the open preview when a file is saved.
- **Docs that can't go stale.** A component's docs show the live component, rendered from the same template
  the website uses, instead of screenshots.
- **The website from the same components.** Its pages are markdown. A page places a component with values of
  its own, and those values are checked against the component's schema, with the file, line and column of
  any mistake. A page's frontmatter is checked against its layout's schema too.
- **A build that stops on errors.** Before `pd build` writes anything, it checks every link and anchor on
  every page, that every image has its width and height and its WebP variants, and accessibility with axe:
  one `<main>`, one `<h1>`, alternative text, accessible names, the page's language. One error, and nothing
  is written.
- **One design system, many sites.** A style guide can be published as a package and used by any number of
  sites. This site is one: its pages live in one project, its components in another.

![Placeholder image, to be replaced: a page that fails the build, with the file, line and column of the error](/assets/content/placeholder-4x3.png)
*Placeholder: a value that doesn't fit a component's schema, and where Pattern Dump says it is.*

One limit, honestly stated: the build's accessibility check runs without a browser, so it can't measure
colour contrast, the most common failure on the WebAIM list. The workbench checks contrast for each
component on screen.

## Sources

- Figma, [Measuring the value of design systems](https://www.figma.com/blog/measuring-the-value-of-design-systems/), December 2019.
- WebAIM, [The WebAIM Million](https://webaim.org/projects/million/), 2026 report.
- Sparkbox, Design Systems Survey, [2020](https://designsystemssurvey.seesparkbox.com/2020) and [2022](https://designsystemssurvey.seesparkbox.com/2022).
- Brad Frost, [*Atomic Design*](https://atomicdesign.bradfrost.com/), 2016.
