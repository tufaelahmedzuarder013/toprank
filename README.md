# Toprung — pay-to-rank leaderboard

A complete, launch-ready pay-to-rank leaderboard. People submit a website or an X profile, pay to claim a position, and the highest confirmed total ranks first. Visitors browse the all-time board, today's board, the daily archive, category boards and product pages.

“Toprung” is a placeholder brand. Rename it, change the colours and logo, and edit every piece of copy from **Admin → Settings / Pages & FAQ** without touching code.

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Quick start (demo mode)](#quick-start-demo-mode)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Switching from demo mode to Stripe](#switching-from-demo-mode-to-stripe)
- [Daily cron](#daily-cron)
- [Deploying to Vercel](#deploying-to-vercel)
- [How ranking works](#how-ranking-works)
- [Payment flow & safety guarantees](#payment-flow--safety-guarantees)
- [Ownership verification & upgrades](#ownership-verification--upgrades)
- [Admin dashboard](#admin-dashboard)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Going live checklist](#going-live-checklist)
- [What needs external credentials or production configuration](#what-needs-external-credentials-or-production-configuration)

---

## Features

**Public site**
- Home: compact “Claim the spotlight.” form (amount ± buttons, URL/X handle, category, live estimated position, rule hints) directly above the leaderboard — no oversized hero.
- Boards: All-Time, Today (UTC, live countdown, resets at 00:00 UTC), Daily Archive (date picker, frozen past days), per-category All-Time/Today boards with the amount needed to reach #1.
- Leaderboard rows: rank, logo/initials fallback, name, description, category, domain, time added, outgoing clicks, amount, View details and Claim/Outbid actions; distinct gold/silver/bronze top 3. Rows glide to new positions when the board refreshes (reduced-motion respected).
- Sidebar: current #1, today's top, recent activity, admin-controlled featured and seasonal blocks (moves below the board on mobile).
- Claim flow: link validation, duplicate detection, SSRF-safe metadata fetch (title, description, favicon, OG image) with manual fallback, editable details, live preview, order summary, terms checkbox, hosted checkout.
- Product pages: all-time/category/today ranks, total paid, clicks, date added, ranking activity, amount to climb, share (native share, copy link, X), visit (tracked, `rel="sponsored"`), related listings, paid-placement disclosure.
- Search with category and All-Time/Today filters, pagination, empty/loading/error states.
- How it works, About, FAQ (with FAQPage JSON-LD), Rules, Contact (stored in admin inbox), Terms, Privacy.
- Light/dark mode, keyboard navigation, visible focus, skip link, WCAG AA colour contrast (brand colours are contrast-corrected automatically), responsive from 320 px up.
- SEO: per-page titles/descriptions, Open Graph (+ generated OG image), canonical URLs, `sitemap.xml`, `robots.txt`.

**Accounts**
- Email + password sign-up/sign-in (scrypt hashes, httpOnly session cookie, rate limited).
- User dashboard: linked listings, rank, clicks, payment/upgrade history, ownership verification, edit details, upgrade paying only the difference.

**Admin** (role-protected)
- Overview (real revenue vs. clearly-labelled demo volume, listings, clicks, checkouts in progress, 14-day chart), listings moderation (hide / restore / remove & block), payments (with refund handling), ownership reviews, categories CRUD/disable, settings (name, logo, colours, homepage text, disclosure, ranking rules, featured & seasonal), pages & FAQ editor (Markdown), contact messages, users & roles, one-click demo-data removal.

## Tech stack

Next.js 16 (App Router, React 19, Server Actions) · TypeScript · Tailwind CSS 4 · shadcn-style components on Radix UI primitives · Lucide icons · Motion (Framer Motion) · PostgreSQL · Prisma 7 (`@prisma/adapter-pg`) · Stripe Checkout (test mode) · Zod · Vitest.

## Quick start (demo mode)

Requirements: **Node.js 22 LTS** (≥ 20.19) and **PostgreSQL 14+**.

```bash
cp .env.example .env            # then edit DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD
npm install                     # also runs `prisma generate`
npm run db:deploy               # apply migrations
npm run db:seed                 # categories, settings, pages, FAQ, admin user + labelled demo listings
npm run dev                     # http://localhost:3000
```

Sign in at `/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD` to reach `/admin`.

With no `STRIPE_SECRET_KEY`, the site runs in **demo mode**: a banner says so on every page, checkout is a clearly labelled simulation (succeed / decline / cancel), demo payments are flagged `isDemo` and are never counted as revenue. Nothing pretends a real payment happened.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string used by the app (a pooled URL is fine). |
| `DIRECT_URL` | no | Direct (non-pooled) URL used only by `prisma migrate` — set it when `DATABASE_URL` goes through a pooler. `DATABASE_URL_UNPOOLED` (set by Neon on Vercel) is picked up too. |
| `NEXT_PUBLIC_SITE_URL` | yes | Public base URL (Stripe redirects, canonical URLs, sitemap, OG). |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | for seeding | `npm run db:seed` creates (or promotes) this admin. Password ≥ 10 characters. |
| `SEED_DEMO` | no | `false` seeds everything except the fictional demo listings. |
| `STRIPE_SECRET_KEY` | for payments | `sk_test_…` while testing. Empty = demo mode. |
| `STRIPE_WEBHOOK_SECRET` | with Stripe | `whsec_…` signing secret for `/api/webhooks/stripe`. |
| `CRON_SECRET` | recommended | Bearer token for `/api/cron/daily-snapshot`. |
| `TEST_DATABASE_URL` | for tests | Separate database; **its tables are truncated** by the integration tests. |

## Database

The schema lives in `prisma/schema.prisma`; the initial migration in `prisma/migrations/`.

```bash
npm run db:deploy      # apply migrations (production / CI)
npm run db:migrate     # create + apply a new migration after editing the schema (development)
npm run db:seed        # idempotent: safe to re-run
npm run db:reset       # drop, re-migrate and re-seed (development only!)
npm run db:clear-demo  # remove seeded demo listings and anything bought through the demo checkout
```

The Prisma client is generated into `src/generated/prisma` (git-ignored) by `npm install` / `npm run db:generate`.

Main tables: `User`, `Session`, `Category`, `Listing`, `Payment`, `WebhookEvent` (processed provider events, for idempotency), `OwnershipClaim`, `DailySnapshot` (frozen daily rankings), `SiteSettings`, `ContentPage`, `Faq`, `ContactMessage`.

## Switching from demo mode to Stripe

1. Create a Stripe account and copy the **test** secret key (`sk_test_…`) into `STRIPE_SECRET_KEY`.
2. Set `NEXT_PUBLIC_SITE_URL` to the URL customers use (Stripe redirects back to `/payment/success` and `/payment/cancelled`).
3. Add a webhook endpoint `https://YOUR_SITE/api/webhooks/stripe` (Dashboard → Developers → Webhooks) for these events and put its signing secret in `STRIPE_WEBHOOK_SECRET`:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`

   Locally, use the Stripe CLI instead:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe   # prints the whsec_… secret
   ```
4. Restart the app. The demo banner changes to a **Stripe test mode** notice; pay with test cards such as `4242 4242 4242 4242`.
5. In **Admin → Overview**, remove the demo data before launch (or run `npm run db:clear-demo`).
6. To take real payments, swap in live keys and a live webhook secret. The test-mode banner disappears automatically with a live key.

Card details never touch this app — payment happens on Stripe's hosted Checkout page.

## Daily cron

Today's board needs no cron: it is computed from payments confirmed since 00:00 UTC, and past days are frozen into `DailySnapshot` the first time they are viewed. A daily job is still recommended to freeze days eagerly and to release abandoned checkouts:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR_SITE/api/cron/daily-snapshot
```

Schedule it a few minutes after 00:00 UTC (Vercel Cron, GitHub Actions, crontab…). It freezes the last 7 finished days (idempotent) and expires checkouts older than 2 hours (Stripe sessions that are already submitted — e.g. slow bank transfers — are left to the webhook).

## Deploying to Vercel

The app runs on Vercel as-is (all pages are server-rendered on demand; webhooks, cron and click tracking are ordinary route handlers). Vercel uses the `vercel-build` script (`scripts/vercel-build.mjs`):

- **Production deployments** apply pending migrations (`prisma migrate deploy`), then run the seed **only if the database is empty**. Later deploys never re-create deleted categories or removed demo data; they only make sure the `ADMIN_EMAIL` account exists.
- **Preview deployments** never touch the database schema.

Steps:

1. **Plan:** a site that takes payments is commercial use, which Vercel's free Hobby plan doesn't allow — use **Pro** for the live site (Hobby is fine for a private demo/test deployment).
2. **Import the GitHub repo** in Vercel (Add New → Project). Framework and build settings are auto-detected.
3. **Database:** in the project, Storage → add Postgres from the Marketplace (Neon, Prisma Postgres, Supabase…) and connect it to Production. The integration sets `DATABASE_URL` (Neon also sets `DATABASE_URL_UNPOOLED`, which migrations use automatically). For another provider, set `DATABASE_URL` and, if it is pooled, `DIRECT_URL`. Pick a function region close to the database (Settings → Functions).
4. **Environment variables** (Settings → Environment Variables, Production):
   - `NEXT_PUBLIC_SITE_URL` — your production URL, e.g. `https://your-project.vercel.app`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` (≥ 10 characters) — the first admin account
   - `SEED_DEMO` — `false` to start without the labelled demo listings
   - `CRON_SECRET` — any long random string
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — leave empty to launch in demo mode
5. **Redeploy** (Deployments → ⋯ → Redeploy) so the build sees the database and variables.
6. **Stripe webhook:** point it at `https://YOUR_DOMAIN/api/webhooks/stripe` — the production domain, not a preview URL (Deployment Protection blocks Stripe on previews). Redeploy after adding the keys.
7. **Cron:** `vercel.json` already schedules `/api/cron/daily-snapshot` daily at 00:05 UTC; Vercel sends `CRON_SECRET` as the `Authorization: Bearer` header automatically. On Hobby it fires somewhere within that hour, which is fine for this job.

To run migrations yourself instead, use `npx prisma migrate deploy` with the production `DATABASE_URL`/`DIRECT_URL` from your machine.

Note: the built-in rate limiter keeps counts in each function instance's memory, so on serverless it is best-effort. For stronger protection add Vercel Firewall rate-limit rules (for `/login`, `/claim` and `/api/*`) or back the limiter with Upstash Redis.

## How ranking works

Defaults (all editable in **Admin → Settings → Ranking rules**):

- Minimum **$10**, whole US dollars, maximum total **$999,999**.
- Taking **#1** needs the current #1 total **+ $5**. An amount above #1 but short of that (e.g. $102 when #1 is $100) is rejected with both valid options offered ($100 → ties for #2, or $105 → #1).
- Passing any other listing needs **+ $1** over its total (configurable “overtake” increment).
- **Ties**: the listing that reached the total first stays ahead.
- A lower amount simply takes the position it supports.
- All-time rank = cumulative confirmed total. Today's rank = amount confirmed during the current UTC day. One payment counts on every board it belongs to (e.g. a $20 upgrade adds $20 to the all-time total and $20 to today).

The pure logic lives in `src/lib/ranking.ts` and is shared by the client (instant estimates) and the server. **The server re-validates every amount** against the live board when checkout starts and **recomputes the final rank when payment is confirmed** — the client price is never trusted, and no position is guaranteed before confirmation. If two checkouts overlap, both payments are honoured and positions are decided by total (then confirmation time); the success page explains when the final rank differs from the estimate.

## Payment flow & safety guarantees

1. `startNewListingCheckout` (server) validates the link, category and amount, then — inside a PostgreSQL advisory lock — creates a `PENDING` listing + `PENDING` payment and **reserves the link for 35 minutes** so two people can't buy the same URL at once.
2. The visitor pays on Stripe Checkout (30-minute session) or the labelled demo checkout.
3. The verified webhook (or the success page's server-side sync, as a fallback) calls `confirmPayment`, which under the same lock:
   - records the provider event id first — **a duplicate notification is a no-op** (`WebhookEvent` primary key), and a payment that is already `SUCCEEDED` is never applied twice;
   - checks amount and currency against the stored payment;
   - activates the listing / adds the upgrade amount, and stores the final rank.
4. Failed, cancelled and expired checkouts release the reservation. Delayed payment methods stay `PENDING` until Stripe reports the outcome; the success page polls while it waits.
5. If money arrives for a link someone else secured meanwhile (or for a listing removed by a moderator), the payment is marked **refund due** and refunded automatically through Stripe (idempotency key), with manual retry / “mark refunded” in **Admin → Payments**.

## Ownership verification & upgrades

Only a signed-in, **verified owner** can edit or upgrade a listing — paying the difference never transfers control. From the listing's “Is this yours?” link, owners verify with one of:

- **DNS TXT** record `toprung-site-verification=<token>` on the domain (or `_toprung.<domain>`),
- **meta tag** `<meta name="toprung-site-verification" content="<token>">` on the homepage,
- **file** at `/.well-known/toprung-verification.txt`,
- **manual review** for X profiles (code in the bio, approved in **Admin → Ownership**),
- **demo** instant verification — only available in demo mode.

Upgrades charge exactly `new total − current total` (e.g. $40 → $60 charges $20), computed on the server.

## Admin dashboard

`/admin` requires a user with role `ADMIN` (the seed creates one; promote others in **Admin → Users**). Every admin page and server action checks the role on the server. Demo figures are always labelled as demo and kept separate from revenue.

## Testing

```bash
npm test            # unit + integration (needs TEST_DATABASE_URL, migrated)
npm run typecheck
npm run lint
npm run test:e2e    # browser smoke test against a running dev server in demo mode
```

Prepare the test database once: `DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy`.

Covered by Vitest (71 tests):
- ranking order, **tie handling**, #1 gap rule, overtake rule, min/max/whole-dollar validation, estimates;
- **daily reset** at UTC midnight, day windows, date parsing, archive freezing;
- **upgrades** charging only the difference, owner-only access, overlapping upgrades, removed listings;
- **duplicate payment events** (same event twice, same event in parallel, success-page sync + webhook), concurrent confirmations, simultaneous claims, reservations, late payments and refunds;
- Stripe webhook route with signed payloads (bad signatures, retries, amount mismatch, delayed methods, expiry);
- link normalisation/duplicates, X handles, SSRF address filtering, metadata parsing, colour-contrast helpers.

`npm run test:e2e` (playwright-core; set `CHROME_PATH` to a Chrome/Chromium binary) walks through: guest claim → demo checkout → success, cancel, register → verify → upgrade, admin moderation and settings, contact form.

## Project structure

```
prisma/                 schema, migrations, seed (+ fictional demo data), clear-demo script
src/app/(site)/         public pages (home, boards, claim, product, info, auth, dashboard, payment)
src/app/admin/          admin dashboard
src/app/actions/        server actions (claims, demo checkout, auth, owner, public forms, admin)
src/app/api/            Stripe webhook, daily cron
src/app/go/[slug]       outbound click tracking redirect
src/components/         UI kit (ui/), layout, board, claim, sidebar, dashboard, admin, sections
src/config/defaults.ts  default brand, rules, categories, page copy and FAQ (seeded; then edited in admin)
src/lib/                pure logic: ranking, time (UTC), URL parsing, colours, verification constants
src/server/             DB, auth, settings, leaderboard queries, claims, payments, Stripe, SSRF-safe fetch
tests/                  unit and integration tests
```

## Going live checklist

- [ ] Rebrand in **Admin → Settings** (name, tagline, logo, colours, contact email, homepage copy).
- [ ] Have the **Terms of Service** and **Privacy Policy** reviewed for your business and jurisdiction (the defaults are drafts, not legal advice), then edit them in **Admin → Pages & FAQ**.
- [ ] Remove demo data.
- [ ] Configure Stripe live keys + webhook, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET` and the cron job.
- [ ] Serve over HTTPS (session cookies are `Secure` in production).
- [ ] Back up the database.

## What needs external credentials or production configuration

- **Stripe** keys and webhook secret (otherwise demo mode).
- **PostgreSQL** database.
- **Cron** for eager archive freezing and abandoned-checkout cleanup (optional but recommended).
- **Email delivery is not included** — there is no password-reset email or notification mail. Stripe sends payment receipts; add a provider (Resend, Postmark, SES…) if you need password resets.
- **Rate limiting is in-memory** (per server instance / serverless function). For multiple instances or Vercel, add platform rate-limit rules or back it with Redis.
- Third-party logos are loaded directly from the listed sites (with an initials fallback); add an image proxy/CDN if you want to cache them.
- Metadata fetching needs outbound internet access from the server; when it fails, users fill in details manually.
