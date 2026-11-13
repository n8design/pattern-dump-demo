// The Sunset waves, moving: every layer of the waves component (components/waves) drawn with WebGL, each layer
// drifting on its own as the page scrolls, and the deck's cards revealed out of the paper.
//
// Everything is read from the SVG the template wrote: the layers' shapes, their colours, the ground gradient and
// Illustrator's shadow recipe (the shifted, tinted copies multiplied over what lies behind). So the canvas draws
// the same picture as the SVG, and the SVG stays the picture wherever this script doesn't run: without WebGL 2,
// without workers, or with reduced motion.
//
// How it draws: each layer's shape becomes a distance map (how far every point is from the layer's edge, worked
// out once, in a worker). Per pixel, the shader walks the layers from front to back: a layer that covers the
// pixel gives its colour, and each layer in front whose hole the pixel lies in darkens it the way its copies
// would.
//
// The reveal, on a page with cards (elements marked `data-waves-card`, each in its own section): the paper stays
// where it is and the cards move. Where every card can be tucked (see layout()), the script turns on
// `waves-reveal` on the root, and the deck's styles make every
// section four screens tall with its card sticky in the middle of the screen. Each card lies between two layers:
// on the highest layer whose paper still overlaps it where it rests, so every layer above that one is clear of it
// there. Tucked, the card is moved right, under the paper of those front layers, until only its left edge shows.
// As its section comes in, it slides out (translate only) to where it rests; as the section leaves, it slides back
// under. The front layers are drawn again over the card, clipped to it, so the part still under the paper stays
// under it; at rest none of them overlaps the card, so it lies on top with nothing to switch. Everything follows
// the scroll position: scrolling back plays it backwards.

const DRIFT = { x: 1.3, y: 0.2 }; // user units per layer, at the top of the page; nothing at the bottom
const DOMAIN = { x: -41, y: -9, w: 146, h: 62 }; // every point of a layer the screen can show, drift included
// The artwork's frames end just past the picture, in slanted straight edges (93 to 101 on the right, -70 to -78 on
// the left). A card tucked far right is tested against points out there, so the paper is taken to go on beyond
// them. The holes never reach past 81 on the right or -57 on the left.
const PAPER_RIGHT = 90, PAPER_LEFT = -65;
const TEXELS_PER_UNIT = 8;
const LUT_SIZE = 64;
const MAX_LAYERS = 30; // what the shader holds
const MAX_TUCK = 120; // user units: the furthest a card is moved to tuck it under the paper
const SHOW_EDGE = 0.1; // the share of a tucked card's width, from its left, that stays out from under the paper
const MIN_EDGE = 24; // CSS pixels: how much of a tucked card's edge must show on screen for the reveal to read
const REVEAL_FROM = "(min-width: 48rem)"; // narrower screens show too little of the artwork to tuck a card
// Around a card, the paper also covers its shadow: at least this many CSS pixels, and five units of the picture
// (the shadow reaches about four, tokens.scss).
const COVER_MARGIN = 120;
// Where the screen's middle is in a section (0 at its top, 1 at its bottom) when the card slides out and back.
// Sections are four screens tall; the card stays in the middle of the screen (sticky) from 0.125 to 1 minus its
// height over four screens, so to 0.8 at the least. Out over a long stretch, arriving before the middle; still
// while it is read; back under over a long stretch too, before it moves on with the page.
const OUT_FROM = 0.14, OUT_TO = 0.42, BACK_FROM = 0.54, BACK_TO = 0.78;

interface Copy { dx: number; dy: number; mix: number; opacity: number }
// depth: the layer the card lies on (-2 until measured); tuck: how far right, in CSS pixels, it moves to hide.
interface Card { el: HTMLElement; section: HTMLElement; depth: number; tuck: number }
type Point = { x: number; y: number };

const root = document.querySelector<HTMLElement>(".waves");
const svg = root?.querySelector<SVGSVGElement>(".waves-svg");
const motionOk = matchMedia("(prefers-reduced-motion: no-preference)");

// Once per page: the workbench preview loads this script for the component and again for the deck layout.
const first = root !== null && root.dataset.wavesScript === undefined;
if (root) root.dataset.wavesScript = "";

if (first && root && svg && motionOk.matches && typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined"
  && typeof ImageBitmapRenderingContext !== "undefined") {
  start(root, svg).catch(() => stop(root));
}

