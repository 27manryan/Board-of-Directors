---
title: Vantage Client Portal Build State
type: note
domain: vantage
status: active
created: 2026-06-12
last-updated: 2026-07-14
tags: [vantage]
---
# Vantage Client Portal Build State

This reference doc tracks implementation status and resume details. Keep it out of local instruction files unless an agent needs to resume portal development.

## Current status

Steps 1 through 8 are complete. The portal is deployed to Vercel at `portal.vantagestrat.co`, live Stripe payments have been verified, and the client-experience foundation pass was deployed on June 24, 2026.

A durable June 29 record says the client-profile migration and client-facing email features deployed. The planned logged-in smoke test for those features was not recorded, so their production state remains verification-pending rather than unimplemented.

The deployable source was recovered on July 14, 2026, into its original `27manryan/Board-of-Directors` history at `Assets/Vantage/client-portal-deploy`. The verified local working clone is `/Users/ryanmancuso/Developer/Board-of-Directors`.

Vercel now builds from `main` in that repository with Root Directory set to `Assets/Vantage/client-portal-deploy`. Preview deployment `dpl_38tdUeqqeLHXm9XcG9xmKbejXxkA` passed, and production deployment `dpl_8fAy84cKkvoLDjLEMEPdnmDJFuNC` reached Ready with the `portal.vantagestrat.co` alias on July 14, 2026.

| Step | Scope | Status |
|---|---|---|
| 1 | Next.js scaffold, design system, page shells | Complete |
| 2 | Supabase auth, session, middleware, protected routes | Complete |
| 3 | Schema and admin panel | Complete |
| 4 | Notion integration, parser, comments API | Complete |
| 5 | Stripe Checkout payment gate | Complete |
| 6 | Submission flow, email, Notion status update | Complete |
| 7 | Polish, mobile QA, deploy, smoke test | Complete |
| 8 | Final-delivery download, P3-gated package upload and download | Complete |

## Resume point

Portal is live on Vercel and in active client use.

- The official tracked source is `27manryan/Board-of-Directors/Assets/Vantage/client-portal-deploy`.
- Lint, 29 tests, type checking, and a production build pass from the recovered local clone.
- A current unauthenticated production request reaches Vercel and redirects to `/login`.
- The GitHub source, Vercel project root, production branch, and public alias are reconciled.
- Migrations 0001 through 0007 and the Stripe customer restoration migration are active.
- `.env.local` exists locally with required keys.
- Final-package upload and P3-gated download are active.
- Stripe live Checkout, webhook processing, payment persistence, and refund handling were verified on June 24, 2026.
- The daily Supabase keepalive is protected by a non-empty production `CRON_SECRET`; an authorized production request returned 200 with `{ok:true}` on June 24, 2026.

## June 24 client-experience foundation

- Client-owned data access now exercises Supabase Row Level Security.
- Gate state is synchronized consistently on dashboard, deliverables, payments, and submissions.
- Notion reads use 60-second tagged caches with write invalidation.
- Dashboard, deliverables, and discovery show explicit fallback states during Notion failures.
- The production deployment `dpl_AsJU1rTPYxaNzjmfuyCidrYDVLnC` passed logged-in smoke checks for dashboard, discovery, deliverables, and payments using a temporary database-only client. The temporary auth user and client row were deleted after verification.
- Client profile and client-email options are mapped in `docs/reference/client-profile-email-recon.md`.

## June 27 client profile and email implementation

- Added `client_notifications` and `client_profiles` migration.
- Added automatic client confirmations for discovery and gate submissions after successful inserts.
- Added admin-gated welcome, deliverables-ready, and final-package Send actions.
- Replaced admin-visible plaintext temporary password handoff with a secure Supabase setup link.
- Added internal profile generation on client creation and after discovery.
- Added profile regeneration, approval, and manual Notion publishing controls in admin.
- Verification passed: `npm test`, `npm run type-check`, `npm run build`, and `git diff --check`.
- ESLint configuration was added during source recovery on July 14. `npm run lint` now produces a deterministic pass or fail.
- A later record says the migration and production deployment completed on June 29. A logged-in feature smoke test remains unrecorded.

## Step 5 completion notes

- `stripe@22` installed.
- `lib/stripe.ts` creates the Stripe singleton with API version `2026-03-25.dahlia`.
- `POST /api/stripe/checkout` creates Checkout Sessions for P2 or P3, creates or caches Stripe customers, and returns `{url}` for redirect.
- `POST /api/stripe/webhook` verifies Stripe signature and marks the matching payment as paid on `checkout.session.completed`.
- `/payment` uses live Supabase data, shows the currently due payment, hides payment for pro bono clients, shows the payment schedule table, and displays a success banner on Stripe return.

## Step 6 completion notes

- `resend@6` installed.
- Resend is instantiated lazily inside the handler to avoid build-time key errors.
- `lib/notion.ts` includes `updateGateStatus(draftingPageId, gate, status)`.
- `POST /api/submit` validates auth, checks P2 gate payment, inserts a submission row, emails Ryan, updates Notion, and returns `{ok:true}`.
- Email and Notion failures are caught and logged after the submission row is written.
- `DeliverableCard` fetches and displays persistent comments.
- New comments append optimistically.
- Comment form becomes a payment callout with a `/payment` link when P2 is unpaid at Gate 2.
- `SubmitPanel` shows gate context and submission state.
- The deliverables page fetches comments, payment state, gate, and submission state in one pass.

## Historical Step 7 checklist

Step 7 is complete according to the June 24 production record. Its original unchecked list is retired. The remaining current checks are the logged-in profile and email smoke test and the Next.js security upgrade.

## Production environment variables

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NOTION_API_KEY=
NOTION_CLIENTS_DATABASE_ID=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
RESEND_API_KEY=
NOTIFY_EMAIL=info@vantagestrat.co
NEXT_PUBLIC_APP_URL=https://portal.vantagestrat.co
ADMIN_EMAIL=27manryan@gmail.com
CRON_SECRET=
```

The daily `/api/cron/supabase-keepalive` job requires `CRON_SECRET`. Its only
Supabase operation is a read of one client ID. It does not invoke intake,
submission, email, or Notion workflows.

## Verification standard

For documentation-only changes, inspect the changed files and run a targeted text scan for banned phrasing or formatting mistakes.

For code changes, do not hand off until `npm run lint` and `npm run build` have been run, unless a real blocker is reported.
