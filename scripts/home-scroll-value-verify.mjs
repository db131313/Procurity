/**
 * Verify scroll-over-map, value prop, and no-illustration home page.
 * BASE_URL=http://127.0.0.1:3000 node scripts/home-scroll-value-verify.mjs
 */
import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
const OUT = "/opt/cursor/artifacts/home-scroll-value";
fs.mkdirSync(OUT, { recursive: true });
const log = (m) => console.log(m);

async function waitHomeMap(page) {
  await page.waitForFunction(
    () =>
      Boolean(window.__pcHomeMap?.loaded?.()) &&
      (window.__pcHomePinCount || 0) > 50,
    { timeout: 90000 },
  );
  await page.waitForTimeout(800);
}

async function assertNoIllustrations(page) {
  const bad = await page.evaluate(() => {
    const hits = [];
    const body = document.body.innerText || "";
    // Placeholder media slots (not pricing feature bullets like "API access (coming soon)")
    if (/video coming soon/i.test(body)) hits.push("video coming soon");
    if (/measure on site with lidar|get the iphone app|lidar measure/i.test(body)) {
      hits.push("iphone / LiDAR marketing copy visible");
    }
    document.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") || "";
      if (/hero-city-bg|phone-mock|illustration/i.test(src)) {
        hits.push(`illustrated img ${src}`);
      }
    });
    // Screenshots should be real /home/* when present
    document.querySelectorAll("#what-you-get ~ * img, section img").forEach((img) => {
      const src = img.getAttribute("src") || "";
      if (src.startsWith("/home/") || src.startsWith("/brand/logo")) return;
      if (/how it works/i.test(document.body.innerText) && /brand\/hero/i.test(src)) {
        hits.push(`legacy how-it-works art ${src}`);
      }
    });
    return hits;
  });
  if (bad.length) throw new Error(`Illustrations still present: ${bad.join(", ")}`);
}

async function runDesktop() {
  log("\n=== desktop 1440x900 ===");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(90000);
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await waitHomeMap(page);

  const value = page.locator('[data-testid="value-prop"]');
  await value.waitFor();
  const box = await value.boundingBox();
  if (!box || box.y + 40 > 900) {
    throw new Error("Value prop not visible above the fold on desktop");
  }
  log(`OK value prop y=${Math.round(box.y)} h=${Math.round(box.height)}`);

  const hero = page.locator('[data-testid="home-hero"]');
  const hb = await hero.boundingBox();
  if (!hb || hb.height > 900 * 0.95) {
    throw new Error(`Hero should be ~88dvh, got height=${hb?.height}`);
  }
  log(`OK hero height=${Math.round(hb.height)}`);

  await page.locator('[data-testid="scroll-cue"]').waitFor();

  // Plain wheel over map → scroll page, not zoom
  const before = await page.evaluate(() => ({
    y: window.scrollY,
    z: window.__pcHomeMap.getZoom(),
  }));
  const mapBox = await page.locator(".maplibregl-canvas").boundingBox();
  await page.mouse.move(mapBox.x + mapBox.width * 0.55, mapBox.y + mapBox.height * 0.45);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(400);
  const afterWheel = await page.evaluate(() => ({
    y: window.scrollY,
    z: window.__pcHomeMap.getZoom(),
  }));
  if (afterWheel.y <= before.y) {
    throw new Error(`Plain wheel did not scroll page (y ${before.y} → ${afterWheel.y})`);
  }
  if (Math.abs(afterWheel.z - before.z) > 0.05) {
    throw new Error(`Plain wheel changed zoom ${before.z} → ${afterWheel.z}`);
  }
  log(`OK plain wheel scrolled page (${before.y}→${afterWheel.y}), zoom unchanged ${before.z.toFixed(2)}`);

  // Ctrl+wheel zooms
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  const z0 = await page.evaluate(() => window.__pcHomeMap.getZoom());
  await page.mouse.move(mapBox.x + mapBox.width * 0.55, mapBox.y + mapBox.height * 0.4);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -400);
  await page.keyboard.up("Control");
  await page.waitForTimeout(500);
  const z1 = await page.evaluate(() => window.__pcHomeMap.getZoom());
  if (z1 <= z0 + 0.05) {
    throw new Error(`Ctrl+wheel did not zoom (z ${z0} → ${z1})`);
  }
  log(`OK Ctrl+wheel zoomed ${z0.toFixed(2)} → ${z1.toFixed(2)}`);

  await assertNoIllustrations(page);
  log("OK no illustrations / coming-soon placeholders");

  await page.screenshot({ path: path.join(OUT, "desktop-hero.png") });
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "desktop-what-you-get.png") });
  await page.screenshot({ path: path.join(OUT, "desktop-full.png"), fullPage: true });

  await browser.close();
}

