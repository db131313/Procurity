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

/**
 * Light Apple-Maps-style city map: cream land, white streets, warm yellow arterials,
 * river, park, soft-shadow buildings, the dark selected site and street labels.
 */
export function buildMap(svg: SVGSVGElement | null, filterId = "pcm-bsh") {
  if (!svg || svg.dataset.done) return;
  svg.dataset.done = "1";
  const R = rng(7);
  const el = (t: string, a: Attrs) => svgEl(svg, t, a);
  const shadow = `url(#${filterId})`;

  const defs = el("defs", {});
  const filter = svgEl(defs, "filter", {
    id: filterId,
    x: "-20%",
    y: "-20%",
    width: "140%",
    height: "150%",
  });
  svgEl(filter, "feDropShadow", {
    dx: 2,
    dy: 3,
    stdDeviation: 1.6,
    "flood-color": "#6b6250",
    "flood-opacity": 0.35,
  });

  el("rect", { width: 390, height: 844, fill: "#F0EDE5" });
  const xs = [-20, 50, 118, 190, 262, 330, 400];
  const ys = [60, 130, 200, 270, 340, 410, 480, 550, 620, 690, 760, 830];
  const park = { i: 3, j: 6 };
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const x = xs[i]! + 6;
      const y = ys[j]! + 6;
      const w = xs[i + 1]! - xs[i]! - 12;
      const h = ys[j + 1]! - ys[j]! - 12;
      if (i === park.i && j === park.j) {
        el("rect", { x, y, width: w, height: h, rx: 6, fill: "#CFE6C0" });
        for (let k = 0; k < 16; k++) {
          el("circle", {
            cx: x + 8 + R() * (w - 16),
            cy: y + 8 + R() * (h - 16),
            r: 4 + R() * 3,
            fill: "#B6D7A3",
          });
        }
        el("path", {
          d: `M${x} ${y + h * 0.6}Q${x + w * 0.5} ${y + h * 0.3} ${x + w} ${y + h * 0.5}`,
          stroke: "#EFE9D6",
          "stroke-width": 3,
          fill: "none",
        });
        continue;
      }
      el("rect", { x, y, width: w, height: h, rx: 4, fill: "#E7E2D7" });
      const n = 2 + Math.floor(R() * 3);
      for (let k = 0; k < n; k++) {
        const bw = 14 + R() * w * 0.45;
        const bh = 12 + R() * h * 0.45;
        const bx = x + 4 + R() * (w - bw - 8);
        const by = y + 4 + R() * (h - bh - 8);
        el("rect", {
          x: bx,
          y: by,
          width: bw,
          height: bh,
          rx: 2,
          fill: R() < 0.3 ? "#F7F5EF" : "#FBFAF6",
          filter: shadow,
        });
      }
    }
  }

  const river = "M-20 452 C 90 410, 190 480, 410 396";
  el("path", {
    d: river,
    fill: "none",
    stroke: "#9FCBE6",
    "stroke-width": 46,
    "stroke-linecap": "round",
  });
  el("path", { d: river, fill: "none", stroke: "#B4D9EE", "stroke-width": 38 });

  const road = (d: string, w: number, c = "#fff") => {
    el("path", { d, fill: "none", stroke: "#D8D2C4", "stroke-width": w + 2.5, "stroke-linecap": "butt" });
    el("path", { d, fill: "none", stroke: c, "stroke-width": w });
  };
  for (const x of xs) road(`M${x} 0V844`, 7);
  for (const y of ys) road(`M0 ${y}H390`, 7);
  road("M118 0V844", 11, "#FFF3CF");
  road("M0 550H390", 11, "#FFF3CF");
  road("M262 0V844", 9);
  road("M0 270H390", 9);
  road("M30 840L390 560", 8);

  el("rect", {
    x: xs[3]! + 7,
    y: ys[3]! + 7,
    width: xs[4]! - xs[3]! - 14,
    height: ys[4]! - ys[3]! - 14,
    rx: 4,
    fill: "#E7E2D7",
  });
  el("rect", { x: 200, y: 312, width: 34, height: 30, rx: 2, fill: "#26282B", filter: shadow });

  const tx = (x: number, y: number, t: string, rot?: number, c = "#70757A") => {
    const e = el("text", {
      x,
      y,
      fill: c,
      "font-size": 9.5,
      "font-weight": 600,
      "font-family": "Inter,system-ui,sans-serif",
      "letter-spacing": ".05em",
      "paint-order": "stroke",
      stroke: "#fff",
      "stroke-width": 3,
      "stroke-linejoin": "round",
      transform: rot ? `rotate(${rot} ${x} ${y})` : "",
    });
    e.textContent = t;
  };
  tx(124, 214, "N CLARK ST", -90);
  tx(268, 430, "N LA SALLE ST", -90);
  tx(12, 266, "W HUBBARD ST");
  tx(12, 546, "W KINZIE ST");
  tx(40, 440, "Chicago River", -9, "#5E9BC4");
  tx(205, 590, "Park", 0, "#6E9F5A");
  tx(300, 260, "River North", 0, "#8A8F94");
}

/**
 * Appends 16 stacked copies of the sign text to `sg`; each sits at `--k * --ez` in Z,
 * and the last one is the face. `sg` may hold static React children; they are left alone.
 */
export function buildSign(
  sg: HTMLElement | null,
  classes: { ext: string; f: string },
  text = "ALDER & FINCH",
) {
  if (!sg || sg.dataset.done) return;
  sg.dataset.done = "1";
  const N = 16;
  for (let k = 0; k < N; k++) {
    const d = document.createElement("div");
    d.className = k === N - 1 ? `${classes.ext} ${classes.f}` : classes.ext;
    d.style.setProperty("--k", String(k));
    d.setAttribute("aria-hidden", "true");
    d.textContent = text;
    sg.appendChild(d);
  }
}
