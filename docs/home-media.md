# Home page media slots

Optional files under `public/home/`. If a file is missing, that slot is **not rendered** (no placeholder, no “coming soon”).

## Site video (BW home)

Single left-flush video panel (`HomeSiteVideo`).

| File | Format | Used for |
| --- | --- | --- |
| `field-3.mp4` | H.264 MP4 | Site video |
| `field-3.webm` | VP9/AV1 WebM | Progressive enhancement |
| `field-3.jpg` | JPEG poster | Poster + PhoneTour Measure background |

Muted, loop, `playsInline`, plays only while visible (`IntersectionObserver`, threshold 0.35). Caption chip rotates at 0s / 3s / 6s. Poster when `prefers-reduced-motion`.

## Real product screenshots

Captured by `npx tsx scripts/capture-home-screens.ts` against a production build (logged in as the demo user). Viewport **390×844 @ 2×**.

| File | Content | Notes |
| --- | --- | --- |
| `map.png` | Logged-in map with heat-colored project dots | No contact details |
| `project-card.png` | Project detail sheet with street view | Scrub addresses if needed; no contacts |
| `measure-quote.png` | Job measure / quote step | Commercial job only |
| `quote-pdf.png` | Quote PDF preview | No residential PII |

Suggested max dimensions: ~780×1688 px (2× of 390×844). PNG, sRGB.

## Legacy optional slots

Older sunrise screenshots and `hero-photo.jpg` may remain for other marketing pages but are unused by the black/white swarm home.

## iPhone app section

The PhoneTour block always shows “coming soon” copy unless `NEXT_PUBLIC_IOS_APP_URL` is set (then “Download on the App Store”). The Jobs workflow LiDAR card / waitlist are unchanged.

## Capture command

```bash
npm run build && npm run start &
npx tsx scripts/capture-home-screens.ts
```

Requires Playwright Chromium and a running production server at `BASE_URL` (default `http://127.0.0.1:3000`).
