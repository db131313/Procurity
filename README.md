# Procurity.Pro

**Find the next job. Before they need you.**

Construction project intelligence for exterior/interior signage sales — starting with New York City. Procurity ingests NYC DOB open data, estimates construction phase, and scores each project on likelihood to buy signage right now.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- MapLibre GL + OpenFreeMap (free tiles, no API key)
- Firebase Auth scaffold (demo session works without keys)
- File-backed store + Prisma schema for Postgres/PostGIS
- Stripe Checkout / Customer Portal / webhooks (3 tiers)
- Framer Motion, lucide-react, @dnd-kit, canvas-confetti

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo access

On `/login` or `/signup`, use **Continue with demo** (or email/password — local scaffold until Firebase is configured).

- Demo email: `demo@procurity.pro`
- Seeded NYC projects load from `data/store.json` (auto-created)

### Live DOB sync

```bash
curl -X GET http://localhost:3000/api/cron/sync-dob
```

Or set `CRON_SECRET` and call with `Authorization: Bearer $CRON_SECRET`. Vercel Cron hits this nightly (`vercel.json`).

## App routes

| Path | Purpose |
| --- | --- |
| `/` | Marketing home |
| `/pricing`, `/how-it-works` | Public pages |
| `/login`, `/signup` | Auth |
| `/app/home` | Dashboard |
| `/app/map` | MapLibre field map |
| `/app/project/[id]` | Project detail + Buy Score |
| `/app/pipeline` | Kanban pipeline |
| `/app/alerts` | Event feed |
| `/app/deal/[id]/won` | Deal won + confetti |
| `/app/settings`, `/app/billing` | Account + Stripe |

## Configuration

See `.env.example` for Firebase, `DATABASE_URL`, Stripe price IDs (`STRIPE_PRICE_ID_STARTER/GROWTH/PRO`), NYC Open Data token, and map style URL.

Until keys are provided:

- Auth uses the `pc_session` cookie + local user store
- Billing upgrades apply in **demo mode**
- Projects use seed data (or live Socrata pulls when you run the cron)

## Brand

Logo SVGs live in `/public/brand/`. Use `<Logo variant="gradient" | "dark" | "light" | "icon" />`.
