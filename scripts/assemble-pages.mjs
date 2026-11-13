// Puts the two builds together as one GitHub Pages artifact in _site/, published as a project page under a
// sub-path (the argument, such as /pattern-dump-demo/): the website at that path, the style guide's workbench
// under <path>styleguide/, and the files the site serves at its root (site/static: the favicon, which browsers ask
// for at <path>favicon.ico; Pattern Dump has no way to place files there or to link an icon from the head).
// Run by `npm run pages`, locally and in .github/workflows/pages.yml.
//
// pattern-dump 0.3.0 builds the website for the root of a host only (see DEMO-GAPS): its pages link
// root-relative, to /, /style-guides/, /_pd/… So here every root-relative href, src and srcset in the website's
// pages gets the sub-path in front. The style guide needs none of this: it is built for its address with --base.
// Because pd build's link check ran before this rewrite, the artifact is checked again at the end: every link,
// script, stylesheet and image on the website's pages that stays on this site must be a file in _site/.
//
// robots.txt: crawlers read it only at the root of a host (n8design.github.io/robots.txt), never under a project
// path, so the one pd build writes would be ignored here and is left out. What it did (keep the workbench's
// previews out of search engines) is done on the previews themselves, with a robots meta tag.
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const base = process.argv[2] ?? "/";
if (!/^\/([\w.-]+\/)*$/.test(base)) throw new Error(`the base path must look like /name/ (got ${base})`);

const site = "site/dist/site";
const styleguide = "styleguide/dist";
const out = "_site";
for (const dir of [site, styleguide]) {
  if (!existsSync(dir)) throw new Error(`${dir} is missing: build it first`);
}

const htmlFiles = (dir) =>
  readdirSync(dir, { recursive: true })
    .map((f) => join(dir, String(f)))
    .filter((f) => f.endsWith(".html") && statSync(f).isFile());

// A root-relative URL ("/x", not "//host/x") gets the base in front.
const prefix = (url) => (url.startsWith("/") && !url.startsWith("//") && !url.startsWith(base) ? base + url.slice(1) : url);

rmSync(out, { recursive: true, force: true });
cpSync(site, out, { recursive: true });
rmSync(join(out, "robots.txt"), { force: true });

let rewritten = 0;
if (base !== "/") {
  for (const file of htmlFiles(out)) {
    const html = readFileSync(file, "utf8")
      .replace(/\b(href|src)="([^"]*)"/g, (m, attr, url) => `${attr}="${prefix(url)}"`)
      .replace(/\bsrcset="([^"]*)"/g, (m, list) =>
        `srcset="${list.split(",").map((part) => part.trim().replace(/^\S+/, prefix)).join(", ")}"`);
    writeFileSync(file, html);
    rewritten++;
  }
}

cpSync(styleguide, join(out, "styleguide"), { recursive: true });
rmSync(join(out, "styleguide", "robots.txt"), { force: true });
let previews = 0;
for (const file of htmlFiles(join(out, "styleguide", "preview"))) {
  const html = readFileSync(file, "utf8");
  if (html.includes('name="robots"')) continue;
  writeFileSync(file, html.replace(/<head>/i, '<head>\n<meta name="robots" content="noindex">'));
  previews++;
}
cpSync("site/static", out, { recursive: true });

// The check: every same-site URL on the website's pages is a file in the artifact.
const missing = [];
let checked = 0;
for (const file of htmlFiles(out).filter((f) => !f.startsWith(join(out, "styleguide")))) {
  const html = readFileSync(file, "utf8");
  const urls = [...html.matchAll(/\b(?:href|src)="([^"]*)"/g)].map((m) => m[1]);
  for (const m of html.matchAll(/\bsrcset="([^"]*)"/g)) urls.push(...m[1].split(",").map((p) => p.trim().split(/\s+/)[0]));
  for (const url of urls) {
    if (!url.startsWith("/") || url.startsWith("//")) continue; // other sites, anchors, mail
    checked++;
    if (!url.startsWith(base)) { missing.push(`${relative(out, file)}: ${url} is outside ${base}`); continue; }
    let path = join(out, decodeURIComponent(url.slice(base.length).split(/[?#]/)[0]));
    if (existsSync(path) && statSync(path).isDirectory()) path = join(path, "index.html");
    if (!existsSync(path)) missing.push(`${relative(out, file)}: ${url} is not in the artifact`);
  }
}
if (missing.length) throw new Error(`broken links in ${out}:\n  ${missing.join("\n  ")}`);
console.log(`${out}: the website at ${base} (${rewritten} pages rewritten), the style guide at ${base}styleguide/ ` +
  `(${previews} previews kept out of search engines); ${checked} same-site URLs checked, none missing`);
