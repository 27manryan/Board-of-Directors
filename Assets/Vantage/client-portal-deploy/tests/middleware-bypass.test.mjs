import assert from "node:assert/strict";
import test from "node:test";

async function loadPathHelper() {
  try {
    return await import("../lib/middleware-paths.ts");
  } catch {
    assert.fail("middleware path helper is not implemented");
  }
}

test("bypasses portal authentication for cron routes", async () => {
  const { bypassPortalAuthentication } = await loadPathHelper();

  assert.equal(bypassPortalAuthentication("/api/cron/supabase-keepalive"), true);
});

test("bypasses portal authentication for the Stripe webhook", async () => {
  const { bypassPortalAuthentication } = await loadPathHelper();

  assert.equal(bypassPortalAuthentication("/api/stripe/webhook"), true);
});

test("keeps other API routes behind portal authentication", async () => {
  const { bypassPortalAuthentication } = await loadPathHelper();

  assert.equal(bypassPortalAuthentication("/api/stripe/checkout"), false);
  assert.equal(bypassPortalAuthentication("/api/submit"), false);
  assert.equal(bypassPortalAuthentication("/api/discovery/submit"), false);
});
