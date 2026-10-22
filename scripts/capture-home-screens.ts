/**
 * Capture real product screenshots for the public home page.
 *
 * Usage (production server already running):
 *   BASE_URL=http://127.0.0.1:3000 npx tsx scripts/capture-home-screens.ts
 *
 * Logs in as the demo user, saves 2× PNGs at 390×844 into public/home/.
 * Never includes contact details — teaser/public fields and job UI only.
 */
import { chromium, type Page } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
const OUT = path.join(process.cwd(), "public", "home");
const DEMO_EMAIL = process.env.DEMO_EMAIL || "demo@procurity.pro";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "demo1234";

fs.mkdirSync(OUT, { recursive: true });

async function login(page: Page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(DEMO_EMAIL);
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD);
  await Promise.all([
    page.waitForURL(/\/app\//, { timeout: 60000 }).catch(() => null),
    page.getByRole("button", { name: /log in/i }).click(),
  ]);
  // If still on login (Firebase redirect lag), try demo session via server action form POST fallback
  if (page.url().includes("/login")) {
    // Local/dev path: navigate after a short wait
    await page.waitForTimeout(2000);
  }
  if (page.url().includes("/login")) {
    throw new Error(
      "Login failed — ensure Firebase is off for local demo password, or set DEMO_* creds",
    );
  }
}

async function shot(page: Page, name: string) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, type: "png" });
  console.log("wrote", file);
}

async function captureMap(page: Page) {
  await page.goto(`${BASE}/app/map?city=nyc`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(4000);
  // Hide any toast / debug overlays if present
  await page.evaluate(() => {
    document
      .querySelectorAll("[data-testid='debug'], .Toastify")
      .forEach((el) => ((el as HTMLElement).style.display = "none"));
  });
  await shot(page, "map.png");
}

async function captureCard(browser: Awaited<ReturnType<typeof chromium.launch>>) {
  // Logged-out public home — scrubbed street-view card (no contacts)
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => (window.__pcHomePinCount || 0) > 50 && Boolean(window.__pcHomeMap),
    { timeout: 90000 },
  );
  // Style may still be settling; wait until loaded() or timeout soft
  await page
    .waitForFunction(() => window.__pcHomeMap?.loaded?.() === true, {
      timeout: 30000,
    })
    .catch(() => null);
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    window.__pcHomeMap?.jumpTo({ center: [-73.98, 40.75], zoom: 13 });
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const feats =
      window.__pcHomeMap?.queryRenderedFeatures({ layers: ["project-pins"] }) ||
      [];
    const f = feats[0];
    if (!f?.properties?.id || !window.__pcOpenHomeProject) return;
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
    .waitFor({ timeout: 15000 });
  await page.waitForTimeout(2500);
  await shot(page, "project-card.png");
  await context.close();
}

async function captureMeasureAndQuote(page: Page) {
  // Re-login if we were on public home (session still cookie)
  await page.goto(`${BASE}/app/jobs`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  // Start a blank job if list is empty
  const newLink = page.getByRole("link", { name: /new job|start/i }).first();
  if (await newLink.isVisible().catch(() => false)) {
    await newLink.click();
  } else {
    await page.goto(`${BASE}/app/jobs/new`, { waitUntil: "domcontentloaded" });
  }
  await page.waitForURL(/\/app\/jobs\/[^/]+/, { timeout: 60000 }).catch(() => null);
  await page.waitForTimeout(2000);

  // Prefer measure section
  const measureHeading = page.getByText(/measure|LiDAR|estimate|quote/i).first();
  if (await measureHeading.isVisible().catch(() => false)) {
    await measureHeading.scrollIntoViewIfNeeded().catch(() => {});
  }
  await shot(page, "measure-quote.png");

  // Quote PDF: try generate or open existing accept link
  const pdfBtn = page.getByRole("button", { name: /generate quote pdf|open pdf/i }).first();
  if (await pdfBtn.isVisible().catch(() => false)) {
    await pdfBtn.click();
    await page.waitForTimeout(2000);
  }
  const openPdf = page.getByRole("link", { name: /open pdf|download pdf/i }).first();
  if (await openPdf.isVisible().catch(() => false)) {
    const href = await openPdf.getAttribute("href");
    if (href) {
      await page.goto(
        href.startsWith("http") ? href : `${BASE}${href}`,
        { waitUntil: "domcontentloaded" },
      );
      await page.waitForTimeout(2000);
      await shot(page, "quote-pdf.png");
      return;
    }
  }
  // Fallback: capture the quote section of the job page
  const quoteSection = page.getByText(/estimate & quote|quote v/i).first();
  if (await quoteSection.isVisible().catch(() => false)) {
    await quoteSection.scrollIntoViewIfNeeded();
  }
  await shot(page, "quote-pdf.png");
}

async function main() {
  console.log("BASE=", BASE);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  await login(page);
  await captureMap(page);
  await captureMeasureAndQuote(page);
  await captureCard(browser);

  await browser.close();
  console.log("Done. Files in", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
