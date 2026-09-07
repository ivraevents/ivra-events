import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDateTime, formatPaise } from "@/lib/utils";
import { Receipt, Download } from "lucide-react";

export default async function InvoicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, invoice_type, total_paise, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Invoices" description="GST and non-GST invoices generated for your payments." />
      {!invoices || invoices.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices yet" description="Invoices are generated once a payment is verified." />
      ) : (
        <Table>
          <THead>
            <TR><TH>Invoice #</TH><TH>Type</TH><TH>Date</TH><TH>Total</TH><TH /></TR>
          </THead>
          <TBody>
            {invoices.map((i) => (
              <TR key={i.id}>
                <TD className="font-medium text-navy-900">{i.invoice_number}</TD>
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
  );
}
