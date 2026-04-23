import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { paymentSchedule, GATES } from "@/lib/engagement";
import PayButton from "./_components/PayButton";

function fmt(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents);
}

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: { success?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("id, project_name, package, project_total, revision_round_balance, current_gate, payment_1_status, payment_2_status, payment_3_status, created_at")
    .eq("supabase_user_id", user.id)
    .single();

  if (!client) redirect("/dashboard");

  const isProBono = client.package === "pro_bono";
  const [p1, p2, p3] = paymentSchedule(client.project_total);
  const revisionBalance = Number(client.revision_round_balance) || 0;

  // Which payment is currently due (if any)
  let duePmtNumber: 2 | 3 | null = null;
  if (!isProBono) {
    if (client.payment_2_status === "unpaid" && client.current_gate >= 2) duePmtNumber = 2;
    else if (client.payment_3_status === "unpaid" && client.current_gate >= 3) duePmtNumber = 3;
  }

  const dueBaseAmount = duePmtNumber === 2 ? p2 : duePmtNumber === 3 ? p3 : 0;
  const dueTotalAmount = dueBaseAmount + revisionBalance;

  const successParam = searchParams.success;
  const successMsg =
    successParam === "p2" ? "Payment received. You may now submit your Gate 2 comments." :
    successParam === "p3" ? "Payment received. Your final deliverable package is being prepared." :
    null;

  const payments = [
    {
      number: 1,
      label: "Payment 1 — Project Start (50%)",
      amount: p1,
      status: client.payment_1_status,
    },
    {
      number: 2,
      label: `Payment 2 — ${GATES[2].name} (25%)`,
      amount: p2,
      status: client.payment_2_status,
    },
    {
      number: 3,
      label: `Payment 3 — Final Delivery (25%)`,
      amount: p3,
      status: client.payment_3_status,
    },
  ] as const;

  return (
    <div className="px-4 sm:px-8 py-10 max-w-2xl">
      {/* Header */}
      <div className="mb-10">
        <p className="label mb-2">Billing</p>
        <h1 className="font-serif text-4xl font-semibold text-navy">Payments</h1>
        <div className="mt-3 w-8 h-px bg-gold" />
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="mb-8 px-6 py-4 border-l-2 border-gold bg-[#FBF8F0]">
          <p className="text-sm text-navy">{successMsg}</p>
        </div>
      )}

      {/* Pro bono — no payment UI */}
      {isProBono ? (
        <div className="card px-4 sm:px-8 py-8">
          <p className="label mb-2">Billing Status</p>
          <p className="font-serif text-2xl font-semibold text-navy">No payment required</p>
          <p className="text-sm text-muted mt-2">This engagement is provided on a pro bono basis.</p>
        </div>
      ) : (
        <>
          {/* Currently due card */}
          {duePmtNumber ? (
            <div className="card mb-8">
              <div className="px-4 sm:px-8 py-8 border-b border-[#ECE8E0]">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <p className="label mb-2">Currently Due</p>
                    <h2 className="font-serif text-2xl font-semibold text-navy">
                      {payments[duePmtNumber - 1].label}
                    </h2>
                    <p className="text-sm text-muted mt-1">{client.project_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="label mb-1">Amount</p>
                    <p className="font-serif text-4xl font-semibold text-gold">
                      {fmt(dueTotalAmount)}
                    </p>
                    {revisionBalance > 0 && (
                      <p className="text-[10px] text-muted mt-1">
                        {fmt(dueBaseAmount)} + {fmt(revisionBalance)} revision
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-4 sm:px-8 py-8">
                <PayButton
                  paymentNumber={duePmtNumber}
                  amountFormatted={fmt(dueTotalAmount)}
                />
                <p className="text-xs text-muted mt-4 max-w-sm leading-relaxed">
                  {duePmtNumber === 2
                    ? "Payment is required before submitting your Gate 2 comments. You'll be redirected to Stripe's secure checkout."
                    : "Payment unlocks your final compiled deliverable package. You'll be redirected to Stripe's secure checkout."}
                </p>
                <div className="mt-6 pt-6 border-t border-[#ECE8E0]">
                  <p className="label mb-2">Accepted Payment Methods</p>
                  <p className="text-xs text-muted">
                    All major credit and debit cards via Stripe. Vantage does not store card details.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // All caught-up state
            !payments.every((p) => p.status === "paid") && client.current_gate < 2 && (
              <div className="card px-4 sm:px-8 py-8 mb-8">
                <p className="label mb-2">Billing Status</p>
                <p className="font-serif text-2xl font-semibold text-navy">No payment due</p>
                <p className="text-sm text-muted mt-2">
                  The next payment will become due when your project reaches Gate 2.
                </p>
              </div>
            )
          )}

          {/* All paid */}
          {payments.every((p) => p.status === "paid") && (
            <div className="card px-4 sm:px-8 py-8 mb-8">
              <p className="label mb-2">Billing Status</p>
              <p className="font-serif text-2xl font-semibold text-navy">All payments complete</p>
              <p className="text-sm text-muted mt-2">Thank you — your engagement is fully paid.</p>
            </div>
          )}

          {/* Payment history */}
          <div>
            <p className="label mb-4">Payment Schedule</p>
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-[#ECE8E0] bg-[#F2EDE5]">
                    <th className="px-6 py-3 text-left label">Description</th>
                    <th className="px-6 py-3 text-left label">Amount</th>
                    <th className="px-6 py-3 text-left label">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.number} className="border-b border-[#ECE8E0] last:border-0">
                      <td className="px-6 py-4 text-sm text-navy">{p.label}</td>
                      <td className="px-6 py-4 text-sm text-navy">{fmt(p.amount)}</td>
                      <td className="px-6 py-4">
                        {p.status === "paid" ? (
                          <span className="inline-block px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest bg-[#E6F0E6] text-[#2D5C2D]">
                            Paid
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest bg-[#FFF8E6] text-[#7A5500]">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
