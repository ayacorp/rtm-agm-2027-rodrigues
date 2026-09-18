# RTM AGM 2027 Rodrigues

Public marketing and booking-info site for the **Round Table Mauritius National AGM 2027**.

- **Dates:** 13–16 May 2027
- **Place:** Rodrigues, Mauritius
- **Audience:** Tablers and partners
- **Brand:** Round Table Mauritius only (not a Friday product surface)

Repo: [ayacorp/rtm-agm-2027-rodrigues](https://github.com/ayacorp/rtm-agm-2027-rodrigues)

## Stack

Static HTML, CSS and JS. No build step. Deployable on **Vercel** as a static project.

```
index.html          # single-page public site
404.html
css/styles.css
js/main.js
assets/             # lockup, favicon, vendor Rodrigues photos
vercel.json
CONTENT.md          # TBA checklist when PDFs / prototype HTML land
```

## Local preview

Any static server from the repo root. Examples:

```bash
python3 -m http.server 4173
```

or

```bash
npx --yes serve -l 4173
```

Open `http://localhost:4173`.

## Deploy to Vercel

1. Import [ayacorp/rtm-agm-2027-rodrigues](https://github.com/ayacorp/rtm-agm-2027-rodrigues) in the [Vercel dashboard](https://vercel.com/new).
2. Framework preset: **Other**.
3. Leave **Build Command** empty.
4. **Output Directory:** empty (project root is the site).
5. Deploy the `main` branch (or this PR branch for a preview).

`vercel.json` sets clean URLs and conservative security headers. Preview URLs are created automatically on each PR.

CLI alternative (once logged in):

```bash
npx vercel
```

## Design notes

The Claude Design prototype
([claude.ai/design/p/3d09c702-19b4-4226-8974-6f8bd36a04d3](https://claude.ai/design/p/3d09c702-19b4-4226-8974-6f8bd36a04d3),
file `RTM AGM 2027 Rodrigues.dc.html`) required authentication and was **not**
available when this site was first built.

The layout follows public Round Table meeting sites for **structure**, not copy:

- [RTI Half Year Meeting 2027](https://rtihym2027.ch/) — hero dates, registration, programme, travel, hotels
- [Round Table Luxembourg](https://www.trl.lu/en/) — association tone and fellowship framing

Visual direction is a premium island AGM: deep navy, lagoon, RT gold, editorial serif. Photographs are CC-licensed shots of Rodrigues (see `assets/PHOTO-CREDITS.md`) and are **not** official venue photography.

## Content rules

- Do not invent official prices, bank details, legal terms, or a venue name.
- Mark unpublished facts **TBA**.
- When booking-sheet / Rodrigues pack / mindmap / brief / financials PDFs arrive, follow `CONTENT.md`.

## Licence

Site code is for Round Table Mauritius AGM use. Photographs remain under their Creative Commons licences.
