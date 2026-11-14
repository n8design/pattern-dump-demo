import { defineConfig } from "pattern-dump";

// Content only: no patterns, skin or styles of its own. All of them come from the style guide
// package (../styleguide, linked as a file: dependency), images included (/assets/images/).
export default defineConfig({
  outDir: "./dist/workbench",
  packages: ["@pattern-dump-demo/styleguide"],
  storefront: {
    pagesDir: "./pages",
    outDir: "./dist/site",
    // Published as a GitHub project page, under /pattern-dump-demo/. Pages link from the site's root ("/articles/");
    // Pattern Dump puts the path in front of every link.
    url: "https://lab.n8d.studio/pattern-dump-demo/",
    // The style guide's own workbench, published beside the site (see the root's "pages" script). The site's build
    // also writes a workbench of its own (dist/workbench, the same components from the package); it isn't published.
    workbenchUrl: "/pattern-dump-demo/styleguide/",
    // The link-preview image (og:image) of every page without an image of its own: the style guide's
    // components/og-image, screenshotted.
    image: "/assets/images/og-image.png",
    site: {
      title: "Pattern Dump demo",
      // The header's links (components/site-header): the pages, then this site's style guide (workbenchUrl).
      navigations: {
        main: [
          { page: "index.md" },
          { page: "articles/index.md" },
          { href: "/pattern-dump-demo/styleguide/", label: "This style guide" },
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
  build: { basePath: "/pattern-dump-demo/styleguide/" },
});
