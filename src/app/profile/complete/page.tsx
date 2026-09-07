import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompleteProfileForm } from "./form";
import { Logo } from "@/components/ui/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CompleteProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, mobile, profile_complete")
    .eq("id", user.id)
    .single();

  if (profile?.profile_complete) redirect(next || "/dashboard");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <Logo size={40} />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Complete your profile</CardTitle>
          <CardDescription>Just your name and mobile number — takes a few seconds.</CardDescription>
        </CardHeader>
        <CardContent>
          <CompleteProfileForm
            defaultName={profile?.full_name ?? ""}
            defaultMobile={profile?.mobile ?? ""}
            next={next || "/dashboard"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
