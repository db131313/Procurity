import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
const OUT = "/opt/cursor/artifacts";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: OUT, size: { width: 1440, height: 900 } },
});
const page = await context.newPage();

let releasePins;
const gate = new Promise((r) => (releasePins = r));
await page.route("**/api/teaser/pins/all**", async (route) => {
  await gate;
  const res = await route.fetch();
  await route.fulfill({ response: res });
});

await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForSelector('[data-testid="swarm-blob"]');
await page.waitForTimeout(900);
releasePins();
await page.waitForFunction(() => {
  const copy = document.querySelector('[data-testid="home-hero-copy"]');
  return copy && getComputedStyle(copy).opacity !== "0";
}, null, { timeout: 90000 });
await page.waitForTimeout(800);

const canvas = page.locator('[data-testid="swarm-canvas"]');
const box = await canvas.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.wheel(0, 700);
await page.waitForTimeout(600);

for (const i of [0, 1, 2, 3, 4]) {
  await page.locator(`[data-testid="car-tab-${i}"]`).click();
  await page.waitForTimeout(700);
}

await page.waitForTimeout(500);
await context.close();
await browser.close();

// Find newest webm in OUT and rename
const files = fs.readdirSync(OUT).filter((f) => f.endsWith(".webm"));
files.sort((a, b) => fs.statSync(path.join(OUT, b)).mtimeMs - fs.statSync(path.join(OUT, a)).mtimeMs);
const src = path.join(OUT, files[0]);
const destWebm = path.join(OUT, "home-carousel-demo.webm");
const destMp4 = path.join(OUT, "home-carousel-demo.mp4");
fs.renameSync(src, destWebm);
// Transcode to mp4 for broader playback
import("node:child_process").then(({ execSync }) => {
  execSync(`ffmpeg -y -i "${destWebm}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${destMp4}"`, { stdio: "inherit" });
  console.log("wrote", destMp4, destWebm);
});
