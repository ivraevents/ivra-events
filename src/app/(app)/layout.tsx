import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: vendorRegistration }] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", user.id).single(),
    // Stall vendors and canopy/game providers are separate vendor types —
    // once someone has registered a stall, hide the canopy/game options.
    supabase.from("registrations").select("id").eq("user_id", user.id).eq("type", "vendor").limit(1).maybeSingle(),
  ]);

  return (
    <AppShell
      navKind="user"
      userLabel={profile?.full_name || profile?.email || "Account"}
      userEmail={profile?.email || user.email || ""}
      hideProvideSection={!!vendorRegistration}
    >
      {children}
    </AppShell>
  );
}
