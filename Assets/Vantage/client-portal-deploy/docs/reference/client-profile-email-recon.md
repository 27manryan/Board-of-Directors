---
title: Client Profile and Portal Email Reconnaissance
type: note
domain: vantage
status: active
created: 2026-06-24
last-updated: 2026-07-14
tags: [vantage, client-portal, onboarding, email]
---
# Client Profile and Portal Email Reconnaissance

This document mapped what the portal could support before activation. Ryan approved all five recommended decisions on 2026-06-27, and the code implementation exists in the repo. A durable June 29 record says the migration and production deployment completed. The planned logged-in profile and email smoke test was not recorded, so production behavior still needs verification with a safe test client.

## Implementation status

- `client_notifications` and `client_profiles` are defined in `supabase/migrations/20260627123000_client_notifications_profiles.sql`.
- Client creation now returns a secure setup link instead of showing a plaintext temporary password.
- Discovery and gate submissions create automatic client confirmations only after the submission row is recorded.
- Welcome, deliverables-ready, and final-package notices are admin-gated Send actions.
- Internal client profiles are generated on client creation and refreshed after discovery.
- Profile approval and manual Notion publishing are available in admin.
- Stripe remains responsible for payment receipts. Vantage does not send fake payment receipt emails.

## Recommended direction

Build both features around explicit, recorded events rather than page views.

- Keep the internal client profile in Supabase so the admin page can load it quickly and version it.
- Mirror only an approved profile summary into the existing Notion client page.
- Keep profiles internal in the first release.
- Send transactional confirmations automatically only after a client action succeeds.
- Keep welcome messages, review-ready notices, and final-package notices approval-gated until the copy and timing have been proven.
- Record every attempted client email in an idempotent notification ledger so retries cannot send duplicates.

## Client profile inputs already available

### Structured Supabase data

| Area | Available fields |
|---|---|
| Identity | Client name, email, Supabase user ID |
| Engagement | Project name, package, add-ons, custom price, veteran discount, project total |
| Progress | Current gate, payment statuses, revision balance, created date |
| Integrations | Drafting page ID, discovery page ID, Stripe customer ID |
| Work state | Included deliverables, released deliverables, final package metadata |
| Client activity | Discovery submission, comments, gate submissions, submission dates |

### Notion data

- The client page in the Clients and Projects database.
- The Drafting child page, including the gate table and deliverable content.
- The Discovery child page, including questions and appended client responses.

### Inputs that are not reliably structured today

- Company name as a field distinct from the contact name.
- Website, industry, location, and time zone.
- Contact role and decision authority.
- Other stakeholders, reviewers, and final approver.
- Preferred communication channel and normal response window.
- Business goals, success measures, deadlines, and constraints.
- Priority audiences and offers.
- Existing brand assets and reference links.
- Known sensitivities, prohibited claims, or compliance requirements.
- Whether a profile section is internal-only or approved for client display.

Discovery answers may contain several of these, but the answers are currently arbitrary question and response pairs rather than normalized fields.

## Profile storage options

| Option | Strengths | Weaknesses |
|---|---|---|
| Supabase only | Fast admin reads, clear permissions, easy versioning, reliable during Notion outages | Duplicates context that Ryan may continue editing in Notion |
| Notion only | Keeps narrative context beside the working engagement | Slow for portal use, difficult to version reliably, unavailable when Notion is down |
| Supabase plus approved Notion summary | Reliable portal record plus useful working context in Notion | Requires synchronization rules and a clear owner for edits |

Recommendation: use the dual approach with Supabase as the generated profile record and Notion as an approved summary destination. Do not attempt two-way free-form synchronization.

## Proposed profile model

Add a `client_profiles` table with one current profile per client and retained versions when regeneration occurs.

Suggested fields:

- `client_id`
- `version`
- `status`: `draft`, `approved`, or `superseded`
- `profile_json`
- `profile_markdown`
- `input_snapshot`
- `generated_at`
- `approved_at`
- `approved_by`
- `notion_synced_at`

Suggested profile sections:

1. Client and engagement
2. Business context
3. Primary objectives
4. Priority audiences
5. Offers and differentiators
6. Voice and messaging signals
7. Constraints and sensitivities
8. Stakeholders and approvals
9. Current engagement status
10. Open questions

