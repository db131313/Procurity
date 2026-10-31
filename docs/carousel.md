# Feature carousel

The homepage **hero** is `FeatureCarousel` at `calc(100svh - 56px)` so ~56px of the swarm map peeks below. An intro blob covers first paint; after reveal, the carousel auto-advances with **background crossfades** (incoming slide waits until the video is painting). Each slide has its own big header (`head`) and caption; both fade out/in (~0.25s) on slide change. The phone gently slides up at `phone.in` (min 0.9s) and slides down at `phone.out` (~0.9s before the slide ends). Clips play **once** (`loop=false`) and hold the last frame; slide `duration` is ~1.5s longer than the clip. If video autoplay is refused (~1.2s paused / `NotAllowedError`), the carousel switches to animated WebP (`video.anim`, play once).

## Layout

Desktop: balanced composition — header at `left: max(40px, 12vw)` (`max-width: 44vw`, ~80px bold), phone at `right: max(40px, 22vw)` (`--s: .92`). Mobile (&lt;820px): header centered at top 74px (36px bold); phone centered with `--s: .68`. No aurora line in the hero. Progress bars are **hidden**. Navigate with swipe (&gt;50px) or arrow keys.

## Transitions

Slide change = **0.8s opacity crossfade**. Incoming video fades in once `readyState >= 3` / `canplay` (1.5s fallback). Phone fades out first; CSS timeline restarts when the phone next appears. JS sets Web Animations `playbackRate` to `SLIDES[i].speed`. `prefers-reduced-motion`: no auto-advance; phone always visible; screens jump to final state.

Videos never show a native play button (`pointer-events: none`, controls hidden); a 400ms interval restarts a paused active clip (skipped once `ended`).

## Swap a video, caption, or screen

Edit **only** [`src/content/carousel.ts`](../src/content/carousel.ts).

| Field | Meaning |
| --- | --- |
| `label` | Accessible name (aria-label; not shown) |
| `head` | Big per-slide header (two short lines; `\n` between) |
| `caption` | Line under the header |
| `screen` | `discover` \| `contact` \| `measure` \| `design` \| `quote` |
| `duration` | ms the slide stays up (clip + hold) |
| `phone` | `{ in, out }` — up at `in`, down at `out` (~0.9s before end) |
| `speed` | WAAPI `playbackRate` for the screen timeline |
| `focus` | CSS `object-position` |
| `video` | `{ webm, mp4, poster, anim, webm640?, mp4640? }` |
| `screenshot` | Optional image replacing the animated screen |

Phone UIs: `src/components/marketing/phone-screens/`. Design matches the Connect/Estimate card UI (no AR/3D). Discover’s selected site uses an animated fire pin.

## Media

| Slide | Head (short) | Caption | Files |
| --- | --- | --- | --- |
| Discover | Be first to / the job. | Find projects ready to buy, near you | `bg-discover` |
| Connect | Reach the / right person. | Contacts for every site, one tap away | `field-3` (+ 640) |
| Measure | Measure it / on the spot. | Point your phone, get exact sizes | `bg-measure` |
| Design | Show it before / you build it. | Preview it on their storefront | `bg-design` |
| Estimate | Send the estimate / before you leave. | Price it and win the job on the spot | `bg-quote` |
