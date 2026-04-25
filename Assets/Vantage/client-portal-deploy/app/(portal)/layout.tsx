import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("name, project_name")
    .eq("supabase_user_id", user.id)
    .single();

  const clientName = client?.name ?? user.email ?? "Client";
  const projectName = client?.project_name ?? "Your Project";
  const isAdmin = user.email?.toLowerCase() === "27manryan@gmail.com";

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-cream-100">
      <Sidebar clientName={clientName} projectName={projectName} isAdmin={isAdmin} />
      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  );
}
