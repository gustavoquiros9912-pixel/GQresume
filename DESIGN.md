# Design system: gustavoquiros.com

The portfolio of Gustavo Quiros, UX and Product Design Lead. One idea runs through everything: **clarity is a
design decision**. The site, the hero film and the illustrations all use the same few parts, so they read as
one piece of work.

## 1. Brand

- **Ground:** near black `#141414`. The site is dark on purpose; the black is part of the identity.
- **One accent:** salmon `#ea4e65`. It marks what matters (the full stop, the selected state, the call to
  action) and nothing else. Text on salmon is `#141414` (5.1:1). White on salmon is never used for text (3.6:1).
- **Cream** `#efeeea` and **charcoal** `#1f1f22` are the two card colours next to salmon.
- **The salmon full stop** is the through-line: it ends the hero line, becomes the button in the film and ends
  every big title on the site as a small piece of cut paper (`.pdot`).

## 2. Type

| Role | Face | Notes |
|---|---|---|
| Display and reading | Bricolage Grotesque (variable, 300 to 700) | Big titles at 300 with tight tracking (-0.05em) |
| Labels and data | Space Mono 400 and 700 | Uppercase, tracked, never below 11 px |
| Simplified Chinese | Noto Sans SC, subset (`GQ Han`) | Only the characters the site sets; system fonts after it |
| Arabic | IBM Plex Sans Arabic, subset (`GQ Arabic`) | Right to left, no letter spacing |

All fonts are self-hosted from `src/fonts` under the SIL Open Font License, so nothing loads from a third party.

## 3. Tokens (`src/css/tokens.css`)

- Colour: `--bg`, `--bg-deep`, `--bg-raise`, `--accent`, `--accent-ink`, `--text`, `--text-soft`, `--text-faint`,
  `--line`, `--line-strong`.
- Type: `--display`, `--mono`, `--han`, `--arabic`.
- Shape: `--radius` (4 px for controls), larger radii for cards (24 to 32 px).
- Layout: `--gutter` (20 to 64 px), `--max` 1360 px, `--nav-height`.
- Motion: `--ease` `cubic-bezier(0.2, 0.7, 0.2, 1)`.

## 4. Components

- **Pill navigation** in liquid glass (SVG displacement in Chromium, frosted blur elsewhere).
- **Hero film** in a rounded frame with play, pause, replay and sound controls.
- **Case cards** (`.scard`): salmon, cream and charcoal, with paper grain, a role line, the industry as the title
  and an image. Client names and client work never appear on the home page: cards are named by industry and their
  images are stock photos (the industrial card uses a logo-free crop), blurred in the file itself with a padlock
  label. The real project images are only in the password-protected case studies.
- **Industry chips** with a 12 x 12 pixel icon each.
- **Password gate**: checks the password in the browser against the encrypted case studies, with a pixel padlock
  that reacts (shakes on a wrong password, opens on the right one).
- **Principle cards** (`.stance__item`) with a cut-paper pictogram each.
- **The multilingual template** (`.tpl`): locked brand zone, flexible content zones, six languages, a live readout.
- **Paper and pixels diorama**: one desk in two techniques, compared with a draggable divider.
- **Night footer**: a cut-paper skyline and a pixel walker.

## 5. The multilingual template

Six languages, in this order everywhere (site and film): **ZH** Simplified Chinese, **AR** Arabic, **TR** Turkish,
**EN** English (selected first), **PL** Polish, **ES** Spanish. Three writing systems (Han, Arabic, Latin), two
reading directions.

- The locked zone (brand mark, colour, type, grid) never changes.
- The flexible zone switches language. Arabic sets `dir="rtl"` and right alignment; Chinese and Arabic use their
  own faces; the zone keeps a fixed height that fits the longest language on two lines, so the component never
  changes size.
- The readout shows the script, the direction, the text length against English (measured from the rendered text)
  and whether the component size changed.
- Keyboard: Tab to the chips, arrow keys move between languages, Enter or Space selects. Changes are announced
  through a polite live region.

## 6. Illustration and motion: paper, then pixels

Two techniques, never mixed inside one piece.

**Cut paper (SVG)**
- Every edge is subdivided and nudged a little, so no cut is perfectly straight.
- Each piece has a crisp near shadow and a soft far shadow, plus a 256 px grain tile in soft-light.
- It moves like stop-motion: held drawings, about 12 a second (`steps(1, end)` keyframes or a 12 fps clock).

**Pixel art (canvas and CSS sprites)**
- One atlas (`src/art/sprites.png`) and one icon sheet (`src/art/icons.png`).
- Only whole-number scales, `image-rendering: pixelated`, never smoothed.
- Each sprite changes drawings on its own clock, 6 to 12 times a second.

**The character** is the designer: fair skin, light brown hair, salmon hoodie, dark trousers. The same palette is
used in every version: the pixel walker (16 x 34), the desk designer seen from behind (30 x 42), the earlier
pixel kit and the cut-paper designer (in the diorama and in the film).

| Part | Base | Shade | Highlight |
|---|---|---|---|
| Skin | `#f2cdb1` | `#dba88b` | |
| Hair | `#a77a4f` | `#7d5637` | `#c99a68` |
| Hoodie | `#ea4e65` | `#b13850` | `#f7a1aa` |

**Rules for motion**
- Nothing moves until `html.motion` is set (only when reduced motion is off and scripts run) and the piece is in view.
- One requestAnimationFrame clock; pieces off screen and hidden tabs do not draw.
- Reduced motion: every piece shows its finished drawing; the film shows its end card instead of playing.

## 7. Writing

- Plain, direct, first person where it is Gustavo's work.
- **No Oxford commas:** "Legal, Engineering, Product and Quality". Commas that join two full sentences stay.
- Numbers as figures: 10+ years, 2,000+ assets, 25 languages.

## 8. Accessibility

- Text contrast at least 4.5:1 (salmon on black is 5.1:1; dark text on salmon is 5.1:1).
- Every animation has a reduced-motion state; the film never autoplays for reduced motion.
- Decorative art is `aria-hidden`; the film has a full text description (`#film-desc`).
- Focus is always visible (salmon outline).
