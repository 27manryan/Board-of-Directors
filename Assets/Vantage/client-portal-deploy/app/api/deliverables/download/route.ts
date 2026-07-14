import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import {
  DELIVERABLES_BUCKET,
  getDeliverableFile,
  isPackageUnlocked,
} from "@/lib/deliverable-files";

// Streams the client's final package via a short-lived signed URL, but only
// after re-checking auth + the payment gate server-side. The bucket is private,
// so the signed URL (created with the service-role key) is the only way in.
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  let clientId: string | null;
  let unlocked: boolean;

  if (isAdminEmail(user.email)) {
    // Admin may fetch any client's package (e.g. to verify before release).
    clientId = req.nextUrl.searchParams.get("client_id");
    if (!clientId) return NextResponse.json({ error: "Missing client_id" }, { status: 400 });
    unlocked = true;
  } else {
    const { data: client } = await supabase
      .from("clients")
      .select("id, package, payment_3_status")
      .single();
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    clientId = client.id;
    unlocked = isPackageUnlocked(client);
  }

  if (!unlocked) {
    return NextResponse.json(
      { error: "Payment required to unlock final delivery" },
      { status: 403 }
    );
  }

  if (!clientId) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const file = await getDeliverableFile(
    clientId,
    isAdminEmail(user.email) ? admin : supabase
  );
  if (!file) {
    return NextResponse.json({ error: "No final package available yet" }, { status: 404 });
  }

  const { data: signed, error } = await admin.storage
    .from(DELIVERABLES_BUCKET)
    .createSignedUrl(file.storage_path, 60, { download: file.file_name });

  if (error || !signed) {
    return NextResponse.json({ error: "Could not generate download link" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
