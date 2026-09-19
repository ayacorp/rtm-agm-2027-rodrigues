# Booking email previews

Checked-in HTML + text/plain renders for the reserve / I've paid / proof paths.

Regenerate:

```bash
npm run email-previews
```

Bank numbers come from `publicBank()` (locked MCB strings). These files are server-side previews, not client checkout copy.

Logo: `assets/logo.png` (raster of `assets/logo.svg`).

Public bank at render time: **visible**.
