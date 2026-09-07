import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Defense in depth — middleware already blocks non-admins from /admin/*,
  // but a server-rendered layout should never assume that ran correctly.
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  return (
    <AppShell
      navKind="admin"
      badge="Admin"
      userLabel={profile?.full_name || profile?.email || "Admin"}
      userEmail={profile?.email || user.email || ""}
    >
      {children}
    </AppShell>
  );
}
