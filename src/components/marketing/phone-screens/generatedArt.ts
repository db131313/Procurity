/**
 * Procedural art for the animated phone screens. Each builder fills its
 * container once (guarded by `data-done`) so the markup stays tiny.
 * The containers must render no React children of their own except where noted.
 */

const NS = "http://www.w3.org/2000/svg";

export function rng(seed: number) {
  let r = seed;
  return () => (r = (r * 16807) % 2147483647) / 2147483647;
}

type Attrs = Record<string, string | number>;

function svgEl(parent: Element, tag: string, attrs: Attrs) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  parent.appendChild(e);
  return e;
}

/** Dark city map: blocks, buildings, arterials, river, park, selected lot, street labels. */
export function buildMap(svg: SVGSVGElement | null, patternId = "pcm-pk") {
  if (!svg || svg.dataset.done) return;
  svg.dataset.done = "1";
  const R = rng(7);
  const el = (t: string, a: Attrs) => svgEl(svg, t, a);

  el("rect", { width: 390, height: 844, fill: "#0F1112" });
  const xs = [-20, 50, 118, 190, 262, 330, 400];
  const ys = [60, 130, 200, 270, 340, 410, 480, 550, 620, 690, 760, 830];
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const x = xs[i]! + 7;
      const y = ys[j]! + 7;
      const w = xs[i + 1]! - xs[i]! - 14;
      const h = ys[j + 1]! - ys[j]! - 14;
      el("rect", { x, y, width: w, height: h, rx: 3, fill: "#15181A" });
      const n = 1 + Math.floor(R() * 3);
      for (let k = 0; k < n; k++) {
        const bw = 12 + R() * w * 0.5;
        const bh = 10 + R() * h * 0.5;
        el("rect", {
          x: x + 3 + R() * (w - bw - 6),
          y: y + 3 + R() * (h - bh - 6),
          width: bw,
          height: bh,
          rx: 2,
          fill: R() < 0.25 ? "#22262A" : "#1B1E21",
        });
      }
    }
  }
  for (const x of [118, 262]) {
    el("rect", { x: x - 3, y: 0, width: 6, height: 844, fill: "#23272B" });
  }
  for (const y of [270, 550]) {
    el("rect", { x: 0, y: y - 3, width: 390, height: 6, fill: "#23272B" });
  }
  const river = "M-20 452 C 90 410, 190 480, 410 396";
  el("path", { d: river, fill: "none", stroke: "#2A2E32", "stroke-width": 40 });
  el("path", { d: river, fill: "none", stroke: "#0A0B0C", "stroke-width": 36 });

  const defs = svgEl(svg, "defs", {});
  const pattern = svgEl(defs, "pattern", {
    id: patternId,
    width: 7,
    height: 7,
    patternUnits: "userSpaceOnUse",
  });
  svgEl(pattern, "circle", { cx: 3, cy: 3, r: 1.2, fill: "#3a3f44" });
  el("rect", { x: 197, y: 557, width: 58, height: 56, rx: 3, fill: `url(#${patternId})` });

  el("rect", {
    x: 196,
    y: 316,
    width: 36,
    height: 28,
    rx: 3,
    fill: "rgba(255,255,255,.16)",
    stroke: "rgba(255,255,255,.7)",
    "stroke-width": 1.5,
  });

  const tx = (x: number, y: number, t: string, rot?: number) => {
    const e = el("text", {
      x,
      y,
      fill: "#5E646A",
      "font-size": 9,
      "font-family": "Inter,system-ui,sans-serif",
      "letter-spacing": ".06em",
      transform: rot ? `rotate(${rot} ${x} ${y})` : "",
    });
    e.textContent = t;
  };
  tx(124, 200, "N CLARK ST", -90);
  tx(268, 420, "N LA SALLE ST", -90);
  tx(10, 266, "W HUBBARD ST");
  tx(10, 546, "W KINZIE ST");
  tx(40, 436, "CHICAGO RIVER", -9);
  tx(205, 596, "PARK");
}

/** Jittered triangle mesh for the AR scan; each triangle gets its own shimmer delay via --d. */
export function buildScan(svg: SVGSVGElement | null) {
  if (!svg || svg.dataset.done) return;
  svg.dataset.done = "1";
  const R = rng(5);
  const C = 8;
  const Rw = 11;
  const x0 = 10;
  const x1 = 380;
  const y0 = 120;
  const y1 = 700;
  const P: Array<Array<[number, number]>> = [];
  for (let j = 0; j <= Rw; j++) {
    const row: Array<[number, number]> = [];
    for (let i = 0; i <= C; i++) {
      const e = i === 0 || j === 0 || i === C || j === Rw ? 0 : 1;
      row.push([
        x0 + ((x1 - x0) * i) / C + (R() - 0.5) * 26 * e,
        y0 + ((y1 - y0) * j) / Rw + (R() - 0.5) * 26 * e,
      ]);
    }
    P.push(row);
  }
  const poly = (a: [number, number], b: [number, number], c: [number, number]) => {
    const p = document.createElementNS(NS, "polygon");
    p.setAttribute(
      "points",
      [a, b, c].map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" "),
    );
    const h = 190 + R() * 60;
    const l = 55 + R() * 25;
    p.setAttribute(
      "fill",
      `hsla(${h.toFixed(0)},90%,${l.toFixed(0)}%,${(0.04 + R() * 0.13).toFixed(2)})`,
    );
    p.style.setProperty("--d", `${(R() * 2).toFixed(2)}s`);
    svg.appendChild(p);
  };
  for (let j = 0; j < Rw; j++) {
    for (let i = 0; i < C; i++) {
      poly(P[j]![i]!, P[j]![i + 1]!, P[j + 1]![i]!);
      poly(P[j]![i + 1]!, P[j + 1]![i + 1]!, P[j + 1]![i]!);
    }
  }
}

/**
 * Appends 14 stacked `translateZ` copies of the sign text to `sg`, the last one
 * being the white face. `sg` may hold static React children; they are left alone.
 */
export function buildSign(
  sg: HTMLElement | null,
  classes: { ext: string; f: string },
  text = "ALDER & FINCH",
) {
  if (!sg || sg.dataset.done) return;
  sg.dataset.done = "1";
  const N = 14;
  for (let k = 0; k < N; k++) {
    const d = document.createElement("div");
    d.className = k === N - 1 ? `${classes.ext} ${classes.f}` : classes.ext;
    d.style.setProperty("--k", String(k));
    d.setAttribute("aria-hidden", "true");
    d.textContent = text;
    sg.appendChild(d);
  }
}
