import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/misc";
import { BookingWizard } from "@/components/booking/booking-wizard";

export default async function BookingPage({ params }: { params: Promise<{ reservationId: string }> }) {
  const { reservationId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reservation } = await supabase
    .from("stall_reservations")
    .select("*, stalls(stall_number, event_id)")
    .eq("id", reservationId)
    .eq("user_id", user.id)
    .single();

  if (!reservation) notFound();

  if (reservation.status !== "active" || new Date(reservation.expires_at) < new Date()) {
    redirect(`/events`);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Book Stall ${reservation.stalls.stall_number}`} description="Complete registration, documents and payment to confirm your stall." />
      <BookingWizard
        reservationId={reservation.id}
        stallId={reservation.stall_id}
        stallNumber={reservation.stalls.stall_number}
        eventId={reservation.stalls.event_id}
        expiresAt={reservation.expires_at}
        defaultEmail={user.email ?? ""}
      />
    </div>
  );
}
