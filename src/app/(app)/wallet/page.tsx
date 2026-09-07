import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { formatPaise } from "@/lib/utils";
import { ArrowDownCircle, ArrowUpCircle, Clock, XCircle, ChevronRight, Plus, History } from "lucide-react";

/**
 * Wallet home — its own dedicated section (not a chip on the dashboard):
 * available balance, lifetime added/used, pending & rejected fund
 * requests, then the two things you'd actually come here to do —
 * Add Funds and Fund History.
 */
export default async function WalletPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: balanceRow }, { data: txns }, { count: pendingCount }, { count: rejectedCount }] = await Promise.all([
    supabase.from("wallet_balance_v").select("balance_paise").eq("user_id", user!.id).maybeSingle(),
    supabase.from("wallet_transactions").select("kind, amount_paise").eq("user_id", user!.id),
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .eq("purpose", "wallet_topup")
      .eq("status", "pending_verification"),
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .eq("purpose", "wallet_topup")
      .eq("status", "failed"),
  ]);

  const balance = balanceRow?.balance_paise ?? 0;
  const totalAdded = (txns ?? [])
    .filter((t) => t.kind === "credit")
    .reduce((sum, t) => sum + t.amount_paise, 0);
  const totalUsed = (txns ?? [])
    .filter((t) => t.kind === "debit")
    .reduce((sum, t) => sum + t.amount_paise, 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-navy-900">Wallet</h1>

      <div className="rounded-[var(--radius-lg)] bg-navy-900 px-5 py-7 text-center text-white sm:px-7">
        <p className="text-xs font-medium uppercase tracking-wide text-cloud-300">Available Fund</p>
        <p className="mt-2 font-display text-4xl font-semibold text-gold-400">{formatPaise(balance)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Total Fund Added" value={formatPaise(totalAdded)} icon={ArrowDownCircle} tone="success" />
        <KpiCard label="Total Fund Used" value={formatPaise(totalUsed)} icon={ArrowUpCircle} tone="navy" />
      </div>

      <div className="flex flex-col divide-y divide-border overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
        <Link href="/payments" className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-surface-muted">
          <span className="flex items-center gap-2.5 text-sm font-medium text-royal-600">
            <Clock className="h-4 w-4" /> Pending Fund Requests
          </span>
          <span className="flex items-center gap-2.5">
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-warning-100 px-1.5 text-xs font-semibold text-warning-600">
              {pendingCount ?? 0}
            </span>
            <ChevronRight className="h-4 w-4 text-charcoal-400" />
          </span>
        </Link>
        <Link href="/payments" className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-surface-muted">
          <span className="flex items-center gap-2.5 text-sm font-medium text-royal-600">
            <XCircle className="h-4 w-4" /> Rejected Fund Requests
          </span>
          <span className="flex items-center gap-2.5">
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-error-100 px-1.5 text-xs font-semibold text-error-600">
              {rejectedCount ?? 0}
            </span>
            <ChevronRight className="h-4 w-4 text-charcoal-400" />
          </span>
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <Button asChild variant="gold" size="lg">
          <Link href="/wallet/add">
            <Plus className="h-4 w-4" /> Add Funds
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/wallet/history">
            <History className="h-4 w-4" /> Fund History
          </Link>
        </Button>
      </div>
    </div>
  );
}
