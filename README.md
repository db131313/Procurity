# Procurity.Pro

Construction project intel for signage sales teams. Answer **“Who is ready to buy signage?”** with a daily **Top 20 sites to visit**, buy-probability scores, contact intel, and a free 3D field map — powered by open NYC Department of Buildings data.

## What it does

- Pulls live **NYC DOB NOW: Build – Job Application Filings** (`w9ak-ipjd`)
- Scores each site for **signage procurement window** readiness
- Enriches contacts with permittee phones from **DOB Permit Issuance** when available
- Ranks a **Top 20 visit list** with probability %, window labels, and outreach contacts
- Renders targets on a **free 3D map** (MapLibre + OpenFreeMap — no API key / no credit card)
- Includes **sign-in** (Auth.js) and **Stripe** subscriptions (with demo upgrade fallback)

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- MapLibre GL + OpenFreeMap tiles (no Mapbox billing)
- NextAuth (Auth.js) credentials
- Stripe Checkout + webhooks
- NYC Open Data (Socrata)

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo account

- Email: `demo@procurity.pro`
- Password: `demo1234`
- Plan: Pro (contacts unlocked)

## Environment

| Variable | Purpose |
| --- | --- |
| `NEXTAUTH_URL` | App URL (e.g. `http://localhost:3000`) |
| `NEXTAUTH_SECRET` / `AUTH_SECRET` | Session encryption |
| `STRIPE_SECRET_KEY` | Stripe server (optional) |
| `STRIPE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe client (optional) |
| `STRIPE_PRICE_ID` | Subscription price (optional) |
| `STRIPE_WEBHOOK_SECRET` | Billing webhooks (optional) |

Maps work out of the box via OpenFreeMap (no key). Without Stripe keys, checkout upgrades the account in **demo mode**.

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run start    # start production server
npm run lint     # eslint
```

## Product note

Procurity.Pro is **not** a generic lead scraper. It models when a construction project is inside the signage buy window (status, scale, timing, SIGN work flags, contactability) so reps can choose where to walk today.
