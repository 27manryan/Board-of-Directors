import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateGateStatus, appendCommentsToNotion } from "@/lib/notion";
import { Resend } from "resend";
import { GATES } from "@/lib/engagement";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: client } = await admin
    .from("clients")
    .select("id, name, project_name, package, current_gate, payment_2_status, notion_drafting_page_id")
    .eq("supabase_user_id", user.id)
    .single();

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const gate = client.current_gate as 1 | 2 | 3;
  const isProBono = client.package === "pro_bono";

  if (gate === 2 && !isProBono && client.payment_2_status !== "paid") {
    return NextResponse.json(
      { error: "Payment required before submitting Gate 2" },
      { status: 402 }
    );
  }

  const { data: existing } = await admin
    .from("submissions")
    .select("id")
    .eq("client_id", client.id)
    .eq("gate", gate)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Already submitted" }, { status: 409 });
  }

  let body: { comments?: { deliverable_code: string; comment_text: string }[] } = {};
  try {
    body = await req.json();
  } catch {
    // No body — submit with no new comments
  }

  const comments = (body.comments ?? []).filter(
    (c) => c.deliverable_code && c.comment_text?.trim()
  );

  if (comments.length > 0) {
    const rows = comments.map((c) => ({
      client_id: client.id,
      deliverable_code: c.deliverable_code,
      comment_text: c.comment_text.trim(),
    }));
    await admin.from("comments").insert(rows);
  }

  const { data: allComments } = await admin
    .from("comments")
    .select("deliverable_code, comment_text, submitted_at")
    .eq("client_id", client.id)
    .order("submitted_at", { ascending: true });

  const { error: submitError } = await admin.from("submissions").insert({
    client_id: client.id,
    gate,
    payment_confirmed: gate === 1 || isProBono || (gate === 2 && client.payment_2_status === "paid"),
  });

  if (submitError) {
    return NextResponse.json({ error: "Failed to record submission" }, { status: 500 });
  }

  const gateName = GATES[gate]?.name ?? `Gate ${gate}`;
  const notifyEmail = process.env.NOTIFY_EMAIL ?? "info@vantagestrat.co";

  const commentLines = (allComments ?? [])
    .map((c) => `[${c.deliverable_code}] ${c.comment_text}`)
    .join("\n\n");

  const emailBody = `
Client: ${client.name}
Project: ${client.project_name}
Gate: Gate ${gate} — ${gateName}
Submitted: ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })}

${commentLines ? `COMMENTS\n--------\n${commentLines}` : "No comments submitted."}
`.trim();

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Vantage Portal <notifications@vantagestrat.co>",
      to: notifyEmail,
      subject: `[Vantage Portal] Gate ${gate} Submission — ${client.name} / ${client.project_name}`,
      text: emailBody,
    });
  } catch (emailErr) {
    console.error("Email send failed:", emailErr);
  }

  if (client.notion_drafting_page_id && comments.length > 0) {
    try {
      await appendCommentsToNotion(
        client.notion_drafting_page_id,
        gate,
        comments
      );
    } catch (notionErr) {
      console.error("Notion comment sync failed:", notionErr);
    }
  }

  if (client.notion_drafting_page_id) {
    try {
      await updateGateStatus(
        client.notion_drafting_page_id,
        gate,
        "Submitted for Review"
      );
    } catch (notionErr) {
      console.error("Notion gate status update failed:", notionErr);
    }
  }

  return NextResponse.json({ ok: true });
}
