---
title: Portal Client Experience Foundation Implementation Plan
type: spec
domain: vantage
status: active
created: 2026-06-24
last-updated: 2026-06-25
tags: [vantage, spec]
---
# Portal Client Experience Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close punch-list items 1 through 3 by restoring database-enforced client isolation, synchronizing gate state everywhere it matters, and making Notion-backed pages faster and more honest when Notion is unavailable.

**Architecture:** Logged-in portal requests use the request-scoped Supabase client for client data so Row Level Security remains active. A shared gate service reads cached Notion gate data, never regresses the stored gate, and uses the service-role client only for the narrow persistence write. Notion read functions use 60-second caches keyed by page ID, while client pages show explicit temporary-unavailability states instead of presenting missing remote content as real emptiness.

**Tech Stack:** Next.js 14 App Router, TypeScript, `@supabase/ssr`, Supabase Postgres and RLS, Notion SDK, Node test runner, Vercel.

## Global Constraints

- Work on `main`, as required by the portal repository instructions.
- Preserve unreleased-deliverable protection.
- Keep the service-role key server-only and use it only for genuine privileged writes, cross-client admin work, storage signing, Stripe webhooks, and the keep-alive.
- Do not change package pricing, payment rules, Notion page structure, or client-facing email behavior.
- Keep the existing Vantage visual system and zero border radius.
- Do not include real client content in tests.
- Run tests, type checking, and a production build before deployment.

---

### Task 1: Enforce RLS on client-scoped reads and writes

**Files:**
- Create: `tests/client-data-access.test.mjs`
- Modify: `app/(portal)/layout.tsx`
- Modify: `app/(portal)/dashboard/page.tsx`
- Modify: `app/(portal)/deliverables/page.tsx`
- Modify: `app/(portal)/discovery/page.tsx`
- Modify: `app/(portal)/payment/page.tsx`
- Modify: `app/api/comments/route.ts`
- Modify: `app/api/discovery/submit/route.ts`
- Modify: `app/api/stripe/checkout/route.ts`
- Modify: `app/api/submit/route.ts`
- Modify: `app/api/deliverables/download/route.ts`
- Modify: `lib/deliverable-files.ts`

**Interfaces:**
- Consumes: `createClient()` from `lib/supabase/server.ts`, which carries the authenticated request cookies.
- Produces: Client reads and client-owned inserts that are checked by existing RLS policies.

- [x] Write a failing source-boundary test that rejects `createAdminClient()` in client-scoped pages and routes except for explicitly privileged writes.
- [x] Run `npm test` and confirm the boundary test fails against the current service-role reads.
- [x] Replace client-scoped reads and owned inserts with the request-scoped Supabase client.
- [x] Keep separate admin clients only for Stripe customer ID persistence, gate persistence, storage signing, webhook updates, admin routes, and cron.
- [x] Run `npm test` and `npm run type-check`.
- [x] Create temporary auth users and rows to verify RLS prevents one client from reading another client's row, comments, submissions, discovery submission, and file metadata. Delete all temporary records afterward.

### Task 2: Synchronize gate state from one shared service

**Files:**
- Create: `lib/gate-sync.ts`
- Create: `tests/gate-sync.test.mjs`
- Modify: `app/(portal)/dashboard/page.tsx`
- Modify: `app/(portal)/deliverables/page.tsx`
- Modify: `app/(portal)/payment/page.tsx`
- Modify: `app/api/submit/route.ts`

**Interfaces:**
- Consumes: `{ id, current_gate, notion_drafting_page_id }` and cached gate rows.
- Produces: `{ gate, rows, notionAvailable }`, where `gate` never regresses below the stored value.

- [x] Write failing tests for no-Notion fallback, non-regression, advancement, and Notion failure.
- [x] Run the focused test and confirm the missing helper failure.
- [x] Implement the gate resolver and narrow privileged persistence write.
- [x] Replace page-specific and raw gate reads with the shared result.
- [x] Run focused tests, the full test suite, and type checking.

### Task 3: Cache Notion reads and show honest fallback states

**Files:**
- Create: `lib/notion-cache.ts`
- Create: `tests/notion-cache.test.mjs`
- Modify: `lib/notion.ts`
- Modify: `app/(portal)/dashboard/page.tsx`
- Modify: `app/(portal)/deliverables/page.tsx`
- Modify: `app/(portal)/discovery/page.tsx`
- Modify: `app/api/submit/route.ts`
- Modify: `app/api/discovery/submit/route.ts`
- Modify: `app/admin/actions.ts`

**Interfaces:**
- Consumes: Existing uncached Notion fetchers and page IDs.
- Produces: Cached gate, drafting, and discovery reads with a 60-second TTL plus tag invalidation after Notion writes or release changes.

- [x] Write failing tests that confirm the cache wrappers use a 60-second TTL, stable cache keys, and named invalidation tags.
- [x] Run the focused test and confirm failure before implementation.
- [x] Wrap Notion read functions in `unstable_cache`.
- [x] Invalidate relevant tags after comments, discovery answers, gate updates, and deliverable release changes.
- [x] Add clear fallback cards for dashboard, deliverables, and discovery when Notion cannot be reached.
- [x] Ensure released deliverables remain visible with their stored labels even during a Notion outage, but show that document content is temporarily unavailable.
- [x] Run tests, type checking, and a production build.

### Task 4: Deploy and verify production behavior

**Files:**
- Modify: `docs/reference/known-issues.md`
- Modify: `docs/reference/build-state.md`

**Interfaces:**
- Consumes: Tasks 1 through 3.
- Produces: A deployed portal with items 1 through 3 marked complete and current implementation notes.

- [x] Review the diff for accidental scope expansion and client-private data.
- [x] Run `npm test`, `npm run type-check`, `npm run build`, and `git diff --check`.
- [x] Run the sensitive-path staged-file check and commit the implementation in logical units.
- [x] Deploy to Vercel production.
- [x] Smoke-test login protection, client pages, cron authorization, Stripe webhook reachability, and live page responses.
- [x] Update the punch list and build-state documentation with verified results.

### Task 5: Reconnaissance for client profiles and client emails

**Files:**
- Create: `docs/reference/client-profile-email-recon.md`

**Interfaces:**
- Consumes: Current Supabase schema, discovery data, Notion links, Resend setup, portal actions, and engagement state changes.
- Produces: Decision-ready options with recommended defaults, data maps, trigger maps, risks, and the smallest questions Ryan must answer.

- [x] Map every available profile input and identify what is missing.
- [x] Compare Supabase-only, Notion-only, and dual-storage profile approaches.
- [x] Map candidate client emails to exact existing system events.
- [x] Separate safe automatic messages from messages that should remain approval-gated.
- [x] Draft recommended profile sections and email trigger defaults without activating either feature.
- [x] List only the unresolved decisions that materially change implementation.
