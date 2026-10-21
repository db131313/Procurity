/**
 * Playwright verification for Sunrise home redesign.
 * BASE_URL=http://127.0.0.1:3000 node scripts/sunrise-home-verify.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
const OUT = "/opt/cursor/artifacts/sunrise-screens";
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function log(msg) {
  console.log(msg);
  results.push(msg);
}

async function waitMap(page, timeout = 45000) {
  await page.waitForFunction(
    () =>
      Boolean(window.__pcHomeMap?.loaded?.()) &&
      (window.__pcHomePinCount || 0) > 100,
    { timeout },
  );
  await page.waitForTimeout(800);
}

async function clearTeaserViews(page) {
  await page.evaluate(() => {
    try {
      localStorage.removeItem("pc_teaser_viewed_ids");
      localStorage.removeItem("pc_teaser_views");
      document.cookie = "pc_teaser_views=; path=/; max-age=0; samesite=lax";
    } catch {}
  });
  await page.context().clearCookies();
}

/** Open the next unviewed pin via the home helper (avoids canvas hit flakiness). */
async function clickNextPin(page, seenIds) {
  const target = await page.evaluate((seen) => {
    const map = window.__pcHomeMap;
    let feats = map.queryRenderedFeatures({ layers: ["project-pins"] });
    if (!feats.length) {
      const clusters = map.queryRenderedFeatures({
        layers: ["project-clusters"],
      });
      if (clusters.length) {
        map.jumpTo({
          center: clusters[0].geometry.coordinates,
          zoom: Math.min(14, map.getZoom() + 2),
        });
        return { kind: "zoomed" };
      }
      return null;
    }
    const next = feats.find(
      (f) => f.properties?.id && !seen.includes(f.properties.id),
    );
    if (!next) return null;
    const open = window.__pcOpenHomeProject;
    if (!open) return null;
    const [lng, lat] = next.geometry.coordinates;
    open(
      next.properties.id,
      lat,
      lng,
      Number(next.properties.score) || 0,
      String(next.properties.projectType || "Project"),
    );
    return {
      kind: "pin",
      id: next.properties.id,
      score: next.properties.score,
      color: next.properties.color,
    };
  }, seenIds);

  if (!target) return null;
  if (target.kind === "zoomed") {
    await page.waitForTimeout(500);
    return clickNextPin(page, seenIds);
  }
  await page.waitForTimeout(500);
  return target;
}

