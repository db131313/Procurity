# Feature carousel

The homepage **hero** is `FeatureCarousel` at `calc(100svh - 56px)` so ~56px of the swarm map peeks below. An intro blob (full-viewport soft radial mix-blend colors, ~4.6s) covers first paint; after reveal, the carousel auto-advances with **1s background crossfades**. Each slide has its own big header (`head`) and caption; both fade out/in (~0.25s) on slide change. Discover / Measure / Estimate use the phone mockup; Connect and Design use floating card stacks (no phone) so people in the clip stay visible. UI slides up at `phone.in` and down at `phone.out` (~0.9s before end). Slide `duration` is clip − 1.0s; ~1.7s before the end the **next** clip is primed (playing at opacity 0) so the crossfade never waits on a cold start; `ended` also advances. If video autoplay is refused (~1.2s paused / `NotAllowedError`), the carousel switches to animated WebP (`video.anim`, play once).

## Layout

Desktop: balanced composition — header at `left: max(40px, 12vw)` (`max-width: 44vw`, ~80px bold), phone at `right: max(40px, 22vw)` (`--s: .92`); Connect/Design cards at `right: max(40px, 17vw)` (350px). Mobile (&lt;820px): header centered at top 74px (36px bold); phone centered with `--s: .68`; cards full-width pinned near the bottom. No aurora line in the hero. Progress bars are **hidden**. Navigate with swipe (&gt;50px) or arrow keys.

## Transitions

Slide change = **1s opacity crossfade**. Incoming video fades in once `readyState >= 3` / `canplay` (1.5s fallback). UI fades out first; CSS timeline restarts when it next appears. JS sets Web Animations `playbackRate` to `SLIDES[i].speed` on phone screens. `prefers-reduced-motion`: no auto-advance; UI always visible; screens jump to final state.

Videos never show a native play button (`pointer-events: none`, controls hidden); a 400ms interval restarts a paused active clip (skipped once `ended`).

## Swap a video, caption, or screen

Edit **only** [`src/content/carousel.ts`](../src/content/carousel.ts).

| Field | Meaning |
| --- | --- |
| `label` | Accessible name (aria-label; not shown) |
| `head` | Big per-slide header (two short lines; `\n` between) |
| `caption` | Line under the header |
| `screen` | `discover` \| `contact` \| `measure` \| `design` \| `quote` |
| `ui` | `phone` \| `cards` (Connect + Design) |
| `duration` | ms the slide stays up (clip − 1.0s; next primes at duration − 1.7s) |
| `phone` | `{ in, out }` — up at `in`, down at `out` |
| `speed` | WAAPI `playbackRate` for phone screen timelines |
| `focus` | CSS `object-position` |
| `video` | `{ webm, mp4, poster, anim, webm640?, mp4640? }` |
| `screenshot` | Optional image replacing the animated screen |

Phone UIs: `src/components/marketing/phone-screens/`. Card overlays: `ConnectOverlay.tsx` / `DesignOverlay.tsx`. Discover’s selected site uses an animated fire pin.

## Media

| Slide | Head (short) | UI | Files |
| --- | --- | --- | --- |
| Discover | Be first to / the job. | phone | `bg-discover` |
| Connect | Capture the / client's info. | cards | `field-3` (+ 640) |
| Measure | Measure it / on the spot. | phone | `bg-measure` |
| Design | Show it before / you build it. | cards | `bg-design` |
| Estimate | Send the estimate / before you leave. | phone | `bg-quote` |
