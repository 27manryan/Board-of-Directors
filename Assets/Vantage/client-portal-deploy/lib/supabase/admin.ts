import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client bypasses RLS. Use it only for genuine privileged work,
// such as admin operations, narrow system persistence, and signed storage URLs.
// Client-owned reads and writes must use the authenticated request client.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
