import assert from "node:assert/strict";
import test from "node:test";

import {
  buildClientProfileDraft,
  nextProfileVersion,
  renderClientProfileMarkdown,
} from "../lib/client-profiles.ts";

const baseClient = {
  id: "client-1",
  name: "Avery Lane",
  email: "avery@example.com",
  project_name: "Launch Messaging",
  package: "clarity",
  addon_competitive_audit: true,
  addon_internal_messaging: false,
  addon_rush_delivery: false,
  addon_pitch_deck: false,
  veteran_discount: false,
  custom_price: null,
  project_total: 2500,
  current_gate: 1,
  payment_1_status: "paid",
  payment_2_status: "unpaid",
  payment_3_status: "unpaid",
  revision_round_balance: 0,
  created_at: "2026-06-27T12:00:00.000Z",
};

test("builds an internal draft profile from client facts", () => {
  const profile = buildClientProfileDraft({
    client: baseClient,
    discoveryAnswers: {},
    version: 1,
  });

  assert.equal(profile.status, "draft");
  assert.equal(profile.visibility, "internal");
  assert.equal(profile.version, 1);
  assert.equal(profile.profile.client.name, "Avery Lane");
  assert.equal(profile.profile.engagement.projectName, "Launch Messaging");
  assert.equal(profile.profile.engagement.package, "clarity");
  assert.deepEqual(profile.profile.engagement.addOns, ["Competitive Audit"]);
  assert.deepEqual(profile.profile.openQuestions, []);
});

test("captures discovery answers as business context and open questions", () => {
  const profile = buildClientProfileDraft({
    client: baseClient,
    discoveryAnswers: {
      "Primary audience": "Veteran founders and nonprofit operators",
      "What is still unclear?": "",
      "Launch deadline": "August 15",
    },
    version: 2,
  });

  assert.equal(profile.version, 2);
  assert.deepEqual(profile.profile.businessContext.discoveryAnswers, [
    {
      prompt: "Primary audience",
      answer: "Veteran founders and nonprofit operators",
    },
    {
      prompt: "Launch deadline",
      answer: "August 15",
    },
  ]);
  assert.deepEqual(profile.inputSnapshot.discoveryAnswerKeys, [
    "Primary audience",
    "Launch deadline",
  ]);
});

test("renders markdown without client-visible language or em dashes", () => {
  const draft = buildClientProfileDraft({
    client: baseClient,
    discoveryAnswers: { "Brand concern": "Avoid sounding too corporate." },
    version: 1,
  });
  const markdown = renderClientProfileMarkdown(draft.profile);

  assert.match(markdown, /# Avery Lane Profile/);
  assert.match(markdown, /Internal working profile/);
  assert.match(markdown, /Avoid sounding too corporate/);
  assert.doesNotMatch(markdown, /client-facing/i);
  assert.doesNotMatch(markdown, /\u2014/);
});

test("calculates the next profile version", () => {
  assert.equal(nextProfileVersion([]), 1);
  assert.equal(nextProfileVersion([{ version: 1 }, { version: 3 }, { version: 2 }]), 4);
});
