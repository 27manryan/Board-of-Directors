import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "27manryan@gmail.com";

export default async function RootPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  redirect(user.email === ADMIN_EMAIL ? "/admin" : "/dashboard");
}
