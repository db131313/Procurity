import { chromium } from "playwright";
import fs from "fs";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";

const CITIES = {
  nyc: [-73.98, 40.75],
  chicago: [-87.63, 41.88],
  los_angeles: [-118.24, 34.05],
  san_francisco: [-122.42, 37.78],
  seattle: [-122.33, 47.61],
  boston: [-71.06, 42.36],
  fort_worth: [-97.33, 32.76],
  miami_dade: [-80.19, 25.77],
};

async function waitMap(page) {
  await page.waitForFunction(
    () => {
      const m = window.__pcHomeMap;
      const c = document.querySelector(".maplibregl-canvas");
      return m?.loaded() && c && c.getBoundingClientRect().height > 200;
    },
    { timeout: 45000 },
  );
}

async function run(name, width, height) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width, height },
    hasTouch: name === "mobile",
    isMobile: name === "mobile",
  });
  const page = await context.newPage();
  const logs = [];
  page.on("console", (m) => logs.push({ type: m.type(), text: m.text() }));
  page.on("pageerror", (e) => logs.push({ type: "pageerror", text: String(e) }));

  await context.request.get(BASE + "/api/teaser/pins/all");
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitMap(page);
  await page.waitForTimeout(2000);

  const layout = await page.evaluate(() => {
    const canvas = document.querySelector(".maplibregl-canvas");
    const r = canvas?.getBoundingClientRect();
    return {
      canvasH: r?.height || 0,
      hasFilters: !!document.body.innerText.match(/Hot|Buying|General Score/i),
      hasLegend: document.body.innerText.includes("Buy Score"),
      hasSelect: !!document.querySelector("select"),
      pill: Array.from(document.querySelectorAll("p"))
        .map((p) => p.textContent)
        .find((t) => t && t.includes("free view")),
    };
  });

  // Toggle Hot filter and check feature count changes
  const before = await page.evaluate(() => {
    const m = window.__pcHomeMap;
    return m.queryRenderedFeatures({
      layers: ["project-pins", "project-clusters"].filter((id) => m.getLayer(id)),
    }).length;
  });
  // Click Hot if visible
  const hot = page.getByRole("button", { name: /^Hot$/i }).first();
  if (await hot.count()) {
    await hot.click();
    await page.waitForTimeout(800);
  }
  const afterHot = await page.evaluate(() => {
    const m = window.__pcHomeMap;
    return m.queryRenderedFeatures({
      layers: ["project-pins", "project-clusters"].filter((id) => m.getLayer(id)),
    }).length;
  });

  const cityPins = {};
  for (const [id, center] of Object.entries(CITIES)) {
    await page.evaluate(([lng, lat]) => {
      window.__pcHomeMap.jumpTo({ center: [lng, lat], zoom: 11 });
    }, center);
    await page.waitForTimeout(700);
    cityPins[id] = await page.evaluate(() => {
      const m = window.__pcHomeMap;
      return m.queryRenderedFeatures({
        layers: ["project-pins", "project-clusters"].filter((id) =>
          m.getLayer(id),
        ),
      }).length;
    });
  }

  const shot1 = `/opt/cursor/artifacts/real-map-${name}.png`;
  await page.screenshot({ path: shot1, fullPage: false });

  // Open a pin in NYC
  await page.evaluate(() =>
    window.__pcHomeMap.jumpTo({ center: [-73.98, 40.75], zoom: 13 }),
  );
  await page.waitForTimeout(900);

  let detailOpened = false;
  let hasStreetOrScore = false;
  let startJobPaywall = false;

  const clickPin = async () => {
    return page.evaluate(() => {
      const m = window.__pcHomeMap;
      let feats = m.getLayer("project-pins")
        ? m.queryRenderedFeatures({ layers: ["project-pins"] })
        : [];
      if (!feats.length && m.getLayer("project-clusters")) {
        const c = m.queryRenderedFeatures({ layers: ["project-clusters"] })[0];
        if (c) {
          m.jumpTo({ center: c.geometry.coordinates, zoom: 14 });
          return { retry: true };
        }
        return { ok: false };
      }
      if (!feats.length) return { ok: false };
      const f = feats[0];
      const pt = m.project(f.geometry.coordinates);
      const r = m.getCanvas().getBoundingClientRect();
      return {
        ok: true,
        id: f.properties.id,
        x: r.left + pt.x,
        y: r.top + pt.y,
      };
    });
  };

  for (let i = 0; i < 5; i++) {
    let t = await clickPin();
    if (t.retry) {
      await page.waitForTimeout(700);
      t = await clickPin();
    }
    if (!t.ok) break;
    await page.mouse.click(t.x, t.y);
    await page.waitForTimeout(1200);
    const state = await page.evaluate(() => ({
      detail: !!document.querySelector('[aria-modal="true"]'),
      text: document.body.innerText,
    }));
    if (state.detail) {
      detailOpened = true;
      hasStreetOrScore =
        state.text.includes("Buy Score") ||
        state.text.includes("Hot") ||
        state.text.includes("Strong") ||
        state.text.includes("Solid") ||
        state.text.includes("Street") ||
        state.text.includes("Start job");
      // Wait for detail body then Start job → paywall
      await page.waitForTimeout(1500);
      const clicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const start = btns.find((b) => /^Start job$/i.test(b.textContent || ""));
        if (!start) return false;
        start.click();
        return true;
      });
      if (clicked) {
        await page.waitForTimeout(900);
        startJobPaywall = await page.evaluate(() =>
          document.body.innerText.includes("Start a job with a plan"),
        );
      }
      break;
    }
  }

  // Bottom sheet swipe dismiss test (mobile)
  let swipeDismissed = null;
  if (name === "mobile" && detailOpened) {
    // reopen pin if needed
    const stillOpen = await page.evaluate(
      () => !!document.querySelector('[aria-modal="true"]'),
    );
    if (!stillOpen) {
      const t = await clickPin();
      if (t.ok) {
        await page.mouse.click(t.x, t.y);
        await page.waitForTimeout(1000);
      }
    }
    const handle = page.locator("[data-sheet-handle]").first();
    if (await handle.count()) {
      const box = await handle.boundingBox();
      if (box) {
        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;
        await page.touchscreen.tap(startX, startY);
        // Playwright mouse drag as pointer for drag controls
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX, startY + 220, { steps: 12 });
        await page.mouse.up();
        await page.waitForTimeout(700);
        swipeDismissed = await page.evaluate(
          () => !document.querySelector('[aria-modal="true"]'),
        );
      }
    }
  }

  // 4th distinct project → paywall (fresh context)
  await browser.close();

  const browser2 = await chromium.launch({ headless: true });
  const ctx2 = await browser2.newContext({ viewport: { width, height } });
  const page2 = await ctx2.newPage();
  await ctx2.request.get(BASE + "/api/teaser/pins/all");
  await page2.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await waitMap(page2);
  await page2.evaluate(() => localStorage.removeItem("pc_teaser_views"));

  const pins = await page2.evaluate(async () => {
    const j = await (await fetch("/api/teaser/pins/all")).json();
    return (j.pins || []).filter((p) => p.city === "nyc").slice(0, 6);
  });

  const tapLog = [];
  for (const pin of pins) {
    await page2.evaluate((p) => {
      window.__pcHomeMap.jumpTo({
        center: [p.longitude, p.latitude],
        zoom: 15,
      });
    }, pin);
    await page2.waitForTimeout(600);
    const click = await page2.evaluate((id) => {
      const m = window.__pcHomeMap;
      const feats = (m.getLayer("project-pins")
        ? m.queryRenderedFeatures({ layers: ["project-pins"] })
        : []
      ).filter((f) => f.properties.id === id);
      if (!feats.length) return null;
      const pt = m.project(feats[0].geometry.coordinates);
      const r = m.getCanvas().getBoundingClientRect();
      return { x: r.left + pt.x, y: r.top + pt.y };
    }, pin.id);
    if (!click) {
      tapLog.push({ id: pin.id, miss: true });
      continue;
    }
    await page2.mouse.click(click.x, click.y);
    await page2.waitForTimeout(1000);
    const state = await page2.evaluate(() => ({
      detail: !!document.querySelector('[aria-modal="true"]'),
      paywall: /explored 3 projects|Pick a plan|Start a job with a plan/i.test(
        document.body.innerText,
      ),
    }));
    tapLog.push({ id: pin.id, ...state });
    if (state.paywall) break;
    if (state.detail) {
      await page2.evaluate(() => {
        document.querySelector('[aria-label="Close"]')?.click();
      });
      await page2.waitForTimeout(400);
    }
  }

  const shot2 = `/opt/cursor/artifacts/real-map-${name}-paywall.png`;
  await page2.screenshot({ path: shot2, fullPage: false });

  const pinsAll = await (
    await ctx2.request.get(BASE + "/api/teaser/pins/all")
  ).json();

  await browser2.close();
  return {
    name,
    layout,
    filterBefore: before,
    filterAfterHot: afterHot,
    cityPins,
    detailOpened,
    hasStreetOrScore,
    startJobPaywall,
    swipeDismissed,
    tapLog: tapLog.slice(0, 8),
    pinsTotal: pinsAll.pins?.length,
    screenshots: [shot1, shot2],
    errors: logs.filter((l) => l.type === "error" || l.type === "pageerror"),
  };
}

const out = [];
out.push(await run("desktop", 1440, 900));
out.push(await run("mobile", 390, 844));
fs.writeFileSync(
  "/opt/cursor/artifacts/real-map-verify.json",
  JSON.stringify(out, null, 2),
);
console.log(JSON.stringify(out, null, 2));
