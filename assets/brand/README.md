# saveour.day brand kit

A vector implementation of selected concept 04: a folded invitation in indigo and dark teal. The front flap and folded back sheet are independently animated elements.

## Variants

| Variant | Use |
| --- | --- |
| `full` | Symbol and **saveour.day** |
| `short` | Symbol and **saveour**, where the full name is already known |
| `mark` | Symbol only, for small surfaces/icons |
| `on-light` | Dark logo on a light background |
| `on-dark` | Light logo on a dark background, such as `#171C36` |
| `*-animated.svg` | One-shot assembly animation, 900 ms; static with reduced motion |

Each of the six variant/tone combinations has a static SVG, transparent PNG, and animated SVG. SVG lettering is outlined, requiring no installed font or network connection. Wordmark PNGs are 384 px high; symbol PNGs are 1024 px high. SVGs scale without quality loss.

`saveour-day-icon.svg` has its own light background for browser-tab contrast. Both applications also include 180×180 px Apple icons.

## Preview and spacing

Open [index.html](index.html) for light/dark versions and replayable animations; it has no external dependencies.

Keep clear space of at least one quarter of the symbol height. Recommended minimum widths: full 160 px, short 116 px, symbol 24 px. Do not distort proportions, rearrange elements, or substitute arbitrary colors.

## Component

```tsx
import { BrandLogo } from "@invitations/ui/brand";

<BrandLogo />
<BrandLogo variant="short" height={40} />
<BrandLogo variant="mark" tone="dark" height={32} />
<BrandLogo animated height={56} />
```

`tone` describes the **background**, not the logo. The default accessible name is `saveour.day`. Use `decorative` inside an already labeled link to avoid duplicate announcements. Animation is decorative, not a saving/progress indicator.

The brand appears in panel/login, demos, password setup, editor navigation, and guest landing/access screens. Published invitation composition remains the organizer's design.

## Panel colors

The light palette uses indigo `#3D518B` for actions/focus, navy `#242B59` for text, and teal `#24485C` on `#DFF0F4` for selected navigation. Background is `#F4F6FB`, surfaces white, and borders `#DCE2EE`. Error/success colors keep their semantic meaning.

`PanelTheme.tsx` defines the Mantine brand scale; `apps/admin/app/panel-colors.css` defines light/dark panel tokens and scoped dark-brand colors. Panel changes do not recolor invitation previews.

## Sources and regeneration

- Geometry, colors, motion: `packages/ui/src/brand-art.ts`.
- Outlined lettering: `packages/ui/src/brand-wordmarks.json`.
- Typeface: Inter SemiBold 600 from `@fontsource/inter`; SIL OFL license in [FONT-LICENSE.txt](FONT-LICENSE.txt).
- Run `npm run build:brand` from the repository root to rebuild SVGs, PNGs, HTML preview, and app icons.
- To regenerate lettering outlines, install Python `fonttools` and `brotli`, then run `python scripts/outline-brand.py` followed by `npm run build:brand`.

Adding branding to the repository does not register a trademark or purchase a domain.
