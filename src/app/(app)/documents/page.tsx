import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusPill } from "@/components/ui/badge";
import { formatDateTime, humanize } from "@/lib/utils";
import { FileText } from "lucide-react";

export default async function DocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: documents } = await supabase
    .from("documents")
    .select("id, kind, status, current_version, updated_at, registration_id")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Documents" description="Aadhaar and PAN documents you've uploaded for verification." />
      {!documents || documents.length === 0 ? (
        <EmptyState icon={FileText} title="No documents uploaded" description="Documents are uploaded during the stall booking flow." />
      ) : (
        <Table>
          <THead>
            <TR><TH>Document</TH><TH>Version</TH><TH>Last Updated</TH><TH>Status</TH></TR>
          </THead>
          <TBody>
            {documents.map((d) => (
              <TR key={d.id}>
                <TD className="font-medium text-navy-900">{humanize(d.kind)}</TD>
                <TD>v{d.current_version}</TD>
                <TD>{formatDateTime(d.updated_at)}</TD>
                <TD><StatusPill status={d.status} /></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <p className="text-xs text-muted-foreground">
        Documents are stored privately and are only ever visible to you and authorized administrators.
      </p>
    </div>
  );
}
