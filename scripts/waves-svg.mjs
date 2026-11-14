// Writes the Sunset waves as two files the pages show as their background (components/waves): styleguide/media/
// images/waves.svg, the artwork as drawn, and waves-fanned.svg, its layers fanned out as the waves script starts at
// the top of a page. Both are the component components/waves-art, as the style guide's own build renders it (its
// preview, and its `fanned` variant), with that component's compiled CSS put inside, so each file looks the same as
// an image as it does inline. Run after a change to waves-art, its styles or data/sunset-waves.json:
//   npm run waves-svg
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const out = mkdtempSync(join(tmpdir(), "waves-svg-"));
try {
  const built = spawnSync("npx", ["pd", "build", "--out", out], { cwd: "styleguide", encoding: "utf8" });
  if (built.status !== 0) throw new Error(`pd build failed:\n${built.stdout}${built.stderr}`);

  const css = readFileSync(join(out, "_pd/components/components/waves-art.css"), "utf8")
    .replace(/\/\*#\s*sourceMappingURL=[^*]*\*\//g, "").trim();
  if (!css.includes(".waves-layer")) throw new Error("waves-art.css has no layer rules");

  // The preview and its variant, as pd build writes them: preview/components/waves-art/index.html and ~fanned.html.
  const dir = join(out, "preview/components/waves-art");
  const previews = readdirSync(dir);
  for (const [page, file] of [["index.html", "waves.svg"], ["~fanned.html", "waves-fanned.svg"]]) {
    if (!previews.includes(page)) throw new Error(`no preview ${page} for waves-art (found: ${previews.join(", ")})`);
    const html = readFileSync(join(dir, page), "utf8");
    const svg = /<svg [^>]*class="waves-svg[^"]*"[\s\S]*?<\/svg>/.exec(html)?.[0];
    if (!svg) throw new Error(`no artwork in the waves-art preview ${page}`);
    const text = svg
      .replace(/>/, `><style>${css.replace(/\s*\n\s*/g, " ")}</style>`) // after the opening tag
      .replace(/\n\s*/g, "\n");
    writeFileSync(join("styleguide/media/images", file), `<?xml version="1.0" encoding="UTF-8"?>\n${text}\n`);
    console.log(`styleguide/media/images/${file}: ${text.length} bytes`);
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}
