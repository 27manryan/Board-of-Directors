# Vantage Strategic Communications — Client Portal

**Domain:** portal.vantagestrat.co  
**Stack:** Next.js 14 · Tailwind CSS · TypeScript · Supabase · Stripe  
**Status:** Step 1 of 7 complete — UI scaffold. No backend connected yet.

---

## Project Overview

This is the client-facing engagement portal for Vantage Strategic Communications. Clients log in to view their project stage, access delivered work, submit comments, and pay invoices. The internal `/admin` page lets Ryan manage client records and control deliverable visibility.

---

## Step-by-Step Build Plan

| Step | Description | Status |
|------|-------------|--------|
| **1** | Next.js scaffold — design system, layout, all pages | ✅ Complete |
| **2** | Supabase auth — login, session management, route guards | ⬜ Next |
| **3** | Supabase DB — clients, projects, deliverables, comments tables | ⬜ Pending |
| **4** | Deliverable system — per-client visibility, comment submission | ⬜ Pending |
| **5** | Stripe payments — Checkout sessions, webhook, payment history | ⬜ Pending |
| **6** | Admin tooling — invite clients, toggle gates, stage management | ⬜ Pending |
| **7** | Production deploy — Vercel, portal.vantagestrat.co subdomain | ⬜ Pending |

---

## Getting Started (Local Dev)

### Prerequisites
- Node.js 18+ 
- npm or pnpm

### Setup

```bash
# 1. Navigate to project
cd vantage-portal

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials (Step 2)

# 4. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/login`.

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the values below.

| Variable | Required By | Description |
|----------|-------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Step 2 | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Step 2 | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Step 3 | Supabase service role key (server-side only) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Step 5 | Stripe publishable key |
| `STRIPE_SECRET_KEY` | Step 5 | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Step 5 | Stripe webhook signing secret |
| `NEXT_PUBLIC_APP_URL` | Step 7 | Production URL: `https://portal.vantagestrat.co` |

---

## Project Structure

```
vantage-portal/
├── app/
│   ├── layout.tsx              # Root layout — fonts, metadata
│   ├── globals.css             # Tailwind + Vantage design tokens
│   ├── page.tsx                # Root redirect → /login
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx        # Login page (no sidebar)
│   ├── (portal)/               # Auth-gated pages w/ sidebar
│   │   ├── layout.tsx          # Sidebar + portal shell
│   │   ├── dashboard/
│   │   │   └── page.tsx        # Stage progress, gate status, what's next
│   │   ├── deliverables/
│   │   │   └── page.tsx        # Deliverable cards + comment forms
│   │   └── payment/
│   │       └── page.tsx        # Invoice + Stripe CTA
│   └── admin/
│       └── page.tsx            # Internal: client mgmt + visibility toggles
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx         # Nav sidebar (desktop) + mobile top nav
│   └── ui/
│       ├── Button.tsx          # Primary / ghost / outline variants
│       ├── Badge.tsx           # Status badges
│       └── Input.tsx           # Labeled input with error/hint
├── tailwind.config.ts          # Custom color tokens + zero border-radius
├── next.config.ts
├── tsconfig.json
├── package.json
└── .env.local.example
```

---

## Design System Quick Reference

| Token | Value | Usage |
|-------|-------|-------|
| Navy `#1B2A4A` | Primary color | Backgrounds, headings, buttons |
| Gold `#B8972E` | Accent | Progress, active states, decorative rules |
| Cream `#F5F0E8` | Surface | Page backgrounds, light surfaces |
| Muted `#6B7FA3` | Secondary text | Labels, subtext, placeholders |
| **Font: Cormorant Garamond** | Serif, 600 | All headings (`font-serif`) |
| **Font: system-ui** | Sans | Body, labels, buttons |
| **Border radius** | 0px everywhere | Sharp edges throughout |

### Utility class shortcuts (defined in `globals.css`)
- `.label` — uppercase, tracked, muted, xs text
- `.btn-primary` — navy bg, cream text, sharp
- `.btn-ghost` — border-bottom only, no bg
- `.input-field` — white bg, cream border, sharp
- `.card` — white bg, cream border

---

## Pages Summary

| Route | Description |
|-------|-------------|
| `/login` | Email + password login. Redirects to `/dashboard` on success. |
| `/dashboard` | Stage progress bar, gate status table, what's next steps. |
| `/deliverables` | Deliverable cards with status badges + comment forms. Hidden/locked items handled. |
| `/payment` | Current invoice, what's included, Pay Now CTA (Stripe placeholder). |
| `/admin` | Create clients, manage tier/stage/amount, toggle per-deliverable visibility. |

---

## Notes for Step 2 (Supabase Auth)

All `TODO (Step 2)` comments in the code mark integration points. Key files to update:

- `app/(auth)/login/page.tsx` — `handleSignIn` function, forgot password handler
- `app/(portal)/layout.tsx` — Add session check + redirect guard
- `components/layout/Sidebar.tsx` — Sign Out button, pull client name from session
- `app/page.tsx` — Check session state before redirecting

You'll need to create a Supabase project at [supabase.com](https://supabase.com), then add the `@supabase/ssr` middleware pattern for App Router cookie-based auth.

---

*Built by Claude for Ryan Mance · Vantage Strategic Communications*
