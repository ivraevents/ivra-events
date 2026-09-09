import type { EventStallMode, Stall, StallType } from "@/types/domain";

export interface CapacitySummary {
  totalCapacity: number;
  halfAvailable: number;
  halfBooked: number;
  fullAvailable: number;
  fullBooked: number;
  /** Fixed mode: halfAvailable + fullAvailable (independent pools).
   *  Unfixed mode: remaining shared capacity units. */
  overallRemaining: number;
}

/**
 * One function, used by both the admin Details tab and (for the public
 * event page) the customer-facing availability line, so "how much is
 * left" is always computed the same way in exactly one place.
 *
 * Fixed mode: half and full are independent pools — this just tallies
 * the pre-generated `stalls` rows by size/status, same as the app has
 * always done.
 *
 * Unfixed mode: there's one shared pool of capacity units (a Full stall
 * costs `fullStallUnitRatio` units, a Half stall costs 1). "Booked" tallies
 * are real counts of stalls actually minted so far (see
 * reserve_open_stall); "available" for each size is how many MORE of
 * that size could still fit in whatever capacity remains — booking one
 * size necessarily changes what's left for the other, which is the
 * nature of a shared pool, not a bug.
 */
export function computeCapacitySummary({
  stallMode,
  totalStallCapacity,
  fullStallUnitRatio,
  stalls,
  stallTypes,
}: {
  stallMode: EventStallMode;
  totalStallCapacity: number | null;
  fullStallUnitRatio: number;
  stalls: Pick<Stall, "id" | "stall_type_id" | "status">[];
  stallTypes: Pick<StallType, "id" | "size_type">[];
}): CapacitySummary {
  const sizeById = new Map(stallTypes.map((t) => [t.id, t.size_type]));

  if (stallMode === "fixed") {
    let halfTotal = 0, halfAvail = 0, fullTotal = 0, fullAvail = 0;
    for (const s of stalls) {
      const size = sizeById.get(s.stall_type_id);
      if (size === "half") {
        halfTotal++;
        if (s.status === "available") halfAvail++;
      } else if (size === "full") {
        fullTotal++;
        if (s.status === "available") fullAvail++;
      }
    }
    return {
      totalCapacity: halfTotal + fullTotal,
      halfAvailable: halfAvail,
      halfBooked: halfTotal - halfAvail,
      fullAvailable: fullAvail,
      fullBooked: fullTotal - fullAvail,
      overallRemaining: halfAvail + fullAvail,
    };
  }

  // unfixed
  let halfBooked = 0, fullBooked = 0, consumedUnits = 0;
  for (const s of stalls) {
    if (s.status === "available") continue;
    const size = sizeById.get(s.stall_type_id);
    if (size === "half") {
      halfBooked++;
      consumedUnits += 1;
    } else if (size === "full") {
      fullBooked++;
      consumedUnits += fullStallUnitRatio;
    }
  }
  const total = totalStallCapacity ?? 0;
  const remaining = Math.max(total - consumedUnits, 0);
  return {
    totalCapacity: total,
    halfAvailable: Math.floor(remaining / 1),
    halfBooked,
    fullAvailable: Math.floor(remaining / fullStallUnitRatio),
    fullBooked,
    overallRemaining: remaining,
  };
}
