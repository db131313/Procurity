import { chromium } from "playwright";
import fs from "fs";

const TARGETS = [
  { name: "local", url: "http://127.0.0.1:3000/" },
  { name: "prod", url: "https://procurity.pro/" },
];

async function probe(name, url) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    // clear cookies — logged out
  });
  const page = await context.newPage();
  const consoleLogs = [];
  const pageErrors = [];
  const failed = [];
  const responses = [];

  page.on("console", (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });
  page.on("pageerror", (err) => {
    pageErrors.push(String(err));
  });
  page.on("requestfailed", (req) => {
    failed.push({
      url: req.url(),
      failure: req.failure()?.errorText,
      method: req.method(),
    });
  });
  page.on("response", async (res) => {
    const u = res.url();
    if (
      u.includes("maplibre") ||
      u.includes("openfreemap") ||
      u.includes("demotiles") ||
      u.includes("tiles") ||
      u.includes("/api/teaser") ||
      u.includes("style")
    ) {
      responses.push({
        url: u.slice(0, 180),
        status: res.status(),
        ct: res.headers()["content-type"],
      });
    }
  });

  const result = {
    name,
    url,
    finalUrl: null,
    title: null,
    mapCanvas: null,
    containerSize: null,
    readyState: null,
    consoleLogs,
    pageErrors,
    failed,
    responses,
  };

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    result.finalUrl = page.url();
    result.title = await page.title();

    // Wait a bit for map load
    await page.waitForTimeout(8000);

    result.containerSize = await page.evaluate(() => {
      const el = document.querySelector('[role="application"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height, children: el.children.length };
    });

    result.mapCanvas = await page.evaluate(() => {
      const canvas = document.querySelector(".maplibregl-canvas, canvas.maplibregl-canvas");
      if (!canvas) return { present: false };
      const r = canvas.getBoundingClientRect();
      // sample a few pixels via 2d if possible — WebGL canvas may be empty when read
      return {
        present: true,
        w: r.width,
        h: r.height,
        className: canvas.className,
      };
    });

    result.ui = await page.evaluate(() => {
      const body = document.body?.innerText?.slice(0, 500) || "";
      const select = !!document.querySelector("select");
      const retry = Array.from(document.querySelectorAll("button")).some((b) =>
        /retry/i.test(b.textContent || ""),
      );
      return { select, retry, bodySnippet: body };
    });

    const shot = `/opt/cursor/artifacts/repro-${name}.png`;
    await page.screenshot({ path: shot, fullPage: false });
    result.screenshot = shot;
  } catch (e) {
    result.gotoError = String(e);
  }

  await browser.close();
  return result;
}

const out = [];
for (const t of TARGETS) {
  console.log("Probing", t.name, t.url);
  out.push(await probe(t.name, t.url));
}
fs.writeFileSync(
  "/opt/cursor/artifacts/home-map-repro.json",
  JSON.stringify(out, null, 2),
);
console.log(JSON.stringify(out, null, 2));
