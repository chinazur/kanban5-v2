# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

IT PMO Kanban **v2**: a cyberpunk-styled revamp of the original board at https://github.com/chinazur/kanban5 (v1, a single blue `index.html`). It is a demo and training tool for a fictitious bank's internal IT PMO. v1 stays untouched and live; do not change it from here.

## What differs from v1

v1's "single file, no assets" rules are **lifted for v2 only**:

- Several files are allowed: `index.html`, `css/styles.css`, `js/app.js` and media under `assets/`.
- Image and video files are allowed (`assets/screens/`, `assets/video/`). Keep them small; the video is a Playwright recording of the live app.

These rules still apply:

- Vanilla HTML, CSS and JS. No frameworks, libraries, build step or npm.
- No external resources: no CDNs, web fonts or remote images. CI fails on them. System font stack, inline SVG for icons.
- No persistence: no `localStorage`, `sessionStorage`, IndexedDB or cookies. The theme choice is deliberately not stored.
- No `alert()` or `confirm()`. Errors show inline; delete uses the inline "Delete? Yes / No" confirm.
- No `!important`.
- Branding: neutral "IT PMO" wordmark. No real UOB logos or trademarks, and no imitation of an official UOB system. Task IDs stay `UOB-ITPM-####` and the email subject `[UOB IT PMO]`.
- The only network call is FormSubmit.

## Commands

- Run locally: `python3 -m http.server 8766` in the repo root, then open http://127.0.0.1:8766/ (a server is needed for Playwright, which blocks `file:`; the page also works from `file://`).
- JS syntax: `node --check js/app.js`
- Constraint grep (should print nothing): `grep -nE 'localStorage|sessionStorage|indexedDB|document\.cookie|alert\(|confirm\(|!important' index.html css/styles.css js/app.js`

## Architecture

- `js/app.js` is v1's logic unchanged: `state = { tasks, filters, ui, nextId }` is the single source of truth, every change goes through `addTask` / `moveTask` / `deleteTask` / `setUi` and then `renderBoard()` rebuilds the columns. Escape every data string with `escapeHtml()`. Events are delegated on `#board`. Dates are local `YYYY-MM-DD` strings.
- v2 additions at the end of `app.js`: `initTheme()` (toggle sets `data-theme` on `<html>`, defaults to the system setting) and `initHeroVideo()` (autoplay unless `prefers-reduced-motion`, with a Pause button).
- `css/styles.css`: all colours come from tokens on `:root`. Light is the default, dark is defined twice, once under `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` and once under `:root[data-theme="dark"]`. Change both together. Priority and column colours are tokens too.
- Gallery screenshots come in light and dark pairs (`for-light` / `for-dark` images) shown by theme.

## Regenerating media

Screenshots and the walkthrough video are made with Playwright against the local server (1440x900 for screenshots, 1280x720 for the video). Recording video needs `npx playwright install ffmpeg` once. Use `behavior: 'instant'` when scrolling before a screenshot, because the page has `scroll-behavior: smooth`. For HTML5 drag and drop in a script, make a few small mouse moves after `mouse.down()` before the long move, or the drag never starts.
