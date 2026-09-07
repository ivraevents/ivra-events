import { Card, CardContent } from "@/components/ui/card";
import { formatPaise } from "@/lib/utils";
import type { PriceBreakdown } from "@/types/domain";

function Row({ label, value, emphasis, subtract }: { label: string; value: string; emphasis?: boolean; subtract?: boolean }) {
  return (
    <div className={`flex items-center justify-between text-sm ${emphasis ? "font-semibold text-navy-900" : "text-charcoal-700"}`}>
      <span>{label}</span>
      <span>{subtract && value !== "—" ? `− ${value}` : value}</span>
    </div>
  );
}

export function PriceBreakdownCard({ breakdown }: { breakdown: PriceBreakdown }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2.5">
        <Row label="Original Stall Price" value={formatPaise(breakdown.original_price_paise)} />
        {breakdown.negotiated_price_paise != null && (
          <Row label="Negotiated Price" value={formatPaise(breakdown.negotiated_price_paise)} />
        )}
        {breakdown.discount_paise > 0 && (
          <Row label="Discount" value={formatPaise(breakdown.discount_paise)} subtract />
        )}
        {breakdown.coupon_discount_paise > 0 && (
          <Row label={`Coupon Discount${breakdown.coupon.code ? ` (${breakdown.coupon.code})` : ""}`} value={formatPaise(breakdown.coupon_discount_paise)} subtract />
        )}
        <div className="my-1 h-px bg-border" />
        <Row label="Final Stall Price" value={formatPaise(breakdown.final_price_paise)} emphasis />
        <Row label="Required Stall Advance" value={formatPaise(breakdown.required_advance_paise)} />
        {breakdown.application_fee_applied_paise > 0 && (
          <Row label="Application Advance Credited (₹99)" value={formatPaise(breakdown.application_fee_applied_paise)} subtract />
        )}
        <div className="my-1 h-px bg-border" />
        <Row label="Additional Advance Required Now" value={formatPaise(breakdown.additional_advance_required_paise)} emphasis />
        <Row label="Balance After Advance" value={formatPaise(breakdown.balance_after_advance_paise)} />
      </CardContent>
    </Card>
  );
}
