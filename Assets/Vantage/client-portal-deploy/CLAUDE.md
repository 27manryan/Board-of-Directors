# Vantage Client Portal — CLAUDE.md

This is the project context file for the Vantage Strategic Communications client portal. Read this before touching any code.

---

## What This Is

A custom client-facing web portal at `portal.vantagestrat.co` for Vantage Strategic Communications (vantagestrat.co). Clients log in to review deliverables, leave comments, pay their stage balance, and submit their reviewed package back to Ryan (the owner/operator).

This is a solo-consultancy tool — Ryan is the only admin. 2–3 active clients at a time.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend + API | Next.js 14 (App Router) | Unified codebase, works perfectly with Vercel |
| Auth + Database | Supabase | Built-in email/password auth + Postgres, no separate auth service needed |
| Notion integration | Notion API (Blocks API) | Deliverables live as heading sections inside a Notion Drafting page per client |
| Payments | Stripe Checkout (hosted) | Simplest implementation — no card UI to build, Stripe manages the hosted page |
| Hosting | Vercel | Free tier, deploys from GitHub, native Next.js support |
| Domain | portal.vantagestrat.co | Subdomain of main site |

---

## Design System

Extracted from vantagestrat.co. Match this exactly — the portal should feel like a continuation of the main site.

### Colors
```
Primary (Navy):   #1B2A4A
Secondary (Gold): #B8972E
Surface (Cream):  #F5F0E8
Muted:            #6B7FA3
Surface alt:      #F2EDE5 / #ECE8E0 / #F8F3EB
```

### Typography
- **Headlines:** Cormorant Garamond, serif, font-weight 600
- **Body/Labels:** system-ui sans-serif
- **Buttons/Labels:** uppercase, tracking-widest, text-xs, font-medium

### Rules
- **Zero border-radius everywhere.** No rounded corners. Not on buttons, cards, inputs, badges — nothing.
- Primary button: navy bg (`#1B2A4A`), cream text, sharp edges
- Ghost button: bottom border only, transparent bg, navy text — no box fill
- Cream (`#F5F0E8`) is the dominant background on every page
- Gold (`#B8972E`) appears on hover states, active nav links, accent borders

---

## Architecture Decisions

### Client Accounts
- Ryan creates client accounts manually via the `/admin` page
- Account creation generates a Supabase auth user (email/password), sets a temp password
- Ryan delivers login credentials to the client when they sign their commitment document
- No self-signup — all accounts are provisioned by Ryan

### Notion Integration
- Each client has a Notion page inside the "Clients & Projects" database
- Under each client page is a "Drafting" sub-page
- Deliverables (D01–D08) are H3 heading sections inside the Drafting page
- Status is embedded in the heading text (e.g. "D01 — Positioning Statement ✅ LOCKED")
- Gate Status is a table at the top of the Drafting page — varies by client tier (do NOT hardcode structure, read it dynamically)
- Use the Notion Blocks API to fetch the Drafting page content

### Deliverable Visibility
- **Critical:** Clients must NOT see deliverables before Ryan releases them
- Each deliverable has a `released` boolean in Supabase (default: false)
- Ryan toggles visibility per deliverable from the `/admin` page
- The portal only renders `released: true` deliverables — unreleased ones don't exist to the client
- This is decoupled from Notion — Ryan controls it in the admin panel, not in Notion

### Engagement Model — Packages, Add-ons, Gates, Payments

**Packages (3-gate flow, 50/25/25 payment split):**
- Foundation — $1,500 — D01-D04
- Clarity — $3,000 — D01-D08
- Command — $6,000 — D01-D12

**Add-ons (Foundation/Clarity only — Command already includes both):**
- `addon_competitive_audit` (+$750) — adds D09
- `addon_internal_messaging` (+$750) — adds D10

**Standalone Competitive Audit ($750)** — NOT in portal scope. Delivered by email + standalone Stripe link. A $750 one-shot audit has no revision loop / scope-creep surface, so the portal's mental-gate value doesn't apply.

**Gates + Payments:**
- **Pre-Gate 1** — Payment 1 (50%) at commitment letter signing. Happens before portal access. Ryan flips it to paid manually.
- **Gate 1: Positioning Review** — after Discovery. Ryan delivers proposed positioning + value prop. Client approves strategic direction. No payment tied to this gate.
- **Gate 2: Voice Review** — full draft review for voice/tone (broad strokes). Payment 2 (25%) required BEFORE client returns comments.
- **Gate 3: Final Review** — wordsmithing, fine details. No payment tied to this gate response.
- **Final Delivery** — Payment 3 (25%) unlocks the final compiled deliverable package.

**Deliverables D01-D10 are toggleable** in admin (subject to client review). **D11, D12 are non-toggleable** — auto-delivered/post-delivery audit by Ryan, no client review.

Single source of truth: [lib/engagement.ts](lib/engagement.ts).

### Submission Flow
When a client submits their reviewed package:
1. API route validates payment is complete
2. Sends email to Ryan (info@vantagestrat.co) with client name, project, and any comments
3. Updates the client's Notion page status field to "Submitted for Review"
4. Updates Supabase submission record

### Admin
- `/admin` route — Ryan's only, lock it to his email (27manryan@gmail.com) or a Supabase admin role
- Functions: create client, set stage, set amount due, toggle deliverable visibility per client, view submission history

---

## Notion Data Structure (Real Example)

