# Feature carousel

The homepage **hero** is `FeatureCarousel` at `calc(100svh - 56px)` so ~56px of the swarm map peeks below. An intro blob covers first paint; after reveal, the carousel auto-advances.

## Swap a video, caption, or screen

Edit **only** [`src/content/carousel.ts`](../src/content/carousel.ts).

| Field | Meaning |
| --- | --- |
| `label` | Bottom tab name |
| `caption` | 1–2 words in the pill under the phone |
| `screen` | Animated phone UI: `discover` \| `measure` \| `design` \| `quote` \| `invoice` |
| `duration` | Milliseconds the slide stays up — match the clip length; tab progress uses the same value |
| `focus` | CSS `object-position` for cropping the background on wide screens (e.g. `50% 40%`) |
| `video` | `{ webm, mp4, poster }` — same `mp4` → one shared `<video>` |
| `screenshot` | Optional image; replaces the animated screen |

There is **no** slide headline/body/CTA — only the phone + caption + tabs.

Phone UIs: `src/components/marketing/phone-screens/` (pure CSS 7s timelines; `.scPlay` restarts on each open).

## Layout

- Phone centered (`--s: .8` desktop / `.46` mobile, `--phone-top`)
- Tabs centered along the bottom; App Store line on desktop near tabs

## Media

Per-slide clips under `public/home/`:

| Slide | Files |
| --- | --- |
| Discover | `field-3.{mp4,webm,jpg}` |
| Measure | `bg-measure.{mp4,webm,jpg}` |
| Design | `bg-design.{mp4,webm,jpg}` |
| Quote | `bg-quote.{mp4,webm,jpg}` |
| Invoice | `bg-invoice.{mp4,webm,jpg}` |

Netlify: `/home/*` immutable cache (`Cache-Control: public,max-age=31536000,immutable`). Use versioned filenames only when re-encoding to bust caches.

## Behavior

- Intro ≥3s (+2s wait for video); CSS `introOut` at 7s fallback
- Auto-advance uses each slide’s `duration` and starts only after intro reveal
- Active slide’s video resets to `0s`; next slide is prefetched (`preload="auto"`)
- `pointerdown` retries `play()` (iOS Low Power Mode)
- `prefers-reduced-motion`: short intro, posters, animations jump to end
