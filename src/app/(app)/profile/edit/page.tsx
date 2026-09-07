import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { ProfileForm } from "../profile-form";

export default async function EditProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/profile" className="flex w-fit items-center gap-1.5 text-sm font-medium text-royal-600">
        <ArrowLeft className="h-4 w-4" /> Back to Profile
      </Link>
      <PageHeader title="Edit Profile" description="Update your name and mobile number." />
      <Card className="max-w-lg">
        <CardContent>
          <ProfileForm defaultName={profile?.full_name ?? ""} defaultMobile={profile?.mobile ?? ""} email={profile?.email ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
