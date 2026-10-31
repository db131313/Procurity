# Feature carousel

The homepage **hero** is `FeatureCarousel` at `calc(100svh - 56px)` so ~56px of the swarm map peeks below. An intro blob covers first paint; after reveal, the carousel auto-advances with **background crossfades** (incoming slide waits until the video is painting). A stationary header (“Find the job. Win the work.”) stays fixed; a smaller caption changes per slide. The phone mockup appears only during each clip’s action window (`phone: { in, out }`).

## Layout

Desktop: balanced composition — header at `left: max(40px, 12vw)`, phone at `right: max(40px, 22vw)` (`--s: .92`). Mobile (&lt;820px): header centered at top 74px; phone centered with `--s: .68`. No aurora line in the hero. Progress bars are **hidden**. Navigate with swipe (&gt;50px) or arrow keys.

## Transitions

Slide change = **0.8s opacity crossfade**. Incoming video fades in once `readyState >= 3` / `canplay` (1.5s fallback). Phone fades out first; CSS timeline restarts when the phone next appears. JS sets Web Animations `playbackRate` to `SLIDES[i].speed`. `prefers-reduced-motion`: no auto-advance; phone always visible; screens jump to final state.

## Swap a video, caption, or screen

Edit **only** [`src/content/carousel.ts`](../src/content/carousel.ts).

| Field | Meaning |
| --- | --- |
| `label` | Accessible name (aria-label; not shown) |
| `caption` | Line under the stationary header |
| `screen` | `discover` \| `contact` \| `measure` \| `design` \| `quote` |
| `duration` | ms the slide stays up (match the clip) |
| `phone` | `{ in, out }` ms — phone visible window |
| `speed` | WAAPI `playbackRate` for the screen timeline |
| `focus` | CSS `object-position` |
| `video` | `{ webm, mp4, poster, webm640?, mp4640? }` |
| `screenshot` | Optional image replacing the animated screen |

Phone UIs: `src/components/marketing/phone-screens/`.

## Media

| Slide | Caption | Files |
| --- | --- | --- |
| Discover | Find who's buying | `bg-discover` |
| Connect | Connect | `field-3` (+ 640) |
| Measure | Measure | `bg-measure` |
| Design | Design | `bg-design` |
| Estimate | Estimate | `bg-quote` |
