import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchGateStatusTable, deriveCurrentGate } from "@/lib/notion";
import { PACKAGES, paymentSchedule, type PackageKey } from "@/lib/engagement";

function StatusPill({ status }: { status: string }) {
  const lower = status.toLowerCase();
  const style = lower.includes("cleared") || lower.includes("complete") || lower.includes("done")
    ? "bg-[#E6F0E6] text-[#2D5C2D]"
    : lower.includes("progress") || lower.includes("active") || lower.includes("current")
    ? "bg-[#FFF8E6] text-[#7A5500]"
    : "bg-[#F0EDE8] text-[#6B7FA3]";

  return (
    <span className={`inline-block px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest ${style}`}>
      {status || "Pending"}
    </span>
  );
}

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("id, project_name, package, current_gate, project_total, payment_1_status, payment_2_status, payment_3_status, notion_drafting_page_id")
    .eq("supabase_user_id", user.id)
    .single();

  if (!client) {
    return (
      <div className="px-4 sm:px-8 py-10 max-w-4xl">
        <p className="text-sm text-muted">Your account is being set up. Check back shortly.</p>
      </div>
    );
  }

  const pkg = PACKAGES[client.package as PackageKey];
  const isProBono = client.package === "pro_bono";
  const [p1Amount, p2Amount, p3Amount] = paymentSchedule(Number(client.project_total));
  const p2Paid = client.payment_2_status === "paid";
  const p3Paid = client.payment_3_status === "paid";

  // Fetch gate status from Notion and sync current_gate to Supabase
  let gateRows: Awaited<ReturnType<typeof fetchGateStatusTable>> = [];
  let currentGate: 1 | 2 | 3 = client.current_gate as 1 | 2 | 3 ?? 1;

  if (client.notion_drafting_page_id) {
    try {
      gateRows = await fetchGateStatusTable(client.notion_drafting_page_id);
      const derived = deriveCurrentGate(gateRows);
      // Take the higher of Supabase and Notion — gate never regresses
      const resolved = Math.max(currentGate, derived) as 1 | 2 | 3;
      if (resolved !== (client.current_gate as number)) {
        currentGate = resolved;
        admin.from("clients").update({ current_gate: resolved }).eq("id", client.id).then(() => {});
      } else {
        currentGate = resolved;
      }
    } catch {
      // Notion unavailable — fall back to Supabase value
    }
  }

  const progressPercent = Math.round(((currentGate - 1) / 3) * 100);

  return (
    <div className="px-4 sm:px-8 py-10 max-w-4xl">
      <div className="mb-10">
        <p className="label mb-2">Overview</p>
        <h1 className="font-serif text-4xl font-semibold text-navy">Dashboard</h1>
        <div className="mt-3 w-8 h-px bg-gold" />
      </div>

      {/* Progress card */}
      <section className="card p-4 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <p className="label mb-1">Engagement Progress</p>
            <h2 className="font-serif text-2xl font-semibold text-navy">{client.project_name}</h2>
            <p className="text-xs text-muted mt-1">{pkg.label} Package</p>
          </div>
          <div className="text-right">
            <p className="label mb-1">Progress</p>
            <p className="font-serif text-3xl font-semibold text-gold">{progressPercent}%</p>
          </div>
        </div>

        <div className="w-full bg-cream-300 h-2 overflow-hidden">
          <div className="h-full bg-navy transition-all duration-500" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="flex justify-between mt-3">
          {[1, 2, 3].map((g) => (
            <div key={g} className="flex flex-col items-center">
              <div className={`w-2 h-2 mt-[-18px] ${g <= currentGate ? "bg-gold" : "bg-cream-300"}`} />
              <p className={`text-[10px] font-medium uppercase tracking-widest mt-2 ${g === currentGate ? "text-navy" : "text-muted"}`}>
                Gate {g}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Gate status table — sourced from Notion */}
      {gateRows.length > 0 && (
        <section className="card mb-6">
          <div className="px-4 sm:px-8 py-5 border-b border-[#ECE8E0]">
            <p className="label">Gate Status</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#ECE8E0]">
                <th className="px-4 sm:px-8 py-3 text-left label">Gate</th>
                <th className="px-4 sm:px-8 py-3 text-left label hidden sm:table-cell">Description</th>
                <th className="px-4 sm:px-8 py-3 text-left label">Status</th>
              </tr>
            </thead>
            <tbody>
              {gateRows.map((row, i) => (
                <tr key={i} className="border-b border-[#ECE8E0] last:border-0">
                  <td className="px-4 sm:px-8 py-4 text-sm text-navy font-medium">{row.gate}</td>
                  <td className="px-4 sm:px-8 py-4 text-sm text-muted hidden sm:table-cell">{row.description}</td>
                  <td className="px-4 sm:px-8 py-4"><StatusPill status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Payment summary — hidden for pro bono */}
      {!isProBono && (
        <section className="card mb-6">
          <div className="px-4 sm:px-8 py-5 border-b border-[#ECE8E0]">
            <p className="label">Payment Schedule</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#ECE8E0]">
            {[
              { label: "Payment 1 — 50%", amount: p1Amount, note: "at commitment", paid: client.payment_1_status === "paid" },
              { label: "Payment 2 — 25%", amount: p2Amount, note: "before Gate 2 comments", paid: p2Paid },
              { label: "Payment 3 — 25%", amount: p3Amount, note: "unlocks final delivery", paid: p3Paid },
            ].map((p, i) => (
              <div key={i} className="px-6 py-5">
                <p className="label text-[9px] mb-2">{p.label}</p>
                <p className="font-serif text-xl font-semibold text-navy mb-1">${p.amount.toLocaleString()}</p>
                <p className="text-[10px] text-muted mb-2">{p.note}</p>
                <span className={`inline-block px-2 py-0.5 text-[9px] font-medium uppercase tracking-widest ${p.paid ? "bg-[#E6F0E6] text-[#2D5C2D]" : "bg-[#F0EDE8] text-[#6B7FA3]"}`}>
                  {p.paid ? "Paid" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* What's next */}
      <section className="card p-4 sm:p-8">
        <p className="label mb-3">What&apos;s Next</p>
        {currentGate === 1 && (
          <p className="text-sm text-navy/80 leading-relaxed">
            Review the positioning and value proposition in your Deliverables tab. Your feedback on strategic direction shapes everything that follows — use the comment field on each card to share your thoughts.
          </p>
        )}
        {currentGate === 2 && (
          <>
            <p className="text-sm text-navy/80 leading-relaxed mb-3">
              Your full draft is ready for review. Read through each deliverable for voice and broad direction — we&apos;re not wordsmithing yet, just making sure it sounds like you.
            </p>
            {!p2Paid && !isProBono && (
              <p className="text-sm font-medium text-[#7A5500]">
                Payment 2 (${p2Amount.toLocaleString()}) is due before returning your comments.
              </p>
            )}
          </>
        )}
        {currentGate === 3 && (
          <p className="text-sm text-navy/80 leading-relaxed">
            This is the final pass — wordsmithing, small details, and polish. Use the comment field on each deliverable to flag anything you&apos;d like adjusted.
          </p>
        )}
      </section>
    </div>
  );
}
