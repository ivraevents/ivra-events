import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDateTime, formatPaise, humanize } from "@/lib/utils";
import { Wallet } from "lucide-react";
import { AddFundForm } from "./add-fund-form";

interface UpiDetails {
  vpa?: string;
  payee_name?: string;
}

export default async function WalletPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: balanceRow }, { data: transactions }, { data: publicSettings }] = await Promise.all([
    supabase.from("wallet_balance_v").select("balance_paise").eq("user_id", user!.id).maybeSingle(),
    supabase
      .from("wallet_transactions")
      .select("id, kind, amount_paise, reason, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase.rpc("get_public_settings"),
  ]);

  const balance = balanceRow?.balance_paise ?? 0;
  const upiDetails = (publicSettings as { upi_details?: UpiDetails } | null)?.upi_details ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Wallet" description="Add funds once, then spend them on any stall booking without a new UPI transfer each time." />

      <Card className="bg-navy-900 text-white">
        <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-cloud-300">Wallet Balance</p>
            <p className="mt-1 font-display text-3xl font-semibold text-gold-400">{formatPaise(balance)}</p>
          </div>
          <AddFundForm upiDetails={upiDetails} />
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold text-navy-900">Transaction History</h2>
        {!transactions || transactions.length === 0 ? (
          <EmptyState icon={Wallet} title="No wallet activity yet" description="Add funds to see them appear here once verified." />
        ) : (
          <Table>
            <THead>
              <TR><TH>Date</TH><TH>Type</TH><TH>Reason</TH><TH>Amount</TH></TR>
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
    </div>
  );
}
