import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusPill } from "@/components/ui/badge";
import { formatDateTime, humanize } from "@/lib/utils";
import { FolderLock } from "lucide-react";
import { DocumentReviewActions } from "./review-actions";

export default async function AdminDocumentsPage() {
  const supabase = await createClient();
  const { data: documents } = await supabase
    .from("documents")
    .select("id, kind, status, current_version, updated_at, profiles(full_name, email), document_versions(id, version, storage_path, status)")
    .in("status", ["pending", "reupload_requested"])
    .order("updated_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="KYC Approval"
        description="Aadhaar and PAN documents awaiting verification. Approving Aadhaar here verifies that customer for every future booking or registration — they won't be asked to upload it again."
      />
      {!documents || documents.length === 0 ? (
        <EmptyState icon={FolderLock} title="No documents pending review" />
      ) : (
        <Table>
          <THead><TR><TH>Applicant</TH><TH>Document</TH><TH>Version</TH><TH>Updated</TH><TH>Status</TH><TH /></TR></THead>
          <TBody>
            {documents.map((d: any) => {
              const latest = d.document_versions?.find((v: any) => v.version === d.current_version);
              return (
                <TR key={d.id}>
                  <TD>
                    <p className="font-medium text-navy-900">{d.profiles?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{d.profiles?.email}</p>
                  </TD>
                  <TD>{humanize(d.kind)}</TD>
                  <TD>v{d.current_version}</TD>
                  <TD>{formatDateTime(d.updated_at)}</TD>
                  <TD><StatusPill status={d.status} /></TD>
                  <TD>{latest && <DocumentReviewActions versionId={latest.id} />}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
      <p className="text-xs text-muted-foreground">
        Document files are private — open the applicant&apos;s registration to view the file via a short-lived signed link.
      </p>
    </div>
  );
}
