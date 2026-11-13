import { defineConfig } from "pattern-dump";

// Content only: no patterns, skin or styles of its own. All of them come from the style guide
// package (../styleguide, linked as a file: dependency).
export default defineConfig({
  outDir: "./dist/workbench",
  packages: ["@pattern-dump-demo/styleguide"],
  // The site's own images, served at /assets/content/. The storefront's image pipeline only takes images from the
  // project's own assets, not from a package's (pattern-dump 0.3.0, see DEMO-GAPS).
  assets: { strategy: "central", dir: ["./media/content"] },
  storefront: {
    pagesDir: "./pages",
    outDir: "./dist/site",
    workbenchUrl: "/workbench/",
    site: {
      title: "Pattern Dump demo",
      // The footer's links (components/site-footer in the style guide).
      footer: {
        project: { title: "Pattern Dump", href: "https://github.com/n8design/pattern-dump" },
        author: { name: "Stefan Bauer", href: "https://github.com/StfBauer" },
      },
    },
  },
  build: { basePath: "/workbench/" },
});
