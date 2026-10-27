# Feature carousel

The homepage **hero** is `FeatureCarousel` (full `100svh`). An intro blob overlay covers first paint; after reveal, the carousel auto-advances.

## Swap a video, copy, or screen

Edit **only** [`src/content/carousel.ts`](../src/content/carousel.ts).

| Field | Meaning |
| --- | --- |
| `label` | Tab label + pill text |
| `title` / `body` | Keep short (3–4 word title, one short body line) |
| `screen` | Phone UI: `discover` \| `measure` \| `design` \| `quote` \| `invoice` |
| `video` | `{ webm, mp4, poster, webm640?, mp4640? }` — slides that share the same `mp4` reuse **one** `<video>` |
| `screenshot` | Optional image; replaces the drawn phone screen |
| `cta` | Optional `{ label, href }` (Invoice → `/signup`) |

Phone UIs: `src/components/marketing/phone-screens/`.

## Media

Versioned under `public/home/` (`field-3-v2.*`) so immutable CDN caches bust after re-encode.

- Desktop: `field-3-v2.mp4` / `.webm` (≤ ~1.5MB)
- Mobile: `field-3-v2-640.*` via `media="(max-width:820px)"`
- Poster: `field-3-v2.webp` (preloaded on first paint)

Netlify: `/home/*` → `Cache-Control: public, max-age=31536000, immutable`.

## Behavior

- Intro: blob grows ≥3s, waits up to +2s for first video, CSS `introOut` at 7s as fallback
- Auto-advance every 7s **starts only after** intro reveal (`ready`)
- Prefetch next slide’s video (`preload="auto"`)
- `pointerdown` retries `play()` (iOS Low Power Mode)
- Phone: right side desktop (scale .8); **centered** on mobile (scale .46)
- `prefers-reduced-motion`: short intro (~300ms), posters only, no auto-advance
