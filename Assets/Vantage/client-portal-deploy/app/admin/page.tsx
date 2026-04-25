import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreateClientForm } from "./_components/CreateClientForm";
import { VisibilityToggle } from "./_components/VisibilityToggle";
import { PaymentToggle } from "./_components/PaymentToggle";
import { DeleteClientButton } from "./_components/DeleteClientButton";
import { NotionLinkCell } from "./_components/NotionLinkCell";
import { DiscoveryLinkCell } from "./_components/DiscoveryLinkCell";
import { EditClientButton } from "./_components/EditClientButton";
import { RevisionRoundButton } from "./_components/RevisionRoundButton";
import {
  PACKAGES,
  DELIVERABLES,
  TOGGLEABLE_CODES,
  deliverablesForClient,
  paymentSchedule,
  type PackageKey,
} from "@/lib/engagement";

const ADMIN_EMAIL = "27manryan@gmail.com";

const PKG_STYLES: Record<PackageKey, string> = {
  foundation: "bg-cream-200 text-muted",
  clarity:    "bg-[#FFF8E6] text-[#7A5500]",
  command:    "bg-navy text-cream-100",
  pro_bono:   "bg-[#E6F0E6] text-[#2D5C2D]",
};

type VisibilityRow = { deliverable_code: string; released: boolean };
type ClientRow = {
  id: string;
  name: string;
  email: string;
  project_name: string;
  package: PackageKey;
  addon_competitive_audit: boolean;
  addon_internal_messaging: boolean;
  addon_rush_delivery: boolean;
  addon_pitch_deck: boolean;
  veteran_discount: boolean;
  custom_price: number | null;
  project_total: number;
  revision_round_balance: number;
  payment_1_status: string;
  payment_2_status: string;
  payment_3_status: string;
  notion_drafting_page_id: string | null;
  notion_discovery_page_id: string | null;
  deliverable_visibility: VisibilityRow[];
  discovery_submissions: { id: string; submitted_at: string; answers: Record<string, string> }[];
};

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.email?.toLowerCase() !== ADMIN_EMAIL) redirect("/dashboard");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clients")
    .select(
      "id, name, email, project_name, package, addon_competitive_audit, addon_internal_messaging, addon_rush_delivery, addon_pitch_deck, veteran_discount, custom_price, project_total, revision_round_balance, payment_1_status, payment_2_status, payment_3_status, notion_drafting_page_id, notion_discovery_page_id, deliverable_visibility ( deliverable_code, released ), discovery_submissions ( id, submitted_at, answers )"
    )
    .order("created_at", { ascending: false });

  const clients = (data as ClientRow[] | null) ?? [];

  return (
    <div className="min-h-screen bg-cream-100">
      <header className="bg-navy border-b border-navy-light/30 px-8 py-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-gold mb-1">Internal</p>
          <h1 className="font-serif text-xl font-semibold text-cream-100">Admin — Client Management</h1>
        </div>
        <div className="flex items-center gap-6">
          <a href="/dashboard" className="text-[10px] font-medium uppercase tracking-widest text-cream-300/50 hover:text-cream-100 transition-colors">
            Portal
          </a>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="text-[10px] font-medium uppercase tracking-widest text-cream-300/50 hover:text-gold transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>
      </header>

      <div className="px-8 py-10 max-w-7xl mx-auto">
        <section className="mb-12">
          <div className="mb-6">
            <p className="label mb-1">Onboarding</p>
            <h2 className="font-serif text-2xl font-semibold text-navy">Create New Client</h2>
          </div>
          <div className="card p-8">
            <CreateClientForm />
          </div>
        </section>

        <section>
          <div className="mb-6">
            <p className="label mb-1">{clients.length} Active Clients</p>
            <h2 className="font-serif text-2xl font-semibold text-navy">Client Overview</h2>
          </div>

          {error && <p className="text-xs text-red-700 mb-4">Failed to load clients: {error.message}</p>}
          {clients.length === 0 && !error && (
            <div className="card p-8 text-sm text-muted">No clients yet. Create one above.</div>
          )}

          {clients.length > 0 && (
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[1400px]">
                <thead>
                  <tr className="border-b border-[#ECE8E0] bg-cream-200">
                    <th className="px-6 py-3 text-left label">Client</th>
                    <th className="px-6 py-3 text-left label">Project</th>
                    <th className="px-6 py-3 text-left label">Package</th>
                    <th className="px-6 py-3 text-left label">Total</th>
                    <th className="px-6 py-3 text-left label">Payments</th>
                    <th className="px-6 py-3 text-left label">Notion</th>
                    <th className="px-6 py-3 text-center label" colSpan={TOGGLEABLE_CODES.length}>
                      Deliverable Visibility
                    </th>
                    <th className="px-3 py-3 text-right label">·</th>
                  </tr>
                  <tr className="border-b border-[#ECE8E0] bg-cream-200/50">
                    <th colSpan={6} />
                    {TOGGLEABLE_CODES.map((code) => (
                      <th key={code} className="px-2 py-2 text-center label text-[9px]" title={DELIVERABLES[code]}>
                        {code}
                      </th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => {
                    const visMap = new Map(client.deliverable_visibility.map((v) => [v.deliverable_code, v.released]));
                    const includedCodes = new Set(deliverablesForClient(client));
                    const isProBono = client.package === "pro_bono";
                    const [p1, p2, p3] = paymentSchedule(Number(client.project_total));

                    return (
                      <tr key={client.id} className="border-b border-[#ECE8E0] last:border-0 hover:bg-cream-50 align-top">
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-navy">{client.name}</p>
                          <p className="text-xs text-muted">{client.email}</p>
                          {client.veteran_discount && (
                            <p className="text-[9px] text-[#7A5500] uppercase tracking-widest mt-0.5">Veteran</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-navy">{client.project_name}</p>
                          {(client.addon_competitive_audit || client.addon_internal_messaging || client.addon_rush_delivery || client.addon_pitch_deck) && (
                            <p className="text-[10px] text-muted mt-1">
                              +{[
                                client.addon_competitive_audit && "Competitive",
                                client.addon_internal_messaging && "Internal",
                                client.addon_rush_delivery && "Rush",
                                client.addon_pitch_deck && "Pitch Deck",
                              ].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest ${PKG_STYLES[client.package]}`}>
                            {PACKAGES[client.package].label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-navy">
                          {isProBono ? <span className="text-[#2D5C2D] text-[10px] uppercase tracking-widest">Pro Bono</span> : `$${Number(client.project_total).toLocaleString()}`}
                          {client.custom_price != null && <p className="text-[9px] text-muted">Custom</p>}
                          {!isProBono && (
                            <RevisionRoundButton
                              clientId={client.id}
                              currentBalance={Number(client.revision_round_balance)}
                            />
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isProBono ? (
                            <span className="text-[10px] text-muted">—</span>
                          ) : (
                            <div className="flex gap-1.5">
                              <PaymentToggle clientId={client.id} paymentNumber={1} initialPaid={client.payment_1_status === "paid"} amount={p1} />
                              <PaymentToggle clientId={client.id} paymentNumber={2} initialPaid={client.payment_2_status === "paid"} amount={p2} />
                              <PaymentToggle clientId={client.id} paymentNumber={3} initialPaid={client.payment_3_status === "paid"} amount={p3} />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 space-y-3">
                          <div>
                            <p className="text-[9px] text-muted uppercase tracking-widest mb-1">Drafting</p>
                            <NotionLinkCell
                              clientId={client.id}
                              clientName={client.name}
                              initialPageId={client.notion_drafting_page_id}
                            />
                          </div>
                          <div>
                            <p className="text-[9px] text-muted uppercase tracking-widest mb-1">Discovery</p>
                            <DiscoveryLinkCell
                              clientId={client.id}
                              clientName={client.name}
                              initialPageId={client.notion_discovery_page_id}
                            />
                            {client.discovery_submissions.length > 0 ? (
                              <p className="text-[9px] text-[#2D5C2D] uppercase tracking-widest mt-1">
                                ✓ Submitted {new Date(client.discovery_submissions[0].submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </p>
                            ) : (
                              <p className="text-[9px] text-muted uppercase tracking-widest mt-1">Not submitted</p>
                            )}
                          </div>
                        </td>
                        {TOGGLEABLE_CODES.map((code) => (
                          <td key={code} className="px-2 py-4 text-center">
                            {includedCodes.has(code) ? (
                              <VisibilityToggle
                                clientId={client.id}
                                deliverableCode={code}
                                initialReleased={visMap.get(code) ?? false}
                              />
                            ) : (
                              <span className="text-muted text-xs">—</span>
                            )}
                          </td>
                        ))}
                        <td className="px-3 py-4 text-right space-y-2">
                          <EditClientButton client={client} />
                          <DeleteClientButton clientId={client.id} clientName={client.name} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
