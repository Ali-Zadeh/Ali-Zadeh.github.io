# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Static single-page PWA ("Corner Café — IOUs") deployed via GitHub Pages from this repo's root. Tracks money owed to people, with archive/paid history and a 6-month bar chart. All state is client-side in `localStorage` — there is no backend, no API, no auth.

## Stack and tooling

- Vanilla HTML/CSS/JS. No framework, no bundler, no `package.json`, no tests, no lint config.
- Vendored libraries committed to the repo root: `bootstrap.min.css`, `bootstrap.bundle.min.js`, `chart.umd.min.js`. Do not add a CDN dependency or a build step without first confirming with the user — the site is intentionally self-contained so it works offline via the service worker.
- To run locally, serve the directory with any static server (e.g. `python3 -m http.server`) and open `index.html`. Opening via `file://` will break the service worker and the `<base href="/">`.

## Architecture

Everything lives in three files:

- `index.html` — markup, inline CSS (theme variables + dark-mode media query), and the modal/toast containers. The `<h1 id="appHeader">` is `contenteditable` and persists to `localStorage`.
- `index.js` — the entire app; one `init()` function attached to `DOMContentLoaded`. Uses module-private state (`transactions`, `archived`, `whomList`) plus DOM refs grabbed once at top of `init`. Re-renders are explicit calls to `renderPeople() / renderArchived() / drawChart()` after every mutation.
- `service-worker.js` — PWA cache, stale-while-revalidate-ish (cache-first with network fallback that re-populates cache).

### State model (localStorage keys)

Defined in `STORAGE` at the top of `init()` in `index.js`:

- `iou_tx` — outstanding transactions: `{ id, whom, amount, date }`
- `iou_arch` — paid/archived transactions: same shape plus `archivedAt`
- `iou_whom` — autocomplete list of payee names (preserves display case, deduped case-insensitively)
- `iou_app` — the editable app header text

### Person grouping convention

People are grouped **case-insensitively** (`whom.trim().toLowerCase()` is the key) but the **original display casing is preserved**. When adding the same name with different casing, or renaming via the inline `contenteditable` person name, `commitRename()` normalizes all matching transactions to the new display string and merges into any existing case-variant. Any new code that touches `whom` must follow this same pattern or it will create duplicate person rows.

### Currency and locale

Hard-coded to `Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' })`. If the app is ever generalized, this is the single point to change.

## Service worker — important

`service-worker.js` caches a fixed list of files (`urlsToCache`) keyed by `CACHE_VERSION`. Two things to remember:

1. **Bump `CACHE_VERSION`** in `service-worker.js` whenever you change any cached asset (`index.html`, `index.js`, `bootstrap.min.css`, `icon-512x512.png`, `manifest.json`). Otherwise returning users will keep seeing the stale cached version until they manually clear it.
2. **Update `urlsToCache`** if you add a new asset that should work offline. Note that `bootstrap.bundle.min.js` and `chart.umd.min.js` are referenced from `index.html` but are **not** currently in `urlsToCache` — confirm with the user before changing this list, since they may have offline-vs-size tradeoffs in mind.

The fetch handler returns cached responses without revalidation, so a cache miss is the only way new content reaches the user — which is why the version bump matters.

## Deployment

Pushed to `main` → served by GitHub Pages at `Ali-Zadeh.github.io`. There is no CI, no preview environment, and no build artifact — what's in the repo root is what ships.
