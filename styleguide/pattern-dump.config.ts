import type { PatternDumpConfigInput } from "pattern-dump";

// The style guide as a project of its own: its own `pd dev` and workbench. Its folders (patterns, styles and the base
// layer, data, scripts, images) are described once, in package.json's "patternDump" field, which both this
// workbench and the site using the package read.
//
// A plain object, not defineConfig(): pattern-dump 0.4.0's defineConfig fills in the default ./src/patterns and
// ./src/styles, which then clash with package.json's folders.
export default {
  outDir: "./dist",
  shell: {
    brand: { title: "Pattern Dump demo: style guide" },
  },
} satisfies PatternDumpConfigInput;
