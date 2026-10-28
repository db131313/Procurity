# Feature carousel

The homepage **hero** is `FeatureCarousel` at `calc(100svh - 56px)` so ~56px of the swarm map peeks below. An intro blob covers first paint; after reveal, the carousel auto-advances with **horizontal slide transitions**.

## Layout

`LAYOUT` in [`src/content/carousel.ts`](../src/content/carousel.ts):

| Value | Desktop | Mobile (&lt;820px) |
| --- | --- | --- |
| `'split'` (default) | Phone on the **right**, big bold caption on the **left** | Caption centered at top 96px; phone centered, scale `.64`, bleeds off the bottom (`--phone-top: calc(60% + 200px)`) |
| `'center'` | Phone centered, caption under it | Same mobile arrangement |

Progress bars are **hidden** (`display: none`). Navigate with swipe (&gt;50px) or arrow keys. Hidden tabs keep `aria-label` / test ids for accessibility and Playwright.

## Transitions

Direction-aware: next enters from the right (old exits left); previous is reversed; wrap-around uses the shorter direction. Background videos use `translate3d` + `.75s` ease. Phone + caption swap-out (`.25s`) then swap-in (`.6s`); the screen timeline starts on swap-in. `prefers-reduced-motion`: instant swap.

## Swap a video, caption, or screen

Edit **only** [`src/content/carousel.ts`](../src/content/carousel.ts).

| Field | Meaning |
| --- | --- |
| `label` | Accessible name (aria-label; not shown) |
| `caption` | Big caption text |
| `screen` | `discover` \| `measure` \| `design` \| `quote` \| `invoice` |
| `duration` | ms the slide stays up (match the clip) |
| `focus` | CSS `object-position` |
| `video` | `{ webm, mp4, poster, webm640?, mp4640? }` |
| `screenshot` | Optional image replacing the animated screen |

Phone UIs: `src/components/marketing/phone-screens/`. Generated art: `generatedArt.ts`.

## Media

| Slide | Caption | Files |
| --- | --- | --- |
| Discover | Find who's buying | `field-3` + 640 |
| Measure | Measure | `bg-measure` |
| Design | Design | `bg-design` |
| Quote | Quote | `bg-quote` |
| Invoice | Invoice | `bg-invoice` |