function stop(root: HTMLElement): void {
  root.classList.remove("waves-live");
  document.documentElement.classList.remove("waves-reveal");
  root.querySelector(".waves-canvas")?.remove();
  document.querySelector(".waves-over")?.remove();
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
// Coming out, the card moves most early on and settles slowly, like paper; it starts and stops without a jolt
// (zero speed at both ends). Going back is the same movement played backwards, so scrolling up retraces it.
const settle = (t: number) => { const e = 1 - (1 - clamp01(t)) ** 2; return e * e * (3 - 2 * e); };

async function start(root: HTMLElement, svg: SVGSVGElement): Promise<void> {
  const offscreen = new OffscreenCanvas(1, 1);
  const gl = offscreen.getContext("webgl2", { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: "low-power" });
  if (!gl) return;
  const wide = "drawingBufferColorSpace" in gl;
  if (wide) gl.drawingBufferColorSpace = "display-p3";
  const space: PredefinedColorSpace = wide ? "display-p3" : "srgb";

  // What the SVG holds.
  const paths = [...svg.querySelectorAll<SVGPathElement>("defs .waves-shape")];
  const shapes = paths.map((p) => p.getAttribute("d") ?? "");
  const layers = [...svg.querySelectorAll<SVGGElement>(".waves-layer")];
  const fills = layers.map((g) => readColour(getComputedStyle(g).getPropertyValue("--waves-colour"), space));
  const ground = [".waves-ground-from", ".waves-ground-to"].map((s) =>
    readColour(getComputedStyle(svg.querySelector(s)!).stopColor, space));
  const gradient = svg.querySelector("linearGradient")!;
  const g = (a: string) => Number(gradient.getAttribute(a));
  const copies: Copy[] = [...layers[0].querySelectorAll<SVGUseElement>(".waves-copy")].map((u) => {
    const m = /translate\(\s*([-\d.e]+)[\s,]+([-\d.e]+)/.exec(u.getAttribute("transform") ?? "");
    const cs = getComputedStyle(u);
    return { dx: Number(m?.[1] ?? 0), dy: Number(m?.[2] ?? 0), mix: parseFloat(cs.getPropertyValue("--mix")) / 100, opacity: Number(cs.opacity) };
  });
  const n = shapes.length;
  if (!n || n > MAX_LAYERS || n !== fills.length || !copies.length) return;

  // The copies lie along one line: the furthest is the shadow's full reach; each copy covers a point that the
  // layer covers when moved back by its share of the reach.
  const far = copies.reduce((a, c) => (Math.hypot(c.dx, c.dy) > Math.hypot(a.dx, a.dy) ? c : a));
  const reach = { x: -far.dx, y: -far.dy };
  const len = Math.hypot(reach.x, reach.y);
  const shares = copies.map((c) => Math.hypot(c.dx, c.dy) / len);
  const step = Math.min(...shares.slice(1).map((s, j) => Math.abs(s - shares[j])));

  const fields = await distanceFields(shapes);
  const program = build(gl);

  // The distance maps, one layer each.
  const tw = DOMAIN.w * TEXELS_PER_UNIT, th = DOMAIN.h * TEXELS_PER_UNIT;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, gl.createTexture());
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.R16F, tw, th, n);
  fields.forEach((f, i) => gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, tw, th, 1, gl.RED, gl.FLOAT, f));
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // The shadow of each layer as a table: how much its copies darken a point at a given share of the reach from
  // its edge (0 at the edge, 1 at the far end). As in the SVG, the copies (each white mixed with the layer's
  // colour) are stacked normally inside their group, and the group as a whole is multiplied over what's behind.
  const lut = new Uint8Array(LUT_SIZE * n * 4);
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < LUT_SIZE; i++) {
      const t = i / (LUT_SIZE - 1);
      const colour = [0, 0, 0]; // premultiplied
      let alpha = 0;
      copies.forEach((c, j) => {
        // Copy j covers points up to its share of the reach; soften its edge over the gap to the next copy.
        const a = c.opacity * Math.min(1, Math.max(0, (shares[j] - t) / step + 0.5));
        for (let ch = 0; ch < 3; ch++) colour[ch] = a * (1 - c.mix * (1 - fills[k][ch])) + (1 - a) * colour[ch];
        alpha = a + (1 - a) * alpha;
      });
      // Multiply with the group's own alpha: behind × (1 − alpha + colour).
      lut.set([...colour.map((v) => Math.round((1 - alpha + v) * 255)), 255], (k * LUT_SIZE + i) * 4);
    }
  }
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, LUT_SIZE, n, 0, gl.RGBA, gl.UNSIGNED_BYTE, lut);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const u = (name: string) => gl.getUniformLocation(program, name);
  gl.uniform1i(u("uFields"), 0);
  gl.uniform1i(u("uShadow"), 1);
  gl.uniform1i(u("uCount"), n);
  gl.uniform4f(u("uDomain"), DOMAIN.x, DOMAIN.y, DOMAIN.w, DOMAIN.h);
  gl.uniform2f(u("uReach"), reach.x, reach.y);
  gl.uniform3fv(u("uFill"), fills.flat());
  gl.uniform3fv(u("uGround"), ground.flat());
  gl.uniform4f(u("uGradient"), g("x1"), g("y1"), g("x2"), g("y2"));
  const uView = u("uView"), uOffset = u("uOffset"), uFront = u("uFront"), uCard = u("uCard"), uRadius = u("uRadius");
  gl.enable(gl.SCISSOR_TEST);

  // One context, two canvases: the picture behind the page, and the paper over the cards.
  const behind = document.createElement("canvas");
  behind.className = "waves-canvas";
  const behindCtx = behind.getContext("bitmaprenderer")!;
  root.append(behind);

  const cardEls = [...document.querySelectorAll<HTMLElement>("[data-waves-card]")];
  const canReveal = cardEls.length > 0;
  let reveal = false; // decided per screen size in layout(): only if every card can tuck
  let over: HTMLCanvasElement | undefined, overCtx: ImageBitmapRenderingContext | undefined;
  if (canReveal) {
    over = document.createElement("canvas");
    over.className = "waves-over";
    over.setAttribute("aria-hidden", "true");
    overCtx = over.getContext("bitmaprenderer")!;
    root.after(over);
  }

  // In user units (the viewBox's), from CSS pixels of the fixed, full-screen picture.
  const view = () => {
    const w = root.clientWidth, h = root.clientHeight, s = Math.max(w / 100, h / 50);
    return { w, h, s, ox: (w - 100 * s) / 2, oy: (h - 50 * s) / 2 };
  };
  const scrollMax = () => document.documentElement.scrollHeight - innerHeight;
  const progressAt = (y: number) => { const max = scrollMax(); return max > 0 ? Math.min(1, Math.max(0, y / max)) : 1; };
  const driftAt = (progress: number): Point[] =>
    Array.from({ length: n }, (_, k) => ({ x: (1 - progress) * k * DRIFT.x, y: (1 - progress) * k * DRIFT.y }));
  const covers = (k: number, x: number, y: number) =>
    x > PAPER_RIGHT || x < PAPER_LEFT || paths[k].isPointInFill(new DOMPoint(x, y));

  // The card where it rests (sticky, in the middle of the screen), as points across it in user units, each with its
  // share of the card's width from the left.
  function restingSpot(el: HTMLElement) {
    const v = view(), r = el.getBoundingClientRect();
    const tucked = parseFloat(el.style.getPropertyValue("--waves-tuck")) || 0;
    const left = (r.left - tucked - v.ox) / v.s, top = (innerHeight / 2 - r.height / 2 - v.oy) / v.s;
    const w = r.width / v.s, h = r.height / v.s;
    const points: (Point & { share: number })[] = [];
    for (let i = 0; i <= 12; i++) for (let j = 0; j <= 6; j++) points.push({ x: left + (w * i) / 12, y: top + (h * j) / 6, share: i / 12 });
    return { points, scale: v.s };
  }

  // Per card, worked out when it is first needed and kept for the screen size: the layer it lies on, and how far
  // it moves right to tuck under the paper. Both are checked over the stretch of its section where it moves or
  // rests, since the drift moves the paper a little meanwhile.
  let cards: Card[] = [];
  let laidOut = "";
  const sectionOf = (el: HTMLElement) => (el.closest("section") ?? el.parentElement) as HTMLElement;
  const driftIn = (section: HTMLElement, ats: number[]) => {
    const top = scrollY + section.getBoundingClientRect().top, height = section.offsetHeight;
    return ats.map((at) => driftAt(progressAt(top + at * height - innerHeight / 2)));
  };
  // Per screen size: the reveal is on only if every card can tuck under paper with its edge still on screen (a
  // narrow or tall screen shows too little of the artwork for some cards). Otherwise the deck stays as it is
  // without the script, so it never half works. The cards are measured with the reveal's layout in place.
  function layout(): void {
    if (!canReveal) return;
    const v = view();
    const key = `${v.w}x${v.h}`;
    if (key === laidOut) return;
    laidOut = key;
    const html = document.documentElement;
    cards = cardEls.map((el) => ({ el, section: sectionOf(el), depth: -2, tuck: 0 }));
    reveal = false;
    if (matchMedia(REVEAL_FROM).matches) {
      html.classList.add("waves-reveal");
      cardEls.forEach((el) => el.style.removeProperty("--waves-tuck"));
      reveal = cards.every((c) => {
        measure(c);
        const left = c.el.getBoundingClientRect().left;
        return c.depth < n - 1 && c.tuck > 0 && left + c.tuck <= innerWidth - MIN_EDGE;
      });
    }
    if (!reveal) {
      html.classList.remove("waves-reveal");
      cardEls.forEach((el) => el.style.removeProperty("--waves-tuck"));
    }
    if (over) over.hidden = !reveal;
  }
  function measure(c: Card): Card {
    if (c.depth > -2) return c;
    const spot = restingSpot(c.el);
    // The layer it lies on: the highest whose paper overlaps it anywhere while it rests.
    const resting = driftIn(c.section, [OUT_TO, 0.5, BACK_FROM]);
    c.depth = -1;
    for (let j = n - 1; j >= 0 && c.depth < 0; j--)
      if (resting.some((off) => spot.points.some((p) => covers(j, p.x - off[j].x, p.y - off[j].y)))) c.depth = j;
    // Tucked: moved right until the paper of the layers above covers all of it but its left edge, wherever it
    // tucks (as it comes in and as it leaves). A card that no paper can hide simply rests on top.
    const moving = driftIn(c.section, [OUT_FROM, BACK_TO]);
    const hidden = (t: number) => moving.every((off) => spot.points.every((p) => p.share < SHOW_EDGE ||
      Array.from({ length: n - 1 - c.depth }, (_, i) => c.depth + 1 + i).some((j) => covers(j, p.x + t - off[j].x, p.y - off[j].y))));
    let tuck = 0;
    if (c.depth < n - 1 && hidden(MAX_TUCK)) {
      let lo = 0, hi = MAX_TUCK;
      for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (hidden(mid)) hi = mid; else lo = mid; }
      tuck = hi;
    }
    c.tuck = tuck * spot.scale;
    return c;
  }

  let drawn = "";

  function draw(): void {
    // At most two device pixels per CSS pixel: the waves are soft, and it halves the work on 3× screens.
    const ratio = Math.min(devicePixelRatio, 2);
    const v = view();
    const w = Math.round(v.w * ratio), h = Math.round(v.h * ratio);
    const progress = progressAt(scrollY);
    const key = `${w}x${h}@${scrollY}`;
    if (key === drawn || !w || !h) return;
    drawn = key;
    if (offscreen.width !== w || offscreen.height !== h) { offscreen.width = w; offscreen.height = h; }

    const offsets = driftAt(progress);
    layout();
    if (reveal) {
      // Each card in a section on screen: out from under the paper once it rests, back under before it leaves.
      // The first card starts out and the last one stays out.
      // Every card is placed on every frame, so none is ever left where an earlier frame put it.
      cards.forEach((c, i) => {
        const r = c.section.getBoundingClientRect();
        const at = (innerHeight / 2 - r.top) / r.height;
        const coming = i === 0 ? 1 : settle((at - OUT_FROM) / (OUT_TO - OUT_FROM));
        const going = i === cards.length - 1 ? 1 : settle(1 - (at - BACK_FROM) / (BACK_TO - BACK_FROM));
        const out = Math.min(coming, going);
        c.el.style.setProperty("--waves-tuck", `${(measure(c).tuck * (1 - out)).toFixed(2)}px`);
      });
    }

    gl!.viewport(0, 0, w, h);
    gl!.uniform4f(uView, v.s * ratio, v.ox * ratio, v.oy * ratio, h);
    gl!.uniform2fv(uOffset, offsets.flatMap((o) => [o.x, o.y]));

    // Behind the page: the whole picture.
    gl!.scissor(0, 0, w, h);
    gl!.uniform1i(uFront, -1);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    behindCtx.transferFromImageBitmap(offscreen.transferToImageBitmap());
    if (!reveal) return;

    // Over the cards: the layers in front of each card's own layer, clipped to the card and its shadow. Where the
    // card has slid out from under them, they don't reach it, and nothing is drawn over it.
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    const margin = Math.max(COVER_MARGIN, 5 * v.s);
    for (const c of cards) {
      const r = c.el.getBoundingClientRect();
      if (c.depth < -1) continue;
      if (r.bottom < -margin || r.top > innerHeight + margin) continue;
      const x0 = Math.max(0, Math.floor((r.left - margin) * ratio));
      const y0 = Math.max(0, Math.floor((innerHeight - r.bottom - margin) * ratio));
      const x1 = Math.min(w, Math.ceil((r.right + margin) * ratio));
      const y1 = Math.min(h, Math.ceil((innerHeight - r.top + margin) * ratio));
      if (x1 <= x0 || y1 <= y0) continue;
      gl!.scissor(x0, y0, x1 - x0, y1 - y0);
      gl!.uniform1i(uFront, c.depth);
      gl!.uniform4f(uCard, r.left * ratio, r.top * ratio, r.right * ratio, r.bottom * ratio);
      gl!.uniform1f(uRadius, (parseFloat(getComputedStyle(c.el).borderTopLeftRadius) || 0) * ratio);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    }
    overCtx!.transferFromImageBitmap(offscreen.transferToImageBitmap());
  }

  let queued = false;
  const request = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; draw(); }); } };
  draw();
  root.classList.add("waves-live");
  addEventListener("scroll", request, { passive: true });
  addEventListener("resize", () => { drawn = ""; laidOut = ""; request(); });
  motionOk.addEventListener("change", () => { if (!motionOk.matches) stop(root); });
}

