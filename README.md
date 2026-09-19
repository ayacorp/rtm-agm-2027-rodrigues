# RTM AGM 2027 Rodrigues

Public marketing and booking site for the **Round Table Mauritius National AGM 2027**.

- **When:** Thursday 13 – Sunday 16 May 2027 (3 nights)
- **Where:** Cotton Bay Resort & Spa, Pointe Coton, Rodrigues
- **Who:** Tablers, partners and children
- **Brand:** Round Table Mauritius only
- **Payment rail:** MCB MUR bank transfer only (no Stripe, no cards)

## Stack

Static HTML, CSS and JS plus Vercel Serverless routes under `/api`. Deploys on **Vercel**.

## Local preview

```bash
npm install
npm test
npm run dev
```

Open `http://127.0.0.1:4173`. Copy `.env.example` to `.env` for local overrides.

Without `POSTGRES_URL` or KV credentials the API writes `data/bookings.json` locally. That file store is a **local-only fallback**, not production. On Vercel it becomes `/tmp` and reservations disappear between deploys.

## Booking API

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/config` | Public bank block, store driver, proof-upload flag |
| `POST` | `/api/reserve` | Create reservation (`pending_payment`), server-generated `RTM27-XXXX-####` |
| `POST` | `/api/booking/paid` | Guest “I’ve paid” → `awaiting_verification` + notify |
| `POST` | `/api/booking/proof` | Optional proof upload (Vercel Blob) → `awaiting_verification` + notify |
| `GET` | `/api/admin/bookings` | List reservations (`Authorization: Bearer $ADMIN_TOKEN`) |
| `PATCH` | `/api/admin/bookings` | `{ "ref", "status": "paid" }` |

`POST /api/reserve` body: `name`, `email`, `phone`, `table`, `companions`, `notes`, `roomType` (`share` \| `partner` \| `single`), `kids`. Total is computed on the server.

Lite admin UI: [`/admin`](./admin.html) (enter `ADMIN_TOKEN`). No seed data.

### curl

```bash
curl -s -X POST http://127.0.0.1:4173/api/reserve \
  -H 'content-type: application/json' \
  -d '{"name":"Alex Morel","email":"alex@example.com","phone":"59061912","roomType":"share","kids":0}'

curl -s -H "Authorization: Bearer $ADMIN_TOKEN" http://127.0.0.1:4173/api/admin/bookings

curl -s -X PATCH http://127.0.0.1:4173/api/admin/bookings \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"ref":"RTM27-MOREL-1234","status":"paid"}'
```

## Env checklist

Copy [`.env.example`](./.env.example). Client HTML/JS do not hardcode account digits — `/api/config` and the reserve response return the bank block when `BANK_DETAILS_PUBLIC=true`.

| Variable | Production value |
| --- | --- |
| `BANK_DETAILS_PUBLIC` | `true` |
| `MCB_ACCOUNT_NAME` | Mauritius Round Table No. 9 |
| `MCB_CHEQUES_PAYABLE` | Round Table 9 |
| `MCB_BANK` | The Mauritius Commercial Bank (MCB), Sir William Newton Street, Port Louis |
| `MCB_ACCOUNT_NUMBER` | `000443540438` |
| `MCB_IBAN` | `MU13MCBL0944000443540438000MUR` |
| `MCB_SWIFT` | `MCBLMUMU` |
| `BOOKING_NOTIFY_EMAIL` | `ishant@ayacorp.io` |
| `TREASURER_PHONE` | `+230 5906 1912` |

Set `BANK_DETAILS_PUBLIC=false` to hide the numbers again (reserve + ref still work).

### Production MUST set

Production is not ready until these are on the Vercel project (Production + Preview), then redeploy:

1. **Bookings (durable store) — pick one**
   - **Preferred:** `POSTGRES_URL` (Neon or Vercel Postgres). `DATABASE_URL` is accepted as an alias.
   - or `KV_REST_API_URL` + `KV_REST_API_TOKEN` (Vercel KV)
2. **Proof upload:** `BLOB_READ_WRITE_TOKEN` (Vercel Blob). `/api/config` reports `proofUpload: true` only when this is set. The checkout form then posts to `/api/booking/proof`.
3. **Notify** `ishant@ayacorp.io`: `RESEND_API_KEY` + `RESEND_FROM` (or `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM`)

Optional: `STORE_DRIVER=postgres|kv|blob|file|memory` (auto-detect prefers Postgres, then KV, then local file). Blob is for proof files, not the booking index.

### Notifications

Reserve, “I’ve paid”, and proof-upload each send **branded HTML** (plus text/plain) to the guest and a branded operational copy to `BOOKING_NOTIFY_EMAIL`. Templates live in `lib/email-templates.js`. Bank numbers come from `publicBank()` — same locked MCB strings as checkout. Default `RESEND_FROM` is `RTM AGM 2027 <bookings@friday.mu>`. Logo: `assets/logo.png`. Checked-in renders: [`email-previews/`](./email-previews/).

If Resend/SMTP is missing, the API queues the messages (`data/notify-queue.json` locally, `/tmp` on Vercel) and logs them. That is not production.

### Admin

- `ADMIN_TOKEN` — required for `/api/admin/bookings` and `/admin`

## Deploy to Vercel

1. Import this repo in the [Vercel dashboard](https://vercel.com/new).
2. Framework preset: **Other** (or Node). Leave **Build Command** and **Output Directory** empty.
3. **Project → Settings → Environment Variables** — add the same values as `.env.example` for Production (and Preview if you want the bank block on PR deploys):

   ```
   BANK_DETAILS_PUBLIC=true
   MCB_ACCOUNT_NAME=Mauritius Round Table No. 9
   MCB_CHEQUES_PAYABLE=Round Table 9
   MCB_BANK=The Mauritius Commercial Bank (MCB), Sir William Newton Street, Port Louis
   MCB_ACCOUNT_NUMBER=000443540438
   MCB_IBAN=MU13MCBL0944000443540438000MUR
   MCB_SWIFT=MCBLMUMU
   BOOKING_NOTIFY_EMAIL=ishant@ayacorp.io
   TREASURER_PHONE=+230 5906 1912
   ```

4. **MUST** set a durable store: `POSTGRES_URL` (preferred) **or** `KV_REST_API_URL` + `KV_REST_API_TOKEN`. File/`/tmp` is local-only.
5. **MUST** set `BLOB_READ_WRITE_TOKEN` so checkout proof upload is enabled (`proofUpload: true`).
6. **MUST** set `RESEND_API_KEY` + `RESEND_FROM=RTM AGM 2027 <bookings@friday.mu>` (or SMTP_*) so reserves, “I’ve paid”, and proof emails reach the guest and `ishant@ayacorp.io`.
7. `ADMIN_TOKEN` for `/admin` and `/api/admin/bookings`.
8. Redeploy so the functions pick up the env. Deploy `main` (or this PR for a preview).

`vercel.json` sets clean URLs and security headers. Serverless functions in `/api` are included automatically.

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

Indicative member sharing ticket is **~Rs 29,700**. Payment rail is MCB MUR transfer only. Do not invent a deposit.
