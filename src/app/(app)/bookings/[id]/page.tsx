import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDate, formatDateTime, formatPaise, humanize } from "@/lib/utils";
import { NegotiateButton, CancelBookingButton, RespondNegotiationButtons } from "@/components/booking/booking-actions";
import { Button } from "@/components/ui/button";
import { stallIsNegotiable } from "@/lib/data/stalls";

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: allocation } = await supabase
    .from("stall_allocations")
    .select("*, stalls(stall_number, stall_type_id, events(name, event_date, venue, city))")
    .eq("id", id)
    .single();

  if (!allocation) notFound();

  const [{ data: payments }, { data: negotiations }, { data: invoices }] = await Promise.all([
    supabase.from("payments").select("*").eq("allocation_id", id).order("created_at", { ascending: false }),
    supabase
      .from("negotiation_requests")
      .select("*, negotiation_offers(*)")
      .eq("allocation_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("invoices").select("*").eq("allocation_id", id),
  ]);

  const negotiable = await stallIsNegotiable(supabase, allocation.stall_id);
  const canCancel = ["draft", "reserved", "payment_pending"].includes(allocation.status);
  const canNegotiate = ["draft", "reserved", "payment_pending"].includes(allocation.status) && negotiable;
  const openNegotiation = negotiations?.find((n) => n.status === "countered");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Stall ${allocation.stalls.stall_number} — ${allocation.stalls.events.name}`}
        description={`${formatDate(allocation.stalls.events.event_date)} · ${allocation.stalls.events.venue}, ${allocation.stalls.events.city}`}
        actions={<StatusPill status={allocation.status} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-2.5">
            <Row label="Original Price" value={formatPaise(allocation.original_price_paise)} />
            {allocation.negotiated_price_paise != null && <Row label="Negotiated Price" value={formatPaise(allocation.negotiated_price_paise)} />}
            <Row label="Discount" value={formatPaise(allocation.discount_paise)} />
            <Row label="Coupon Discount" value={formatPaise(allocation.coupon_discount_paise)} />
            <Row label="Final Price" value={formatPaise(allocation.final_price_paise)} emphasis />
            <Row label="Required Advance" value={formatPaise(allocation.required_advance_paise)} />
            <Row label="Application Fee Applied" value={formatPaise(allocation.application_fee_applied_paise)} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <p className="font-display text-base font-semibold text-navy-900">Actions</p>
            {canNegotiate && (
              <NegotiateButton allocationId={allocation.id} originalPricePaise={allocation.original_price_paise} negotiable />
            )}
            {canCancel && <CancelBookingButton allocationId={allocation.id} />}
            {invoices && invoices.length > 0 && (
              <Button variant="outline" asChild>
                <Link href="/invoices">View Invoices</Link>
              </Button>
            )}
            <Button variant="ghost" asChild>
              <Link href={`/support?allocation=${allocation.id}`}>Get Support</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {openNegotiation && (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <p className="font-display text-base font-semibold text-navy-900">Negotiation — Admin Countered</p>
            {openNegotiation.negotiation_offers?.slice().reverse().map((o: any) => (
              <div key={o.id} className="rounded-[var(--radius-md)] bg-surface-muted p-3 text-sm">
                <p className="font-medium text-navy-900">{humanize(o.kind)} {o.price_paise ? `· ${formatPaise(o.price_paise)}` : ""}</p>
                {o.message && <p className="text-muted-foreground">{o.message}</p>}
              </div>
            ))}
            <RespondNegotiationButtons negotiationId={openNegotiation.id} />
          </CardContent>
        </Card>
      )}

      {payments && payments.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-lg font-semibold text-navy-900">Payment History</h2>
          <Table>
            <THead>
              <TR><TH>Date</TH><TH>Purpose</TH><TH>Amount</TH><TH>UTR</TH><TH>Status</TH></TR>
            </THead>
            <TBody>
              {payments.map((p) => (
                <TR key={p.id}>
                  <TD>{formatDateTime(p.created_at)}</TD>
                  <TD>{humanize(p.purpose)}</TD>
                  <TD>{formatPaise(p.amount_paise)}</TD>
                  <TD>{p.utr_reference ?? "—"}</TD>
                  <TD><StatusPill status={p.status} /></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={`flex items-center justify-between text-sm ${emphasis ? "font-semibold text-navy-900" : "text-charcoal-700"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
