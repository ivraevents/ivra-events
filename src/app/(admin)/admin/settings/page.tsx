import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SettingsForm } from "./settings-form";
import { AdminPasswordForm } from "./admin-password-form";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: settings } = await supabase.from("system_settings").select("*");
  const map = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Global defaults for fees, advances, negotiation and invoicing." />

      <Card>
        <CardHeader>
          <CardTitle>Admin Sign-In Password</CardTitle>
          <CardDescription>Used at /admin-login — separate from the sign-in customers and vendors use.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminPasswordForm email={user?.email ?? ""} />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <SettingsForm settings={map} />
        </CardContent>
      </Card>
    </div>
  );
}
