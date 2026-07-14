---
title: Client Profiles and Portal Email Activation Design
type: spec
domain: vantage
status: active
created: 2026-06-27
last-updated: 2026-06-28
tags: [vantage, spec]
---
# Client Profiles and Portal Email Activation Design

## Approved decisions

Ryan approved all five recommendations from `docs/reference/client-profile-email-recon.md` on 2026-06-27:

1. Client profiles are internal-only in the first release.
2. Welcome, deliverables-ready, and final-package notices require Ryan to approve or click Send.
3. Stripe remains responsible for payment receipts. Vantage emails only when portal access or client workflow state changes.
4. Client access uses secure password setup links rather than emailed plaintext temporary passwords.
5. Approved profile summaries are copied to Notion only when Ryan clicks Publish to Notion.

## Architecture

Add two private Supabase-backed records:

- `client_notifications` records each client-facing email attempt, approval state, provider result, and dedupe key.
- `client_profiles` stores generated internal profile drafts, approval state, profile JSON, rendered markdown, and optional Notion publish time.

Client action routes create notifications only after a real client action succeeds. Page views and gate synchronization helpers do not create email events. Admin actions are the only entry point for approval-gated sends and Notion publishing.

## Components

- `lib/client-notifications.ts`: template registry, dedupe key builder, ledger upsert, and Resend send helper.
- `lib/client-profiles.ts`: deterministic profile generation from known engagement data and discovery answers.
- `app/admin/actions.ts`: secure setup link creation, admin send actions, profile approval, regeneration, and Notion publish action.
- Admin components: small buttons for Send, Approve, Regenerate, and Publish to Notion.
- Migrations: RLS-enabled tables, grants for authenticated admin reads, and service-role access for server actions.

## Data flow

1. Client creation creates the Supabase Auth user, stores the client row, seeds deliverables, creates an internal profile shell, and creates a pending welcome notification with a secure setup link.
2. Discovery submission writes the response, refreshes the internal profile draft, records an automatic client confirmation, and sends it once.
3. Gate submission writes comments and the submission row, records an automatic client confirmation, and sends it once.
4. Deliverable release toggles visibility only. Ryan can click Notify client after the release batch is ready.
5. Final package upload or payment state changes may make the final package available. Ryan can click Send final package notice once readiness is true.
6. Profile approval stores an approved profile. Publish to Notion is manual and one-way.

## Error handling

- Duplicate events return the existing ledger row instead of sending twice.
- Email send failures are stored on the notification row and surfaced in admin.
- Missing Resend configuration blocks only the affected client email, not the client submission itself.
- Notion publish failures do not alter the approved profile.

## Testing

Add focused Node tests for:

- notification dedupe keys and automatic-versus-approval template behavior;
- profile draft generation, versioning shape, and internal-only defaults;
- final package readiness rules;
- code guardrails proving page-view helpers do not send client email.
