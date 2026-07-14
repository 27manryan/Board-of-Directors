import { createAdminClient } from "@/lib/supabase/admin";
import { fetchGateStatusTable } from "@/lib/notion";
import {
  syncGate,
  type GateClient,
} from "@/lib/gate-sync-core";

export async function getSyncedGate(client: GateClient) {
  return syncGate(client, {
    fetchRows: fetchGateStatusTable,
    persistGate: async (clientId, gate) => {
      const admin = createAdminClient();
      const { error } = await admin
        .from("clients")
        .update({ current_gate: gate })
        .eq("id", clientId)
        .lt("current_gate", gate);

      if (error) throw new Error(error.message);
    },
  });
}
