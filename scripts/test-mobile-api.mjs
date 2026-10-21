/**
 * Smoke tests for mobile jobs API helpers (no Firebase token required).
 * Run: node scripts/test-mobile-api.mjs
 */
import assert from "node:assert/strict";
import {
  buildDesignNotesFromMeasurements,
  buildDesignDescription,
  lengthInches,
  prefillLineItemsFromMeasurements,
  formatInches,
} from "../src/lib/jobs/mobile-prefill.ts";
import { scanFilePath } from "../src/lib/jobs/scan-urls.ts";
import { quotePdfPath } from "../src/lib/jobs/pdf-urls.ts";

const mWidth = {
  id: "1",
  jobId: "j",
  label: "Sign width",
  width: 96,
  height: null,
  unit: "in",
  annotation: {
    scanId: "s1",
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
    realLength: 96,
    start3d: { x: 0, y: 0, z: 0 },
    end3d: { x: 2.44, y: 0, z: 0 },
    source: "lidar",
  },
  createdAt: new Date().toISOString(),
};

const mHeight = {
  ...mWidth,
  id: "2",
  label: "Sign height",
  width: 36,
  annotation: { ...mWidth.annotation, realLength: 36 },
};

assert.equal(lengthInches(mWidth), 96);
assert.equal(formatInches(96), `8' 0"`);

const notes = buildDesignNotesFromMeasurements("", [mWidth, mHeight]);
assert.match(notes, /LiDAR/);
assert.match(notes, /Sign width/);

const desc = buildDesignDescription("", [mWidth, mHeight]);
assert.match(desc, /Sign width/);
assert.match(desc, /Sign height/);

const items = prefillLineItemsFromMeasurements([], [mWidth, mHeight]);
assert.equal(items.length, 1);
assert.ok(items[0].qty > 0);
assert.match(items[0].description, /sq ft/);

assert.equal(
  scanFilePath("job1", "scan1"),
  "/api/jobs/job1/scans/scan1/file",
);
assert.equal(
  quotePdfPath("job1", "q1"),
  "/api/jobs/job1/quotes/q1/pdf",
);

console.log("mobile-api smoke tests OK");
