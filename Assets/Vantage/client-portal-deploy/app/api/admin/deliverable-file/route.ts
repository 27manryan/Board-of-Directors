import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { DELIVERABLES_BUCKET, getDeliverableFile } from "@/lib/deliverable-files";

// NOTE: uploads route through this serverless function, so they are subject to
// the platform request-body limit (~4.5 MB on Vercel). Typical strategy PDFs are
// far smaller; if larger packages are ever needed, switch to a client-side
// direct upload via a Supabase signed upload URL.
const MAX_BYTES = 25 * 1024 * 1024;

async function isAdmin(): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return !!user && isAdminEmail(user.email);
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const clientId = String(form.get("client_id") ?? "");
  const file = form.get("file");

  if (!clientId) return NextResponse.json({ error: "Missing client_id" }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: "File is empty" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File exceeds 25 MB" }, { status: 400 });

  const admin = createAdminClient();

  const { data: client } = await admin.from("clients").select("id").eq("id", clientId).single();
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  // Remove any previous object so the bucket doesn't accumulate orphans.
  const existing = await getDeliverableFile(clientId);
  if (existing) {
    await admin.storage.from(DELIVERABLES_BUCKET).remove([existing.storage_path]);
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${clientId}/${Date.now()}-${safeName}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(DELIVERABLES_BUCKET)
    .upload(storagePath, bytes, { contentType: "application/pdf", upsert: true });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { error: rowError } = await admin.from("deliverable_files").upsert(
    {
      client_id: clientId,
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      content_type: "application/pdf",
      uploaded_at: new Date().toISOString(),
    },
    { onConflict: "client_id" }
  );
  if (rowError) {
    // Roll back the orphaned object if the row write failed.
    await admin.storage.from(DELIVERABLES_BUCKET).remove([storagePath]);
    return NextResponse.json({ error: rowError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, file_name: file.name });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = req.nextUrl.searchParams.get("client_id");
  if (!clientId) return NextResponse.json({ error: "Missing client_id" }, { status: 400 });

  const admin = createAdminClient();
  const existing = await getDeliverableFile(clientId);
  if (existing) {
    await admin.storage.from(DELIVERABLES_BUCKET).remove([existing.storage_path]);
    await admin.from("deliverable_files").delete().eq("client_id", clientId);
  }
  return NextResponse.json({ ok: true });
}
