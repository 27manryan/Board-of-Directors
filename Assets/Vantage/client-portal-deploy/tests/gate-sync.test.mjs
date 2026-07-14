import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveGate,
  syncGate,
} from "../lib/gate-sync-core.ts";

const complete = (gate) => ({
  gate: `Gate ${gate}`,
  description: "",
  status: "Cleared",
  isComplete: true,
});

const pending = (gate) => ({
  gate: `Gate ${gate}`,
  description: "",
  status: "Pending",
  isComplete: false,
});

test("falls back to the stored gate when no Notion page is linked", async () => {
  let fetched = false;
  const result = await syncGate(
    { id: "client-1", current_gate: 2, notion_drafting_page_id: null },
    {
      fetchRows: async () => {
        fetched = true;
        return [];
      },
      persistGate: async () => {},
    }
  );

  assert.equal(result.gate, 2);
  assert.deepEqual(result.rows, []);
  assert.equal(result.notionAvailable, true);
  assert.equal(fetched, false);
});

test("never regresses below the stored gate", () => {
  assert.equal(resolveGate(3, [pending(1), pending(2), pending(3)]), 3);
});

test("advances and persists when Notion is ahead", async () => {
  const persisted = [];
  const rows = [complete(1), pending(2), pending(3)];
  const result = await syncGate(
    { id: "client-1", current_gate: 1, notion_drafting_page_id: "page-1" },
    {
      fetchRows: async () => rows,
      persistGate: async (clientId, gate) => persisted.push([clientId, gate]),
    }
  );

  assert.equal(result.gate, 2);
  assert.deepEqual(result.rows, rows);
  assert.deepEqual(persisted, [["client-1", 2]]);
});

test("uses the stored gate and reports a temporary Notion failure", async () => {
  const result = await syncGate(
    { id: "client-1", current_gate: 2, notion_drafting_page_id: "page-1" },
    {
      fetchRows: async () => {
        throw new Error("Notion unavailable");
      },
      persistGate: async () => {
        throw new Error("must not persist");
      },
    }
  );

  assert.equal(result.gate, 2);
  assert.deepEqual(result.rows, []);
  assert.equal(result.notionAvailable, false);
});
