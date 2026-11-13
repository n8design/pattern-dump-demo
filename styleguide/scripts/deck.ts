// The deck's cover link (layouts/deck): "Learn more" takes the reader through every card, at reading pace.
//
// Without this script the link is an ordinary link to the first slide's headline. With it, a click (or Enter)
// starts a tour: the page scrolls to where the first slide's card rests, out from under the paper, over
// --learn-more-duration (tokens.scss) with an ease-in-out, so the card slides out at its own pace. Once there, the
// tour waits as long as reading the card takes, at --reading-speed words a minute, before it moves on to the next
// card. It ends on the last card. While it plays, a "Stop tour" button shows below the header; it, Escape, and any
// wheel, touch, pointer or key input stop the tour and leave the page where it is, and so does leaving the tab.
// The focus stays put during the tour, so a screen reader isn't interrupted at every card: when the tour ends or
// stops, the headline of the card it last reached takes the focus (without scrolling). With reduced motion the
// page jumps to the first slide and nothing moves on by itself.

const link = document.querySelector<HTMLAnchorElement>("a[data-deck-more]");

// Once per page: the workbench preview loads this script for the layout and again through its script tag.
if (link && link.dataset.deckMore !== "on") {
  link.dataset.deckMore = "on";
  link.addEventListener("click", follow);
}

const STOPPERS = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
let running: AbortController | undefined;

function follow(event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = decodeURIComponent(link!.hash.slice(1));
  const first = anchor ? document.getElementById(anchor) : null;
  if (!first) return;
  event.preventDefault();
  running?.abort();

  // The tour's stops: the first slide's card and every card after it, each by its headline.
  const cards = [...document.querySelectorAll<HTMLElement>("[data-waves-card]")];
  const from = cards.findIndex((c) => c.contains(first));
  const stops = from < 0 ? [first] : [first, ...cards.slice(from + 1).map((c) => c.querySelector<HTMLElement>("h1, h2, h3") ?? c)];

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    scrollTo({ top: restingPlace(first), behavior: "instant" });
    land(first, anchor);
    return;
  }
  tour(stops, anchor);
}

async function tour(stops: HTMLElement[], anchor: string): Promise<void> {
  // While it plays, snapping is held off (it would pull each step to the nearest card) and any input stops it.
  const html = document.documentElement;
  html.style.scrollSnapType = "none";
  const control = new AbortController();
  running = control;
  const stop = () => control.abort();
  STOPPERS.forEach((type) => addEventListener(type, stop, { capture: true, passive: true, signal: control.signal }));
  document.addEventListener("visibilitychange", stop, { signal: control.signal });
  const button = stopButton(stop, control.signal);
  const settings = getComputedStyle(html);
  const duration = durationOf(settings.getPropertyValue("--learn-more-duration"));
  const wpm = Number.parseFloat(settings.getPropertyValue("--reading-speed")) || 238;

  let reached: HTMLElement | undefined;
  try {
    for (const [i, target] of stops.entries()) {
      await glide(restingPlace(target), duration, control.signal);
      reached = target;
      if (i === 0 && location.hash !== `#${anchor}`) history.pushState(null, "", `#${anchor}`);
      if (i < stops.length - 1) await wait(readingTime(target, wpm), control.signal);
    }
  } catch {
    // Stopped: the page stays where the reader took over.
  } finally {
    control.abort();
    button.remove();
    // A tour started in the meantime holds snapping off itself and keeps the focus where it is.
    if (running === control) {
      running = undefined;
      html.style.removeProperty("scroll-snap-type");
      land(reached ?? stops[0], "");
    }
  }
}

/** The "Stop tour" button, after the header in the page's order and fixed below it on screen, while a tour plays. */
function stopButton(stop: () => void, signal: AbortSignal): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "deck-tour-stop";
  button.textContent = "Stop tour";
  button.addEventListener("click", stop);
  // Escape stops the tour anyway (any key does); said here as well, so it holds should that ever change.
  addEventListener("keydown", (e) => { if (e.key === "Escape") stop(); }, { capture: true, signal });
  const header = document.querySelector(".site-header");
  if (header) header.after(button);
  else document.body.prepend(button);
  return button;
}

/** The card's headline takes the focus without scrolling again; the first stop also puts its anchor in the address. */
function land(target: HTMLElement, anchor: string): void {
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
  if (anchor && location.hash !== `#${anchor}`) history.pushState(null, "", `#${anchor}`);
}

/** Scrolls to `to` over `duration` with an ease-in-out; rejects as soon as the tour is stopped. */
function glide(to: number, duration: number, signal: AbortSignal): Promise<void> {
  const max = document.documentElement.scrollHeight - innerHeight;
  const end = Math.min(max, Math.max(0, to));
  const from = scrollY;
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    if (from === end) return resolve();
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / duration);
      scrollTo({ top: from + (end - from) * easeInOut(t), behavior: "instant" });
      if (t < 1) frame = requestAnimationFrame(step);
      else resolve();
    });
    signal.addEventListener("abort", () => { cancelAnimationFrame(frame); reject(signal.reason); }, { once: true });
  });
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
  });
}

/** How long reading a card takes: a second to take it in, then its words at the reading speed. */
function readingTime(target: HTMLElement, wpm: number): number {
  const card = target.closest<HTMLElement>("[data-waves-card]") ?? target;
  const words = (card.textContent ?? "").trim().split(/\s+/).filter(Boolean).length;
  return 1000 + (words / wpm) * 60_000;
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
