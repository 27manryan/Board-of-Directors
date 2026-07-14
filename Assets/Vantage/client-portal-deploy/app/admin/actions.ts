"use server";

import { revalidatePath } from "next/cache";
import { invalidateNotionCache } from "@/lib/notion-cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  appendClientProfileSummaryToNotion,
  findDraftingPageId,
  findDiscoveryPageId,
} from "@/lib/notion";
import {
  DELIVERABLES,
  PACKAGES,
  REVISION_ROUND_PRICE,
  type PackageKey,
  deliverablesForClient,
  projectTotal,
} from "@/lib/engagement";
import { isAdminEmail } from "@/lib/admin";
import {
  approveAndSendClientNotification,
  isFinalPackageReady,
  portalUrl,
} from "@/lib/client-notifications";
import { createProfileDraftForClient } from "@/lib/portal-side-effects";

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    throw new Error("Unauthorized");
  }
}

function randomTempPassword() {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((b) => b.toString(36))
    .join("")
    .slice(0, 16);
}

async function createPasswordSetupLink(email: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: `${portalUrl()}/reset-password`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  const actionLink = (data as { properties?: { action_link?: string } } | null)
    ?.properties?.action_link;

  if (!actionLink) {
    throw new Error("Supabase did not return a setup link.");
  }

  return actionLink;
}

// Reseeds deliverable_visibility for a client based on their current engagement.
// Preserves released state for deliverables that remain in the set.
// Removes rows for deliverables no longer applicable.
// Adds unreleased rows for new deliverables.
async function reseedVisibility(
  clientId: string,
  engagement: Parameters<typeof deliverablesForClient>[0]
) {
  const admin = createAdminClient();
  const newCodes = new Set(deliverablesForClient(engagement));

  const { data: existing } = await admin
    .from("deliverable_visibility")
    .select("deliverable_code")
    .eq("client_id", clientId);

  const existingCodes = new Set((existing ?? []).map((r: { deliverable_code: string }) => r.deliverable_code));

  // Remove codes no longer in package
  const toDelete = Array.from(existingCodes).filter((c) => !newCodes.has(c));
  if (toDelete.length > 0) {
    await admin
      .from("deliverable_visibility")
      .delete()
      .eq("client_id", clientId)
      .in("deliverable_code", toDelete);
  }

  // Add new codes (preserves existing rows via unique constraint)
  const toAdd = Array.from(newCodes).filter((c) => !existingCodes.has(c));
  if (toAdd.length > 0) {
    await admin.from("deliverable_visibility").insert(
      toAdd.map((code) => ({ client_id: clientId, deliverable_code: code, released: false }))
    );
  }
}

// =========================================================================
// CREATE CLIENT
// =========================================================================

export type CreateClientResult =
  | { ok: true; setupLink: string; email: string }
  | { ok: false; error: string };

