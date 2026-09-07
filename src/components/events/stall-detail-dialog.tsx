"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge, StatusPill } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { formatPaise, humanize } from "@/lib/utils";
import type { Category, Stall } from "@/types/domain";
import { Ruler, Tag, ShieldCheck, Handshake } from "lucide-react";

export function StallDetailDialog({
  stall,
  categories,
  open,
  onOpenChange,
}: {
  stall: Stall | null;
  categories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [categoryId, setCategoryId] = useState<string>(stall?.preset_category_id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  if (!stall) return null;

  const price = stall.price_override_paise ?? stall.stall_type?.price_paise ?? 0;
  const negotiable = stall.is_negotiable_override ?? stall.stall_type?.is_negotiable ?? false;
  const requiresCategory = !stall.preset_category_id;

  async function reserve() {
    if (requiresCategory && !categoryId) {
      setError("Please select a category for this stall.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();

    // Browsing is public, but reserving a stall needs an account — send
    // signed-out visitors to sign in and bring them straight back here
    // instead of showing a dead-end error.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    const { data, error } = await supabase.rpc("reserve_stall", {
      p_stall_id: stall!.id,
      p_category_id: requiresCategory ? categoryId : stall!.preset_category_id,
    });
    setLoading(false);
    if (error) {
      const map: Record<string, string> = {
        STALL_NOT_AVAILABLE: "Someone just booked this stall. Please pick another.",
        MONOPOLY_UNAVAILABLE: "This category is already booked as a monopoly for this event.",
        MAX_STALLS_REACHED: "You've reached the maximum number of stalls allowed for this event.",
        MULTIPLE_STALLS_NOT_ALLOWED: "Only one stall per user is allowed for this event.",
        AUTH_REQUIRED: "Please sign in to reserve a stall.",
      };
      setError(map[error.message] ?? error.message);
      return;
    }
    router.push(`/booking/${data.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`Stall ${stall.stall_number}`}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={stall.status} />
            <Badge tone={stall.stall_type?.monopoly_type === "monopoly" ? "gold" : "neutral"}>
              {humanize(stall.stall_type?.monopoly_type)}
            </Badge>
            <Badge tone="info">{humanize(stall.stall_type?.size_type)}</Badge>
            {negotiable && <Badge tone="success"><Handshake className="h-3 w-3" /> Negotiable</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-charcoal-500">
              <Ruler className="h-4 w-4" /> {stall.stall_type?.width_ft ?? "—"} × {stall.stall_type?.length_ft ?? "—"} ft
            </div>
            <div className="flex items-center gap-2 text-charcoal-500">
              <ShieldCheck className="h-4 w-4" /> Advance {stall.stall_type?.advance_kind === "percentage" ? `${stall.stall_type.advance_value}%` : formatPaise(stall.stall_type?.advance_value)}
            </div>
          </div>

          <div className="rounded-[var(--radius-md)] bg-surface-muted p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Stall Price</p>
            <p className="font-display text-2xl font-semibold text-navy-900">{formatPaise(price)}</p>
          </div>

          {requiresCategory && (
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-charcoal-700">
                <Tag className="h-4 w-4" /> Product category
              </p>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {stall.stall_type?.monopoly_type === "monopoly" && (
                <p className="mt-1.5 text-xs text-warning-600">
                  Monopoly stall — once booked, no other vendor can book this category for this event.
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="rounded-[var(--radius-md)] bg-error-100 px-3 py-2 text-xs font-medium text-error-600">{error}</p>
          )}

          <Button
            size="lg"
            variant="gold"
            onClick={reserve}
            loading={loading}
            disabled={stall.status !== "available"}
          >
            Reserve This Stall
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Reserving holds this stall for you temporarily while you complete registration.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