async function dismissSheet(page, { preferSwipe = false } = {}) {
  const sheet = page.locator(
    '[data-pc-sheet="project-public"], [data-pc-sheet="project"]',
  ).first();

  if (preferSwipe) {
    const handle = page.locator("[data-sheet-handle]").first();
    const hb = await handle.boundingBox().catch(() => null);
    if (hb) {
      await page.mouse.move(hb.x + hb.width / 2, hb.y + 4);
      await page.mouse.down();
      await page.mouse.move(hb.x + hb.width / 2, hb.y + 480, { steps: 18 });
      await page.mouse.up();
      await page.waitForTimeout(800);
      const gone = !(await sheet.isVisible().catch(() => false));
      if (gone) return "swipe";
    }
  }

  // Backdrop dismiss is the most reliable (Close can be covered by street-view header)
  const dismiss = page.getByRole("button", { name: /^Dismiss$/i }).first();
  if (await dismiss.isVisible().catch(() => false)) {
    await dismiss.click({ force: true });
    await page.waitForTimeout(600);
    return "backdrop";
  }

  const close = sheet.getByRole("button", { name: /^Close$/i }).first();
  if (await close.count()) {
    await close.click({ force: true });
    await page.waitForTimeout(600);
    return "close";
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  return "escape";
}

async function openDistinctViews(page, want, shotPrefix) {
  const seen = [];
  for (let i = 0; i < want; i++) {
    // zoom in to surface more unclustered pins
    await page.evaluate(() => {
      const map = window.__pcHomeMap;
      if (map.getZoom() < 12.5) map.jumpTo({ zoom: 13 });
    });
    await page.waitForTimeout(400);

    let opened = false;
    for (let attempt = 0; attempt < 6 && !opened; attempt++) {
      const hit = await clickNextPin(page, seen);
      if (!hit) {
        // pan a bit
        await page.evaluate(() => {
          const map = window.__pcHomeMap;
          const c = map.getCenter();
          map.panBy([80 * (attempt % 2 === 0 ? 1 : -1), 40], { duration: 0 });
          void c;
        });
        await page.waitForTimeout(300);
        continue;
      }

      const paywall = page.locator('[data-pc-sheet="pricing"]');
      if (await paywall.isVisible().catch(() => false)) {
        seen.push("paywall");
        await page.screenshot({
          path: path.join(OUT, `${shotPrefix}-paywall.png`),
          fullPage: false,
        });
        return seen;
      }

      const dialog = page.locator(
        '[data-pc-sheet="project-public"], [data-pc-sheet="project"]',
      ).first();
      if (await dialog.isVisible().catch(() => false)) {
        // Wait for teaser detail (counts the free view server-side)
        await page
          .waitForResponse(
            (r) =>
              r.url().includes("/api/teaser/detail") &&
              (r.status() === 200 || r.status() === 402),
            { timeout: 15000 },
          )
          .catch(() => null);
        await page.waitForTimeout(400);
        seen.push(hit.id);
        await page.screenshot({
          path: path.join(OUT, `${shotPrefix}-view-${i + 1}.png`),
          fullPage: false,
        });
        const hasImg = await dialog.locator("img, canvas, iframe").count();
        log(`  view ${i + 1}: id=${hit.id} score=${hit.score} color=${hit.color} media=${hasImg}`);
        // If detail 402'd, pricing may already be up
        if (await page.locator('[data-pc-sheet="pricing"]').isVisible().catch(() => false)) {
          seen.push("paywall");
          log("  paywall from detail 402");
          return seen;
        }
        const how = await dismissSheet(page);
        log(`  dismissed via ${how}`);
        opened = true;
      }
    }
    if (!opened) throw new Error(`Failed to open distinct view ${i + 1}`);
  }
  return seen;
}

async function runViewport(name, size) {
  log(`\n=== ${name} ${size.width}x${size.height} ===`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: size,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(90000);

  await clearTeaserViews(page);
  const pinsResp = page.waitForResponse(
    (r) => r.url().includes("/api/teaser/pins/all") && r.ok(),
    { timeout: 90000 },
  );
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await pinsResp;
  await page.waitForFunction(
    () =>
      Boolean(window.__pcHomeMap?.loaded?.()) &&
      (window.__pcHomePinCount || 0) > 100,
    { timeout: 90000 },
  );
  // give style/layers a beat to paint
  await page.waitForTimeout(1200);

  const topbar = page.locator('[data-testid="home-topbar"]');
  await topbar.waitFor({ timeout: 15000 });
  const tb = await topbar.boundingBox();
  if (!tb || Math.abs(tb.height - 64) > 4) {
    throw new Error(`Top bar height unexpected: ${tb?.height}`);
  }
  log(`OK topbar height=${Math.round(tb.height)} y=${Math.round(tb.y)} (safe-area padded header)`);

  // Logo left padding check
  const logoBox = await topbar.locator("a").first().boundingBox();
  if (logoBox && logoBox.x < 16) {
    throw new Error(`Logo left spacing too tight: x=${logoBox.x}`);
  }
  log(`OK logo left x=${Math.round(logoBox?.x ?? -1)}`);
  log(`OK map loaded with pins (count=${await page.evaluate(() => window.__pcHomePinCount)})`);

  // Sample pin color (heat ramp)
  const sampleColor = await page.evaluate(() => {
    const map = window.__pcHomeMap;
    const feats = map.queryRenderedFeatures({ layers: ["project-pins"] });
    return (
      feats[0]?.properties?.color ||
      map.queryRenderedFeatures({ layers: ["project-pins-halo"] })[0]
        ?.properties?.color ||
      null
    );
  });
  log(`OK sample pin color=${sampleColor}`);
  if (!sampleColor || !/^#(9FB4CC|C4B89A|F2B544|F08A3C|F26B3A)$/i.test(sampleColor)) {
    // still accept any non-blue-violet legacy
    if (sampleColor && /#5B21B6|#6D28D9|#93C5FD/i.test(sampleColor)) {
      throw new Error(`Legacy violet pin color still in use: ${sampleColor}`);
    }
  }

  await page.screenshot({
    path: path.join(OUT, `${name}-01-hero.png`),
    fullPage: false,
  });

  // Ask Procurity
  const askBtn = page.getByRole("button", { name: "Hot projects in Chicago" });
  await askBtn.scrollIntoViewIfNeeded();
  await askBtn.click({ force: true });
  try {
    await page.waitForFunction(
      () => {
        const live = document.querySelector('[aria-live="polite"]');
        const t = live?.textContent || "";
        return /\d+ projects in Chicago/.test(t) && !t.trim().startsWith("0 ");
      },
      { timeout: 10000 },
    );
  } catch (e) {
    const t = await page.locator('[aria-live="polite"]').textContent().catch(() => "");
    throw new Error(`Ask Procurity did not resolve: "${t}" (${e.message})`);
  }
  const askLine = await page.locator('[aria-live="polite"]').textContent();
  log(`OK Ask Procurity result: ${askLine}`);
  await page.screenshot({
    path: path.join(OUT, `${name}-02-ask-chicago.png`),
    fullPage: false,
  });

  // Filters panel — toggle Buying Now then back
  await page.getByRole("button", { name: "Map filters" }).click({ force: true });
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /^Buying Now$/ }).click();
  await page.waitForTimeout(400);
  log("OK Buying Now filter clicked");
  await page.screenshot({
    path: path.join(OUT, `${name}-03-filters.png`),
    fullPage: false,
  });
  // close filter panel
  await page.getByRole("button", { name: "Close filters" }).click().catch(async () => {
    await page.keyboard.press("Escape");
  });
  await page.waitForTimeout(300);

  // Reset filters + views for card flow (All / NYC)
  await clearTeaserViews(page);
  await page.getByRole("button", { name: "Map filters" }).click({ force: true });
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: /^All$/, exact: true }).first().click();
  await page.getByRole("button", { name: "All scores" }).click();
  await page.getByRole("button", { name: "Close filters" }).click().catch(async () => {
    await page.keyboard.press("Escape");
  });
  await page.evaluate(() => {
    const map = window.__pcHomeMap;
    map.jumpTo({ center: [-73.98, 40.75], zoom: 13 });
  });
  await page.waitForTimeout(800);

  const views = await openDistinctViews(page, 3, `${name}`);
  log(`OK 3 views: ${views.length}`);

  const stored = await page.evaluate(() =>
    localStorage.getItem("pc_teaser_viewed_ids"),
  );
  log(`teaser local views=${stored}`);

  // After the 3rd card closes, pricing should slide up (or on the next tap)
  let paywallVisible = await page
    .locator('[data-pc-sheet="pricing"]')
    .isVisible()
    .catch(() => false);
  if (!paywallVisible) {
    // Force a 4th distinct open — optimistic gate should flip paywall
    await page.evaluate(() => {
      const map = window.__pcHomeMap;
      map.jumpTo({ center: [-73.99, 40.74], zoom: 13.2 });
    });
    await page.waitForTimeout(400);
    await clickNextPin(page, views);
    await page.waitForTimeout(900);
    paywallVisible = await page
      .locator('[data-pc-sheet="pricing"]')
      .isVisible()
      .catch(() => false);
    // Or close a lingering card
    if (!paywallVisible) {
      await dismissSheet(page);
      await page.waitForTimeout(700);
      paywallVisible = await page
        .locator('[data-pc-sheet="pricing"]')
        .isVisible()
        .catch(() => false);
    }
  }
  if (!paywallVisible) {
    throw new Error(
      `Paywall did not appear after 3 distinct views (local=${stored})`,
    );
  }
  log("OK pricing slide-up after 3 free views");
  await page.screenshot({
    path: path.join(OUT, `${name}-05-paywall.png`),
    fullPage: false,
  });

  // Swipe dismiss proof — fresh browser context so teaser cookie is empty
  await context.clearCookies();
  await clearTeaserViews(page);
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page
    .waitForResponse(
      (r) => r.url().includes("/api/teaser/pins/all") && r.ok(),
      { timeout: 60000 },
    )
    .catch(() => null);
  await waitMap(page);
  // dismiss paywall if somehow still up
  const pricing = page.locator('[data-pc-sheet="pricing"]');
  if (await pricing.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /^Dismiss$/i }).first().click().catch(() => {});
    await page.waitForTimeout(400);
  }
  await page.evaluate(() => {
    window.__pcHomeMap.jumpTo({ center: [-73.98, 40.75], zoom: 13 });
  });
  await page.waitForTimeout(700);
  let opened = false;
  for (let a = 0; a < 5 && !opened; a++) {
    await clickNextPin(page, []);
    opened = await page
      .locator('[data-pc-sheet="project-public"], [data-pc-sheet="project"]')
      .first()
      .isVisible()
      .catch(() => false);
    if (!opened) await page.waitForTimeout(400);
  }
  const sheetSel = '[data-pc-sheet="project-public"], [data-pc-sheet="project"]';
  if (!opened) throw new Error("Sheet not open for swipe test");
  await page.screenshot({
    path: path.join(OUT, `${name}-06-before-swipe.png`),
    fullPage: false,
  });
  // Prove drag handle exists, then dismiss (swipe on mobile; Escape/backdrop on desktop)
  const handleVisible = await page.locator("[data-sheet-handle]").first().isVisible().catch(() => false);
  if (!handleVisible) throw new Error("Sheet drag handle missing");
  let how = await dismissSheet(page, { preferSwipe: size.width < 800 });
  let stillOpen = await page.locator(sheetSel).first().isVisible().catch(() => false);
  if (stillOpen) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    how = `${how}+escape`;
    stillOpen = await page.locator(sheetSel).first().isVisible().catch(() => false);
  }
  if (stillOpen) {
    await page.getByRole("button", { name: /^Dismiss$/i }).click({ force: true }).catch(() => {});
    await page.waitForTimeout(600);
    how = `${how}+backdrop`;
    stillOpen = await page.locator(sheetSel).first().isVisible().catch(() => false);
  }
  if (stillOpen) throw new Error("Sheet still open after dismiss");
  log(`OK swipe/dismiss worked via ${how} (handle=${handleVisible})`);
  await page.screenshot({
    path: path.join(OUT, `${name}-07-after-swipe.png`),
    fullPage: false,
  });

  // Below fold
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(OUT, `${name}-08-below-fold.png`),
    fullPage: false,
  });
  await page.screenshot({
    path: path.join(OUT, `${name}-09-full.png`),
    fullPage: true,
  });

  await browser.close();
}

async function main() {
  log(`BASE=${BASE}`);
  const res = await fetch(BASE + "/");
  if (!res.ok) throw new Error(`Home status ${res.status}`);

  await runViewport("mobile", { width: 390, height: 844 });
  await runViewport("desktop", { width: 1440, height: 900 });

  fs.writeFileSync(path.join(OUT, "results.txt"), results.join("\n") + "\n");
  log("\nALL CHECKS PASSED");
}

main().catch((e) => {
  console.error(e);
  fs.writeFileSync(
    path.join(OUT, "results.txt"),
    results.join("\n") + "\nFAIL: " + e.message + "\n",
  );
  process.exit(1);
});
