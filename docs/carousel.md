# Feature carousel

The homepage **hero** is `FeatureCarousel` at `calc(100svh - 56px)` so ~56px of the swarm map peeks below. An intro blob covers first paint; after reveal, the carousel auto-advances with **background crossfades** (incoming slide waits until the video is painting). Each slide has its own big header (`head`) and caption; both fade out/in (~0.25s) on slide change. The phone mockup pops in at `phone.in` (min 0.9s) and **stays until the next slide**. If video autoplay is refused (~2s paused), the carousel switches to looping animated WebP (`video.anim`).

## Layout

Desktop: balanced composition — header at `left: max(40px, 12vw)` (`max-width: 44vw`, ~80px bold), phone at `right: max(40px, 22vw)` (`--s: .92`). Mobile (&lt;820px): header centered at top 74px (36px bold); phone centered with `--s: .68`. No aurora line in the hero. Progress bars are **hidden**. Navigate with swipe (&gt;50px) or arrow keys.

## Transitions

Slide change = **0.8s opacity crossfade**. Incoming video fades in once `readyState >= 3` / `canplay` (1.5s fallback). Phone fades out first; CSS timeline restarts when the phone next appears. JS sets Web Animations `playbackRate` to `SLIDES[i].speed`. `prefers-reduced-motion`: no auto-advance; phone always visible; screens jump to final state.

Videos never show a native play button (`pointer-events: none`, controls hidden); a 400ms interval + pause listener restarts the active clip if Safari pauses it.

## Swap a video, caption, or screen

Edit **only** [`src/content/carousel.ts`](../src/content/carousel.ts).

| Field | Meaning |
| --- | --- |
| `label` | Accessible name (aria-label; not shown) |
| `head` | Big per-slide header (two short lines; `\n` between) |
| `caption` | Line under the header |
| `screen` | `discover` \| `contact` \| `measure` \| `design` \| `quote` |
| `duration` | ms the slide stays up (match the clip) |
| `phone` | `{ in, out }` ms — pops in at `in`, stays until slide change |
| `speed` | WAAPI `playbackRate` for the screen timeline |
| `focus` | CSS `object-position` |
| `video` | `{ webm, mp4, poster, anim, webm640?, mp4640? }` |
| `screenshot` | Optional image replacing the animated screen |

Phone UIs: `src/components/marketing/phone-screens/`. Design matches the Connect/Estimate card UI (no AR/3D). Discover’s selected site uses an animated fire pin.

## Media

| Slide | Head (short) | Caption | Files |
| --- | --- | --- | --- |
| Discover | Find the job / before they do. | Projects ready to buy, near you | `bg-discover` |
| Connect | Know exactly / who to call. | The contact for every site | `field-3` (+ 640) |
| Measure | Measure it / in seconds. | Exact sizes, right on the wall | `bg-measure` |
| Design | Show them the / finished sign. | Preview it before you build it | `bg-design` |
| Estimate | Send the estimate / before you leave. | Win the work on the spot | `bg-quote` |
