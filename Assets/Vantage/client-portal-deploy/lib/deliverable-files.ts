import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export const DELIVERABLES_BUCKET = "deliverables";

export interface DeliverableFile {
  client_id: string;
  storage_path: string;
  file_name: string;
  file_size: number | null;
  content_type: string | null;
  uploaded_at: string;
}

// A client's final package is unlocked once the engagement is pro bono or
// Payment 3 has been paid. Deliberately decoupled from current_gate: the admin
// only uploads the file when the work is actually done, so the upload itself is
// the "ready" signal and remains independent from gate progression.
export function isPackageUnlocked(client: {
  package: string;
  payment_3_status: string;
}): boolean {
  return client.package === "pro_bono" || client.payment_3_status === "paid";
}

export async function getDeliverableFile(
  clientId: string,
  database: SupabaseClient = createAdminClient()
): Promise<DeliverableFile | null> {
  const { data } = await database
    .from("deliverable_files")
    .select("client_id, storage_path, file_name, file_size, content_type, uploaded_at")
    .eq("client_id", clientId)
    .maybeSingle();
  return (data as DeliverableFile | null) ?? null;
}
