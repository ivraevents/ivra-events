import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { humanize } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-cloud-100 text-charcoal-700",
        success: "bg-success-100 text-success-600",
        warning: "bg-warning-100 text-warning-600",
        error: "bg-error-100 text-error-600",
        info: "bg-info-100 text-info-600",
        gold: "bg-gold-300/40 text-gold-600",
        navy: "bg-navy-900 text-white",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

// ------------------------------------------------------------------
// StatusPill — maps every domain status enum to a consistent tone
// ------------------------------------------------------------------
const STATUS_TONE: Record<string, VariantProps<typeof badgeVariants>["tone"]> = {
  // stall / booking
  available: "success",
  reserved: "warning",
  confirmed: "info",
  occupied: "navy",
  blocked: "neutral",
  draft: "neutral",
  payment_pending: "warning",
  pending_approval: "warning",
  balance_pending: "warning",
  fully_paid: "success",
  cancelled: "error",
  completed: "navy",
  // registration / document
  submitted: "info",
  under_review: "warning",
  approved: "success",
  rejected: "error",
  changes_requested: "warning",
  pending: "warning",
  reupload_requested: "warning",
  // events
  upcoming: "info",
  registration_open: "success",
  registration_closed: "warning",
  ongoing: "gold",
  // payments
  initiated: "neutral",
  pending_verification: "warning",
  verified: "success",
  failed: "error",
  reversed: "error",
  // negotiation
  countered: "warning",
  expired: "neutral",
  withdrawn: "neutral",
  // tickets
  open: "info",
  in_progress: "warning",
  waiting_for_user: "warning",
  resolved: "success",
  closed: "neutral",
};

export function StatusPill({ status, className }: { status: string | null | undefined; className?: string }) {
  if (!status) return <Badge tone="neutral" className={className}>—</Badge>;
  return (
    <Badge tone={STATUS_TONE[status] ?? "neutral"} className={className}>
      {humanize(status)}
    </Badge>
  );
}
