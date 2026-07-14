import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PROJECT_ROOT = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, PROJECT_ROOT), "utf8");
}

const CLIENT_PAGE_FILES = [
  "app/(portal)/layout.tsx",
  "app/(portal)/dashboard/page.tsx",
  "app/(portal)/deliverables/page.tsx",
  "app/(portal)/discovery/page.tsx",
  "app/(portal)/payment/page.tsx",
];

const CLIENT_ROUTE_FILES = [
  "app/api/comments/route.ts",
  "app/api/discovery/submit/route.ts",
  "app/api/submit/route.ts",
];

test("client portal pages do not import the service-role client", async () => {
  for (const file of CLIENT_PAGE_FILES) {
    const text = await source(file);
    assert.equal(
      text.includes('from "@/lib/supabase/admin"'),
      false,
      `${file} must use the RLS server client`
    );
  }
});

test("client-owned API routes do not import the service-role client", async () => {
  for (const file of CLIENT_ROUTE_FILES) {
    const text = await source(file);
    assert.equal(
      text.includes('from "@/lib/supabase/admin"'),
      false,
      `${file} must use the RLS server client`
    );
  }
});

test("Stripe checkout reads the client through RLS before privileged persistence", async () => {
  const text = await source("app/api/stripe/checkout/route.ts");

  assert.match(text, /supabase\s*\.from\("clients"\)\s*\.select/);
  assert.match(text, /admin\s*\.from\("clients"\)\s*\.update/);
  assert.doesNotMatch(text, /admin\s*\.from\("clients"\)\s*\.select/);
});

test("final-package download reads the client through RLS", async () => {
  const text = await source("app/api/deliverables/download/route.ts");

  assert.match(text, /supabase\s*\.from\("clients"\)\s*\.select/);
  assert.doesNotMatch(text, /admin\s*\.from\("clients"\)\s*\.select/);
});
