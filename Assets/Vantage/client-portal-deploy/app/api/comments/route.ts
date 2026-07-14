import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { deliverable_code, comment_text } = body;

  if (!deliverable_code || !comment_text?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .single();

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const { error } = await supabase.from("comments").insert({
    client_id: client.id,
    deliverable_code,
    comment_text: comment_text.trim(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
