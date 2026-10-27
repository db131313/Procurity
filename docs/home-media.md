# Home page media slots

## Feature carousel (hero)

See [carousel.md](./carousel.md).

| File | Notes |
| --- | --- |
| `field-3-v2.mp4` / `.webm` | Desktop backgrounds (shared across slides) |
| `field-3-v2-640.mp4` / `.webm` | Mobile `media="(max-width:820px)"` |
| `field-3-v2.webp` | Poster (preload); target ≤80KB |
| `field-3-v2.jpg` | JPEG fallback |

Legacy `field-3.*` (unversioned) may remain for older references; the live carousel uses `*-v2*`.

## Product screenshots

Captured by `npx tsx scripts/capture-home-screens.ts` (390×844 @ 2×).

| File | Content |
| --- | --- |
| `map.png` | Logged-in map |
| `project-card.png` | Project detail |
| `measure-quote.png` | Job measure / quote |
| `quote-pdf.png` | Quote PDF preview |

## iPhone app line

Carousel shows “coming soon” unless `NEXT_PUBLIC_IOS_APP_URL` is set.
