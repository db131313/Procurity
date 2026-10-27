# Feature carousel

The homepage walkthrough under the swarm hero is `FeatureCarousel`.

## Swap a video, copy, or screen

Edit **only** [`src/content/carousel.ts`](../src/content/carousel.ts).

Each slide has:

| Field | Meaning |
| --- | --- |
| `label` | Tab label + pill text |
| `title` / `body` | Left-side copy |
| `screen` | Which phone UI: `discover` \| `measure` \| `design` \| `quote` \| `invoice` |
| `video` | `{ webm, mp4, poster, webm640?, mp4640? }` full-bleed background |
| `screenshot` | Optional image path — when set, replaces the drawn phone screen |
| `cta` | Optional `{ label, href }` under the copy (Invoice uses `/signup`) |

Phone UIs live in `src/components/marketing/phone-screens/` (one file each). To replace a drawn screen with a real capture, set `screenshot: "/home/your.png"` on that slide.

## Media

Files under `public/home/`:

- `field-3.mp4` / `field-3.webm` — desktop sources (H.264 + VP9, muted, ~1.5MB)
- `field-3-640.mp4` / `field-3-640.webm` — `media="(max-width:820px)"` pair
- `field-3.webp` — poster (preload on first paint)

Netlify serves `/home/*` with `Cache-Control: public, max-age=31536000, immutable`.

## Behavior notes

- Auto-advance every 7s; pause when under 35% visible
- Videos mount only when the carousel is within ~one viewport (`rootMargin: 100%`)
- `prefers-reduced-motion`: posters only, no auto-advance / progress fill
- App Store line: “coming soon” unless `NEXT_PUBLIC_IOS_APP_URL` is set
