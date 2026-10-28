# Home page media slots

## Feature carousel (hero)

See [carousel.md](./carousel.md).

| Slide | Files | Notes |
| --- | --- | --- |
| Discover | `field-3.{mp4,webm,webp}` + `field-3-640.{mp4,webm}` | ~10s; 640px sources for mobile |
| Measure | `bg-measure.{mp4,webm,jpg}` | ~5.8s, ~0.24MB mp4 |
| Design | `bg-design.{mp4,webm,jpg}` | ~10s, ~0.57MB mp4 |
| Quote | `bg-quote.{mp4,webm,jpg}` | ~10s, ~0.66MB mp4 |
| Invoice | `bg-invoice.{mp4,webm,jpg}` | ~10s, ~0.74MB mp4 |

`field-3.mp4` (~1.04MB) and `.webm` (~1.33MB) are under 1.5MB — no re-encode required. Poster is `field-3.webp` (~55KB).

## Product screenshots

| File | Content |
| --- | --- |
| `map.png` | Logged-in map |
| `project-card.png` | Project detail |
| `measure-quote.png` | Job measure / quote |
| `quote-pdf.png` | Quote PDF preview |

## iPhone app line

Carousel shows “coming soon” unless `NEXT_PUBLIC_IOS_APP_URL` is set.