export async function createClientAction(formData: FormData): Promise<CreateClientResult> {
  await requireAdmin();

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const project = String(formData.get("project") || "").trim();
  const pkg = String(formData.get("package") || "") as PackageKey;
  const addonCompetitive = formData.get("addon_competitive_audit") === "on";
  const addonInternal = formData.get("addon_internal_messaging") === "on";
  const addonRush = formData.get("addon_rush_delivery") === "on";
  const addonPitch = formData.get("addon_pitch_deck") === "on";
  const veteranDiscount = formData.get("veteran_discount") === "on";
  const customPriceRaw = String(formData.get("custom_price") || "").replace(/[^0-9.]/g, "");
  const customPrice = customPriceRaw ? parseFloat(customPriceRaw) : null;

  if (!name || !email || !project) {
    return { ok: false, error: "Name, email, and project are required." };
  }
  if (!(pkg in PACKAGES)) {
    return { ok: false, error: "Invalid package." };
  }

  const engagement = { package: pkg, addon_competitive_audit: addonCompetitive, addon_internal_messaging: addonInternal, addon_rush_delivery: addonRush, addon_pitch_deck: addonPitch, veteran_discount: veteranDiscount, custom_price: customPrice };
  const total = projectTotal(engagement);
  const codes = deliverablesForClient(engagement);

  const admin = createAdminClient();
  const tempPassword = randomTempPassword();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return { ok: false, error: authError?.message ?? "Failed to create auth user." };
  }

  const userId = authData.user.id;

  const { data: clientRow, error: clientError } = await admin
    .from("clients")
    .insert({
      supabase_user_id: userId,
      name,
      email,
      project_name: project,
      package: pkg,
      addon_competitive_audit: addonCompetitive,
      addon_internal_messaging: addonInternal,
      addon_rush_delivery: addonRush,
      addon_pitch_deck: addonPitch,
      veteran_discount: veteranDiscount,
      custom_price: customPrice,
      project_total: total,
    })
    .select("id")
    .single();

  if (clientError || !clientRow) {
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: clientError?.message ?? "Failed to create client row." };
  }

  const { error: visError } = await admin.from("deliverable_visibility").insert(
    codes.map((code) => ({ client_id: clientRow.id, deliverable_code: code, released: false }))
  );
  if (visError) {
    return { ok: false, error: `Client created, but seeding visibility failed: ${visError.message}` };
  }

  let setupLink: string;
  try {
    setupLink = await createPasswordSetupLink(email);
  } catch (setupError) {
    return {
      ok: false,
      error: `Client created, but setup link creation failed: ${(setupError as Error).message}`,
    };
  }

  try {
    await createProfileDraftForClient({ clientId: clientRow.id });
    await admin.from("client_notifications").insert({
      client_id: clientRow.id,
      event_type: "portal_welcome",
      dedupe_key: `portal_welcome:${clientRow.id}:current`,
      recipient_email: email,
      status: "pending",
      template_version: "2026-06-27",
      payload: {
        clientName: name,
        projectName: project,
        portalUrl: portalUrl(),
        setupUrl: setupLink,
      },
    });
  } catch (followUpError) {
    console.error("Client profile or welcome ledger creation failed:", followUpError);
  }

  revalidatePath("/admin");
  return { ok: true, setupLink, email };
}

// =========================================================================
// UPDATE CLIENT
// =========================================================================

export type UpdateClientResult = { ok: true } | { ok: false; error: string };

export interface UpdateClientData {
  name: string;
  email: string;
  project_name: string;
  package: PackageKey;
  addon_competitive_audit: boolean;
  addon_internal_messaging: boolean;
  addon_rush_delivery: boolean;
  addon_pitch_deck: boolean;
  veteran_discount: boolean;
  custom_price: number | null;
}

export async function updateClientAction(
  clientId: string,
  data: UpdateClientData
): Promise<UpdateClientResult> {
  await requireAdmin();

  const engagement = {
    package: data.package,
    addon_competitive_audit: data.addon_competitive_audit,
    addon_internal_messaging: data.addon_internal_messaging,
    addon_rush_delivery: data.addon_rush_delivery,
    addon_pitch_deck: data.addon_pitch_deck,
    veteran_discount: data.veteran_discount,
    custom_price: data.custom_price,
  };
  const total = projectTotal(engagement);

  const admin = createAdminClient();
  const { error } = await admin
    .from("clients")
    .update({
      name: data.name,
      email: data.email,
      project_name: data.project_name,
      package: data.package,
      addon_competitive_audit: data.addon_competitive_audit,
      addon_internal_messaging: data.addon_internal_messaging,
      addon_rush_delivery: data.addon_rush_delivery,
      addon_pitch_deck: data.addon_pitch_deck,
      veteran_discount: data.veteran_discount,
      custom_price: data.custom_price,
      project_total: total,
    })
    .eq("id", clientId);

  if (error) return { ok: false, error: error.message };

  await reseedVisibility(clientId, engagement);

  revalidatePath("/admin");
  return { ok: true };
}

// =========================================================================
// VISIBILITY / PAYMENTS
// =========================================================================

export async function toggleVisibilityAction(
  clientId: string,
  deliverableCode: string,
  released: boolean
) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("deliverable_visibility")
    .update({ released, released_at: released ? new Date().toISOString() : null })
    .eq("client_id", clientId)
    .eq("deliverable_code", deliverableCode);
  if (error) throw new Error(error.message);
  invalidateNotionCache("drafting");
  revalidatePath("/admin");
  revalidatePath("/deliverables");
}

