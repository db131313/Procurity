/**
 * Playwright proof: animated centered carousel hero + intro + menu + scroll.
 * BASE_URL=http://127.0.0.1:3000 node scripts/verify-home-carousel-anim.mjs
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
    {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
      });
      await page.goto(BASE + "/", {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await page.waitForSelector('[data-testid="home-intro"]', {
        timeout: 15000,
      });
      const intro = await page.evaluate(() => {
        const i = document.querySelector('[data-testid="home-intro"]');
        const cap = document.querySelector('[data-testid="car-caption"]');
        return {
          introOpacity: i ? getComputedStyle(i).opacity : null,
          capOpacity: cap ? getComputedStyle(cap).opacity : null,
          hasLogo: !!document.querySelector('[data-testid="home-header"]'),
        };
      });
      await shot(page, "anim-intro-blob-1440.png");
      if (
        intro.hasLogo &&
        Number(intro.introOpacity) > 0.5 &&
        Number(intro.capOpacity || 0) < 0.2
      ) {
        ok("first-load-blob-logo", JSON.stringify(intro));
      } else fail("first-load-blob-logo", JSON.stringify(intro));

      await page.waitForFunction(
        () =>
          getComputedStyle(
            document.querySelector("[data-testid=home-intro]"),
          ).opacity === "0",
        null,
        { timeout: 12000 },
      );
      await page.waitForTimeout(900);
      await shot(page, "anim-reveal-slide1-1440.png");

      // ~56px map peek
      const peek = await page.evaluate(() => {
        const car = document.querySelector("[data-testid=feature-carousel]");
        const swarm = document.querySelector("[data-testid=home-swarm-section]");
        if (!car || !swarm) return null;
        const cr = car.getBoundingClientRect();
        return {
          carBottom: cr.bottom,
          viewport: window.innerHeight,
          peekPx: window.innerHeight - cr.bottom,
        };
      });
      if (peek && peek.peekPx >= 40 && peek.peekPx <= 80) {
        ok("map-peek-56", JSON.stringify(peek));
      } else fail("map-peek-56", JSON.stringify(peek));

      for (let i = 0; i < 5; i++) {
        await page.locator(`[data-testid="car-tab-${i}"]`).click();
        await page.waitForTimeout(500);
        await shot(page, `anim-car-slide-${i}-1440.png`);
      }
      const cap = await page.locator('[data-testid="car-caption"]').innerText();
      ok("desktop-five-slides", `last caption: ${cap}`);

      await page
        .locator('[data-testid="home-swarm-section"]')
        .scrollIntoViewIfNeeded();
      await page.waitForSelector('[data-testid="swarm-canvas"]', {
        timeout: 90000,
      });
      const beforeY = await page.evaluate(() => window.scrollY);
      const box = await page
        .locator('[data-testid="swarm-canvas"]')
        .boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.wheel(0, 800);
        await page.waitForTimeout(300);
      }
      const afterY = await page.evaluate(() => window.scrollY);
      if (afterY > beforeY + 40)
        ok("wheel-over-map-scrolls", `${beforeY}→${afterY}`);
      else fail("wheel-over-map-scrolls", `${beforeY}→${afterY}`);
      await page.close();
    }

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
      await page.waitForSelector('[data-testid="home-burger"]');
      await shot(page, "anim-intro-blob-390.png");
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
      await shot(page, "anim-reveal-390.png");

      await shot(page, "anim-menu-closed-390.png");
      await page.locator('[data-testid="home-burger"]').click();
      await page.waitForTimeout(200);
      await shot(page, "anim-menu-mid-390.png");
      await page.waitForTimeout(500);
      await shot(page, "anim-menu-open-390.png");
      const open = await page.evaluate(
        () =>
          document
            .querySelector("[data-testid=home-menu]")
            ?.getAttribute("aria-hidden") === "false",
      );
      if (open) ok("hamburger-menu-open");
      else fail("hamburger-menu-open");
      await page.locator('[data-testid="home-burger"]').click();
      await page.waitForTimeout(400);

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      if (overflow.scrollWidth <= overflow.clientWidth + 1)
        ok("no-horizontal-scroll-390", JSON.stringify(overflow));
      else fail("no-horizontal-scroll-390", JSON.stringify(overflow));

      await page.locator('[data-testid="car-tab-1"]').click();
      await page.waitForTimeout(500);
      await shot(page, "anim-car-measure-390.png");
      await page.locator('[data-testid="car-tab-2"]').click();
      await page.waitForTimeout(500);
      await shot(page, "anim-car-design-390.png");
      ok("mobile-measure-design");

      await page
        .locator('[data-testid="home-swarm-section"]')
        .scrollIntoViewIfNeeded();
      await page.waitForSelector('[data-testid="swarm-canvas"]', {
        timeout: 90000,
      });
      const beforeY = await page.evaluate(() => window.scrollY);
      const box = await page
        .locator('[data-testid="swarm-canvas"]')
        .boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.wheel(0, 500);
        await page.waitForTimeout(300);
      }
      const afterY = await page.evaluate(() => window.scrollY);
      if (afterY > beforeY + 20)
        ok("touch-or-wheel-scroll-390", `${beforeY}→${afterY}`);
      else fail("touch-or-wheel-scroll-390", `${beforeY}→${afterY}`);
      await page.close();
    }
  } catch (e) {
    fail("script-error", e instanceof Error ? e.message : String(e));
    exit = 1;
  }
  await browser.close();
  fs.writeFileSync(
    path.join(OUT, "home-carousel-anim-verify.json"),
    JSON.stringify(results, null, 2),
  );
  if (results.some((r) => !r.pass)) exit = 1;
  process.exit(exit);
}
main();
