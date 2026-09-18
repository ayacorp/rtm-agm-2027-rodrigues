# RTM AGM 2027 Rodrigues

Public marketing and booking site for the **Round Table Mauritius National AGM 2027**.

- **When:** Thursday 13 – Sunday 16 May 2027 (3 nights)
- **Where:** Cotton Bay Resort & Spa, Pointe Coton, Rodrigues
- **Who:** Tablers, partners and children
- **Brand:** Round Table Mauritius only

## Stack

Static HTML, CSS and JS. No build step. Deploys on **Vercel** as a static project.

## Local preview

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Deploy to Vercel

1. Import this repo in the [Vercel dashboard](https://vercel.com/new).
2. Framework preset: **Other**.
3. Leave **Build Command** and **Output Directory** empty.
4. Deploy `main` (or this PR for a preview).

`vercel.json` sets clean URLs and security headers.

## Sources

**Visual SoT — Claude Design**

- Prototype: https://claude.ai/design/p/3d09c702-19b4-4226-8974-6f8bd36a04d3
- File: `RTM AGM 2027 Rodrigues.dc.html`
- Full: https://claude.ai/design/p/3d09c702-19b4-4226-8974-6f8bd36a04d3?file=RTM%20AGM%202027%20Rodrigues.dc.html

**Learn-from (structure/UX, not copy)**

- https://www.trl.lu/en/
- https://rtihym2027.ch/

**Content SoT** — CoS PDFs in `/content/` (booking sheet, 10-page pack, mindmap, brief, financials).

## Content rules

Prices, inclusions and programme come from those PDFs only. Visual layout follows the Design file (Invitation, Destination, Weekend, Pricing, FAQ, Reserve — lagoon teal, ivory, sand, gold). See `CONTENT.md` for remaining TBA.

Indicative member sharing ticket is **~Rs 29,700**. Do not invent bank details or a deposit.
