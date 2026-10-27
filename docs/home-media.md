# Home page media slots

Files under `public/home/`.

## Field video band (required for the BW home)

Edge-to-edge three-up band. Desktop: 3 columns, no gaps. Mobile: stacked full width.

| File | Format | Used for |
| --- | --- | --- |
| `field-1.mp4` / `.webm` / `.jpg` | H.264 / VP9 / JPEG poster | Column 1 |
| `field-2.mp4` / `.webm` / `.jpg` | H.264 / VP9 / JPEG poster | Column 2 |
| `field-3.mp4` / `.webm` / `.jpg` | H.264 / VP9 / JPEG poster | Column 3 |

Videos are muted, loop, `playsInline`, and play only while visible (`IntersectionObserver`). When `prefers-reduced-motion: reduce`, the poster is shown and playback stays paused.

## Legacy optional slots

Older sunrise screenshots (`map.png`, `project-card.png`, …) and `hero-photo.jpg` are unused by the black/white swarm home but may remain for other marketing pages.
