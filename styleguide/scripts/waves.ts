// The Sunset waves, moving: every layer of the waves component (components/waves) drawn with WebGL on a canvas
// over the still SVG, each layer drifting on its own as the page scrolls.
//
// Everything is read from the SVG the template wrote: the layers' shapes, their colours, the ground gradient and
// Illustrator's shadow recipe (the shifted, tinted copies multiplied over what lies behind). So the canvas draws
// the same picture as the SVG, and the SVG stays the picture wherever this script doesn't run: without WebGL 2,
// without workers, or with reduced motion.
//
// How it draws: each layer's shape becomes a distance map (how far every point is from the layer's edge, worked
// out once, in a worker). Per pixel, the shader walks the layers from front to back: a layer that covers the
// pixel gives its colour, and each layer in front whose hole the pixel lies in darkens it the way its copies
// would. Nothing is redrawn but the canvas, and only when the page scrolls or resizes.

const DRIFT = { x: 1.3, y: 0.2 }; // user units per layer, at the top of the page; nothing at the bottom
const DOMAIN = { x: -41, y: -9, w: 146, h: 62 }; // every point of a layer the screen can show, drift included
const TEXELS_PER_UNIT = 8;
const LUT_SIZE = 64;

interface Copy { dx: number; dy: number; mix: number; opacity: number }

const root = document.querySelector<HTMLElement>(".waves");
const svg = root?.querySelector<SVGSVGElement>(".waves-svg");
const motionOk = matchMedia("(prefers-reduced-motion: no-preference)");

// Once per page: the workbench preview loads this script for the component and again for the deck layout.
const first = root !== null && root.dataset.wavesScript === undefined;
if (root) root.dataset.wavesScript = "";

if (first && root && svg && motionOk.matches && typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined") {
  start(root, svg).catch(() => stop(root));
}

function stop(root: HTMLElement): void {
  root.classList.remove("waves-live");
  root.querySelector(".waves-canvas")?.remove();
}

async function start(root: HTMLElement, svg: SVGSVGElement): Promise<void> {
  const canvas = document.createElement("canvas");
  canvas.className = "waves-canvas";
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "low-power" });
  if (!gl) return;
  const wide = "drawingBufferColorSpace" in gl;
  if (wide) gl.drawingBufferColorSpace = "display-p3";
  const space: PredefinedColorSpace = wide ? "display-p3" : "srgb";

  // What the SVG holds.
  const shapes = [...svg.querySelectorAll<SVGPathElement>("defs .waves-shape")].map((p) => p.getAttribute("d") ?? "");
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
  if (!shapes.length || shapes.length !== fills.length || !copies.length) return;

  // The copies lie along one line: the furthest is the shadow's full reach (u); each copy covers a point that the
  // layer covers when moved back by its share of u.
  const far = copies.reduce((a, c) => (Math.hypot(c.dx, c.dy) > Math.hypot(a.dx, a.dy) ? c : a));
  const reach = { x: -far.dx, y: -far.dy };
  const len = Math.hypot(reach.x, reach.y);
  const shares = copies.map((c) => Math.hypot(c.dx, c.dy) / len);
  const step = Math.min(...shares.slice(1).map((s, j) => Math.abs(s - shares[j])));
  if (shapes.length > 30) return; // the shader holds 30 layers

  const fields = await distanceFields(shapes);
  const program = build(gl);
  const n = shapes.length;

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
  const uView = u("uView"), uOffset = u("uOffset");

  root.append(canvas);
  let drawn = "";

  function draw(): void {
    // At most two device pixels per CSS pixel: the waves are soft, and it halves the work on 3× screens.
    const ratio = Math.min(devicePixelRatio, 2);
    const w = Math.round(canvas.clientWidth * ratio), h = Math.round(canvas.clientHeight * ratio);
    const max = document.documentElement.scrollHeight - innerHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 1;
    const key = `${w}x${h}@${progress.toFixed(4)}`;
    if (key === drawn || !w || !h) return;
    drawn = key;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl!.viewport(0, 0, w, h);
    // The viewBox 0 0 100 50, sliced: as many pixels per unit as it takes to cover the canvas, centred.
    const scale = Math.max(w / 100, h / 50);
    gl!.uniform4f(uView, scale, (w - 100 * scale) / 2, (h - 50 * scale) / 2, h);
    const offsets: number[] = [];
    for (let k = 0; k < n; k++) offsets.push((1 - progress) * k * DRIFT.x, (1 - progress) * k * DRIFT.y);
    gl!.uniform2fv(uOffset, offsets);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  let queued = false;
  const request = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; draw(); }); } };
  draw();
  root.classList.add("waves-live");
  addEventListener("scroll", request, { passive: true });
  addEventListener("resize", request);
  motionOk.addEventListener("change", () => { if (!motionOk.matches) stop(root); });
  canvas.addEventListener("webglcontextlost", () => stop(root));
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
  uniform vec2 uOffset[30];
  uniform vec3 uFill[30];
  uniform vec3 uGround[2];
  uniform vec4 uGradient; // x1, y1, x2, y2
  out vec4 colour;

  float field(vec2 q, int k) {
    return texture(uFields, vec3((q - uDomain.xy) / uDomain.zw, float(k))).r;
  }

  void main() {
    vec2 px = vec2(gl_FragCoord.x, uView.w - gl_FragCoord.y);
    vec2 p = (px - uView.yz) / uView.x;
    vec3 sum = vec3(0.0);
    float covered = 0.0;
    vec3 shade = vec3(1.0);
    for (int k = uCount - 1; k >= 0; k--) {
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
    vec2 g = uGradient.zw - uGradient.xy;
    float t = clamp(dot(p - uGradient.xy, g) / dot(g, g), 0.0, 1.0);
    sum += (1.0 - covered) * shade * mix(uGround[0], uGround[1], t);
    colour = vec4(sum, 1.0);
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
