# Feature carousel

The homepage **hero** is `FeatureCarousel` at `calc(100svh - 56px)` so ~56px of the swarm map peeks below. An intro blob covers first paint; after reveal, the carousel auto-advances.

## Layout

`LAYOUT` in [`src/content/carousel.ts`](../src/content/carousel.ts):

| Value | Desktop | Mobile (&lt;820px) |
| --- | --- | --- |
| `'split'` (default) | Phone on the **right**, big bold caption on the **left** with a short aurora line above | Caption top-left; phone centered at 61% height |
| `'center'` | Phone centered, caption under it | Same mobile arrangement |

Bottom nav is **progress bars only** (no visible labels). Each bar is a `<button>` with `aria-label` from the slide’s `label`.

## Swap a video, caption, or screen

Edit **only** [`src/content/carousel.ts`](../src/content/carousel.ts).

| Field | Meaning |
| --- | --- |
| `label` | Accessible name of the progress bar (not shown as text) |
| `caption` | 1–2 words in the big caption |
| `screen` | Animated phone UI: `discover` \| `measure` \| `design` \| `quote` \| `invoice` |
| `duration` | Milliseconds the slide stays up — match the clip; tab progress uses the same value |
| `focus` | CSS `object-position` for cropping the background (e.g. `50% 40%`) |
| `video` | `{ webm, mp4, poster, webm640?, mp4640? }` — same `mp4` → one shared `<video>` |
| `screenshot` | Optional image; replaces the animated screen |

Phone UIs: `src/components/marketing/phone-screens/` (pure CSS timelines timed to each clip; `.scPlay` restarts on each open). Generated map / mesh / sign art: `generatedArt.ts`.

## Media

| Slide | Files |
| --- | --- |
| Discover | `field-3.{mp4,webm,webp}` + `field-3-640.{mp4,webm}` for mobile |
| Measure | `bg-measure.{mp4,webm,jpg}` |
| Design | `bg-design.{mp4,webm,jpg}` |
| Quote | `bg-quote.{mp4,webm,jpg}` |
| Invoice | `bg-invoice.{mp4,webm,jpg}` |

Netlify: `/home/*` immutable cache.

## Behavior

- Intro ≥3s (+2s wait for video); CSS `introOut` at 7s fallback
- Auto-advance uses each slide’s `duration` and starts only after intro reveal
- Active video resets to `0s`; next slide is prefetched
- `pointerdown` retries `play()` (iOS Low Power Mode)
- `prefers-reduced-motion`: short intro, posters, animations jump to end
