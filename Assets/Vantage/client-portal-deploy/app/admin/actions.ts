"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findDraftingPageId, findDiscoveryPageId } from "@/lib/notion";
import {
  PACKAGES,
  REVISION_ROUND_PRICE,
  type PackageKey,
  deliverablesForClient,
  projectTotal,
} from "@/lib/engagement";

const ADMIN_EMAIL = "27manryan@gmail.com";

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
    throw new Error("Unauthorized");
  }
}

function randomTempPassword() {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((b) => b.toString(36))
    .join("")
    .slice(0, 16);
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
  | { ok: true; tempPassword: string; email: string }
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

  revalidatePath("/admin");
  return { ok: true, tempPassword, email };
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
  revalidatePath("/admin");
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