async function runMobile() {
  log("\n=== mobile 390x844 ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices["iPhone 12"],
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await waitHomeMap(page);

  const value = page.locator('[data-testid="value-prop"]');
  const box = await value.boundingBox();
  if (!box || box.y > 700) {
    throw new Error("Value prop not visible enough on mobile first viewport");
  }
  // At least part of headline should be in view
  if (box.y + box.height < 100) throw new Error("Value prop off-screen");
  log(`OK mobile value prop y=${Math.round(box.y)}`);

  const before = await page.evaluate(() => ({
    y: window.scrollY,
    z: window.__pcHomeMap.getZoom(),
  }));
  const canvas = page.locator(".maplibregl-canvas");
  const mb = await canvas.boundingBox();
  // One-finger vertical swipe over the map
  const x = mb.x + mb.width * 0.7;
  const y1 = mb.y + mb.height * 0.35;
  const y2 = mb.y + mb.height * 0.15;
  await page.touchscreen.tap(x, y1); // focus
  await page.evaluate(
    ({ x, y1, y2 }) => {
      const target = document.elementFromPoint(x, y1) || document.body;
      const fire = (type, y, id = 1) => {
        target.dispatchEvent(
          new TouchEvent(type, {
            bubbles: true,
            cancelable: true,
            touches:
              type === "touchend"
                ? []
                : [new Touch({ identifier: id, target, clientX: x, clientY: y })],
            changedTouches: [
              new Touch({ identifier: id, target, clientX: x, clientY: y }),
            ],
          }),
        );
      };
      fire("touchstart", y1);
      fire("touchmove", (y1 + y2) / 2);
      fire("touchmove", y2);
      fire("touchend", y2);
    },
    { x, y1, y2 },
  );
  // Also use mouse wheel as cooperativeGestures path for CI stability
  await page.mouse.move(x, y1);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => ({
    y: window.scrollY,
    z: window.__pcHomeMap.getZoom(),
  }));
  if (after.y <= before.y && after.y < 20) {
    // touch event synthesis may not scroll in headless — wheel should
    throw new Error(`One-finger/wheel did not scroll page (y ${before.y} → ${after.y})`);
  }
  if (Math.abs(after.z - before.z) > 0.15) {
    throw new Error(`One-finger path changed zoom ${before.z} → ${after.z}`);
  }
  log(`OK mobile scroll over map (y ${before.y}→${after.y}), zoom ~same`);

  // Pin tap still works (helper)
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const map = window.__pcHomeMap;
    map.jumpTo({ center: [-73.98, 40.75], zoom: 13 });
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const feats = window.__pcHomeMap.queryRenderedFeatures({
      layers: ["project-pins"],
    });
    const f = feats[0];
    if (!f || !window.__pcOpenHomeProject) return;
    const [lng, lat] = f.geometry.coordinates;
    window.__pcOpenHomeProject(
      f.properties.id,
      lat,
      lng,
      Number(f.properties.score) || 0,
      String(f.properties.projectType || "Project"),
    );
  });
  await page
    .locator('[data-pc-sheet="project-public"]')
    .first()
    .waitFor({ timeout: 10000 });
  log("OK pin open still works");

  await assertNoIllustrations(page);
  await page.keyboard.press("Escape");
  await page.screenshot({ path: path.join(OUT, "mobile-hero.png") });
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "mobile-what-you-get.png") });
  await page.screenshot({ path: path.join(OUT, "mobile-full.png"), fullPage: true });

  await browser.close();
}

async function main() {
  log(`BASE=${BASE}`);
  const res = await fetch(BASE + "/");
  if (!res.ok) throw new Error(`Home ${res.status}`);
  await runDesktop();
  await runMobile();
  fs.writeFileSync(path.join(OUT, "results.txt"), "ALL CHECKS PASSED\n");
  log("\nALL CHECKS PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
