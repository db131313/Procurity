import { chromium } from "playwright";
import fs from "fs";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";

const CITY_CENTERS = {
  nyc: [-73.98, 40.75],
  chicago: [-87.63, 41.88],
  los_angeles: [-118.24, 34.05],
  san_francisco: [-122.42, 37.78],
  seattle: [-122.33, 47.61],
  boston: [-71.06, 42.36],
  fort_worth: [-97.33, 32.76],
  miami_dade: [-80.19, 25.77],
};

async function waitForMap(page, timeout = 30000) {
  await page.waitForFunction(
    () => {
      const map = window.__pcHomeMap;
      const canvas = document.querySelector(".maplibregl-canvas");
      if (!map || !canvas) return false;
      const r = canvas.getBoundingClientRect();
      return r.height > 200 && r.width > 200 && map.loaded();
    },
    { timeout },
  );
}

function mapAlive(page) {
  return page.evaluate(() => {
    const map = window.__pcHomeMap;
    if (!map) return false;
    try {
      map.getCenter();
      return true;
    } catch {
      return false;
    }
  });
}

async function layoutInfo(page) {
  return page.evaluate(() => {
    const app = document.querySelector('[role="application"]');
    const wrap = app?.parentElement;
    const canvas = document.querySelector(".maplibregl-canvas");
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        position: getComputedStyle(el).position,
      };
    };
    return {
      wrap: box(wrap),
      app: box(app),
      canvas: box(canvas),
      hasSelect: !!document.querySelector("select"),
      pillText: Array.from(document.querySelectorAll("p"))
        .map((p) => p.textContent)
        .find((t) => t && t.includes("free view")),
      attribution:
        document.body.innerText.includes("OpenStreetMap") ||
        document.body.innerText.includes("MapLibre") ||
        document.body.innerText.includes("OpenFreeMap"),
      mapFailed: document.body.innerText.includes("The map didn't load"),
    };
  });
}

async function pinsVisibleInView(page) {
  return page.evaluate(() => {
    const map = window.__pcHomeMap;
    if (!map) return { count: 0 };
    try {
      const features = map.queryRenderedFeatures({
        layers: ["teaser-pins", "teaser-clusters"].filter((id) =>
          map.getLayer(id),
        ),
      });
      return {
        count: features.length,
        sample: features.slice(0, 3).map((f) => f.properties),
      };
    } catch (e) {
      return { count: 0, error: String(e) };
    }
  });
}

async function flyToCity(page, cityId) {
  const center = CITY_CENTERS[cityId];
  if (!(await mapAlive(page))) {
    await waitForMap(page);
  }
  await page.evaluate(
    ([lng, lat]) => {
      window.__pcHomeMap.jumpTo({ center: [lng, lat], zoom: 11 });
    },
    center,
  );
  await page.waitForTimeout(900);
}

async function clickFirstPin(page) {
  return page.evaluate(() => {
    const map = window.__pcHomeMap;
    if (!map) return { ok: false, reason: "no map" };
    let feats = [];
    try {
      if (map.getLayer("teaser-pins")) {
        feats = map.queryRenderedFeatures({ layers: ["teaser-pins"] });
      }
    } catch {
      return { ok: false, reason: "query failed" };
    }
    if (!feats.length) {
      try {
        const clusters = map.getLayer("teaser-clusters")
          ? map.queryRenderedFeatures({ layers: ["teaser-clusters"] })
          : [];
        if (!clusters.length) return { ok: false, reason: "no features" };
        const c = clusters[0];
        map.jumpTo({ center: c.geometry.coordinates, zoom: 14 });
        return { ok: false, reason: "zoomed cluster", retry: true };
      } catch {
        return { ok: false, reason: "cluster fail" };
      }
    }
    const f = feats[0];
    const coords = f.geometry.coordinates;
    const point = map.project(coords);
    const canvas = map.getCanvas();
    const rect = canvas.getBoundingClientRect();
    return {
      ok: true,
      projectId: f.properties.projectId,
      clientX: rect.left + point.x,
      clientY: rect.top + point.y,
    };
  });
}

