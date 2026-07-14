# Vantage Client Portal Instructions

Read root `AGENTS.md` first. This file adds location-specific rules for the Vantage client portal and applies to every provider.

## What this is

A client-facing Next.js portal at `portal.vantagestrat.co` for Vantage Strategic Communications. Clients log in to review released deliverables, leave comments, pay stage balances, and submit reviewed packages. Ryan is the only admin.

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Supabase auth and Postgres
- Notion API for Drafting page content
- Stripe Checkout for payments
- Resend for notification email
- Vercel for hosting

## Local commands

```bash
npm install
npm run dev
npm run lint
npm run build
```

Run `npm run lint` and `npm run build` before handing off code changes unless the task is documentation-only.

## Hard rules

- Do not expose unreleased deliverables to clients. Only render deliverables with `released: true`.
- Admin access is Ryan only. Use `ADMIN_EMAIL=27manryan@gmail.com` or the Supabase admin function already in the schema.
- Do not hardcode Notion gate-table shape. Read it dynamically from the Drafting page.
- Keep Vantage visual rules intact: cream background, navy primary, gold accents, Cormorant Garamond headings, and zero border radius.
- Do not commit `.env.local`, API keys, Stripe secrets, Supabase service keys, or Notion credentials.
- Do not treat standalone Competitive Audit as portal scope. It remains email plus standalone Stripe link.

## Reference docs

Open these only when the task needs them:

- `docs/reference/project-context.md`: architecture, data model, design rules, environment variables, and decisions.
- `docs/reference/build-state.md`: completed build steps, current resume point, deployment checklist.
- `supabase/migrations/`: live database schema.
- `lib/engagement.ts`: package, add-on, deliverable, and pricing logic.

## Local context boundary

This portal is a Vantage infrastructure project. Do not pull client-private content into code, fixtures, examples, screenshots, or tests. Use anonymized test clients unless Ryan explicitly provides a real client context for the task.
