import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { GameForm } from "./game-form";

export default async function GameRegistrationPage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, name")
    .in("status", ["upcoming", "registration_open"])
    .order("event_date");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Games & Entertainment Registration" description="Register to provide games or entertainment at an upcoming event." />
      <Card className="max-w-2xl">
        <CardContent>
          <GameForm events={events ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