The first implementation can be deterministic and assemble known facts plus discovery responses without adding an AI provider. A later generation step can summarize discovery themes, but its output should remain a draft until Ryan approves it.

## Profile generation points

| Event | Recommended behavior |
|---|---|
| Client account created | Create a factual profile shell from engagement data |
| Discovery submitted | Generate or refresh the draft profile |
| Client engagement edited | Mark the profile stale and offer regeneration |
| Ryan approves profile | Store approval and optionally publish the summary to Notion |
| Later discovery or major scope change | Create a new version rather than overwriting approved history |

## Existing email capability

Resend is configured and currently sends internal notifications to Ryan from `notifications@vantagestrat.co`.

Current internal events:

- Discovery submission recorded.
- Gate submission recorded.

The portal does not currently keep an email event history, client template preferences, or per-event send status.

## Candidate client email triggers

| Message | Exact available event | Default recommendation |
|---|---|---|
| Portal welcome | `createClientAction` completes | Approval-gated |
| Password setup | Auth user is created | Automatic secure setup link, not a plaintext password |
| Discovery received | Discovery submission insert succeeds | Automatic |
| Deliverables ready | Ryan finishes a release batch | Approval-gated explicit send |
| Gate feedback received | Gate submission insert succeeds | Automatic |
| Payment received | Stripe webhook marks a payment paid | Automatic only if it adds useful portal context beyond Stripe's receipt |
| Final package available | Final file exists and Payment 3 is paid, or the engagement is pro bono | Approval-gated initially |
| Revision balance added | Ryan adds a revision round | Approval-gated |

## Important trigger constraints

### Welcome and credentials

The current action creates a random temporary password and displays it once in the admin UI. Emailing that password would preserve the existing workflow but is not the preferred security model.

Recommendation: replace temporary-password delivery with a Supabase password setup or recovery link. The welcome email can then contain the portal URL, what the client can do there, and the secure setup link.

### Deliverables ready

The admin currently releases deliverables one toggle at a time. Sending from each toggle would create duplicate or partial notifications.

Recommendation: add a separate `Notify client` action after Ryan finishes a release batch. The message should list the deliverables currently available and link directly to `/deliverables`.

### Payment received

Stripe can send its own receipt. A Vantage email should be sent only when it explains a portal state change, such as Gate 2 comments becoming available or the final package unlocking.

### Final package available

Readiness is a combined condition:

- A final file has been uploaded.
- Payment 3 is paid, or the client is pro bono.

The condition can become true in either order. Evaluate it after file upload, Stripe webhook completion, and admin payment changes, then offer or send the notice once.

### Gate progression

Do not send emails from `getSyncedGate`. That helper runs during page requests, so using it as a notification trigger could make an ordinary client visit send mail. Gate-related notices need an explicit admin event or a recorded background transition.

## Notification ledger

Add a `client_notifications` table before enabling client email.

Suggested fields:

- `client_id`
- `event_type`
- `dedupe_key`
- `recipient_email`
- `status`: `pending`, `approved`, `sent`, or `failed`
- `provider_message_id`
- `template_version`
- `payload`
- `approved_at`
- `sent_at`
- `last_error`

Use a unique constraint on `client_id`, `event_type`, and `dedupe_key`. This prevents webhook retries, repeated server actions, or double-clicks from sending the same message twice.

## Smallest implementation sequence

1. Add the notification ledger and a shared Resend sender.
2. Add automatic discovery and gate-submission confirmations.
3. Replace plaintext temporary-password delivery with a secure setup link.
4. Add admin-reviewed welcome and deliverables-ready messages.
5. Add composite final-package readiness detection and an approval-gated notice.
6. Add the profile table and factual profile shell.
7. Generate a draft profile after discovery and add Ryan's approval step.
8. Add optional one-way Notion summary publishing.

## Decisions Ryan approved on 2026-06-27

1. The first client profile is internal-only.
2. Welcome, review-ready, and final-package emails require an admin Send action.
3. Stripe remains responsible for payment receipts.
4. The temporary-password handoff is replaced by a secure setup link.
5. Approved profile summaries publish to Notion only when Ryan clicks Publish to Notion.
