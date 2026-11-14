// Puts the two builds together as one GitHub Pages artifact in _site/: the website (site/dist/site) at the
// project page's path, and the style guide's own workbench (styleguide/dist) under styleguide/. Both are built for
// their addresses already (storefront.url and --base), so this only copies them.
// Run by `npm run pages`, locally and in .github/workflows/pages.yml.
import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const site = "site/dist/site";
const styleguide = "styleguide/dist";
const out = "_site";
for (const dir of [site, styleguide]) {
  if (!existsSync(dir)) throw new Error(`${dir} is missing: build it first`);
}

rmSync(out, { recursive: true, force: true });
cpSync(site, out, { recursive: true });
cpSync(styleguide, join(out, "styleguide"), { recursive: true });
console.log(`${out}: the website, and the style guide under styleguide/`);
