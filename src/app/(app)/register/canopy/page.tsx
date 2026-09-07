import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { CanopyForm } from "./canopy-form";

export default async function CanopyRegistrationPage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, name")
    .in("status", ["upcoming", "registration_open"])
    .order("event_date");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Canopy Provider Registration" description="Register to provide canopies/tents at an upcoming event." />
      <Card className="max-w-2xl">
        <CardContent>
          <CanopyForm events={events ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
