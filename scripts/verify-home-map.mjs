import { chromium } from "playwright";
import fs from "fs";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";

async function runViewport(name, width, height) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width, height },
    // logged out — no cookies
  });
  const page = await context.newPage();
  const consoleLogs = [];
  const pageErrors = [];
  const failed = [];

  page.on("console", (m) =>
    consoleLogs.push({ type: m.type(), text: m.text() }),
  );
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  page.on("requestfailed", (r) =>
    failed.push({ url: r.url(), err: r.failure()?.errorText }),
  );

  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(5000);

  const layout = await page.evaluate(() => {
    const wrap = document.querySelector('[role="application"]')?.parentElement;
    const app = document.querySelector('[role="application"]');
    const canvas = document.querySelector(".maplibregl-canvas");
    const rb = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) };
    };
    return {
      wrap: rb(wrap),
      app: rb(app),
      canvas: rb(canvas),
      hasSelect: !!document.querySelector("select"),
      pill: document.body.innerText.includes("free view"),
      wordmark: document.body.innerText.includes("PROCURITY"),
    };
  });

  // Wait for pins source via evaluating maplibre canvas non-gray
  // Sample: check that canvas pixels aren't all the same (blank)
  const pixelSample = await page.evaluate(() => {
    const canvas = document.querySelector(".maplibregl-canvas");
    if (!(canvas instanceof HTMLCanvasElement)) return { ok: false, reason: "no canvas" };
    // Can't easily read WebGL pixels; check size instead
    return {
      ok: canvas.clientWidth > 100 && canvas.clientHeight > 100,
      w: canvas.clientWidth,
      h: canvas.clientHeight,
    };
  });

  // Fetch pins/all and verify
  const pinsAll = await page.evaluate(async () => {
    const r = await fetch("/api/teaser/pins/all");
    const j = await r.json();
    return {
      status: r.status,
      ok: j.ok,
      pinCount: j.pins?.length,
      cities: j.cities,
      perCity: Object.fromEntries(
        Object.entries(j.byCity || {}).map(([k, v]) => [
          k,
          (v).pins?.length,
        ]),
      ),
    };
  });

  // Click a pin via map query — find unclustered features if possible is hard.
  // Instead: call detail API for 4 distinct ids and verify 402 on 4th,
  // then click coordinates of first pin by synthesizing map click if ready.
  const detailFlow = await page.evaluate(async () => {
    const pins = (await (await fetch("/api/teaser/pins/all")).json()).pins || [];
    const ids = pins.slice(0, 4).map((p) => p.id);
    const results = [];
    for (const id of ids) {
      const r = await fetch(`/api/teaser/detail?id=${encodeURIComponent(id)}`);
      const j = await r.json();
      results.push({
        id: id.slice(0, 20),
        status: r.status,
        hasContact: !!(j.detail && (j.detail.ownerName || j.detail.phone)),
        keys: j.detail ? Object.keys(j.detail) : Object.keys(j),
      });
    }
    return results;
  });

  // Try clicking map center to open a pin — may hit cluster
  // Pan to NYC and try queryRenderedFeatures via exposing nothing —
  // Use page mouse click on canvas and see if detail opens after locating a pin.

  // Fly programmatically by evaluating — we don't have window.map.
  // Click several places over NYC area of the canvas.
  const canvasBox = await page.locator(".maplibregl-canvas").boundingBox();
  let detailOpened = false;
  let paywallShown = false;

  if (canvasBox) {
    // Clear localStorage views first for UI test of 3 then paywall —
    // detail API already used cookies above so paywall may already be active
    // for cookie. Reset by new context would be needed.
    // For UI: open a fresh context later for paywall UI test.

    // Just try a few clicks to see if panel can open
    for (const [fx, fy] of [
      [0.55, 0.45],
      [0.5, 0.5],
      [0.48, 0.52],
      [0.6, 0.4],
    ]) {
      await page.mouse.click(
        canvasBox.x + canvasBox.width * fx,
        canvasBox.y + canvasBox.height * fy,
      );
      await page.waitForTimeout(600);
      detailOpened = await page.evaluate(() =>
        !!document.querySelector('[aria-label="Project details"]'),
      );
      if (detailOpened) break;
    }
  }

  paywallShown = await page.evaluate(() =>
    document.body.innerText.includes("You've seen 3 projects"),
  );

  const shot = `/opt/cursor/artifacts/home-map-${name}.png`;
  await page.screenshot({ path: shot, fullPage: false });

  // demo redirect
  const demo = await page.evaluate(async () => {
    const r = await fetch("/demo", { redirect: "manual" });
    return { status: r.status, location: r.headers.get("location") };
  });

  await browser.close();
  return {
    name,
    viewport: { width, height },
    layout,
    pixelSample,
    pinsAll,
    detailFlow,
    detailOpened,
    paywallShown,
    demo,
    pageErrors,
    consoleErrors: consoleLogs.filter((c) => c.type === "error"),
    consoleWarnings: consoleLogs.filter((c) => c.type === "warning").slice(0, 5),
    failed: failed.filter((f) => !f.url.includes("_rsc")).slice(0, 10),
    screenshot: shot,
  };
}

const results = [];
results.push(await runViewport("desktop", 1440, 900));
results.push(await runViewport("mobile", 390, 844));

fs.writeFileSync(
  "/opt/cursor/artifacts/home-map-verify2.json",
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results, null, 2));
