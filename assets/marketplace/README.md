# Marketplace graphics

Generated publication assets:

- `project-time-icon-32.png` — Marketplace small icon
- `project-time-icon-128.png` — Marketplace large icon
- `project-time-banner-220x140.png` — Marketplace application card banner

The SVG files are the editable sources. On a system where ImageMagick has an SVG delegate such as Inkscape or librsvg, regenerate the PNGs from the repository root:

```bash
magick -background none assets/marketplace/project-time-icon.svg -resize 32x32 assets/marketplace/project-time-icon-32.png
magick -background none assets/marketplace/project-time-icon.svg -resize 128x128 assets/marketplace/project-time-icon-128.png
magick -background none assets/marketplace/project-time-banner.svg -resize 220x140! assets/marketplace/project-time-banner-220x140.png
```

If ImageMagick reports a missing SVG delegate on macOS, render the SVGs through Quick Look at Retina resolution, trim the white thumbnail canvas, and resize with ImageMagick. Always run `npm run publication:check` afterward to verify the exact dimensions.

Before review, upload the 128px icon to a public Google-hosted location whose URL begins with `https://lh3.googleusercontent.com/`, then use that URL for `addOns.common.logoUrl` in `src/appsscript.json`. Upload the identical PNG as the Marketplace listing icon. Do not leave the current development-only `gstatic.com` clock URL in the production manifest.

At least one real 1280×800, 640×400, or 2560×1600 screenshot of Project Time open in Google Calendar is still required. Do not use a fabricated mockup for the review screenshot.
