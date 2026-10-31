/**
 * Playwright proof: 5-slide carousel hero (crossfade + per-slide heads + phone up/down + play-once hold).
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
        const hh = document.querySelector('[data-testid="car-header"]');
        return {
          introOpacity: i ? getComputedStyle(i).opacity : null,
          capOpacity: cap ? getComputedStyle(cap).opacity : null,
          hhOpacity: hh ? getComputedStyle(hh).opacity : null,
          hasLogo: !!document.querySelector('[data-testid="home-header"]'),
        };
      });
      await shot(page, "anim-intro-blob-1440.png");
      if (
        intro.hasLogo &&
        Number(intro.introOpacity) > 0.5 &&
        Number(intro.hhOpacity || 0) < 0.2
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

      const layout = await page.evaluate(() => {
        const car = document.querySelector("[data-testid=feature-carousel]");
        const phs = car?.querySelector("[data-testid=car-phone]");
        const hh = document.querySelector("[data-testid=car-header]");
        const cap = document.querySelector("[data-testid=car-caption]");
        const tabs = [...document.querySelectorAll('[role="tab"]')];
        const tabWrap = car?.querySelector('[role="tablist"]');
        const pr = phs ? getComputedStyle(phs) : null;
        const hr = hh ? getComputedStyle(hh) : null;
        const h2 = hh?.querySelector("h2");
        return {
          phoneRight: pr?.right,
          hhFontSize: h2 ? getComputedStyle(h2).fontSize : null,
          capFontSize: cap ? getComputedStyle(cap).fontSize : null,
          capText: cap?.textContent?.trim(),
          headerText: h2?.textContent?.replace(/\s+/g, " ").trim(),
          tabsDisplay: tabWrap ? getComputedStyle(tabWrap).display : null,
          tabAria: tabs.map((t) => t.getAttribute("aria-label")),
          s: car ? getComputedStyle(car).getPropertyValue("--s").trim() : null,
        };
      });
      if (
        layout.tabsDisplay === "none" &&
        layout.tabAria?.length === 5 &&
        layout.tabAria.includes("Discover") &&
        layout.tabAria.includes("Connect") &&
        /Be first to/i.test(layout.headerText || "") &&
        /the job/i.test(layout.headerText || "") &&
        /Find projects ready to buy/i.test(layout.capText || "") &&
        Number.parseFloat(layout.hhFontSize || "0") >= 36 &&
        Number.parseFloat(layout.hhFontSize || "0") <= 80 &&
        Number.parseFloat(layout.capFontSize || "0") >= 18 &&
        Number.parseFloat(layout.capFontSize || "0") < 40
      ) {
        ok("per-slide-header-hidden-tabs", JSON.stringify(layout));
      } else fail("per-slide-header-hidden-tabs", JSON.stringify(layout));

      const videoMeta = await page.evaluate(() => {
        const vids = [
          ...document.querySelectorAll(
            "[data-testid=feature-carousel] video source[type='video/mp4']:not([media])",
          ),
        ]
          .map((s) => s.getAttribute("src"))
          .filter(Boolean);
        return { unique: [...new Set(vids)] };
      });
      const expected = [
        "/home/bg-discover.mp4",
        "/home/field-3.mp4",
        "/home/bg-measure.mp4",
        "/home/bg-design.mp4",
        "/home/bg-quote.mp4",
      ];
      if (
        expected.every((u) => videoMeta.unique.includes(u)) &&
        videoMeta.unique.length === 5 &&
        !videoMeta.unique.some((u) => /invoice/i.test(u || ""))
      ) {
        ok("per-slide-videos", JSON.stringify(videoMeta.unique));
      } else fail("per-slide-videos", JSON.stringify(videoMeta));

      // Safari: first non-media source per video must be MP4, then WebM
      const sourceOrder = await page.evaluate(() => {
        return [...document.querySelectorAll("[data-testid=feature-carousel] video")].map(
          (v) =>
            [...v.querySelectorAll("source:not([media])")].map((s) => ({
              type: s.getAttribute("type"),
              src: s.getAttribute("src"),
            })),
        );
      });
      const orderOk = sourceOrder.every(
        (srcs) =>
          srcs.length >= 2 &&
          srcs[0]?.type === "video/mp4" &&
          srcs[1]?.type === "video/webm",
      );
      if (orderOk) ok("mp4-before-webm", JSON.stringify(sourceOrder).slice(0, 400));
      else fail("mp4-before-webm", JSON.stringify(sourceOrder).slice(0, 400));

      const autoplayAttrs = await page.evaluate(() => {
        const v = document.querySelector("[data-testid=feature-carousel] video");
        return {
          hasAutoplay: v?.hasAttribute("autoplay") ?? false,
          muted: v?.muted ?? null,
          playsInline: v?.hasAttribute("playsinline") ?? false,
        };
      });
      if (autoplayAttrs.hasAutoplay && autoplayAttrs.muted && autoplayAttrs.playsInline) {
        ok("autoplay-muted-playsinline", JSON.stringify(autoplayAttrs));
      } else fail("autoplay-muted-playsinline", JSON.stringify(autoplayAttrs));

      const noControls = await page.evaluate(() => {
        const vids = [...document.querySelectorAll("[data-testid=feature-carousel] video")];
        return {
          count: vids.length,
          anyControls: vids.some((v) => v.hasAttribute("controls") || v.controls),
          peNone: vids.every((v) => getComputedStyle(v).pointerEvents === "none"),
        };
      });
      if (noControls.count >= 5 && !noControls.anyControls && noControls.peNone) {
        ok("no-play-button", JSON.stringify(noControls));
      } else fail("no-play-button", JSON.stringify(noControls));

      const car = page.locator('[data-testid="feature-carousel"]');
      await car.focus();
      const captions = [];
      const heads = [];
      for (let i = 0; i < 5; i++) {
        if (i > 0) {
          await page.keyboard.press("ArrowRight");
          await page.waitForTimeout(1000);
        } else {
          await page.waitForTimeout(400);
        }
        captions.push(
          (await page.locator('[data-testid="car-caption"]').innerText()).trim(),
        );
        heads.push(
          (await page.locator('[data-testid="car-header"] h2').innerText())
            .replace(/\s+/g, " ")
            .trim(),
        );
        await shot(page, `anim-car-slide-${i}-1440.png`);
      }
      const expectedCaps = [
        /Find projects ready to buy/i,
        /Contacts for every site/i,
        /Point your phone/i,
        /Preview it on their storefront/i,
        /Price it and win the job/i,
      ];
      const expectedHeads = [
        /Be first to.*the job/i,
        /Reach the.*right person/i,
        /Measure it.*on the spot/i,
        /Show it before.*you build it/i,
        /Send the estimate.*before you leave/i,
      ];
      if (
        captions.length === 5 &&
        expectedCaps.every((re, i) => re.test(captions[i] || "")) &&
        expectedHeads.every((re, i) => re.test(heads[i] || ""))
      ) {
        ok("desktop-five-slides", JSON.stringify({ captions, heads }));
      } else fail("desktop-five-slides", JSON.stringify({ captions, heads }));

      // Discover fire pin + Design card UI (Connect/Estimate style, no AR/3D)
      const screenBits = await page.evaluate(() => {
        const fire = document.querySelector('[data-testid="car-screen-discover"] [class*="bgFire"]');
        const flameSvg = fire?.querySelector("svg");
        const dzd = document.querySelector('[data-testid="car-screen-design"] [class*="dzd"]');
        const title = dzd?.querySelector("b")?.textContent?.trim();
        const pills = dzd ? [...dzd.querySelectorAll('[class*="dzp"] u')].map((u) => u.textContent?.trim()) : [];
        const ar = document.querySelector('[data-testid="car-screen-design"] [class*="arg"], [data-testid="car-screen-design"] [class*="ext"]');
        return {
          hasFire: !!fire && !!flameSvg,
          hasCard: !!dzd,
          title,
          pills,
          hasArLayers: !!ar,
        };
      });
      if (
        screenBits.hasFire &&
        screenBits.hasCard &&
        /Sign design/i.test(screenBits.title || "") &&
        screenBits.pills?.includes("Bold") &&
        screenBits.pills?.includes("Halo-lit") &&
        !screenBits.hasArLayers
      ) {
        ok("fire-pin-and-design-card", JSON.stringify(screenBits));
      } else fail("fire-pin-and-design-card", JSON.stringify(screenBits));
      const animUrls = [
        "/home/bg-discover.webp",
        "/home/field-3.webp",
        "/home/bg-measure.webp",
        "/home/bg-design.webp",
        "/home/bg-quote.webp",
      ];
      const animOk = [];
      for (const u of animUrls) {
        const res = await page.request.get(new URL(u, BASE).href);
        animOk.push({ u, status: res.status(), len: Number(res.headers()["content-length"] || 0) });
      }
      if (animOk.every((x) => x.status === 200 && x.len > 50_000)) {
        ok("anim-webp-assets", JSON.stringify(animOk));
      } else fail("anim-webp-assets", JSON.stringify(animOk));

      // Phone up/down: Measure (duration 7.3s, phone.in 1.8s, phone.out 6.4s)
      for (let n = 0; n < 6; n++) {
        const cap = (await page.locator('[data-testid="car-caption"]').innerText()).trim();
        if (/Point your phone/i.test(cap)) break;
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(700);
      }
      await page.waitForTimeout(2200); // past phone.in
      const phoneMid = await page.evaluate(() => {
        const phs = document.querySelector("[data-testid=car-phone]");
        const dev = phs?.querySelector("[class*='dev']");
        return {
          opacity: dev ? Number(getComputedStyle(dev).opacity) : 0,
          show: phs?.className.includes("phsShow") || false,
        };
      });
      // Wait until after hide (duration-900); slide still on Measure briefly
      await page.waitForTimeout(4500);
      const phoneLate = await page.evaluate(() => {
        const phs = document.querySelector("[data-testid=car-phone]");
        const dev = phs?.querySelector("[class*='dev']");
        return {
          opacity: dev ? Number(getComputedStyle(dev).opacity) : 0,
          show: phs?.className.includes("phsShow") || false,
          cap: document.querySelector("[data-testid=car-caption]")?.textContent?.trim(),
        };
      });
      const loopOff = await page.evaluate(() => {
        const v = document.querySelector("[data-testid=feature-carousel] video");
        return { loop: v?.loop ?? null, hasLoopAttr: v?.hasAttribute("loop") ?? null };
      });
      if (phoneMid.opacity > 0.5 && phoneLate.opacity < 0.5 && loopOff.loop === false) {
        ok("phone-up-down-and-play-once", JSON.stringify({ phoneMid, phoneLate, loopOff }));
      } else fail("phone-up-down-and-play-once", JSON.stringify({ phoneMid, phoneLate, loopOff }));

      // Crossfade: active video opacity ~1, others ~0 (not translate)
      const fade = await page.evaluate(() => {
        const vids = [
          ...document.querySelectorAll("[data-testid=feature-carousel] video"),
        ];
        return vids.map((v) => ({
          opacity: getComputedStyle(v).opacity,
          transform: getComputedStyle(v).transform,
          src: v.querySelector("source[type='video/mp4']")?.getAttribute("src"),
        }));
      });
      const on = fade.filter((v) => Number(v.opacity) > 0.5);
      const hasTranslateSlide = fade.some((v) =>
        /matrix.*[^,]*,\s*(-?\d{2,})/.test(v.transform || ""),
      );
      if (on.length >= 1 && !hasTranslateSlide) {
        ok("crossfade-opacity", JSON.stringify(fade).slice(0, 500));
      } else fail("crossfade-opacity", JSON.stringify(fade).slice(0, 500));

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

      const mobileLayout = await page.evaluate(() => {
        const car = document.querySelector("[data-testid=feature-carousel]");
        const phs = car?.querySelector("[data-testid=car-phone]");
        const hh = document.querySelector("[data-testid=car-header]");
        return {
          phoneTop: phs ? getComputedStyle(phs).top : null,
          s: car ? getComputedStyle(car).getPropertyValue("--s").trim() : null,
          hhAlign: hh ? getComputedStyle(hh).textAlign : null,
        };
      });
      if (
        Number.parseFloat(mobileLayout.s || "0") >= 0.6 &&
        mobileLayout.hhAlign === "center"
      ) {
        ok("mobile-header-phone-layout", JSON.stringify(mobileLayout));
      } else fail("mobile-header-phone-layout", JSON.stringify(mobileLayout));

      await page.locator('[data-testid="feature-carousel"]').focus();
      // Discover → Connect → Measure → Design
      for (let i = 0; i < 2; i++) {
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(900);
      }
      await shot(page, "anim-car-measure-390.png");
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(1200);
      await shot(page, "anim-car-design-390.png");
      const mobileScreens = await page.evaluate(() => {
        const cap = document.querySelector("[data-testid=car-caption]")?.textContent || "";
        const head = document.querySelector("[data-testid=car-header] h2")?.textContent || "";
        return { cap: cap.trim(), head: head.replace(/\s+/g, " ").trim() };
      });
      if (/Preview it on their storefront/i.test(mobileScreens.cap) && /build it/i.test(mobileScreens.head)) {
        ok("mobile-measure-design", JSON.stringify(mobileScreens));
      } else fail("mobile-measure-design", JSON.stringify(mobileScreens));

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
