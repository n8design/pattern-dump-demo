import { defineConfig } from "pattern-dump";

// The style guide as a project of its own: its own `pd dev` and workbench.
// The same folders are described a second time in package.json ("patternDump"), which is what the
// site reads when it uses this folder as a pattern package. Keep the two in step.
export default defineConfig({
  patternsDir: "./patterns",
  outDir: "./dist",
  styles: { strategy: "parallel", dir: "./styles" },
  documentBase: ["base"],
  dataDir: "./data",
  // Images for pages and samples, served at /assets/images/ (the folder's name), as the package serves it too.
  assets: { strategy: "central", dir: ["./media/images"] },
  scriptsDir: "./scripts",
  shell: {
    brand: { title: "Pattern Dump demo: style guide" },
  },
});
