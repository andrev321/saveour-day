# Theme redesign — ten historical concepts

Open [index.html](index.html) for two proposals per theme, desktop/mobile previews, comparisons, rationale, and a local selection list. Interactive mockups include schedule, venue, and a visual RSVP demonstration that does not save answers.

**This directory is a design exploration, not the production application.** Some directions were subsequently selected; see [Current themes](../../docs/THEMES-AND-PALETTES.md). Example text and AI photographs are illustrative. Images, text, and fonts are local, so the gallery needs no external services.

## Original recommendations

| Original theme | Concept A | Concept B | Recommendation at the time |
| --- | --- | --- | --- |
| Classic elegance | Maison — warm photographic minimalism | The Modern Vow — typography without a photo | A as a base; B for couples without a photo |
| Botanical garden | Olive Atelier — light olive, asymmetry | The Garden Society — forest green, symmetry | A for outdoor events; B as a bolder alternative |
| Modern editorial | The Wedding Issue — magazine serif | Gallery 12 — gallery, sans serif, cobalt | B best differentiates it from classic |
| Evening glow | Midnight Cinema — photography/light | Champagne Club — warm art deco | A for evening mood; B without a photo |
| Joyful celebration | Aperitivo — butter yellow/burgundy | Modern Muse — pink/plum | A balances joy and elegance |

These recommendations are historical; they are not the final selection list.

## Review of the earlier designs

- Classic: retain the color/type foundation; reduce competing headings, double frames, and purposeless empty space.
- Botanical: greenery fits, but the photo arch and cards overwhelmed subtle plant detail; develop a more distinctive composition.
- Editorial: readable but too close to a generic business site; strengthen scale, grid, and editorial character.
- Evening: good contrast, but panels obscured photography and excessive borders added weight; focus on light/photo or one geometric element.
- Celebration: friendly, but tilted images and many soft boxes weakened elegance; let color and type supply expression.

## Research record — 2026-09-29

This was a qualitative review, not sales or market-share research. Sources showed several coexisting directions rather than one dominant style:

1. [Shutterfly — Top 7 Modern Wedding Invitation Trends for 2026](https://www.shutterfly.com/ideas/modern-wedding-invitation-trends/), recorded update 2026-01-20: hierarchy, restrained layouts, a single photo, warmer palettes.
2. [Paperlust — 2026 Wedding Invitation Trends](https://paperlust.co/blog/2026-wedding-invitation-trends/): modern serif and magazine-scale typography.
3. [Every Little Something — 2026 Wedding Stationery Trends](https://everylittlesomething.com/2026-wedding-stationery-trends/): material, restraint, intentional space, and content organization.
4. [Papier — New In Wedding Invitations](https://www.papier.com/wedding/new-in/wedding-invitation): botanical, illustration, typography, and color directions.

Palettes, names, grids, section layouts, fonts, and photographic direction are original design choices, not reproductions of those templates. Paper/print qualities were translated into proportion, lines, and contrast rather than heavy textures. The links are retained as historical references, not newly verified research.

## Implementation principles

- One primary RSVP action; date and venue near the main heading.
- Readable section labels and body type, at least 16 px for core content.
- Responsive compositions and separate mobile photo framing.
- Deliberate no-photo layouts, not empty placeholders.
- Flexible typography for long names, PL/EN/DE, other events, and custom content.
- Production checks for editable-palette contrast, keyboard navigation, dynamic content, and real RSVP.

## Files and regeneration

- `overview.png`: all ten concepts.
- `previews/*-comparison.png`: five A/B boards.
- `previews/*-desktop.png` and `*-mobile.png`: individual screenshots.
- `concepts/*.html`, `style.css`: responsive mockups.
- [Media prompts](media/PROMPTS.md): full generation prompts.
- `verification.json`: recorded desktop/mobile widths, demonstration RSVP dialog checks, and runtime errors.

From the repository root:

```sh
node assets/theme-redesign/build.mjs
node assets/theme-redesign/serve.mjs
```

The build uses installed Playwright to recreate mockups/screenshots. The server uses port 4788. Mockups can also be opened directly as files.
