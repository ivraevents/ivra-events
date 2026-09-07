import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublicHome } from "@/components/marketing/public-home";
import type { PublicEvent } from "@/components/marketing/events-showcase";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  const { data: events } = await supabase
    .from("event_listing_v")
    .select("id, name, slug, banner_url, venue, city, event_date, end_date, status, available_stalls")
    .in("status", ["upcoming", "registration_open"])
    .order("event_date", { ascending: true })
    .limit(12);

  return <PublicHome events={(events ?? []) as PublicEvent[]} />;
}
