import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const PROJECT_ROOT = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, PROJECT_ROOT), "utf8");
}

test("Notion readers use stable cache keys, named tags, and a 60 second TTL", async () => {
  const notion = await source("lib/notion.ts");
  const cache = await source("lib/notion-cache.ts");

  assert.match(cache, /NOTION_CACHE_TTL_SECONDS\s*=\s*60/);
  assert.match(cache, /gateStatus:\s*"notion-gate-status"/);
  assert.match(cache, /drafting:\s*"notion-drafting"/);
  assert.match(cache, /discovery:\s*"notion-discovery"/);

  for (const key of [
    "notion-gate-status-reader",
    "notion-drafting-reader",
    "notion-discovery-reader",
  ]) {
    assert.equal(notion.includes(`"${key}"`), true, `${key} must be stable`);
  }

  assert.equal((notion.match(/unstable_cache\(/g) ?? []).length, 3);
  assert.equal(
    (notion.match(/revalidate:\s*NOTION_CACHE_TTL_SECONDS/g) ?? []).length,
    3
  );
});

test("Notion cache invalidation is wired to each write path", async () => {
  const submit = await source("app/api/submit/route.ts");
  const discovery = await source("app/api/discovery/submit/route.ts");
  const admin = await source("app/admin/actions.ts");

  assert.match(submit, /invalidateNotionCache\("gateStatus", "drafting"\)/);
  assert.match(discovery, /invalidateNotionCache\("discovery"\)/);
  assert.match(admin, /invalidateNotionCache\("drafting"\)/);
});
