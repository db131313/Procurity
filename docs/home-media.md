# Homepage media (`public/home/`)

Carousel background clips (no audio):

| Slide | Files | Notes |
| --- | --- | --- |
| Discover | `bg-discover.{mp4,webm,jpg}` | Street-walk; phone in at 4.4s |
| Connect | `field-3.{mp4,webm,jpg}` + `field-3-640.{mp4,webm}` | Site walk-in; 640px sources for mobile |
| Measure | `bg-measure.{mp4,webm,jpg}` | ~5.8s |
| Design | `bg-design.{mp4,webm,jpg}` | ~10s |
| Estimate | `bg-quote.{mp4,webm,jpg}` | Screen id `quote` |

Netlify serves `/home/*` with `Cache-Control: public,max-age=31536000,immutable`.

Safari/iOS: carousel `<video>` lists the **MP4 `<source>` before WebM** (Safari can pick WebM, fail to decode, and never fall back). Videos also set `autoplay` + `muted` + `playsinline`. Native controls stay hidden (`pointer-events: none` + webkit media-control CSS); a 400ms interval restarts a paused active clip so no play button is ever shown. If the active clip stays paused ~2s (e.g. iOS Low Power Mode), the carousel switches to looping animated WebP (`video.anim`). If a clip plays but never gets data (`readyState < 2` for ~3s), the mp4 is fetched as a blob and played via `URL.createObjectURL`.

Other assets: `map.png`, `measure-quote.png`, `project-card.png`, `quote-pdf.png`.
