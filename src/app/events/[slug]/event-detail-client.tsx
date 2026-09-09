"use client";

import { useMemo, useState } from "react";
import { StallMap } from "@/components/events/stall-map";
import { StallFilters, type StallFilterState } from "@/components/events/stall-filters";
import { StallDetailDialog } from "@/components/events/stall-detail-dialog";
import { OpenStallBooking } from "@/components/events/open-stall-booking";
import type { Category, Stall } from "@/types/domain";

export function EventDetailClient({
  stalls,
  categories,
  openMode,
}: {
  stalls: Stall[];
  categories: Category[];
  /** Present only for "unfixed" events — swaps the stall map for a plain
   *  Half/Full picker since there are no pre-numbered stalls to click on. */
  openMode?: {
    eventId: string;
    halfPricePaise: number | null;
    fullPricePaise: number | null;
    halfAvailable: number;
    fullAvailable: number;
  };
}) {
  const [filters, setFilters] = useState<StallFilterState>({
    size: "all", monopoly: "all", category: "all", availability: "all",
  });
  const [selected, setSelected] = useState<Stall | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    return stalls.filter((s) => {
      if (filters.size !== "all" && s.stall_type?.size_type !== filters.size) return false;
      if (filters.monopoly !== "all" && s.stall_type?.monopoly_type !== filters.monopoly) return false;
      if (filters.category !== "all" && s.preset_category_id && s.preset_category_id !== filters.category) return false;
      if (filters.availability === "available" && s.status !== "available") return false;
      return true;
    });
  }, [stalls, filters]);

  if (openMode) {
    return (
      <OpenStallBooking
        eventId={openMode.eventId}
        categories={categories}
        halfPricePaise={openMode.halfPricePaise}
        fullPricePaise={openMode.fullPricePaise}
        halfAvailable={openMode.halfAvailable}
        fullAvailable={openMode.fullAvailable}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <StallFilters categories={categories} value={filters} onChange={setFilters} />
      <StallMap
        stalls={filtered}
        onSelect={(s) => {
          setSelected(s);
          setOpen(true);
        }}
      />
      <StallDetailDialog stall={selected} categories={categories} open={open} onOpenChange={setOpen} />
    </div>
  );
}
