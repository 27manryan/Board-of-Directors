---
title: Client Profiles and Portal Email Activation Implementation Plan
type: spec
domain: vantage
status: active
created: 2026-06-27
last-updated: 2026-06-28
tags: [vantage, spec]
---
# Client Profiles and Portal Email Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate internal client profile drafts and safe client-facing portal emails using Ryan's five approved recommendations.

**Architecture:** Add RLS-enabled notification and profile tables, isolate behavior in small library helpers, then expose only explicit admin controls for approval-gated client messages and Notion publishing. Automatic emails happen only after client submissions succeed.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase Auth/Postgres, Resend, Notion API, Node test runner.

## Global Constraints

- No plaintext temporary password handoff.
- Client profiles stay internal-only until Ryan chooses otherwise.
- Welcome, deliverables-ready, and final-package messages are admin-gated.
- Stripe handles payment receipts.
- Notion profile publishing is manual.
- No client email is triggered from page views, gate sync, or cached Notion reads.
- No em dashes in generated copy.

---

### Task 1: Notification ledger and template rules

**Files:**
- Create: `lib/client-notifications.ts`
- Create: `tests/client-notifications.test.mjs`
- Create: `supabase/migrations/20260627123000_client_notifications_profiles.sql`

**Interfaces:**
- Produces: `notificationTemplateFor(eventType)`, `buildNotificationDedupeKey(input)`, `shouldSendAutomatically(eventType)`, `isFinalPackageReady(client)`.

- [ ] Write tests for dedupe keys, automatic event allowlist, and final package readiness.
- [ ] Run `npm test -- tests/client-notifications.test.mjs` and confirm the new tests fail because the helper file does not exist.
- [ ] Add the helper with the smallest passing implementation.
- [ ] Add the migration table definition with RLS and grants.
- [ ] Re-run the notification tests.

### Task 2: Profile generation core

**Files:**
- Create: `lib/client-profiles.ts`
- Create: `tests/client-profiles.test.mjs`

**Interfaces:**
- Produces: `buildClientProfileDraft(input)`, `renderClientProfileMarkdown(profile)`, `nextProfileVersion(existingVersions)`.

- [ ] Write tests for a factual profile shell, discovery answer capture, and next version calculation.
- [ ] Run the new test and confirm failure.
- [ ] Add the deterministic profile builder.
- [ ] Re-run the profile tests.

### Task 3: Server actions and submission hooks

**Files:**
- Modify: `app/admin/actions.ts`
- Modify: `app/api/discovery/submit/route.ts`
- Modify: `app/api/submit/route.ts`
- Modify: `app/api/admin/deliverable-file/route.ts`

**Interfaces:**
- Consumes: notification helpers and profile helpers from Tasks 1 and 2.
- Produces: admin actions for setup link, welcome send, deliverables-ready send, final-package send, profile regenerate, profile approve, and Notion publish.

- [ ] Add profile creation after client creation.
- [ ] Replace temporary password result with setup-link copy.
- [ ] Add automatic discovery and gate confirmation sends after successful inserts.
- [ ] Keep internal Ryan notifications intact.
- [ ] Add final-package readiness checks after upload and payment changes.

### Task 4: Admin UI controls

**Files:**
- Modify: `app/admin/page.tsx`
- Modify: `app/admin/_components/CreateClientForm.tsx`
- Create: `app/admin/_components/ClientNotificationButtons.tsx`
- Create: `app/admin/_components/ClientProfilePanel.tsx`

**Interfaces:**
- Consumes: admin server actions from Task 3.
- Produces: visible Send, Approve, Regenerate, and Publish buttons for Ryan only.

- [ ] Show setup link guidance after client creation.
- [ ] Add notification status and send buttons per client.
- [ ] Add profile draft summary and manual approval/publish buttons.
- [ ] Keep the admin table usable without widening it excessively.

### Task 5: Verification and docs

**Files:**
- Modify: `docs/reference/client-profile-email-recon.md`
- Modify: `docs/reference/known-issues.md`
- Modify: `docs/reference/build-state.md`

**Interfaces:**
- Consumes: finished implementation.
- Produces: updated status and verification notes.

- [ ] Run `npm test`.
- [ ] Run `npm run type-check`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check`.
- [ ] Update docs to reflect completed work and any remaining manual Stripe or Supabase dashboard settings.
