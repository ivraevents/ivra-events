import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDateTime, formatPaise, humanize } from "@/lib/utils";
import { History } from "lucide-react";

export default async function WalletHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: transactions } = await supabase
    .from("wallet_transactions")
    .select("id, kind, amount_paise, reason, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Fund History" description="Every credit and debit against your wallet." />
      {!transactions || transactions.length === 0 ? (
        <EmptyState icon={History} title="No wallet activity yet" description="Add funds to see them appear here once verified." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>Type</TH>
              <TH>Reason</TH>
              <TH>Amount</TH>
            </TR>
          </THead>
          <TBody>
            {transactions.map((t) => (
              <TR key={t.id}>
                <TD>{formatDateTime(t.created_at)}</TD>
                <TD>{humanize(t.kind)}</TD>
                <TD>{t.reason}</TD>
                <TD className={t.kind === "credit" ? "font-medium text-success-600" : "font-medium text-error-600"}>
                  {t.kind === "credit" ? "+" : "−"}
                  {formatPaise(t.amount_paise)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
