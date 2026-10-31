# Feature carousel

The homepage **hero** is `FeatureCarousel` at `calc(100svh - 56px)` so ~56px of the swarm map peeks below. An intro blob covers first paint; after reveal, the carousel auto-advances with **background crossfades**. A stationary header (“Find the job. Win the work.”) stays fixed; a smaller caption changes per slide. The phone mockup appears only during each clip’s action window (`phone: { in, out }`).

## Layout

Desktop: phone on the **right** (`--s: .92`, vertical center); Design uses `--sd: 1.1` + 3D tilt. Mobile (&lt;820px): header centered at top 74px; phone centered with `--s: .68`. No aurora line in the hero. Progress bars are **hidden** (`display: none`). Navigate with swipe (&gt;50px) or arrow keys.

## Transitions

Slide change = **0.8s opacity crossfade** of background videos (no horizontal slide). Phone fades out first; its screen swaps and the CSS timeline restarts when the phone next appears. JS sets Web Animations `playbackRate` to `SLIDES[i].speed`. `prefers-reduced-motion`: no auto-advance; phone always visible; screens jump to final state.

## Swap a video, caption, or screen

Edit **only** [`src/content/carousel.ts`](../src/content/carousel.ts).

| Field | Meaning |
| --- | --- |
| `label` | Accessible name (aria-label; not shown) |
| `caption` | Line under the stationary header |
| `screen` | `discover` \| `measure` \| `design` \| `quote` (Estimate uses `quote`) |
| `duration` | ms the slide stays up (match the clip) |
| `phone` | `{ in, out }` ms — phone visible window |
| `speed` | WAAPI `playbackRate` for the screen timeline |
| `focus` | CSS `object-position` |
| `video` | `{ webm, mp4, poster, webm640?, mp4640? }` |
| `screenshot` | Optional image replacing the animated screen |

Phone UIs: `src/components/marketing/phone-screens/`. Generated art: `generatedArt.ts`.

## Media

| Slide | Caption | Files |
| --- | --- | --- |
| Discover | Find who's buying | `bg-discover` |
| Measure | Measure | `bg-measure` |
| Design | Design | `bg-design` |
| Estimate | Estimate | `bg-quote` |
