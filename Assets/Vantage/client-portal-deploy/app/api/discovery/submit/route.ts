import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeDiscoveryAnswers } from "@/lib/notion";
import { Resend } from "resend";
import { invalidateNotionCache } from "@/lib/notion-cache";
import { afterDiscoverySubmitted } from "@/lib/portal-side-effects";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, email, project_name, notion_discovery_page_id")
    .single();

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const { data: existing } = await supabase
    .from("discovery_submissions")
    .select("id")
    .eq("client_id", client.id)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Already submitted" }, { status: 409 });
  }

  let body: { answers?: { heading: string; answer: string }[] } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const answers = (body.answers ?? []).filter(
    (a) => a.heading && a.answer?.trim()
  );

  if (answers.length === 0) {
    return NextResponse.json({ error: "At least one answer is required" }, { status: 400 });
  }

  const answersJson: Record<string, string> = {};
  for (const a of answers) {
    answersJson[a.heading] = a.answer.trim();
  }

  const { data: submission, error: submitError } = await supabase
    .from("discovery_submissions")
    .insert({
      client_id: client.id,
      answers: answersJson,
    })
    .select("id")
    .single();

  if (submitError || !submission) {
    return NextResponse.json({ error: "Failed to record submission" }, { status: 500 });
  }

  try {
    await afterDiscoverySubmitted({
      clientId: client.id,
      submissionId: submission.id,
      clientName: client.name,
      projectName: client.project_name,
      recipientEmail: client.email,
      answers: answersJson,
    });
  } catch (sideEffectErr) {
    console.error("Discovery client follow-up failed:", sideEffectErr);
  }

  if (client.notion_discovery_page_id) {
    try {
      await writeDiscoveryAnswers(
        client.notion_discovery_page_id,
        answers.map((a) => ({ heading: a.heading, answer: a.answer.trim() }))
      );
      invalidateNotionCache("discovery");
    } catch (notionErr) {
      console.error("Notion discovery write-back failed:", notionErr);
    }
  }

  const notifyEmail = process.env.NOTIFY_EMAIL ?? "info@vantagestrat.co";
  const answerLines = answers
    .map((a) => `${a.heading}\n${a.answer.trim()}`)
    .join("\n\n---\n\n");

  const emailBody = `
Client: ${client.name}
Project: ${client.project_name}
Submitted: ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })}

DISCOVERY RESPONSES
-------------------
${answerLines}
`.trim();

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Vantage Portal <notifications@vantagestrat.co>",
      to: notifyEmail,
      subject: `[Vantage Portal] Discovery Submitted — ${client.name}`,
      text: emailBody,
    });
  } catch (emailErr) {
    console.error("Discovery email send failed:", emailErr);
  }

  return NextResponse.json({ ok: true });
}
