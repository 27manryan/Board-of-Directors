import assert from "node:assert/strict";
import test from "node:test";

async function loadAuthorizationHelper() {
  try {
    return await import("../lib/cron-authorization.ts");
  } catch {
    assert.fail("cron authorization helper is not implemented");
  }
}

test("rejects a request when CRON_SECRET is missing", async () => {
  const { isAuthorizedCronRequest } = await loadAuthorizationHelper();

  assert.equal(isAuthorizedCronRequest("Bearer anything", undefined), false);
});

test("rejects a request with the wrong bearer token", async () => {
  const { isAuthorizedCronRequest } = await loadAuthorizationHelper();

  assert.equal(isAuthorizedCronRequest("Bearer wrong", "expected"), false);
});

test("accepts a request with the configured bearer token", async () => {
  const { isAuthorizedCronRequest } = await loadAuthorizationHelper();

  assert.equal(isAuthorizedCronRequest("Bearer expected", "expected"), true);
});

test("does not query Supabase when the request is unauthorized", async () => {
  const { runSupabaseKeepAlive } = await loadAuthorizationHelper();
  let queryCalled = false;

  const result = await runSupabaseKeepAlive({
    authorization: "Bearer wrong",
    cronSecret: "expected",
    query: async () => {
      queryCalled = true;
      return { error: null };
    },
  });

  assert.deepEqual(result, { status: 401, body: { ok: false } });
  assert.equal(queryCalled, false);
});

test("performs one read-only query for an authorized request", async () => {
  const { runSupabaseKeepAlive } = await loadAuthorizationHelper();
  let queryCount = 0;

  const result = await runSupabaseKeepAlive({
    authorization: "Bearer expected",
    cronSecret: "expected",
    query: async () => {
      queryCount += 1;
      return { error: null };
    },
  });

  assert.deepEqual(result, { status: 200, body: { ok: true } });
  assert.equal(queryCount, 1);
});

test("reports a failed Supabase read without exposing error details", async () => {
  const { runSupabaseKeepAlive } = await loadAuthorizationHelper();

  const result = await runSupabaseKeepAlive({
    authorization: "Bearer expected",
    cronSecret: "expected",
    query: async () => ({ error: new Error("database details") }),
  });

  assert.deepEqual(result, { status: 503, body: { ok: false } });
});
