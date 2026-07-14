import {
  buildClientProfileDraft,
  nextProfileVersion,
  type ClientProfileClientInput,
} from "@/lib/client-profiles";
import {
  portalUrl,
  recordAndMaybeSendClientNotification,
} from "@/lib/client-notifications";
import { createAdminClient } from "@/lib/supabase/admin";

const CLIENT_PROFILE_SELECT = [
  "id",
  "name",
  "email",
  "project_name",
  "package",
  "addon_competitive_audit",
  "addon_internal_messaging",
  "addon_rush_delivery",
  "addon_pitch_deck",
  "veteran_discount",
  "custom_price",
  "project_total",
  "current_gate",
  "payment_1_status",
  "payment_2_status",
  "payment_3_status",
  "revision_round_balance",
  "created_at",
].join(", ");

type ProfileVersionRow = { version: number };

export async function createProfileDraftForClient({
  clientId,
  discoveryAnswers = {},
}: {
  clientId: string;
  discoveryAnswers?: Record<string, string>;
}) {
  const admin = createAdminClient();
  const { data: client, error: clientError } = await admin
    .from("clients")
    .select(CLIENT_PROFILE_SELECT)
    .eq("id", clientId)
    .single();

  if (clientError || !client) {
    throw new Error(clientError?.message ?? "Client not found");
  }

  const { data: existingProfiles } = await admin
    .from("client_profiles")
    .select("version")
    .eq("client_id", clientId);

  const version = nextProfileVersion((existingProfiles ?? []) as ProfileVersionRow[]);
  const draft = buildClientProfileDraft({
    client: client as unknown as ClientProfileClientInput,
    discoveryAnswers,
    version,
  });

  const { data: inserted, error: insertError } = await admin
    .from("client_profiles")
    .insert({
      client_id: clientId,
      version,
      status: draft.status,
      visibility: draft.visibility,
      profile_json: draft.profile,
      profile_markdown: draft.profileMarkdown,
      input_snapshot: draft.inputSnapshot,
    })
    .select("id, version, status")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return inserted;
}

export async function afterDiscoverySubmitted({
  clientId,
  submissionId,
  clientName,
  projectName,
  recipientEmail,
  answers,
}: {
  clientId: string;
  submissionId: string;
  clientName: string;
  projectName: string;
  recipientEmail: string;
  answers: Record<string, string>;
}) {
  const admin = createAdminClient();

  await createProfileDraftForClient({
    clientId,
    discoveryAnswers: answers,
  });

  return recordAndMaybeSendClientNotification({
    admin,
    clientId,
    eventType: "discovery_received",
    entityId: submissionId,
    recipientEmail,
    payload: {
      clientName,
      projectName,
      portalUrl: portalUrl(),
    },
  });
}

export async function afterGateSubmitted({
  clientId,
  submissionId,
  clientName,
  projectName,
  recipientEmail,
  gateLabel,
}: {
  clientId: string;
  submissionId: string;
  clientName: string;
  projectName: string;
  recipientEmail: string;
  gateLabel: string;
}) {
  const admin = createAdminClient();

  return recordAndMaybeSendClientNotification({
    admin,
    clientId,
    eventType: "gate_feedback_received",
    entityId: submissionId,
    recipientEmail,
    payload: {
      clientName,
      projectName,
      gateLabel,
      portalUrl: portalUrl(),
    },
  });
}