export async function togglePaymentAction(
  clientId: string,
  paymentNumber: 1 | 2 | 3,
  paid: boolean
) {
  await requireAdmin();
  const column = `payment_${paymentNumber}_status` as const;
  const admin = createAdminClient();
  const { error } = await admin
    .from("clients")
    .update({ [column]: paid ? "paid" : "unpaid" })
    .eq("id", clientId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

// =========================================================================
// REVISION ROUNDS
// =========================================================================

export async function addRevisionRoundAction(
  clientId: string
): Promise<{ ok: true; newBalance: number } | { ok: false; error: string }> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: client, error: fetchError } = await admin
    .from("clients")
    .select("revision_round_balance")
    .eq("id", clientId)
    .single();

  if (fetchError || !client) return { ok: false, error: "Client not found" };

  const newBalance = Number(client.revision_round_balance) + REVISION_ROUND_PRICE;
  const { error } = await admin
    .from("clients")
    .update({ revision_round_balance: newBalance })
    .eq("id", clientId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true, newBalance };
}

export async function clearRevisionBalanceAction(
  clientId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("clients")
    .update({ revision_round_balance: 0 })
    .eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

// =========================================================================
// CLIENT NOTIFICATIONS
// =========================================================================

type AdminSendResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

async function loadClientForNotification(clientId: string) {
  const admin = createAdminClient();
  const { data: client, error } = await admin
    .from("clients")
    .select(
      "id, name, email, project_name, package, payment_3_status, deliverable_visibility ( deliverable_code, released ), deliverable_files ( file_name )"
    )
    .eq("id", clientId)
    .single();

  if (error || !client) {
    throw new Error(error?.message ?? "Client not found");
  }

  const row = client as unknown as {
    id: string;
    name: string;
    email: string;
    project_name: string;
    package: string;
    payment_3_status: string;
    deliverable_visibility: { deliverable_code: string; released: boolean }[];
    deliverable_files: { file_name: string } | { file_name: string }[] | null;
  };

  return {
    ...row,
    deliverable_files: Array.isArray(row.deliverable_files)
      ? row.deliverable_files[0] ?? null
      : row.deliverable_files,
  };
}

export async function sendWelcomeNotificationAction(
  clientId: string
): Promise<AdminSendResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const client = await loadClientForNotification(clientId);
  const setupLink = await createPasswordSetupLink(client.email);

  const result = await approveAndSendClientNotification({
    admin,
    clientId,
    eventType: "portal_welcome",
    recipientEmail: client.email,
    payload: {
      clientName: client.name,
      projectName: client.project_name,
      portalUrl: portalUrl(),
      setupUrl: setupLink,
    },
  });

  revalidatePath("/admin");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function sendDeliverablesReadyNotificationAction(
  clientId: string
): Promise<AdminSendResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const client = await loadClientForNotification(clientId);
  const released = client.deliverable_visibility
    .filter((row) => row.released)
    .map((row) => `- ${DELIVERABLES[row.deliverable_code] ?? row.deliverable_code}`)
    .join("\n");

  if (!released) {
    return { ok: false, error: "No released deliverables are available yet." };
  }

  const result = await approveAndSendClientNotification({
    admin,
    clientId,
    eventType: "deliverables_ready",
    entityId: released,
    recipientEmail: client.email,
    payload: {
      clientName: client.name,
      projectName: client.project_name,
      portalUrl: `${portalUrl()}/deliverables`,
      deliverablesList: released,
    },
  });

  revalidatePath("/admin");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function sendFinalPackageNotificationAction(
  clientId: string
): Promise<AdminSendResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const client = await loadClientForNotification(clientId);

  if (!isFinalPackageReady(client)) {
    return {
      ok: false,
      error: "Final package is not unlocked yet. Upload the file and confirm Payment 3 first.",
    };
  }

  const result = await approveAndSendClientNotification({
    admin,
    clientId,
    eventType: "final_package_available",
    entityId: client.deliverable_files?.file_name ?? "final-package",
    recipientEmail: client.email,
    payload: {
      clientName: client.name,
      projectName: client.project_name,
      portalUrl: `${portalUrl()}/deliverables`,
      finalPackageUrl: `${portalUrl()}/deliverables`,
    },
  });

  revalidatePath("/admin");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

// =========================================================================
// CLIENT PROFILES
// =========================================================================

export async function regenerateClientProfileAction(
  clientId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: discovery } = await admin
    .from("discovery_submissions")
    .select("answers")
    .eq("client_id", clientId)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  try {
    await createProfileDraftForClient({
      clientId,
      discoveryAnswers: (discovery?.answers ?? {}) as Record<string, string>,
    });
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }

  revalidatePath("/admin");
  return { ok: true };
}

