# Pattern Dump demo

The Pattern Dump demo site, built with `pattern-dump` as published on npm (0.3.0). Two projects:

- `styleguide/`: the style guide. Patterns (components, and the skin's layouts and partials), styles, packaged
  as a pattern package (`patternDump` in its `package.json`). `npm run dev` there opens its own workbench.
- `site/`: content only (pages, and images later). No patterns or styles of its own; it uses the style guide
  through `"@pattern-dump-demo/styleguide": "file:../styleguide"`. `npm run dev` there serves the site and a
  workbench; edits in `styleguide/` reload both. `npm run build` writes `site/dist/site` and
  `site/dist/workbench`.

Run `npm install` in `styleguide/` first, then in `site/`.
