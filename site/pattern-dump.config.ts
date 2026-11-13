import { defineConfig } from "pattern-dump";

// Content only: no patterns, skin or styles of its own. All of them come from the style guide
// package (../styleguide, linked as a file: dependency).
export default defineConfig({
  outDir: "./dist/workbench",
  packages: ["@pattern-dump-demo/styleguide"],
  storefront: {
    pagesDir: "./pages",
    outDir: "./dist/site",
    workbenchUrl: "/workbench/",
    site: { title: "Pattern Dump demo" },
  },
  build: { basePath: "/workbench/" },
});
