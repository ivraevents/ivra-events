"use client";

import { useMemo, useState } from "react";
import { StallMap } from "@/components/events/stall-map";
import { StallFilters, type StallFilterState } from "@/components/events/stall-filters";
import { StallDetailDialog } from "@/components/events/stall-detail-dialog";
import type { Category, Stall } from "@/types/domain";

export function EventDetailClient({ stalls, categories }: { stalls: Stall[]; categories: Category[] }) {
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
