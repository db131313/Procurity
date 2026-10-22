# Home page media slots

Optional files under `public/home/`. If a file is missing, that slot is **not rendered** (no placeholder, no “coming soon”).

## Real product screenshots

Captured by `npx tsx scripts/capture-home-screens.ts` against a production build (logged in as the demo user). Viewport **390×844 @ 2×**.

| File | Content | Notes |
| --- | --- | --- |
| `map.png` | Logged-in map with heat-colored project dots | No contact details |
| `project-card.png` | Project detail sheet with street view | Scrub addresses if needed; no contacts |
| `measure-quote.png` | Job measure / quote step | Commercial job only |
| `quote-pdf.png` | Quote PDF preview | No residential PII |

Suggested max dimensions: ~780×1688 px (2× of 390×844). PNG, sRGB.

## Field / brand media (manual drop-in)

| File | Format | Suggested size | Used for |
| --- | --- | --- | --- |
| `hero-photo.jpg` | JPEG | ≥1600×900, <500 KB | Optional photo band below “What you get” |
| `field-video.mp4` | H.264 MP4 | Portrait ≤1080p, <15 MB | Field clip 1 (“On the job site”) |
| `field-video.webm` | VP9/AV1 WebM | Same as MP4 | Progressive enhancement |
| `field-poster.jpg` | JPEG | Matching video frame | Clip 1 poster |
| `field-video-2.mp4` | H.264 MP4 | Portrait ≤1080p, <15 MB | Field clip 2 (“Close the deal”) |
| `field-video-2.webm` | VP9/AV1 WebM | Same as MP4 | Progressive enhancement |
| `field-poster-2.jpg` | JPEG | Matching video frame | Clip 2 poster |

Each clip renders only when its `.mp4` and/or `.webm` exists. Posters are optional. Portrait (9:16) is preferred; the home layout stacks on mobile and pairs side-by-side from `sm` up.

## iPhone app section

The iPhone LiDAR marketing block is **hidden** unless `NEXT_PUBLIC_IOS_APP_URL` is set. The Jobs workflow LiDAR card / waitlist are unchanged.

## Capture command

```bash
npm run build && npm run start &
npx tsx scripts/capture-home-screens.ts
```

Requires Playwright Chromium and a running production server at `BASE_URL` (default `http://127.0.0.1:3000`).
