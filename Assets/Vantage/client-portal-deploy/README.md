---
title: Vantage Strategic Communications Client Portal
type: readme
domain: vantage
status: active
created: 2026-04-16
last-updated: 2026-07-14
tags: [vantage]
---
# Vantage Strategic Communications Client Portal

Client-facing engagement portal for Vantage Strategic Communications.

## Status

The portal is live at `portal.vantagestrat.co`. Steps 1 through 8 are complete.

The official tracked source is this folder in `27manryan/Board-of-Directors`. The working clone is `/Users/ryanmancuso/Developer/Board-of-Directors/Assets/Vantage/client-portal-deploy`.

The repository was reconciled on 2026-07-14 from the newer local production working copy that had been left inside Athenaeum. Lint, 29 tests, type checking, and a production build pass from the recovered source.

Current verification gaps:

- A June 29 record says the client-profile migration and email features deployed, but the planned logged-in smoke test was not recorded.
- The revived GitHub source and local Vercel project link still need a deliberate production-source reconciliation before the next deployment.
- Next.js 14 has current high-severity advisories. Upgrade planning is required rather than an unreviewed forced major update.

## Source boundary

- Keep deployable source in this repository, not inside Athenaeum.
- Keep `.env.local`, `.vercel/`, `.next/`, Supabase CLI temp state, and generated TypeScript state local and untracked.
- Athenaeum owns the portal's operating pointer and audit record, not a second source copy.

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Supabase
- Notion API
- Stripe Checkout
- Resend
- Vercel

## Start local dev

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verify changes

```bash
npm test
npm run type-check
npm run lint
npm run build
```

## Key files

- `AGENTS.md`: provider-neutral local agent instructions.
- `docs/reference/project-context.md`: architecture, data model, design rules, and decisions.
- `docs/reference/build-state.md`: build status, resume point, and deployment checklist.
- `supabase/migrations/`: database schema.
- `lib/engagement.ts`: package and pricing logic.
- `.env.local.example`: environment variable template.

## Environment

Copy `.env.local.example` to `.env.local` and fill in local credentials. Never commit `.env.local` or real secrets.
