import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { userNav } from "@/components/layout/nav-items";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  return (
    <AppShell
      nav={userNav}
      userLabel={profile?.full_name || profile?.email || "Account"}
      userEmail={profile?.email || user.email || ""}
    >
      {children}
    </AppShell>
  );
}
