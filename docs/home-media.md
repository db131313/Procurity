# Home page media slots

Files under `public/home/`. Featured on the black/white swarm home + feature carousel.

## Feature carousel video

Used as full-bleed slide backgrounds (and the Measure phone camera). See [carousel.md](./carousel.md).

| File | Format | Notes |
| --- | --- | --- |
| `field-3.mp4` | H.264 +faststart | Desktop; muted; target ≤1.5MB |
| `field-3.webm` | VP9 | Desktop progressive enhancement |
| `field-3-640.mp4` | H.264 | `media="(max-width:820px)"` |
| `field-3-640.webm` | VP9 | Mobile pair |
| `field-3.webp` | WebP poster | Preloaded; target ≤80KB |
| `field-3.jpg` | JPEG poster | Fallback |

Muted, loop, `playsInline`. Only the active slide’s video plays; others use `preload="none"`. Videos mount when the carousel is within about one viewport.

## Real product screenshots

Captured by `npx tsx scripts/capture-home-screens.ts` against a production build (logged in as the demo user). Viewport **390×844 @ 2×**.

| File | Content | Notes |
| --- | --- | --- |
| `map.png` | Logged-in map with heat-colored project dots | No contact details |
| `project-card.png` | Project detail sheet with street view | Scrub addresses if needed; no contacts |
| `measure-quote.png` | Job measure / quote step | Commercial job only |
| `quote-pdf.png` | Quote PDF preview | No residential PII |

Suggested max dimensions: ~780×1688 px (2× of 390×844). PNG, sRGB.

## iPhone app line

Carousel footer shows “iPhone app coming soon to the App Store” unless `NEXT_PUBLIC_IOS_APP_URL` is set (then “Download on the App Store”).

## Capture command

```bash
npm run build && npm run start &
npx tsx scripts/capture-home-screens.ts
```

Requires Playwright Chromium and a running production server at `BASE_URL` (default `http://127.0.0.1:3000`).