export async function approveClientProfileAction(
  profileId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return { ok: false, error: "Unauthorized" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("client_profiles")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    })
    .eq("id", profileId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin");
  return { ok: true };
}

export async function publishClientProfileToNotionAction(
  profileId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("client_profiles")
    .select("id, status, profile_markdown, clients ( notion_drafting_page_id )")
    .eq("id", profileId)
    .single();

  if (error || !profile) {
    return { ok: false, error: error?.message ?? "Profile not found" };
  }

  if (profile.status !== "approved") {
    return { ok: false, error: "Approve the profile before publishing it to Notion." };
  }

  const pageId = (profile.clients as { notion_drafting_page_id?: string | null } | null)
    ?.notion_drafting_page_id;
  if (!pageId) {
    return { ok: false, error: "Link the client's Drafting page before publishing." };
  }

  try {
    await appendClientProfileSummaryToNotion(pageId, profile.profile_markdown);
  } catch (notionError) {
    return { ok: false, error: (notionError as Error).message };
  }

  const { error: updateError } = await admin
    .from("client_profiles")
    .update({ notion_synced_at: new Date().toISOString() })
    .eq("id", profileId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  revalidatePath("/admin");
  return { ok: true };
}

// =========================================================================
// NOTION LINK
// =========================================================================

export type NotionLinkResult =
  | { ok: true; pageId: string }
  | { ok: false; error: string };

export async function autoLinkNotionAction(
  clientId: string,
  clientName: string
): Promise<NotionLinkResult> {
  await requireAdmin();
  let pageId: string | null;
  try {
    pageId = await findDraftingPageId(clientName);
  } catch (e) {
    return { ok: false, error: `Notion error: ${(e as Error).message}` };
  }
  if (!pageId) {
    return { ok: false, error: `No match found for "${clientName}" in Notion. Check the name or paste the ID manually.` };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("clients").update({ notion_drafting_page_id: pageId }).eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true, pageId };
}

export async function setNotionPageIdAction(
  clientId: string,
  pageId: string
): Promise<NotionLinkResult> {
  await requireAdmin();
  const cleaned = pageId.trim().replace(/-/g, "");
  if (cleaned.length !== 32) {
    return { ok: false, error: "Invalid Notion page ID — should be 32 hex characters." };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("clients").update({ notion_drafting_page_id: cleaned }).eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true, pageId: cleaned };
}

// =========================================================================
// NOTION LINK — DISCOVERY
// =========================================================================

export async function autoLinkDiscoveryAction(
  clientId: string,
  clientName: string
): Promise<NotionLinkResult> {
  await requireAdmin();
  let pageId: string | null;
  try {
    pageId = await findDiscoveryPageId(clientName);
  } catch (e) {
    return { ok: false, error: `Notion error: ${(e as Error).message}` };
  }
  if (!pageId) {
    return { ok: false, error: `No "Discovery" page found for "${clientName}" in Notion.` };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("clients").update({ notion_discovery_page_id: pageId }).eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true, pageId };
}

export async function setDiscoveryPageIdAction(
  clientId: string,
  pageId: string
): Promise<NotionLinkResult> {
  await requireAdmin();
  const cleaned = pageId.trim().replace(/-/g, "");
  if (cleaned.length !== 32) {
    return { ok: false, error: "Invalid Notion page ID — should be 32 hex characters." };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("clients").update({ notion_discovery_page_id: cleaned }).eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true, pageId: cleaned };
}

// =========================================================================
// DELETE CLIENT
// =========================================================================

export async function deleteClientAction(clientId: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: client, error: fetchError } = await admin
    .from("clients")
    .select("supabase_user_id")
    .eq("id", clientId)
    .single();

  if (fetchError || !client) throw new Error(fetchError?.message ?? "Client not found");

  if (client.supabase_user_id) {
    const { error } = await admin.auth.admin.deleteUser(client.supabase_user_id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin.from("clients").delete().eq("id", clientId);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin");
}
