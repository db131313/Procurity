# Procurity.Pro

**Find the next job. Before they need you.**

Construction project intelligence for exterior/interior signage sales. Procurity ingests open permit data, estimates construction phase, and scores each project on likelihood to buy signage right now.

## Hosting

**Netlify** (not Vercel). Live site: [rococo-scone-8d41f1.netlify.app](https://rococo-scone-8d41f1.netlify.app).  
`vercel.json` is unused/dead — all hosting, domain, and env work goes through Netlify (`netlify.toml`).

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- MapLibre GL + OpenFreeMap (free tiles, no API key)
- Firebase Auth (Email/Password + password reset) via env config
- File-backed store for local/demo + Prisma schema for Postgres/PostGIS
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

On `/login` or `/signup`, use **Try demo session**. With Firebase env vars set, email/password and `/forgot-password` use Firebase Auth.

### Storage (important)

| Environment | Storage |
| --- | --- |
| No `DATABASE_URL` | **File-based** `data/store.json` + legacy `data/users.json` |
| `DATABASE_URL` set | **Postgres via Prisma** exclusively — JSON file I/O is skipped |

**Cutover:** paste Neon `DATABASE_URL` into Netlify env → redeploy. Build runs `prisma migrate deploy` automatically. Then hit `/api/cron/sync-cities` (with `CRON_SECRET`) to load NYC + Chicago + LA + Miami + Boston.

### Multi-city sync

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://rococo-scone-8d41f1.netlify.app/api/cron/sync-cities"
```

| City | Feed | Notes |
| --- | --- | --- |
| NYC | NYC Open Data / DOB | Live |
| Chicago | Socrata `ydr8-5enu` | Live |
| Los Angeles | Socrata `xnhu-aczu` | Live (geo via `location_1`) |
| Boston | **CKAN** (not Socrata) | Live — `CITY_BOSTON_CKAN_RESOURCE_ID` |
| Miami | Socrata `7ey5-m434` on `data.miamigov.com` | May need `CITY_MIAMI_SOCRATA_URL` if DNS/egress blocks default host |

### Stripe webhooks

Point Stripe at:

`https://rococo-scone-8d41f1.netlify.app/api/webhooks/stripe`

(Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.)  
After `procurity.pro` DNS cutover, update the endpoint to the custom domain.

## App routes

| Path | Purpose |
| --- | --- |
| `/` | Marketing home |
| `/pricing`, `/how-it-works` | Public pages |
| `/login`, `/signup`, `/forgot-password` | Auth |
| `/app/home` | Dashboard |
| `/app/map` | MapLibre field map |
| `/app/project/[id]` | Project detail + Buy Score |
| `/app/pipeline` | Kanban pipeline |
| `/app/alerts` | Event feed |
| `/app/deal/[id]/won` | Deal won + confetti |
| `/app/settings`, `/app/billing` | Account + Stripe |

## Configuration

See `.env.example` for the full Netlify env checklist (Firebase, Stripe, `DATABASE_URL`, city feed URLs, etc.).

Until keys are provided:

- Auth uses demo session + local scaffold
- Billing upgrades apply in **demo mode**
- Projects use seed data (or live Socrata pulls when you run the cron)

## Brand

Logo SVGs live in `/public/brand/`. Use `<Logo variant="gradient" | "dark" | "light" | "icon" />`.
