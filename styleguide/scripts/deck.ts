// The deck's cover link (layouts/deck): "Learn more" scrolls to the first slide at the reveal's pace.
//
// Without this script the link is an ordinary link to the slide's headline. With it, a click (or Enter) scrolls to
// where the slide's card rests, out from under the paper, over --learn-more-duration (tokens.scss) with an
// ease-in-out, so the card slides out at its own pace rather than in the browser's quick default. Any wheel,
// touch, pointer or key input during the scroll stops it and leaves the page where it is. Once there, the slide's
// headline takes the focus (without scrolling again) and the address gets its anchor. With reduced motion the page
// jumps there directly. One slide only: nothing plays on by itself.

const link = document.querySelector<HTMLAnchorElement>("a[data-deck-more]");

// Once per page: the workbench preview loads this script for the layout and again through its script tag.
if (link && link.dataset.deckMore !== "on") {
  link.dataset.deckMore = "on";
  link.addEventListener("click", follow);
}

const STOPPERS = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
let running: (() => void) | undefined;

function follow(event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = decodeURIComponent(link!.hash.slice(1));
  const target = anchor ? document.getElementById(anchor) : null;
  if (!target) return;
  event.preventDefault();
  running?.();

  const html = document.documentElement;
  const max = html.scrollHeight - innerHeight;
  const to = Math.min(max, Math.max(0, restingPlace(target)));
  const from = scrollY;
  const land = () => {
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    if (location.hash !== `#${anchor}`) history.pushState(null, "", `#${anchor}`);
  };

  if (matchMedia("(prefers-reduced-motion: reduce)").matches || from === to) {
    scrollTo({ top: to, behavior: "instant" });
    land();
    return;
  }

  // While it scrolls, snapping is held off (it would pull each step to the nearest card) and any input stops it.
  const snap = html.style.scrollSnapType;
  html.style.scrollSnapType = "none";
  const duration = durationOf(getComputedStyle(html).getPropertyValue("--learn-more-duration"));
  const start = performance.now();
  let frame = 0;
  const end = (arrived: boolean) => {
    cancelAnimationFrame(frame);
    STOPPERS.forEach((type) => removeEventListener(type, stop, true));
    html.style.scrollSnapType = snap;
    running = undefined;
    if (arrived) land();
  };
  const stop = () => end(false);
  running = stop;
  STOPPERS.forEach((type) => addEventListener(type, stop, { capture: true, passive: true }));

  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    scrollTo({ top: from + (to - from) * easeInOut(t), behavior: "instant" });
    if (t < 1) frame = requestAnimationFrame(step);
    else end(true);
  };
  frame = requestAnimationFrame(step);
}

/** Where the target's slide rests. In the reveal the waves script records it on the section (where its card is
 *  out from under the paper); otherwise it is where the card sits in the middle of the screen, below the header. */
function restingPlace(target: HTMLElement): number {
  const section = target.closest<HTMLElement>("section");
  const recorded = Number(section?.dataset.wavesRest);
  if (section?.dataset.wavesRest && Number.isFinite(recorded)) return recorded;
  const card = target.closest<HTMLElement>("[data-waves-card]") ?? target;
  const r = card.getBoundingClientRect();
  const header = parseFloat(getComputedStyle(document.documentElement).scrollPaddingBlockStart) || 0;
  return scrollY + r.top + r.height / 2 - (header + (innerHeight - header) / 2);
}

/** A CSS time ("1.8s", "1800ms") in milliseconds; 1.8 s if it can't be read. */
function durationOf(css: string): number {
  const m = /^\s*([\d.]+)\s*(ms|s)\s*$/.exec(css);
  if (!m) return 1800;
  return Number(m[1]) * (m[2] === "s" ? 1000 : 1);
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}
