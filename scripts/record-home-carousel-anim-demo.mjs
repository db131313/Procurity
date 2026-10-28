import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
const OUT = "/opt/cursor/artifacts";
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: OUT, size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForSelector('[data-testid="home-intro"]');
await page.waitForTimeout(1000);
await page.waitForFunction(() => getComputedStyle(document.querySelector("[data-testid=home-intro]")).opacity === "0", null, { timeout: 12000 });
await page.waitForTimeout(1200);
for (const i of [0, 1, 2, 3, 4]) {
  await page.locator(`[data-testid="car-tab-${i}"]`).click();
  await page.waitForTimeout(900);
}
await page.locator('[data-testid="home-swarm-section"]').scrollIntoViewIfNeeded();
await page.waitForTimeout(700);
await context.close();
await browser.close();
const files = fs.readdirSync(OUT).filter((f) => f.endsWith(".webm"));
files.sort((a, b) => fs.statSync(path.join(OUT, b)).mtimeMs - fs.statSync(path.join(OUT, a)).mtimeMs);
const src = path.join(OUT, files[0]);
const destWebm = path.join(OUT, "home-carousel-anim-demo.webm");
const destMp4 = path.join(OUT, "home-carousel-anim-demo.mp4");
fs.renameSync(src, destWebm);
execSync(`ffmpeg -y -i "${destWebm}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${destMp4}"`, { stdio: "inherit" });
console.log("wrote", destMp4);
