import { chromium } from "playwright";
import fs from "fs";

const url = process.argv[2] || "http://127.0.0.1:3000/";

const browser = await chromium.launch({ headless: true });
const page = await browser.newContext({ viewport: { width: 1440, height: 900 } }).then((c) =>
  c.newPage(),
);

const consoleLogs = [];
page.on("console", (m) => consoleLogs.push({ type: m.type(), text: m.text() }));
page.on("pageerror", (e) => consoleLogs.push({ type: "pageerror", text: String(e) }));

await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForTimeout(3000);

const layout = await page.evaluate(() => {
  function box(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      id: el.id,
      role: el.getAttribute("role"),
      className: String(el.className).slice(0, 120),
      w: Math.round(r.width),
      h: Math.round(r.height),
      top: Math.round(r.top),
      left: Math.round(r.left),
      position: cs.position,
      display: cs.display,
      visibility: cs.visibility,
      opacity: cs.opacity,
      overflow: cs.overflow,
      zIndex: cs.zIndex,
      bg: cs.backgroundColor,
      transform: cs.transform,
    };
  }

  const app = document.querySelector('[role="application"]');
  const section = app?.closest("section") || app?.parentElement;
  const mapDiv = document.querySelector(".maplibregl-map");
  const canvas = document.querySelector(".maplibregl-canvas");
  const canvasContainer = document.querySelector(".maplibregl-canvas-container");

  // Check if WebGL context exists and has drawn
  let glInfo = null;
  if (canvas instanceof HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    glInfo = {
      hasGl: !!gl,
      canvasW: canvas.width,
      canvasH: canvas.height,
      clientW: canvas.clientWidth,
      clientH: canvas.clientHeight,
    };
  }

  // Sample pixel from canvas via readPixels if possible - often blocked for WebGL
  return {
    viewport: { w: window.innerWidth, h: window.innerHeight },
    dvhSupport: CSS.supports("height", "100dvh"),
    section: box(section),
    app: box(app),
    mapDiv: box(mapDiv),
    canvasContainer: box(canvasContainer),
    canvas: box(canvas),
    glInfo,
    maplibreCssLoaded: !!Array.from(document.styleSheets).find((s) => {
      try {
        return (s.href || "").includes("maplibre") || Array.from(s.cssRules || []).some((r) =>
          String(r.cssText || "").includes("maplibregl"),
        );
      } catch {
        return false;
      }
    }),
    hasMaplibreCssLink: !!document.querySelector('link[href*="maplibre"]'),
    inlineStyles: Array.from(document.querySelectorAll("style"))
      .map((s) => s.textContent?.includes("maplibregl"))
      .filter(Boolean).length,
  };
});

// Check if maplibre-gl CSS is imported
const cssCheck = await page.evaluate(async () => {
  const sheets = Array.from(document.styleSheets);
  let maplibreRules = 0;
  for (const s of sheets) {
    try {
      for (const r of s.cssRules || []) {
        if (String(r.selectorText || r.cssText || "").includes("maplibregl")) {
          maplibreRules++;
        }
      }
    } catch {
      /* cross-origin */
    }
  }
  return { maplibreRules };
});

fs.writeFileSync(
  "/opt/cursor/artifacts/home-map-layout.json",
  JSON.stringify({ url, layout, cssCheck, consoleLogs: consoleLogs.slice(0, 30) }, null, 2),
);
console.log(JSON.stringify({ url, layout, cssCheck }, null, 2));
await browser.close();
