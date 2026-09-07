import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { SettingsForm } from "./settings-form";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from("system_settings").select("*");
  const map = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Global defaults for fees, advances, negotiation and invoicing." />
      <Card>
        <CardContent>
          <SettingsForm settings={map} />
        </CardContent>
      </Card>
    </div>
  );
}
