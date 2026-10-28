# Feature carousel

The homepage **hero** is `FeatureCarousel` at `calc(100svh - 56px)` so ~56px of the swarm map peeks below. An intro blob covers first paint; after reveal, the carousel auto-advances.

## Swap a video, caption, or screen

Edit **only** [`src/content/carousel.ts`](../src/content/carousel.ts).

| Field | Meaning |
| --- | --- |
| `label` | Bottom tab name |
| `caption` | 1–2 words in the pill under the phone |
| `screen` | Animated phone UI: `discover` \| `measure` \| `design` \| `quote` \| `invoice` |
| `video` | `{ webm, mp4, poster, webm640?, mp4640? }` — same `mp4` → one shared `<video>` |
| `screenshot` | Optional image; replaces the animated screen |

There is **no** slide headline/body/CTA — only the phone + caption + tabs.

Phone UIs: `src/components/marketing/phone-screens/` (pure CSS 7s timelines; `.scPlay` restarts on each open).

## Layout

- Phone centered (`--s: .8` desktop / `.46` mobile, `--phone-top`)
- Tabs centered along the bottom; App Store line on desktop near tabs

## Media

Versioned under `public/home/` (`field-3-v2.*`). Netlify: `/home/*` immutable cache.

## Behavior

- Intro ≥3s (+2s wait for video); CSS `introOut` at 7s fallback
- Auto-advance every 7s starts only after intro reveal
- Prefetch next slide’s video; `pointerdown` retries `play()`
- `prefers-reduced-motion`: short intro, posters, animations jump to end
