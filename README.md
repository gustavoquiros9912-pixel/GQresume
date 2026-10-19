# gustavoquiros.com

The portfolio of Gustavo Quiros, UX & Product Design Lead in San Diego. A static site: HTML, CSS and vanilla
JavaScript with no build step and no third-party requests (fonts and scripts are local).

## Run it locally

```bash
python3 -m http.server 8000      # then open http://localhost:8000
```

Use a local server rather than opening the file directly: the page fetches its cut-paper art (`src/art/*.svg`) so
the pieces can move.

## Deploy

Vercel, as is: no build command, the repository root is the output. `vercel.json` turns on clean URLs
(`/insurance` serves `insurance.html`). `.vercelignore` keeps these notes, `tools/` and anything private out of the
deployment.

## Where things are

| Path | What |
|---|---|
| `index.html` | Home: hero film, work by industry, password gate, principles, multilingual template, experience, Paper and pixels, night footer |
| `work.html` and the five case-study pages | Encrypted with StatiCrypt (see `tools/`) |
| `design-system.html` | The design system page |
| `src/css`, `src/js` | Styles and scripts, one concern per file |
| `src/art`, `src/fonts` | Sprite sheets, cut-paper SVGs, grain, fonts (SIL OFL) |
| `work/images`, `work/hero` | Case-study images and the hero film's web encodes |
| `tools/` | Encrypt and verify the case studies (Node, no install) |

`DESIGN.md` describes the design system. Editable sources for the
art, characters, animation and film are in the handoff package that came with this repository.
