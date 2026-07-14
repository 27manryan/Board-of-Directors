---
title: Vantage Client Portal Project Context
type: note
domain: vantage
status: active
created: 2026-06-12
last-updated: 2026-06-13
tags: [vantage]
---
# Vantage Client Portal Project Context

This reference doc holds durable portal context. Keep `AGENTS.md` lean and link here instead of copying this material into instruction files.

## Product purpose

The portal gives Vantage clients one place to review released deliverables, leave comments, pay stage balances, and submit reviewed packages. Ryan uses the admin page to create accounts, manage stage state, toggle deliverable visibility, and view submissions.

Ryan is the only admin. There is no self-signup.

## Core stack

| Layer | Choice |
|---|---|
| Frontend and API | Next.js 14 App Router |
| Auth and database | Supabase |
| Content integration | Notion Blocks API |
| Payments | Stripe Checkout |
| Email | Resend |
| Hosting | Vercel |
| Domain | `portal.vantagestrat.co` |

## Design rules

Match the public Vantage site.

| Token | Value | Usage |
|---|---|---|
| Navy | `#1B2A4A` | Primary color, headings, buttons |
| Gold | `#B8972E` | Accents, hover states, active nav, progress |
| Cream | `#F5F0E8` | Dominant page background |
| Muted | `#6B7FA3` | Labels, secondary text, placeholders |
| Surface alt | `#F2EDE5`, `#ECE8E0`, `#F8F3EB` | Light surfaces |
| Headings | Cormorant Garamond, 600 | All headings |
| Body | system-ui sans | Body, labels, buttons |
| Border radius | 0px | Sharp edges everywhere |

Buttons and inputs should preserve the site feel:

- Primary button: navy background, cream text, sharp edges.
- Ghost button: bottom border only, transparent background, navy text.
- Cards and inputs: clean cream or white surfaces, sharp edges.

## Account model

- Ryan creates client accounts manually from `/admin`.
- Account creation generates a Supabase auth user with email and temporary password.
- Ryan delivers login credentials after commitment paperwork.
- Clients only see their own rows under RLS.
- Admin access is tied to Ryan's email or the existing Supabase admin function.

## Notion integration

Each client has a Notion page inside the Clients and Projects database. Under each client page is a Drafting subpage.

Deliverables live as heading sections inside the Drafting page. Status is embedded in the heading text. The Gate Status table sits near the top of the Drafting page.

The portal stores the Drafting page ID in Supabase, fetches blocks through the Notion Blocks API, reads the gate table dynamically, and parses deliverable sections from the page content.

Do not hardcode the gate-table shape. It varies by tier.

Example structure:

```text
Clients and Projects database
└── Bridge Geometric client page
    └── Drafting subpage
        ├── Gate Status table
        ├── D01 Positioning Statement
        ├── D02 Value Proposition
        ├── D03 Key Messages
        ├── D04 Elevator Pitch
        ├── D05 Audience Personas
        ├── D06 Audience-Specific Messaging
        ├── D07 Tone Guide
        └── D08 Sample Copy
```

## Deliverable visibility

Clients must not see deliverables before Ryan releases them.

Each deliverable has a `released` boolean in Supabase. The default is false. Ryan toggles release state in the admin panel. The client UI renders only `released: true` deliverables.

This is deliberately decoupled from Notion. Notion can contain draft work that is not ready for client view.

D01 through D10 are toggleable. D11 and D12 are not toggleable because they are post-delivery or Ryan-only work.

## Packages and payments

Package logic lives in `lib/engagement.ts`.

| Package | Price | Deliverables |
|---|---:|---|
| Foundation | $1,500 | D01 to D04 |
| Clarity | $3,000 | D01 to D08 |
| Command | $6,000 | D01 to D12 |

Add-ons for Foundation and Clarity:

- `addon_competitive_audit`: +$750, adds D09.
- `addon_internal_messaging`: +$750, adds D10.

Command already includes both. Do not add redundant add-ons to Command.

Standalone Competitive Audit is not portal scope. It is delivered by email with a standalone Stripe link.

Payment model:

| Stage | Payment |
|---|---|
| Pre-Gate 1 | Payment 1, 50 percent, handled before portal access |
| Gate 1 | Positioning review, no payment tied to response |
| Gate 2 | Voice review, Payment 2 required before comments return |
| Gate 3 | Final review, no payment tied to response |
| Final delivery | Payment 3 required before final package unlock |

## Submission flow

When a client submits a reviewed package:

1. The API validates payment state.
2. The portal inserts a Supabase submission record.
3. The portal emails Ryan at `info@vantagestrat.co`.
4. The portal updates the client's Notion page status.
5. The API returns success even if notification side effects fail after the submission row is written. Failures are logged.

## Supabase schema

Live schema lives in `supabase/migrations/`.

Important tables:

- `clients`: package, add-on flags, project total, current gate, payment statuses, Supabase user link, Notion IDs, Stripe IDs.
- `deliverable_visibility`: per-client release state for D01 through D10.
- `comments`: client comments per deliverable.
- `submissions`: gate submission events.

Important constraints:

- RLS limits clients to their own rows.
- Admin function gives Ryan full access.
- Add-ons are blocked on Command-tier clients.

## Environment variables

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

Keep real values in `.env.local`. Never commit them.

## Supabase keep-alive

Vercel calls `/api/cron/supabase-keepalive` once per day. The protected route
performs one read-only query against the Supabase `clients` table and returns
only a health result. It does not authenticate as a client, submit portal
forms, send email, call Notion, or write database records.

Set `CRON_SECRET` to a random value of at least 16 characters in the Vercel
project. Vercel sends that value as a bearer token when it invokes the route.

## Key decisions

- Notion is the live record for gate status. Supabase `current_gate` is a synced cache.
- Auto-link uses `notion.search`, not a database query, to avoid property-name dependency.
- Pro bono clients have $0 pricing, all D01 through D10 available for release, and payment UI hidden.
- Veteran discount is 15 percent off unless custom price is set.
- Custom price override beats computed pricing.
- Visibility reseeds on package change while preserving released state for still-valid deliverables.
- Fixed package prices are changed in `lib/engagement.ts`.
