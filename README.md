# Hisab — হিসাব

Personal finance, expense tracking and a digital tally khata (dhar-dena ledger) for Bangladesh.
English by default with full Bangla support, mobile-first, installable as a PWA.

**Stack:** Next.js 16 (App Router, Server Components, Server Actions) · React 19 · TypeScript (strict) ·
Tailwind CSS 4 · shadcn/ui (Radix) · Recharts · React Hook Form + Zod · PostgreSQL (Neon) · Drizzle ORM ·
Better Auth · Vercel Private Blob · Vercel Cron.

## Features

| Area | What it does |
| --- | --- |
| Auth | Email/password signup & login, remember me, logout, forgot/reset password, change password, active sessions, sign out other devices, delete account |
| Onboarding | Pick starting accounts (Cash, Bank, bKash, Nagad, Rocket, Card) and opening balances; skippable |
| Accounts | Multiple money accounts with live balances, archive, delete (only when unused), balance adjustment |
| Transactions | Expense, income, transfer; quick-add bottom sheet; last-used account; receipts (private); filters, debounced search, pagination, CSV export |
| Ledger | Lend / borrow / got back / paid back, partial repayments, due dates (FIFO), overdue, settlement, statement with running balance (print / PDF / share) |
| Analytics | Period selector, KPIs, expense trend, income vs expense, category donut & ranking, month comparison, projection (marked as estimate) |
| Budgets | Monthly category limits with normal / near-limit / exceeded states |
| Recurring | Rent, bills, salary… creates *upcoming* items you confirm or skip — never posts silently |
| Reports | Expense, income, cash flow, category, account statement, ledger, receivable, payable — CSV + print |
| Reminders | In-app notifications for debts due/overdue, budgets, upcoming recurring (daily cron + on dashboard visit) |
| Settings | Profile & avatar, language (বাংলা / English), currency, timezone, week start, light/dark/system, data export (JSON), delete account |

## Accounting rules

All money is stored as `NUMERIC(18,2)` and handled as decimal strings (integer paisa via `BigInt` in
TypeScript). The rules live in one place — `lib/finance/rules.ts` — and the SQL aggregates in
`db/queries/finance-sql.ts` are generated from the same tables.

* Only `INCOME` / `EXPENSE` count as income or expense. Loans, repayments, transfers and adjustments never do.
* Account balance = opening balance + every movement with `affects_account = true`.
* Ledger balance per person: `LEND +`, `DEBT_RECEIVED −`, `BORROW −`, `DEBT_PAID +` (positive = পাবো, negative = দিতে হবে).
* A transfer is a single row, so it is atomic by construction.

## Security model

* The user id always comes from the server session (`lib/auth/session.ts`), never from client input.
* Every query filters by `user_id`; composite foreign keys (`user_id, id`) make it impossible for a row to
  reference another user's account, category or contact, even by a bug.
* Server-side Zod validation on every action; client validation is only for UX.
* Receipts and avatars live in **private** Blob storage and are streamed only to their owner
  (`/api/attachments/[id]`, `/api/avatar`); file types are verified by magic bytes.
* Auth rate limiting (database-backed) in production, secure cookies, CSRF protection via Better Auth's
  origin checks, security headers in `next.config.ts`, safe error messages, audit log for destructive actions.

## Local development

Requires Node 20+, pnpm and PostgreSQL.

```bash
cp .env.example .env.local      # fill DATABASE_URL, BETTER_AUTH_SECRET, CRON_SECRET
createdb hisab && createdb hisab_test
pnpm install
pnpm db:migrate
pnpm dev
```

### Checks

```bash
pnpm typecheck     # route types + tsc --noEmit
pnpm lint
pnpm test          # unit tests: money, formatting, accounting rules, due dates, recurrence
pnpm test:db       # integration tests on TEST_DATABASE_URL (spec §87 case, ledger, budgets, authorization)
pnpm build
pnpm tsx tests/e2e-auth.ts     # against a running server: auth flows
pnpm tsx tests/e2e-pages.ts    # against a running server: every page renders, cross-user access is 404, cron, exports
```

### Database migrations

Schema lives in `db/schema/`. Never edit the database by hand:

```bash
pnpm db:generate --name <change>   # creates db/migrations/NNNN_<change>.sql
pnpm db:migrate                    # applies pending migrations
```

## Deploying to Vercel

1. Import the repository in Vercel.
2. **Storage → Connect Neon Postgres** (sets `DATABASE_URL`). Create the database in
   **AWS ap-southeast-1 (Singapore)** — `vercel.json` pins functions to `sin1`, the closest region to
   Bangladesh. Keeping the database and functions in the same region is the biggest speed factor.
3. **Storage → Create Blob store** (sets `BLOB_READ_WRITE_TOKEN`). Uploads use private access.
4. Add environment variables: `BETTER_AUTH_SECRET`, `CRON_SECRET`, and optionally `BETTER_AUTH_URL`
   (your custom domain), `RESEND_API_KEY`, `EMAIL_FROM`.
5. Deploy. `vercel.json` runs `pnpm vercel-build`, which applies migrations before `next build`, and
   registers the daily reminders cron (`/api/cron/reminders`, 02:00 UTC = 08:00 Dhaka).

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres (Neon) connection string |
| `BETTER_AUTH_SECRET` | yes | Session signing secret |
| `CRON_SECRET` | yes | Protects the reminders cron endpoint |
| `BETTER_AUTH_URL` | prod custom domain | Public base URL used in auth links |
| `BLOB_READ_WRITE_TOKEN` | for uploads in prod | Vercel Private Blob |
| `RESEND_API_KEY`, `EMAIL_FROM` | optional | Password-reset emails |
| `DATABASE_POOL_MAX` | optional | pg pool size per instance |

## Project structure

```
app/            routes: (auth), (app), (legal), api/
actions/        server actions (auth-checked, Zod-validated)
components/     ui/ (shadcn), finance/, ledger/, dashboard/, charts/, settings/ …
db/             schema/, migrations/, queries/ (reads), mutations/ (writes)
lib/            money, dates, format, finance rules, i18n, auth, storage, validation
locales/        en.ts (source of truth for keys), bn.ts
tests/          unit, db integration and e2e checks
```
# hisab
# hisab

## Performance notes

* `pnpm dev` compiles each page on first visit and is much slower than production. To feel real speed
  locally, run `pnpm build && pnpm start`. With 2,000 transactions, pages render in roughly 10–30 ms on
  the server (`pnpm tsx tests/perf.ts`).
* Every page has an instant loading skeleton; detail pages check ownership in a segment layout so
  missing or foreign ids still return a real 404.
* The quick-add sheet prefetches accounts and categories when the browser is idle.
* Charts load lazily; the Bengali font downloads only when Bangla text is shown.
* Page-load reminder generation is throttled to once per 30 minutes per user (the daily cron covers the rest).
