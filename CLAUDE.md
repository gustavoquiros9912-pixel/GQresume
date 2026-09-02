# Gustavo Quiros — Portfolio

Personal portfolio website.

## Stack

Vite + Vanilla JS (no animation library — cursor/scroll effects are hand-rolled with requestAnimationFrame, IntersectionObserver, and CSS keyframes)

## Design tokens

| Token | Value |
|-------|-------|
| `--blue` | `#1a52d4` |
| `--ink` | `#1a2744` |
| `--cream` | `#f5f0e6` |
| `--stamp` | `#c8001e` |

**Fonts:** Noto Serif JP (display), Space Mono (labels/mono), Caveat (handwritten)

**Panels:** `border-radius: 6px` (`--panel-radius`), gap `12px` (`--panel-gap`)

## Conventions

- CSS values always use custom properties from `src/css/tokens.css` — never hardcoded
- Each JS file handles one concern only (`src/js/`)
- SVG illustrations live in `src/assets/illustrations/`, referenced by `<img>` or `<object>`
- Never use React, jQuery, or any framework — vanilla JS only

## Structure

```
src/css/
  tokens.css
  base.css
  layout.css
  components/
    ticket.css
    panel.css
    caption.css
src/js/
  ticket.js
  nav.js
  typewriter.js
src/assets/illustrations/
work/
```
