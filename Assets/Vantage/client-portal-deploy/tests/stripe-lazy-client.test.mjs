import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PROJECT_ROOT = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, PROJECT_ROOT), "utf8");
}

test("Stripe initializes only inside a request path", async () => {
  const helper = await source("lib/stripe.ts");
  const checkout = await source("app/api/stripe/checkout/route.ts");
  const webhook = await source("app/api/stripe/webhook/route.ts");

  assert.match(helper, /export function getStripe\(\)/);
  assert.doesNotMatch(helper, /export const stripe\s*=\s*new Stripe/);
  assert.match(checkout, /getStripe\(\)/);
  assert.match(webhook, /getStripe\(\)/);
});
