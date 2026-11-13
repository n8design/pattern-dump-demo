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
    // The style guide's own workbench, published beside the site at /styleguide/ (see the root's "pages" script,
    // which also puts the published site's sub-path in front). The site's build also writes a workbench of its own
    // (dist/workbench, the same components from the package); it isn't published.
    workbenchUrl: "/styleguide/",
    site: {
      title: "Pattern Dump demo",
      // The header's links (components/site-header): the pages, then this site's style guide (workbenchUrl).
      navigations: {
        main: [
          { page: "index.md" },
          { page: "style-guides.md" },
          { href: "/styleguide/", label: "This style guide" },
        ],
      },
      // The footer's links (components/site-footer in the style guide).
      footer: {
        project: { title: "Pattern Dump", href: "https://github.com/n8design/pattern-dump" },
        author: { name: "Stefan Bauer", href: "https://github.com/StfBauer" },
      },
    },
  },
  // pd build requires the site's own workbench to be built for the same address as workbenchUrl, even though that
  // workbench isn't published.
  build: { basePath: "/styleguide/" },
});
