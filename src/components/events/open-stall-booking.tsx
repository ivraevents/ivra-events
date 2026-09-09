"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPaise } from "@/lib/utils";
import type { Category, StallSize } from "@/types/domain";
import { LayoutGrid, LayoutPanelTop } from "lucide-react";

/**
 * The booking UI for an "unfixed / open capacity" event — there's no
 * pre-numbered stall map to click on (see reserve_open_stall in
 * 0030_open_stall_capacity.sql), so instead the customer just picks Half
 * or Full and, if there's room, gets handed a stall the same RPC mints
 * for them on the spot. Everything after that (the /booking/[id] wizard,
 * payment, negotiation) is identical to the fixed-event flow.
 */
export function OpenStallBooking({
  eventId,
  categories,
  halfPricePaise,
  fullPricePaise,
  halfAvailable,
  fullAvailable,
}: {
  eventId: string;
  categories: Category[];
  halfPricePaise: number | null;
  fullPricePaise: number | null;
  halfAvailable: number;
  fullAvailable: number;
}) {
  const [size, setSize] = useState<StallSize | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const options: { size: StallSize; label: string; price: number | null; available: number; icon: typeof LayoutGrid }[] = [
    { size: "half", label: "Half Stall", price: halfPricePaise, available: halfAvailable, icon: LayoutPanelTop },
    { size: "full", label: "Full Stall", price: fullPricePaise, available: fullAvailable, icon: LayoutGrid },
  ];

  async function reserve() {
    if (!size) return;
    if (!categoryId) {
      setError("Please select a product category.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    const { data, error } = await supabase.rpc("reserve_open_stall", {
      p_event_id: eventId,
      p_size_type: size,
      p_category_id: categoryId,
    });
    setLoading(false);
    if (error) {
      const map: Record<string, string> = {
        CAPACITY_UNAVAILABLE: "That size just sold out. Try the other size or check back later.",
        STALL_TYPE_NOT_CONFIGURED: "This stall size isn't open for booking yet.",
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
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {options.map((opt) => {
          const disabled = opt.price == null || opt.available <= 0;
          const Icon = opt.icon;
          return (
            <Card
              key={opt.size}
              className={`cursor-pointer transition-shadow ${size === opt.size ? "ring-2 ring-royal-500" : ""} ${disabled ? "opacity-50" : "hover:shadow-[var(--shadow-elevated)]"}`}
              onClick={() => !disabled && setSize(opt.size)}
            >
              <CardContent className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-navy-900">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-display text-base font-semibold text-navy-900">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {opt.price == null ? "Not available for this event" : disabled ? "Sold out" : `${opt.available} available`}
                    </p>
                  </div>
                </div>
                <p className="font-display text-lg font-semibold text-gold-600">{opt.price != null ? formatPaise(opt.price) : "—"}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {size && (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm font-medium text-charcoal-700">Product category for your {size} stall</p>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="rounded-[var(--radius-md)] bg-error-100 px-3 py-2 text-xs font-medium text-error-600">{error}</p>}
            <Button size="lg" variant="gold" onClick={reserve} loading={loading}>
              Reserve {size === "half" ? "Half" : "Full"} Stall
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Reserving holds your stall temporarily while you complete registration.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
