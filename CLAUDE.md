# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static single-page marketing site for the **Museo Archipiélago de Humboldt** (Chungungo, La Higuera, Región de Coquimbo, Chile). Plain HTML/CSS/vanilla JS — no build step, no framework, no package manager, no tests. Content is in **Spanish** (`<html lang="es">`); keep all user-facing copy in Spanish. Deployed at `museoarchipielagodehumboldt.cl`.

## Running locally

Open `index.html` directly in a browser, or serve the folder so root-relative paths (e.g. `/favicon.ico`) resolve:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

There is nothing to build, lint, or test. To preview a change, open the page in a browser (a phone/narrow viewport matters — see Responsive below).

## Structure

- `index.html` — the entire page. All sections live here as `<section id="...">` blocks, in this order: hero (no `id`), the donation strip, the weather-station strip (`#estacion-resumen`), `#importancia`, `#galeria`, `#columna`, `#quienes-somos`, `#impacto`, `#visita`, `#instagram`. Only four of them are in the nav (`#quienes-somos`, `#visita`, `estacion.html`, `#galeria`) plus the "Hazte socio" CTA.
  - `#importancia` and `#impacto` are collapsible (`.section-toggle` + `.section-body`); `#galeria` is deliberately **not** collapsible (`.section-estatica`) so the carousel is always visible. `#columna` and `#instagram` are plain sections.
  - `#importancia` carries running prose (`.prosa`), not cards — it absorbed the former `#arte` section ("Por qué un museo de arte") as an `<h3>`. The former `#actividades` ("Qué habrá en el museo") was removed.
  - `#estacion-resumen` is a compact strip under the hero, on the dark `--deep` background (it sits right under the yellow donation strip, so the contrast keeps the two apart — don't lighten it without rechecking that pairing). `js/main.js` fetches `data/estacion/resumen.json` (the same file `estacion.html` uses) and fills the `[data-campo]` slots; on failure it leaves dashes and the button to `estacion.html` still works.
  - `#impacto` holds the photo-submission invite (`.fotos-invite`), whose button points at the public Tally form `https://tally.so/r/1W4D04`.
  - `#columna` is the fortnightly opinion column: currently one placeholder `.columna-card`. New entries = copy that block.
  - `#instagram` embeds one post via Instagram's official `embed.js`; if the script is blocked the `blockquote`'s link is styled as a fallback button.
- `css/styles.css` — all styling, organized by `/* ===== SECTION ===== */` comment banners that mirror the HTML sections.
- `js/main.js` — all behavior (small).
- `videos/` — video files used by `#quienes-somos`.
- `images/` — all assets are `.webp` (recent history converted everything from `.jpg`; keep new images as `.webp`).

## Photo gallery page

`galeria.html` is a third page: the full photo mosaic, reached from the nav
("Foto galería") and from the "Ver galería completa" button under the home
carousel. Layout is CSS `columns` (3 → 2 → 1), so photos keep their natural
aspect ratio and are never cropped. Each item is a `<figure class="mosaico-item"
onclick="openLightbox(this)">`; it reuses the same lightbox and `main.js` as the
home page. Adding a photo = copy one `.mosaico-item` block. A photo that is not
the museum's own carries its credit in `.mosaico-credito` (currently only the
albatross, by Tomás, a fisherman from Chungungo). The page ends with the same
Tally photo-submission invite as `#impacto`. The home carousel and this page
currently hold the same images; the plan is for the mosaic to be fed from the
"WEB" subfolder of the museum's Drive folder "FOTOS PROPIOS".

## Weather station page

`estacion.html` is a **second page** (the rest of the site is a single page). It
renders the museum's Davis weather station data from JSON files in
`data/estacion/`, which are written by `scripts/estacion_fetch.py` and committed
weekly by `.github/workflows/estacion.yml` — never edit `data/estacion/` by hand.
`js/estacion.js` draws the charts as hand-written SVG (no chart library): line
charts with a hover crosshair, plus a daily bar chart for rain. Series colors are
`--serie-aire` `#C9611C` and `--serie-agua` `#0E78AD` in `:root`; that pair was
validated for contrast on the light surface and for color-blind separation, so if
one changes, re-check the other. Credentials live only in the repository's GitHub
Actions secrets (see README), never in the code.

## Conventions that span files

- **Design tokens**: colors and max-width are CSS custom properties in `:root` at the top of `styles.css`. The palette follows the museum's brand sheet: `--deep`/`--ocean` `#29303A` (azul grafito, dark backgrounds), `--seafoam` `#FFBD59` (amarillo, main accent — name kept for historical reasons), `--naranja` `#F58235`, `--verde` `#A5C886`, plus `--accent-ink` `#9A6413` (darkened yellow, used wherever the accent must sit as text on a light background — the raw yellow fails contrast there). Also `--bg`, `--sand`, `--text`, `--muted`, `--maxw 1140px`. Use these vars rather than hardcoding hex values. Note: `js/main.js` hardcodes the active-nav color `#FFBD59` — if `--seafoam` changes, update it there too.
- **Fonts**: a single family, `Open Sans`, loaded from Google Fonts in `<head>` (weights 300–800 plus italics). Headings use weight 700–800 with slight negative letter-spacing; body is 300–400.
- **Lightbox gallery**: gallery items use inline `onclick="openLightbox(this)"` calling functions in `main.js`. `openLightbox` reads the item's `<img>` src/alt into `#lightbox-img`; Escape or click closes. Adding a gallery image = copy a `.gallery-item` block in the `#galeria` grid; no JS change needed.
- **Scroll-spy nav**: `main.js` uses an `IntersectionObserver` over `section[id]` to highlight the matching `.nav-links a` (matched by `href="#id"`). For this to work, a new nav link and its target section must share the same id.
- **Mobile nav**: `main.js` toggles `.open` on `#nav-links` and `.nav-toggle` (and `aria-expanded`) and closes the menu when a link is tapped. Keep those ids/classes in sync with the CSS.
- **Videos**: `main.js` calls `v.load()` on `#quienes-somos video` when playback ends, to reset it to its poster.
- **Donation CTA**: the nav item `.nav-donate` ("Hazte socio") and `.support-cta` in `#visita` both link to `https://fundacionmuseo.donando.cl/`; change both together. Because `.nav-donate` is inside `.nav-links`, the scroll-spy also iterates over it (it has no matching section, so it is simply never highlighted).
- **SEO metadata**: `<head>` holds a canonical URL and a JSON-LD block (including the Instagram `sameAs`). Update it when contact/social info changes; the same Instagram link also appears in `#visita`.
- **Responsive**: breakpoints are `@media (max-width: 768px)` and `(max-width: 480px)` at the bottom of `styles.css`. The hero text sits over a photographic background, so legibility on small screens / iPhone / Firefox is a recurring concern — verify text contrast over images when touching hero or `.hero-eyebrow`.