/** A CSS colour as 0–1 channel values in the canvas's colour space, read by painting one pixel. */
function readColour(css: string, space: PredefinedColorSpace): [number, number, number] {
  const ctx = new OffscreenCanvas(1, 1).getContext("2d", { colorSpace: space })!;
  ctx.fillStyle = css.trim();
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1, { colorSpace: space }).data;
  return [r / 255, g / 255, b / 255];
}

/** The distance maps, in a worker so the page stays responsive: per texel, the distance in user units to the
 *  layer's edge, positive where the layer covers, negative in its hole. */
function distanceFields(shapes: string[]): Promise<Float32Array[]> {
  const source = `(${worker.toString()})(${JSON.stringify({ domain: DOMAIN, texelsPerUnit: TEXELS_PER_UNIT })})`;
  const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
  const w = new Worker(url);
  URL.revokeObjectURL(url);
  return new Promise((resolve, reject) => {
    w.onmessage = (e: MessageEvent<Float32Array[]>) => { resolve(e.data); w.terminate(); };
    w.onerror = (e) => { reject(e); w.terminate(); };
    w.postMessage(shapes);
  });
}

// Runs in the worker: rasterise each shape, then two exact Euclidean distance transforms (to the inside and to
// the outside), seeded with each edge texel's coverage so the edge falls between texels where the shape puts it.
function worker(opts: { domain: { x: number; y: number; w: number; h: number }; texelsPerUnit: number }): void {
  const { domain, texelsPerUnit: s } = opts;
  const W = domain.w * s, H = domain.h * s;
  const INF = 1e20;
  const canvas = new OffscreenCanvas(W, H);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const f = new Float64Array(Math.max(W, H)), z = new Float64Array(Math.max(W, H) + 1);
  const v = new Int32Array(Math.max(W, H)), d = new Float64Array(Math.max(W, H));

  function edt1d(grid: Float64Array, offset: number, stride: number, length: number): void {
    for (let q = 0; q < length; q++) f[q] = grid[offset + q * stride];
    let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < length; q++) {
      let s2 = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s2 <= z[k]) { k--; s2 = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; z[k] = s2; z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < length; q++) {
      while (z[k + 1] < q) k++;
      d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
    }
    for (let q = 0; q < length; q++) grid[offset + q * stride] = d[q];
  }
  function edt(grid: Float64Array): void {
    for (let x = 0; x < W; x++) edt1d(grid, x, W, H);
    for (let y = 0; y < H; y++) edt1d(grid, y * W, 1, W);
  }

  self.onmessage = (e: MessageEvent<string[]>) => {
    const out: Float32Array[] = [];
    for (const shape of e.data) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.setTransform(s, 0, 0, s, -domain.x * s, -domain.y * s);
      ctx.fill(new Path2D(shape));
      const alpha = ctx.getImageData(0, 0, W, H).data;
      const toInside = new Float64Array(W * H), toOutside = new Float64Array(W * H);
      for (let i = 0; i < W * H; i++) {
        const a = alpha[i * 4 + 3] / 255;
        if (a >= 1) { toInside[i] = 0; toOutside[i] = INF; }
        else if (a <= 0) { toInside[i] = INF; toOutside[i] = 0; }
        else { toInside[i] = Math.max(0, 0.5 - a) ** 2; toOutside[i] = Math.max(0, a - 0.5) ** 2; }
      }
      edt(toInside); edt(toOutside);
      const field = new Float32Array(W * H);
      for (let i = 0; i < W * H; i++) field[i] = (Math.sqrt(toOutside[i]) - Math.sqrt(toInside[i])) / s;
      out.push(field);
    }
    (self as unknown as Worker).postMessage(out, out.map((a) => a.buffer));
  };
}

