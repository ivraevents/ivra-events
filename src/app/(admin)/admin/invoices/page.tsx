import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDateTime, formatPaise, humanize } from "@/lib/utils";
import { Receipt, Download } from "lucide-react";
import Link from "next/link";
import { GenerateInvoiceDialog } from "./generate-invoice-dialog";

export default async function AdminInvoicesPage() {
  const supabase = await createClient();
  const [{ data: invoices }, { data: verifiedPayments }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, invoice_type, total_paise, created_at, profiles(full_name, email)")
      .order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select("id, user_id, purpose, amount_paise, allocation_id, profiles(full_name, email)")
      .eq("status", "verified")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Invoices" description="Generate and manage GST / non-GST invoices." />

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold text-navy-900">Verified Payments Awaiting Invoice</h2>
        <Table>
          <THead><TR><TH>User</TH><TH>Purpose</TH><TH>Amount</TH><TH /></TR></THead>
          <TBody>
            {(verifiedPayments ?? []).map((p: any) => (
              <TR key={p.id}>
                <TD>{p.profiles?.full_name}</TD>
                <TD>{humanize(p.purpose)}</TD>
                <TD>{formatPaise(p.amount_paise)}</TD>
                <TD>
                  <GenerateInvoiceDialog userId={p.user_id} paymentId={p.id} allocationId={p.allocation_id} defaultAmount={p.amount_paise / 100} defaultDescription={humanize(p.purpose)} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold text-navy-900">All Invoices</h2>
        {!invoices || invoices.length === 0 ? (
          <EmptyState icon={Receipt} title="No invoices generated yet" />
        ) : (
          <Table>
            <THead><TR><TH>Invoice #</TH><TH>User</TH><TH>Type</TH><TH>Date</TH><TH>Total</TH><TH /></TR></THead>
            <TBody>
              {invoices.map((i: any) => (
                <TR key={i.id}>
                  <TD className="font-medium text-navy-900">{i.invoice_number}</TD>
                  <TD>{i.profiles?.full_name}</TD>
                  <TD className="uppercase">{i.invoice_type.replace("_", " ")}</TD>
                  <TD>{formatDateTime(i.created_at)}</TD>
                  <TD>{formatPaise(i.total_paise)}</TD>
                  <TD>
                    <Link href={`/api/invoices/${i.id}/pdf`} className="flex items-center gap-1 text-sm font-medium text-royal-600">
                      <Download className="h-3.5 w-3.5" /> PDF
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </div>
  );
}
