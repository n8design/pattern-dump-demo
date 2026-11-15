import { defineConfig } from "pattern-dump";

// The style guide as a project of its own: its own `pd dev` and workbench. Its folders (patterns, styles and the base
// layer, data, scripts, images) are described once, in package.json's "patternDump" field, which both this
// workbench and the site using the package read.
export default defineConfig({
  outDir: "./dist",
  shell: {
    brand: { title: "Pattern Dump demo: style guide" },
  },
});