```
Clients & Projects (database)
└── Bridge Geometric (client page)
    └── Drafting (sub-page)
        ├── Gate Status (table) — varies by tier
        ├── D01 — Positioning Statement ✅ LOCKED
        ├── D02 — Value Proposition ✅ LOCKED
        ├── D03 — Key Messages ✅ LOCKED
        ├── D04 — Elevator Pitch ⏳ In Progress
        ├── D05 — Audience Personas (not started)
        ├── D06 — Audience-Specific Messaging (not started)
        ├── D07 — Tone Guide (not started)
        └── D08 — Sample Copy (not started)
```

The portal fetches the Drafting page by Notion page ID (stored in Supabase per client), reads all blocks, and parses D0X sections.

---

## Supabase Schema

Live schema is in [supabase/migrations/0002_packages_gates_payments.sql](supabase/migrations/0002_packages_gates_payments.sql). Key shape:

- `clients` — package, addon flags, project_total, current_gate (1-3), three payment_N_status columns, supabase_user_id link, notion/stripe IDs
- `deliverable_visibility` — per-client per-deliverable released flag (only D01-D10 are seeded; D11/D12 are non-toggleable)
- `comments` — client comments per deliverable
- `submissions` — gate submission events (gate is 1-3)

RLS: clients see only their own rows; admin (per `is_admin()` function checking `27manryan@gmail.com`) sees everything. A `addons_not_on_command` constraint blocks adding redundant add-ons to Command-tier clients.

---

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Notion
NOTION_API_KEY=
NOTION_CLIENTS_DATABASE_ID=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Email (for submission notifications)
NOTIFY_EMAIL=info@vantagestrat.co

# App
NEXT_PUBLIC_APP_URL=https://portal.vantagestrat.co
ADMIN_EMAIL=27manryan@gmail.com
```

---

## Build Order (current status)

- [x] **Step 1** — Next.js scaffold, design system, page shells
- [x] **Step 2** — Supabase auth (login, session, middleware, protected routes)
- [x] **Step 3** — Schema + admin panel (packages, gates, payments, visibility, edit, delete)
- [x] **Step 4** — Notion integration (auto-link, gate table → Supabase sync, deliverable parser, comments API)
- [x] **Step 5** — Stripe Checkout payment gate
- [x] **Step 6** — Submission flow (email to Ryan + Notion status update)
- [ ] **Step 7** — Polish, mobile QA, deployment to Vercel + portal.vantagestrat.co ← **NEXT**

## Resume Point (last updated 2026-04-23)

All migrations run. `.env.local` present locally with all keys. Latest commit: `cbcb156`.

### Step 5 — DONE
- `stripe@22` installed
- `lib/stripe.ts` — Stripe singleton (API version `2026-03-25.dahlia`)
- `POST /api/stripe/checkout` — creates Checkout Session for P2 or P3; creates/caches Stripe customer; returns `{url}` for redirect
- `POST /api/stripe/webhook` — verifies Stripe signature; on `checkout.session.completed` marks `payment_N_status = 'paid'` via service role
- `/payment` page — live Supabase data; shows currently-due payment (P2 if gate≥2, P3 if gate≥3) with PayButton; pro bono shows "no payment required"; full payment schedule table; success banner on return from Stripe

### Step 6 — DONE
- `resend@6` installed; instantiated lazily inside handler (not module-level, avoids build-time key error)
- `lib/notion.ts` — `updateGateStatus(draftingPageId, gate, status)` patches Status cell in gate table; preserves Gate/Description columns
- `POST /api/submit` — auth → P2 gate check → insert submissions row → email Ryan via Resend → update Notion → returns `{ok:true}`; email+Notion failures are caught and logged, never fail the request
- `DeliverableCard` — now fetches + displays existing comments persistently (gold left-border list); new comments append optimistically; comment form replaced with payment callout + /payment link when P2 is unpaid at Gate 2
- `SubmitPanel` (new) — gate context, submit button; shows payment callout at Gate 2 unpaid; shows "Submitted ✓" after success or if already submitted this gate
- Deliverables page — fetches comments, payment state, gate, and existing submission in one pass; passes down to both components

### Env var needed for Step 6
- `RESEND_API_KEY` — get from resend.com; verify `vantagestrat.co` domain to send from `notifications@vantagestrat.co`

### Step 7 scope
- Mobile QA pass (sidebar collapse, card overflow, payment page on small screens)
- Commit + push to GitHub
- Vercel project setup (import repo, set all env vars)
- Custom domain: portal.vantagestrat.co → Vercel DNS
- Stripe webhook endpoint registered in Stripe dashboard (production)
- Smoke test full flow end-to-end with a test client account

### Key decisions already made
- Notion is the authority for gate status — portal parses Gate|Description|Status table; `current_gate` in Supabase is a synced cache
- Auto-link uses `notion.search` (not `databases.query`) — no property name dependency
- Pro Bono — $0, all D01–D10, payment UI hidden from client
- Veteran discount — 15% off (flag on client row); disabled if custom_price is set
- Custom price override — nullable `custom_price` column beats all computed pricing
- Visibility reseeds on package change — preserves released state, prunes removed codes, seeds new ones
- D11/D12 non-toggleable; standalone Competitive Audit not in portal scope
- To change fixed prices: edit `PACKAGES` in `lib/engagement.ts`

---

## Owner Contact
- Ryan Mancuso — 27manryan@gmail.com
- Main site: vantagestrat.co
- Notion workspace: connected (Clients & Projects database)
