---
title: Vantage Client Portal Known Issues
type: note
domain: vantage
status: active
created: 2026-06-17
last-updated: 2026-07-14
tags: [vantage, tech-debt]
---
# Vantage Client Portal Known Issues and Tech Debt

The original security, gate-sync, and Notion-reliability items were resolved and deployed on June 24, 2026. A later durable record says the client onboarding and communication migration deployed on June 29. The planned logged-in verification was not recorded, so the remaining issue is production verification rather than activation.

## Open

### 1. Client profile generation pending live verification

**What:** The repo includes internal profile generation, admin approval, regeneration, and manual Notion publishing. The June 29 record says the `client_profiles` migration deployed, but no later logged-in smoke result was found.

**Why it matters:** Ryan has to reconstruct client context from Notion and portal records instead of having a compact internal profile available while managing the engagement.

**Verification needed:** Confirm the migration exists in production and smoke test one admin profile regeneration with a safe test client.

**Reconnaissance:** See `docs/reference/client-profile-email-recon.md` for the data map, storage comparison, proposed profile sections, and remaining decisions.

### 2. Client-facing portal emails pending live verification

**What:** The repo includes an idempotent notification ledger, automatic discovery and gate confirmations, secure setup links, and admin-gated welcome, deliverables-ready, and final-package notices. The June 29 record says the `client_notifications` migration deployed, but no later logged-in smoke result was found.

**Why it matters:** Clients depend on manual messages for account access and portal changes.

**Verification needed:** Confirm the migration exists in production and smoke test one admin-gated email plus one automatic confirmation with a safe test client.

### 3. Next.js security upgrade required

**What:** The recovered source builds on Next.js 14.2.35, which now has high-severity advisories. npm's non-breaking fixes reduce the audit to five remaining findings, including four high-severity findings that require a major framework upgrade.

**Why it matters:** The portal is client-facing and processes authenticated requests. Staying on an unsupported framework line increases operational risk.

**Repair needed:** Plan and test a deliberate Next.js and React upgrade. Do not use `npm audit fix --force` against production source without migration review and a full portal regression pass.

**Reconnaissance:** See `docs/reference/client-profile-email-recon.md` for exact trigger points, duplicate-send safeguards, and the recommended secure password-setup flow.

## Resolved on June 24, 2026

### Client reads bypassed Row Level Security

Client pages and client-owned API operations now use the authenticated request-scoped Supabase client. Privileged access remains limited to real admin work, Stripe webhook updates, narrow gate persistence, and signed storage URLs.

Verification included a live two-client isolation test covering client rows, deliverable visibility, comments, submissions, discovery submissions, file metadata, own inserts, and blocked cross-client inserts. Temporary records were deleted afterward.

### Gate state was synchronized only on the dashboard

Dashboard, deliverables, payments, and gate submission now use one shared gate service. The service reads Notion, never regresses the stored gate, persists forward movement, and falls back to the last confirmed gate when Notion is unavailable.

### Notion reads were uncached and failures looked like empty content

Gate status, drafting content, and discovery questions now use tagged 60-second caches. Relevant tags are invalidated after Notion writes and deliverable releases. Portal pages show explicit temporary-unavailability states, and released deliverable labels remain visible if Notion content cannot load.
