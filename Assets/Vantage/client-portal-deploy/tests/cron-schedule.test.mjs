import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("schedules the Supabase keep-alive once per day", async () => {
  let config;

  try {
    config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url)));
  } catch {
    assert.fail("vercel.json does not define the keep-alive schedule");
  }

  assert.deepEqual(config.crons, [
    {
      path: "/api/cron/supabase-keepalive",
      schedule: "17 12 * * *",
    },
  ]);
});
