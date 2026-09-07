import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusPill } from "@/components/ui/badge";
import { formatDateTime, formatPaise, humanize } from "@/lib/utils";
import { Wallet } from "lucide-react";

export default async function PaymentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: payments } = await supabase
    .from("payments")
    .select("id, purpose, amount_paise, method, status, utr_reference, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Payments" description="Every payment you've submitted, and its verification status." />
      {!payments || payments.length === 0 ? (
        <EmptyState icon={Wallet} title="No payments yet" />
      ) : (
        <Table>
          <THead>
            <TR><TH>Date</TH><TH>Purpose</TH><TH>Method</TH><TH>UTR</TH><TH>Amount</TH><TH>Status</TH></TR>
          </THead>
          <TBody>
            {payments.map((p) => (
              <TR key={p.id}>
                <TD>{formatDateTime(p.created_at)}</TD>
                <TD>{humanize(p.purpose)}</TD>
                <TD className="uppercase">{p.method}</TD>
                <TD>{p.utr_reference ?? "—"}</TD>
                <TD>{formatPaise(p.amount_paise)}</TD>
                <TD><StatusPill status={p.status} /></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
