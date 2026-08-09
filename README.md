# Procurity.Pro

Construction project intel for signage sales teams. Answer **“Who is ready to buy signage?”** with a daily **Top 20 sites to visit**, buy-probability scores, contact intel, and a Mapbox 3D field map — powered by open NYC Department of Buildings data.

## What it does

- Pulls live **NYC DOB NOW: Build – Job Application Filings** (`w9ak-ipjd`)
- Scores each site for **signage procurement window** readiness
- Enriches contacts with permittee phones from **DOB Permit Issuance** when available
- Ranks a **Top 20 visit list** with probability %, window labels, and outreach contacts
- Renders targets on a **Mapbox 3D** buildings map
- Includes **sign-in** (Auth.js) and **Stripe** subscriptions (with demo upgrade fallback)

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- Mapbox GL JS
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
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox 3D map |
| `STRIPE_SECRET_KEY` | Stripe server |
| `STRIPE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe client |
| `STRIPE_PRICE_ID` | Subscription price |
| `STRIPE_WEBHOOK_SECRET` | Billing webhooks |

Without Mapbox/Stripe keys the app still runs: maps show a skyline fallback, and checkout upgrades the user in **demo mode**.

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run start    # start production server
npm run lint     # eslint
```

## Product note

Procurity.Pro is **not** a generic lead scraper. It models when a construction project is inside the signage buy window (status, scale, timing, SIGN work flags, contactability) so reps can choose where to walk today.
