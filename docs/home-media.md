# Homepage media (`public/home/`)

Carousel background clips (portrait ~416×752, no audio, each under ~0.75MB):

| Slide | Files | Notes |
| --- | --- | --- |
| Discover | `bg-discover.{mp4,webm,jpg}` | Street-walk clip; phone in at 4.4s |
| Measure | `bg-measure.{mp4,webm,jpg}` | ~5.8s |
| Design | `bg-design.{mp4,webm,jpg}` | ~10s |
| Estimate | `bg-quote.{mp4,webm,jpg}` | Screen id `quote` |

Netlify (or equivalent) should serve `/home/*` with `Cache-Control: public,max-age=31536000,immutable`.

Other assets: `map.png`, `measure-quote.png`, `project-card.png`, `quote-pdf.png`.
