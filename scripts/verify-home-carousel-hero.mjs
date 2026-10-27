/**
 * Playwright proof: carousel-as-hero, intro blob, hamburger, scroll fix.
 *
 *   BASE_URL=http://127.0.0.1:3000 node scripts/verify-home-carousel-hero.mjs
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
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  let exit = 0;
  try {
    // —— Desktop ——
    {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
      });
      await page.goto(BASE + "/", {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });

      // (1) first-load: intro blob + logo visible; carousel copy hidden
      await page.waitForSelector('[data-testid="home-intro"]', {
        timeout: 15000,
      });
      const introVisible = await page.evaluate(() => {
        const intro = document.querySelector('[data-testid="home-intro"]');
        const logo = document.querySelector('[data-testid="home-header"]');
        const copy = document.querySelector('[data-testid="car-copy"]');
        const cs = intro && getComputedStyle(intro);
        return {
          introOpacity: cs?.opacity,
          hasLogo: !!logo,
          copyOpacity: copy ? getComputedStyle(copy).opacity : null,
        };
      });
      await shot(page, "hero-intro-blob-1440.png");
      if (
        introVisible.hasLogo &&
        Number(introVisible.introOpacity) > 0.5 &&
        Number(introVisible.copyOpacity || 0) < 0.2
      ) {
        ok("first-load-blob-logo", JSON.stringify(introVisible));
      } else {
        fail("first-load-blob-logo", JSON.stringify(introVisible));
      }

      // (2) wait for reveal
      await page.waitForFunction(
        () =>
          document
            .querySelector("[data-testid=home-shell]")
            ?.className.includes("ready") ||
          getComputedStyle(
            document.querySelector("[data-testid=home-intro]"),
          ).opacity === "0",
        null,
        { timeout: 12000 },
      );
      await page.waitForTimeout(800);
      await shot(page, "hero-reveal-slide1-1440.png");
      ok("reveal-slide-1");

      // Five slides
      for (let i = 0; i < 5; i++) {
        await page.locator(`[data-testid="car-tab-${i}"]`).click();
        await page.waitForTimeout(400);
        await shot(page, `hero-car-slide-${i}-1440.png`);
      }
      ok("desktop-five-slides");

      // Scroll to map; wheel over canvas
      await page.locator('[data-testid="home-swarm-section"]').scrollIntoViewIfNeeded();
      await page.waitForSelector('[data-testid="swarm-canvas"]', {
        timeout: 90000,
      });
      await page.waitForTimeout(500);
      const beforeY = await page.evaluate(() => window.scrollY);
      const box = await page.locator('[data-testid="swarm-canvas"]').boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.wheel(0, 800);
        await page.waitForTimeout(300);
      }
      const afterY = await page.evaluate(() => window.scrollY);
      if (afterY > beforeY + 40) ok("wheel-over-map-scrolls", `${beforeY}→${afterY}`);
      else fail("wheel-over-map-scrolls", `${beforeY}→${afterY}`);

      await page.close();
    }

    // —— Mobile 390 ——
    {
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      });
      await page.goto(BASE + "/", {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await page.waitForSelector('[data-testid="home-intro"]');
      await shot(page, "hero-intro-blob-390.png");

      // Burger visible during intro
      const burger = page.locator('[data-testid="home-burger"]');
      await burger.waitFor({ state: "visible" });
      ok("burger-visible-on-mobile");

      await page.waitForFunction(
        () =>
          getComputedStyle(
            document.querySelector("[data-testid=home-intro]"),
          ).opacity === "0",
        null,
        { timeout: 12000 },
      );
      await page.waitForTimeout(600);
      await shot(page, "hero-reveal-390.png");

      // Hamburger: closed → mid → open
      await shot(page, "hero-menu-closed-390.png");
      await burger.click();
      await page.waitForTimeout(200);
      await shot(page, "hero-menu-mid-390.png");
      await page.waitForTimeout(500);
      await shot(page, "hero-menu-open-390.png");
      const menuOpen = await page.evaluate(
        () =>
          document
            .querySelector("[data-testid=home-menu]")
            ?.className.includes("menuOpen") ||
          document
            .querySelector("[data-testid=home-menu]")
            ?.getAttribute("aria-hidden") === "false",
      );
      if (menuOpen) ok("hamburger-menu-open");
      else fail("hamburger-menu-open");
      await burger.click();
      await page.waitForTimeout(400);

      // No horizontal scroll
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      if (overflow.scrollWidth <= overflow.clientWidth + 1) {
        ok("no-horizontal-scroll-390", JSON.stringify(overflow));
      } else fail("no-horizontal-scroll-390", JSON.stringify(overflow));

      // Measure + Design (phone should be centered / fully visible)
      await page.locator('[data-testid="car-tab-1"]').click();
      await page.waitForTimeout(400);
      await shot(page, "hero-car-measure-390.png");
      await page.locator('[data-testid="car-tab-2"]').click();
      await page.waitForTimeout(400);
      await shot(page, "hero-car-design-390.png");
      ok("mobile-measure-design");

      // Touch/wheel scroll over map
      await page.locator('[data-testid="home-swarm-section"]').scrollIntoViewIfNeeded();
      await page.waitForSelector('[data-testid="swarm-canvas"]', {
        timeout: 90000,
      });
      const beforeY = await page.evaluate(() => window.scrollY);
      const box = await page.locator('[data-testid="swarm-canvas"]').boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.wheel(0, 500);
        await page.waitForTimeout(300);
      }
      const afterY = await page.evaluate(() => window.scrollY);
      if (afterY > beforeY + 20) ok("touch-or-wheel-scroll-390", `${beforeY}→${afterY}`);
      else fail("touch-or-wheel-scroll-390", `${beforeY}→${afterY}`);

      await page.close();
    }
  } catch (e) {
    fail("script-error", e instanceof Error ? e.message : String(e));
    exit = 1;
  }

  await browser.close();
  const summary = path.join(OUT, "home-carousel-hero-verify.json");
  fs.writeFileSync(summary, JSON.stringify(results, null, 2));
  console.log("summary", summary);
  if (results.some((r) => !r.pass)) exit = 1;
  process.exit(exit);
}

main();
