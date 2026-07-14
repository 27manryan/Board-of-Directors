import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchDraftingDeliverables, type NotionDeliverableStatus } from "@/lib/notion";
import { DELIVERABLES, GATES } from "@/lib/engagement";
import { getSyncedGate } from "@/lib/gate-sync";
import DeliverablesView from "./_components/DeliverablesView";
import FinalPackageCard from "./_components/FinalPackageCard";
import { getDeliverableFile, isPackageUnlocked } from "@/lib/deliverable-files";

export default async function DeliverablesPage({
  searchParams,
}: {
  searchParams: { auto_submit?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: client } = await supabase
    .from("clients")
    .select(`
      id,
      package,
      current_gate,
      payment_2_status,
      payment_3_status,
      notion_drafting_page_id,
      deliverable_visibility ( deliverable_code, released )
    `)
    .single();

  if (!client) {
    return (
      <div className="px-4 sm:px-8 py-10 max-w-4xl">
        <p className="text-sm text-muted">Your account is being set up. Check back shortly.</p>
      </div>
    );
  }

  const isProBono = client.package === "pro_bono";
  const { gate, notionAvailable: gateStatusAvailable } = await getSyncedGate(client);
  const paymentRequired =
    !isProBono && gate === 2 && client.payment_2_status !== "paid";

  const releasedCodes = new Set(
    (client.deliverable_visibility as { deliverable_code: string; released: boolean }[])
      .filter((v) => v.released)
      .map((v) => v.deliverable_code)
  );

  type NotionDeliverable = { code: string; title: string; notionStatus: NotionDeliverableStatus; contentBlocks: string[] };
  let notionMap = new Map<string, NotionDeliverable>();
  let notionContentAvailable = true;
  if (client.notion_drafting_page_id) {
    try {
      const parsed = await fetchDraftingDeliverables(client.notion_drafting_page_id);
      notionMap = new Map(parsed.map((d) => [d.code, d]));
    } catch {
      notionContentAvailable = false;
    }
  }

  const { data: allComments } = await supabase
    .from("comments")
    .select("deliverable_code, comment_text, submitted_at")
    .eq("client_id", client.id)
    .order("submitted_at", { ascending: true });

  const commentsByCode = new Map<string, { text: string; submittedAt: string }[]>();
  for (const c of allComments ?? []) {
    const existing = commentsByCode.get(c.deliverable_code) ?? [];
    existing.push({ text: c.comment_text, submittedAt: c.submitted_at });
    commentsByCode.set(c.deliverable_code, existing);
  }

  const { data: recentSubmission } = await supabase
    .from("submissions")
    .select("id")
    .eq("client_id", client.id)
    .eq("gate", gate)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const alreadySubmitted = !!recentSubmission;

  const visibleDeliverables = Array.from(releasedCodes)
    .sort()
    .map((code) => {
      const notion = notionMap.get(code);
      return {
        code,
        title: notion?.title ?? DELIVERABLES[code] ?? code,
        notionStatus: notion?.notionStatus ?? ("not_started" as NotionDeliverableStatus),
        contentBlocks: notion?.contentBlocks ?? [],
        existingComments: commentsByCode.get(code) ?? [],
      };
    });

  const finalFile = await getDeliverableFile(client.id, supabase);
  const packageUnlocked = isPackageUnlocked(client);

  return (
    <div className="px-4 sm:px-8 py-10 max-w-4xl">
      <div className="mb-10">
        <p className="label mb-2">Your Documents</p>
        <h1 className="font-serif text-4xl font-semibold text-navy">Deliverables</h1>
        <div className="mt-3 w-8 h-px bg-gold" />
        <p className="text-sm text-muted mt-4 max-w-lg">
          Released deliverables appear below. Use the comment field on each card to share
          feedback or revision requests, then submit when you&apos;re ready.
        </p>
      </div>

      {!gateStatusAvailable && (
        <div className="mb-6 px-6 py-4 border-l-2 border-gold bg-[#FBF8F0]">
          <p className="text-sm text-navy">
            Live project status is temporarily unavailable. Your last confirmed gate is being used.
          </p>
        </div>
      )}

      {!notionContentAvailable && (
        <div className="mb-6 px-6 py-4 border-l-2 border-gold bg-[#FBF8F0]">
          <p className="text-sm text-navy">
            Document content is temporarily unavailable. Released deliverables are still listed below.
          </p>
        </div>
      )}

      {finalFile && (
        <FinalPackageCard
          fileName={finalFile.file_name}
          unlocked={packageUnlocked}
          isProBono={isProBono}
        />
      )}

      {visibleDeliverables.length === 0 ? (
        <div className="card px-8 py-12 text-center">
          <p className="font-serif text-xl text-muted">No deliverables released yet.</p>
          <p className="text-sm text-muted mt-2">Check back after your discovery call is complete.</p>
        </div>
      ) : (
        <DeliverablesView
          deliverables={visibleDeliverables}
          gate={gate}
          gateName={GATES[gate].name}
          paymentRequired={paymentRequired}
          alreadySubmitted={alreadySubmitted}
          autoSubmit={searchParams.auto_submit === "true"}
        />
      )}
    </div>
  );
}
