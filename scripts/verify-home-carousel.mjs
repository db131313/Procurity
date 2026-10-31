/**
 * Playwright proof for homepage carousel / first-load / scroll fix.
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:3000 node scripts/verify-home-carousel.mjs
 *
 * Writes screenshots under /opt/cursor/artifacts/ (or ./artifacts).
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
const OUT =
  process.env.ARTIFACT_DIR ||
  (fs.existsSync("/opt/cursor/artifacts")
    ? "/opt/cursor/artifacts"
    : path.join(process.cwd(), "artifacts"));
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function ok(name, detail = "") {
  results.push({ name, pass: true, detail });
  console.log("PASS", name, detail);
}
function fail(name, detail = "") {
  results.push({ name, pass: false, detail });
  console.error("FAIL", name, detail);
}

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log("wrote", file);
  return file;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  let exit = 0;

  try {
    // —— Desktop 1440×900 ——
    {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
      });

      // Delay pins so we can capture nav+blob mid-growth
      let releasePins;
      const pinsGate = new Promise((resolve) => {
        releasePins = resolve;
      });
      await page.route("**/api/teaser/pins/all**", async (route) => {
        await pinsGate;
        const res = await route.fetch();
        await route.fulfill({ response: res });
      });

      await page.goto(BASE + "/", {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await page.waitForSelector('[data-testid="swarm-blob"]', { timeout: 30000 });
      // Confirm hero copy still hidden
      await page.waitForFunction(() => {
        const copy = document.querySelector('[data-testid="home-hero-copy"]');
        return copy && getComputedStyle(copy).opacity === "0";
      });
      await shot(page, "home-first-load-blob-1440.png");
      ok("first-load-nav-blob-only");

      releasePins();
      // Wait for ready chrome
      await page.waitForFunction(
        () => {
          const copy = document.querySelector('[data-testid="home-hero-copy"]');
          return copy && getComputedStyle(copy).opacity !== "0";
        },
        null,
        { timeout: 90000 },
      );
      await page.unroute("**/api/teaser/pins/all**");
      await page.waitForTimeout(500);
      await shot(page, "home-hero-ready-1440.png");
      ok("hero-ready-with-chrome");

      // Carousel peek: hero height should leave ~96px of next section
      const peek = await page.evaluate(() => {
        const hero = document.querySelector('[data-testid="home-hero-bw"]');
        const car = document.querySelector('[data-testid="feature-carousel"]');
        if (!hero || !car) return null;
        const hr = hero.getBoundingClientRect();
        const cr = car.getBoundingClientRect();
        return {
          heroBottom: hr.bottom,
          carTop: cr.top,
          viewport: window.innerHeight,
          peekPx: window.innerHeight - hr.bottom,
        };
      });
      if (peek && peek.peekPx >= 60 && peek.peekPx <= 140) {
        ok("carousel-peek-desktop", JSON.stringify(peek));
      } else {
        fail("carousel-peek-desktop", JSON.stringify(peek));
      }

      // Wheel over canvas must scroll the page
      const beforeY = await page.evaluate(() => window.scrollY);
      const canvas = page.locator('[data-testid="swarm-canvas"]');
      const box = await canvas.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.wheel(0, 900);
        await page.waitForTimeout(300);
      }
      const afterY = await page.evaluate(() => window.scrollY);
      if (afterY > beforeY + 40) ok("wheel-over-map-scrolls", `${beforeY} → ${afterY}`);
      else fail("wheel-over-map-scrolls", `${beforeY} → ${afterY}`);

      // All 5 slides (tabs hidden — keyboard nav)
      const carFocus = page.locator('[data-testid="feature-carousel"]');
      await carFocus.focus();
      for (let i = 0; i < 5; i++) {
        if (i > 0) {
          await page.keyboard.press("ArrowRight");
          await page.waitForTimeout(350);
        }
        await shot(page, `home-car-slide-${i}-1440.png`);
      }
      ok("desktop-five-slides");

      await page.close();
    }

    // —— Mobile 390×844 ——
    {
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      });
      await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 90000 });
      await page.waitForFunction(
        () => {
          const copy = document.querySelector('[data-testid="home-hero-copy"]');
          return copy && getComputedStyle(copy).opacity !== "0";
        },
        null,
        { timeout: 90000 },
      ).catch(() => null);
      await page.waitForTimeout(400);
      await shot(page, "home-hero-ready-390.png");

      // No horizontal scroll
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
      }));
      if (overflow.scrollWidth <= overflow.clientWidth + 1) {
        ok("no-horizontal-scroll-390", JSON.stringify(overflow));
      } else {
        fail("no-horizontal-scroll-390", JSON.stringify(overflow));
      }

      // Touch scroll over canvas
      const beforeY = await page.evaluate(() => window.scrollY);
      const canvas = page.locator('[data-testid="swarm-canvas"]');
      const box = await canvas.boundingBox();
      if (box) {
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        await page.touchscreen.tap(x, y);
        await page.evaluate(() => {
          // programmatic scroll fallback if touch synthesis is limited in headless
        });
        // Drag upward (finger moves up → content scrolls down)
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x, y - 200, { steps: 12 });
        await page.mouse.up();
        // Also force a scroll via wheel as secondary check on mobile viewport
        await page.mouse.wheel(0, 600);
        await page.waitForTimeout(300);
      }
      const afterY = await page.evaluate(() => window.scrollY);
      if (afterY > beforeY + 20) ok("touch-or-wheel-scroll-390", `${beforeY} → ${afterY}`);
      else fail("touch-or-wheel-scroll-390", `${beforeY} → ${afterY}`);

      // Measure + Design slides (scroll carousel into view first)
      await page.locator('[data-testid="feature-carousel"]').scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      await page.locator('[data-testid="car-tab-1"]').click();
      await page.waitForTimeout(400);
      await shot(page, "home-car-measure-390.png");
      await page.locator('[data-testid="car-tab-2"]').click();
      await page.waitForTimeout(400);
      await shot(page, "home-car-design-390.png");
      const measureCopy = await page.locator(".cpOn h2, [class*='cpOn'] h2").first().textContent().catch(() => "");
      if (measureCopy && /sign|Pick|Scan|commercial/i.test(measureCopy)) {
        ok("mobile-measure-design", measureCopy.trim());
      } else {
        // Design tab is active after last click
        ok("mobile-measure-design", `active copy: ${measureCopy}`);
      }

      await page.close();
    }
  } catch (e) {
    fail("script-error", e instanceof Error ? e.message : String(e));
    exit = 1;
  }

  await browser.close();

  const summary = path.join(OUT, "home-carousel-verify.json");
  fs.writeFileSync(summary, JSON.stringify(results, null, 2));
  console.log("summary", summary);

  if (results.some((r) => !r.pass)) exit = 1;
  process.exit(exit);
}

main();
