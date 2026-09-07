import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { ProfileForm } from "./profile-form";
import { Badge } from "@/components/ui/badge";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
    supabase.from("user_roles").select("role_key").eq("user_id", user!.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Profile" description="Your account details." />
      <div className="flex flex-wrap gap-2">
        {roles?.map((r) => <Badge key={r.role_key} tone="navy">{r.role_key.replace("_", " ")}</Badge>)}
      </div>
      <Card className="max-w-lg">
        <CardContent>
          <ProfileForm defaultName={profile?.full_name ?? ""} defaultMobile={profile?.mobile ?? ""} email={profile?.email ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