function build(gl: WebGL2RenderingContext): WebGLProgram {
  const vs = `#version 300 es
  void main() {
    vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
    gl_Position = vec4(p, 0.0, 1.0);
  }`;
  const fs = `#version 300 es
  precision highp float;
  precision highp sampler2DArray;
  uniform sampler2DArray uFields;
  uniform sampler2D uShadow;
  uniform int uCount;
  uniform vec4 uDomain;   // x, y, width, height of the distance maps, in user units
  uniform vec4 uView;     // pixels per unit, x and y offset of the viewBox, canvas height
  uniform vec2 uReach;    // the shadow's full reach
  uniform vec2 uOffset[${MAX_LAYERS}];
  uniform vec3 uFill[${MAX_LAYERS}];
  uniform vec3 uGround[2];
  uniform vec4 uGradient; // x1, y1, x2, y2
  uniform int uFront;     // -1: the whole picture; otherwise only the layers in front of this one, over a card
  uniform vec4 uCard;     // the card, in pixels from the top left: left, top, right, bottom
  uniform float uRadius;  // its corner radius, in pixels
  out vec4 colour;

  float field(vec2 q, int k) {
    vec2 uv = (q - uDomain.xy) / uDomain.zw;
    // Beyond the maps, and beyond the frames' outer edges, the layers are paper.
    vec2 outside = max(-uv, uv - 1.0) * uDomain.zw;
    float beyond = max(max(outside.x, outside.y), max(q.x - ${PAPER_RIGHT}.0, ${PAPER_LEFT}.0 - q.x));
    float d = texture(uFields, vec3(uv, float(k))).r;
    return max(d, beyond);
  }

  void main() {
    vec2 px = vec2(gl_FragCoord.x, uView.w - gl_FragCoord.y);
    vec2 p = (px - uView.yz) / uView.x;
    vec3 sum = vec3(0.0);
    float covered = 0.0;
    vec3 shade = vec3(1.0);
    for (int k = uCount - 1; k > uFront; k--) {
      vec2 q = p - uOffset[k];
      float d0 = field(q, k);
      float a = clamp(0.5 + d0 * uView.x, 0.0, 1.0);
      sum += (1.0 - covered) * a * shade * uFill[k];
      covered += (1.0 - covered) * a;
      if (covered > 0.998) break;
      // In this layer's hole: how far along the reach until the layer covers again, read from the two ends.
      float d1 = field(q + uReach, k);
      if (d0 < 0.0 && d1 > 0.0) {
        float t = d0 / (d0 - d1);
        shade *= texture(uShadow, vec2(t, (float(k) + 0.5) / float(uCount))).rgb;
      }
    }
    if (uFront < 0) {
      vec2 g = uGradient.zw - uGradient.xy;
      float t = clamp(dot(p - uGradient.xy, g) / dot(g, g), 0.0, 1.0);
      sum += (1.0 - covered) * shade * mix(uGround[0], uGround[1], t);
      colour = vec4(sum, 1.0);
      return;
    }
    // Over a card: the paper in front, and on the card itself the paper's shadows, as darkness. Outside the card
    // the picture behind already has those shadows.
    vec2 e = abs(px - (uCard.xy + uCard.zw) / 2.0) - (uCard.zw - uCard.xy) / 2.0 + uRadius;
    float inside = clamp(0.5 - (length(max(e, 0.0)) + min(max(e.x, e.y), 0.0) - uRadius), 0.0, 1.0);
    float dark = (1.0 - covered) * (1.0 - dot(shade, vec3(0.2126, 0.7152, 0.0722))) * inside;
    colour = vec4(sum, covered + dark);
  }`;
  const program = gl.createProgram()!;
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]] as const) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader");
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link");
  gl.useProgram(program);
  return program;
}
