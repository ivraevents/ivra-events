import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusPill } from "@/components/ui/badge";
import { formatDateTime, humanize } from "@/lib/utils";
import { ClipboardList } from "lucide-react";

export default async function RegistrationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: registrations } = await supabase
    .from("registrations")
    .select("id, type, status, created_at, rejection_reason, events(name)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My Registrations" description="Vendor, canopy and game/entertainment registrations you've submitted." />
      {!registrations || registrations.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No registrations yet" description="Registrations are created automatically when you book a stall, or via the Provide menu." />
      ) : (
        <Table>
          <THead>
            <TR><TH>Event</TH><TH>Type</TH><TH>Submitted</TH><TH>Status</TH><TH>Notes</TH></TR>
          </THead>
          <TBody>
            {registrations.map((r: any) => (
              <TR key={r.id}>
                <TD className="font-medium text-navy-900">{r.events?.name ?? "—"}</TD>
                <TD>{humanize(r.type)}</TD>
                <TD>{formatDateTime(r.created_at)}</TD>
                <TD><StatusPill status={r.status} /></TD>
                <TD className="text-error-600">{r.rejection_reason ?? ""}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
