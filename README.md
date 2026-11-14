# Pattern Dump demo

The Pattern Dump demo site, built with `pattern-dump` as published on npm (0.4.0). An npm workspaces monorepo
with two projects:

- `styleguide/`: the style guide. Patterns (components, and the skin's layouts and partials), styles, packaged
  as a pattern package (`patternDump` in its `package.json`).
- `site/`: content only: pages, and the articles in `pages/articles/`. No patterns or styles of its own; it uses the style guide
  through `"@pattern-dump-demo/styleguide": "file:../styleguide"`.

```bash
npm install                # once, at the root: one lockfile, one node_modules
npm run dev:styleguide     # the style guide's own workbench: http://localhost:4300/
npm run dev:site           # the site: http://live.localhost:4000/, its workbench: http://pd.localhost:4000/
npm run build              # writes site/dist/site and site/dist/workbench, checked in Chromium too
npm run pages              # both builds, put together in _site/ as published
npm run waves-svg          # after a change to components/waves-art: rewrites media/images/waves*.svg
```

Edits in `styleguide/` reload both servers.