async function runViewport(name, width, height) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const consoleLogs = [];
  page.on("console", (m) =>
    consoleLogs.push({ type: m.type(), text: m.text() }),
  );
  page.on("pageerror", (e) =>
    consoleLogs.push({ type: "pageerror", text: String(e) }),
  );

  // Warm pins endpoint first so home map gets full data
  await context.request.get(BASE + "/api/teaser/pins/all");

  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitForMap(page);
  await page.waitForTimeout(2000);

  const layout = await layoutInfo(page);
  const shot1 = `/opt/cursor/artifacts/home-map-${name}.png`;
  await page.screenshot({ path: shot1, fullPage: false });

  const cityPins = {};
  for (const cityId of Object.keys(CITY_CENTERS)) {
    await flyToCity(page, cityId);
    let vis = await pinsVisibleInView(page);
    if (vis.count === 0) {
      await page.evaluate(() => {
        if (window.__pcHomeMap) window.__pcHomeMap.zoomTo(12);
      });
      await page.waitForTimeout(700);
      vis = await pinsVisibleInView(page);
    }
    cityPins[cityId] = vis.count;
  }

  // Fresh context for detail/paywall UI so cookie starts clean
  await browser.close();

  const browser2 = await chromium.launch({ headless: true });
  const context2 = await browser2.newContext({ viewport: { width, height } });
  const page2 = await context2.newPage();
  await context2.request.get(BASE + "/api/teaser/pins/all");
  await page2.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitForMap(page2);
  await flyToCity(page2, "nyc");
  await page2.evaluate(() => {
    localStorage.removeItem("pc_teaser_views");
    if (window.__pcHomeMap) window.__pcHomeMap.zoomTo(13);
  });
  await page2.waitForTimeout(1000);

  let detailOpened = false;
  let paywallShown = false;
  const tapLog = [];

  for (let i = 0; i < 10; i++) {
    if (!(await mapAlive(page2))) break;
    let target = await clickFirstPin(page2);
    if (target.retry) {
      await page2.waitForTimeout(800);
      target = await clickFirstPin(page2);
    }
    if (!target.ok) {
      tapLog.push(target);
      await page2.evaluate(() => {
        if (window.__pcHomeMap) window.__pcHomeMap.panBy([50, 30]);
      });
      await page2.waitForTimeout(400);
      continue;
    }
    await page2.mouse.click(target.clientX, target.clientY);
    await page2.waitForTimeout(1000);
    const state = await page2.evaluate(() => ({
      detail: !!document.querySelector('[aria-label="Project details"]'),
      paywall: document.body.innerText.includes("You've seen 3 projects"),
    }));
    tapLog.push({ projectId: target.projectId, ...state });
    if (state.detail) detailOpened = true;
    if (state.paywall) {
      paywallShown = true;
      break;
    }
    if (state.detail) {
      await page2.evaluate(() => {
        const btn = document.querySelector('[aria-label="Close"]');
        if (btn instanceof HTMLElement) btn.click();
      });
      await page2.waitForTimeout(350);
      await page2.evaluate(() => {
        if (window.__pcHomeMap) window.__pcHomeMap.panBy([90, 60]);
      });
      await page2.waitForTimeout(450);
    }
  }

  const shot2 = `/opt/cursor/artifacts/home-map-${name}-after-taps.png`;
  await page2.screenshot({ path: shot2, fullPage: false });

  const demoRes = await context2.request.get(BASE + "/demo", {
    maxRedirects: 0,
  });
  const demoShare = await context2.request.get(BASE + "/demo/share", {
    maxRedirects: 0,
  });
  const pinsAll = await context2.request.get(BASE + "/api/teaser/pins/all");
  const pinsJson = await pinsAll.json();

  await browser2.close();
  return {
    name,
    viewport: { width, height },
    layout,
    cityPins,
    detailOpened,
    paywallShown,
    tapLog: tapLog.slice(0, 12),
    demo: {
      demo: demoRes.status(),
      demoLoc: demoRes.headers()["location"],
      share: demoShare.status(),
      shareLoc: demoShare.headers()["location"],
    },
    pinsAll: {
      status: pinsAll.status(),
      totalPins: pinsJson.pins?.length,
      perCity: Object.fromEntries(
        Object.entries(pinsJson.byCity || {}).map(([k, v]) => [
          k,
          v.pins?.length,
        ]),
      ),
    },
    consoleErrors: consoleLogs.filter(
      (c) => c.type === "error" || c.type === "pageerror",
    ),
    screenshots: [shot1, shot2],
  };
}

const out = [];
out.push(await runViewport("desktop", 1440, 900));
out.push(await runViewport("mobile", 390, 844));
fs.writeFileSync(
  "/opt/cursor/artifacts/home-map-verify-full.json",
  JSON.stringify(out, null, 2),
);
console.log(JSON.stringify(out, null, 2));
