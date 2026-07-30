# Kushal Basnet — Portfolio Website

Personal portfolio site built from scratch with HTML, CSS and vanilla JavaScript — no
frameworks, no build step. Second-year BSc Computing Systems, Ulster University (London).

**Live sections:** Projects · Skills · Journey · Contact

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure and content |
| `styles.css` | All styling, theming and responsive breakpoints |
| `script.js` | Interactions and the hero canvas animation |
| `portrait_hd.png` | Hero portrait image |

## Features

- **Hero network animation** — a canvas topology that discovers a route, performs a
  visible TCP handshake (SYN / SYN·ACK / ACK), streams data and confirms delivery to
  the portrait node. Rebuilt on resize; skipped entirely for reduced-motion users.
- **Dark / light theme** — CSS custom properties switched via `data-theme` on `<html>`,
  remembered in `localStorage`, defaulting to the OS preference. A small inline script
  in `<head>` applies the theme before first paint to avoid a flash of the wrong colours.
  The canvas re-reads its palette from CSS on toggle so the animation matches.
- **Custom cursor** — a dot that tracks the pointer with a ring easing behind it.
  Positioned with `transform: translate3d(...)` only, so it stays GPU-composited and
  never triggers layout on mouse move.
- **Responsive** — fluid `clamp()` typography plus breakpoints at 820 / 760 / 640 /
  480 / 360px. Hamburger navigation below 760px.
- **Motion and accessibility** — every animation respects
  `prefers-reduced-motion`, interactive elements have visible focus rings, and the
  decorative canvas and portrait are hidden from assistive technology.

## Running locally

Open `index.html` directly in a browser, or serve the folder:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Contact

- GitHub — [kushal502](https://github.com/kushal502)
- LinkedIn — [kushal502](https://www.linkedin.com/in/kushal502)
