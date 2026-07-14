import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: client } = await supabase
    .from("clients")
    .select("name, project_name")
    .single();

  const clientName = client?.name ?? user.email ?? "Client";
  const projectName = client?.project_name ?? "Your Project";
  const isAdmin = isAdminEmail(user.email);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-cream-100">
      <Sidebar clientName={clientName} projectName={projectName} isAdmin={isAdmin} />
      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  );
}
