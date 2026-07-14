import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTOMATIC_CLIENT_NOTIFICATION_EVENTS,
  APPROVAL_GATED_CLIENT_NOTIFICATION_EVENTS,
  buildNotificationDedupeKey,
  isFinalPackageReady,
  notificationTemplateFor,
  shouldSendAutomatically,
} from "../lib/client-notifications.ts";

test("only client submission confirmations send automatically", () => {
  assert.deepEqual(AUTOMATIC_CLIENT_NOTIFICATION_EVENTS.sort(), [
    "discovery_received",
    "gate_feedback_received",
  ]);

  assert.equal(shouldSendAutomatically("discovery_received"), true);
  assert.equal(shouldSendAutomatically("gate_feedback_received"), true);

  for (const eventType of APPROVAL_GATED_CLIENT_NOTIFICATION_EVENTS) {
    assert.equal(shouldSendAutomatically(eventType), false, eventType);
  }
});

test("dedupe keys are stable and scoped to the event instance", () => {
  assert.equal(
    buildNotificationDedupeKey({
      eventType: "discovery_received",
      clientId: "client-1",
      entityId: "submission-1",
    }),
    "discovery_received:client-1:submission-1"
  );

  assert.equal(
    buildNotificationDedupeKey({
      eventType: "deliverables_ready",
      clientId: "client-1",
      entityId: null,
      version: "batch-2026-06-27",
    }),
    "deliverables_ready:client-1:batch-2026-06-27"
  );
});

test("final package notice is available only when a file exists and payment is unlocked", () => {
  assert.equal(
    isFinalPackageReady({
      package: "clarity",
      payment_3_status: "unpaid",
      deliverable_files: { file_name: "final.pdf" },
    }),
    false
  );

  assert.equal(
    isFinalPackageReady({
      package: "clarity",
      payment_3_status: "paid",
      deliverable_files: { file_name: "final.pdf" },
    }),
    true
  );

  assert.equal(
    isFinalPackageReady({
      package: "pro_bono",
      payment_3_status: "unpaid",
      deliverable_files: { file_name: "final.pdf" },
    }),
    true
  );

  assert.equal(
    isFinalPackageReady({
      package: "pro_bono",
      payment_3_status: "unpaid",
      deliverable_files: null,
    }),
    false
  );
});

test("templates produce client-facing copy without fake receipt language", () => {
  const template = notificationTemplateFor("gate_feedback_received");
  const message = template.render({
    clientName: "Avery",
    projectName: "Launch Messaging",
    portalUrl: "https://portal.vantagestrat.co",
    gateLabel: "Gate 1",
  });

  assert.match(message.subject, /Gate 1 feedback received/);
  assert.match(message.text, /Hi Avery,/);
  assert.match(message.text, /Launch Messaging/);
  assert.doesNotMatch(message.text.toLowerCase(), /receipt|payment processed/);
  assert.doesNotMatch(message.text, /\u2014/);
});
