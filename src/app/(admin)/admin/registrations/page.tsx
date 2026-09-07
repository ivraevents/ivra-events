import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusPill } from "@/components/ui/badge";
import { formatDateTime, humanize } from "@/lib/utils";
import { ClipboardList } from "lucide-react";
import { RegistrationReviewActions } from "./review-actions";

export default async function AdminRegistrationsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("registrations")
    .select("id, type, status, created_at, profiles(full_name, email), events(name)")
    .order("created_at", { ascending: false });
  if (type) query = query.eq("type", type);

  const { data: registrations } = await query;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Registrations" description="Vendor, canopy and game/entertainment registrations across all events." />
      {!registrations || registrations.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No registrations yet" />
      ) : (
        <Table>
          <THead>
            <TR><TH>Applicant</TH><TH>Event</TH><TH>Type</TH><TH>Submitted</TH><TH>Status</TH><TH /></TR>
          </THead>
          <TBody>
            {registrations.map((r: any) => (
              <TR key={r.id}>
                <TD>
                  <p className="font-medium text-navy-900">{r.profiles?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{r.profiles?.email}</p>
                </TD>
                <TD>{r.events?.name ?? "—"}</TD>
                <TD>{humanize(r.type)}</TD>
                <TD>{formatDateTime(r.created_at)}</TD>
                <TD><StatusPill status={r.status} /></TD>
                <TD><RegistrationReviewActions registrationId={r.id} status={r.status} /></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
