import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runSupabaseKeepAlive } from "@/lib/cron-authorization";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = createAdminClient();
  const result = await runSupabaseKeepAlive({
    authorization: req.headers.get("authorization"),
    cronSecret: process.env.CRON_SECRET,
    query: async () => {
      const { error } = await admin.from("clients").select("id").limit(1);
      return { error };
    },
  });

  if (result.status === 503) {
    console.error("Supabase keep-alive read failed");
  }

  return NextResponse.json(result.body, { status: result.status });
}
