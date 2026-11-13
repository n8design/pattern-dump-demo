// The site header (components/site-header): its links in a row where the whole row fits, behind a "Menu" button
// where it doesn't.
//
// The links are one list in one <nav>. Collapsed (the markup's state, and what shows without this script) the list
// is a native popover that the Menu button opens and closes, light dismiss and Escape included. Where the title and
// every link fit on one line, this script marks the header `is-wide`: the button goes, and the list sits in the row.
// There's no breakpoint: the row is measured, so another link, a longer title or larger text moves the point by
// itself. The script is classic and runs right after the header is parsed, so the first paint already has the right
// layout. Following modern-web-guidance's navbar guide.

const header = document.querySelector<HTMLElement>(".site-header");
const list = header?.querySelector<HTMLElement>(".site-header-list");

// Once per page: the workbench preview loads this script for the component and again through its script tag.
if (header && list && header.dataset.siteHeader !== "on") {
  header.dataset.siteHeader = "on";
  let measuredAt = 0;

  const update = () => {
    const width = header.clientWidth;
    const wide = header.classList.contains("is-wide");
    // Collapsed, measure again only once the header has grown; switching to the row just to measure on every
    // narrowing would make the layout thrash.
    if (!wide && width <= measuredAt) return;
    measuredAt = width;
    const open = list.matches(":popover-open");
    header.classList.add("is-measuring", "is-wide");
    list.removeAttribute("popover");
    const fits = header.scrollWidth <= header.clientWidth;
    if (!fits) {
      header.classList.remove("is-wide");
      list.setAttribute("popover", "auto");
      if (open) list.showPopover();
    }
    requestAnimationFrame(() => header.classList.remove("is-measuring"));
  };

  update();
  const observer = new ResizeObserver(update);
  observer.observe(header);
  observer.observe(list);
}
