import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusPill } from "@/components/ui/badge";
import { formatDateTime, formatPaise, humanize } from "@/lib/utils";
import { CreditCard, CheckCircle2 } from "lucide-react";
import { VerifyPaymentButton } from "./verify-button";
import { ApproveBookingButton } from "./approve-button";

export default async function AdminPaymentsPage() {
  const supabase = await createClient();
  const [{ data: payments }, { data: pendingApprovals }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, purpose, amount_paise, method, status, utr_reference, created_at, profiles(full_name, email)")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("stall_allocations")
      .select("id, final_price_paise, required_advance_paise, profiles(full_name, email), stalls(stall_number, events(name))")
      .eq("status", "pending_approval"),
  ]);

  const pending = (payments ?? []).filter((p) => p.status === "pending_verification");
  const others = (payments ?? []).filter((p) => p.status !== "pending_verification");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Payments" description="Verify submitted payments against your bank/UPI statement." />

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold text-navy-900">Pending Verification ({pending.length})</h2>
        {pending.length === 0 ? (
          <EmptyState icon={CreditCard} title="Nothing to verify right now" />
        ) : (
          <Table>
            <THead><TR><TH>User</TH><TH>Purpose</TH><TH>Amount</TH><TH>UTR</TH><TH>Date</TH><TH /></TR></THead>
            <TBody>
              {pending.map((p: any) => (
                <TR key={p.id}>
                  <TD>
                    <p className="font-medium text-navy-900">{p.profiles?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{p.profiles?.email}</p>
                  </TD>
                  <TD>{humanize(p.purpose)}</TD>
                  <TD>{formatPaise(p.amount_paise)}</TD>
                  <TD>{p.utr_reference ?? "—"}</TD>
                  <TD>{formatDateTime(p.created_at)}</TD>
                  <TD><VerifyPaymentButton paymentId={p.id} /></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold text-navy-900">Awaiting Booking Approval ({pendingApprovals?.length ?? 0})</h2>
        {!pendingApprovals || pendingApprovals.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="No bookings awaiting approval" />
        ) : (
          <Table>
            <THead><TR><TH>User</TH><TH>Event / Stall</TH><TH>Advance Required</TH><TH /></TR></THead>
            <TBody>
              {pendingApprovals.map((a: any) => (
                <TR key={a.id}>
                  <TD>{a.profiles?.full_name}</TD>
                  <TD>{a.stalls?.events?.name} · {a.stalls?.stall_number}</TD>
                  <TD>{formatPaise(a.required_advance_paise)}</TD>
                  <TD><ApproveBookingButton allocationId={a.id} /></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold text-navy-900">Recent History</h2>
        <Table>
          <THead><TR><TH>User</TH><TH>Purpose</TH><TH>Amount</TH><TH>Status</TH><TH>Date</TH></TR></THead>
          <TBody>
            {others.slice(0, 50).map((p: any) => (
              <TR key={p.id}>
                <TD>{p.profiles?.full_name}</TD>
                <TD>{humanize(p.purpose)}</TD>
                <TD>{formatPaise(p.amount_paise)}</TD>
                <TD><StatusPill status={p.status} /></TD>
                <TD>{formatDateTime(p.created_at)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
