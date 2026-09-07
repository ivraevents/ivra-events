"use client";

import { cn } from "@/lib/utils";
import { formatPaise } from "@/lib/utils";
import type { Stall } from "@/types/domain";

const STATUS_COLOR: Record<string, string> = {
  available: "bg-success-100 border-success-600 text-success-600 hover:bg-success-600 hover:text-white cursor-pointer",
  reserved: "bg-warning-100 border-warning-600 text-warning-600 cursor-not-allowed",
  confirmed: "bg-info-100 border-info-600 text-info-600 cursor-not-allowed",
  occupied: "bg-charcoal-300/30 border-charcoal-500 text-charcoal-500 cursor-not-allowed",
  blocked: "bg-charcoal-300/10 border-dashed border-charcoal-300 text-charcoal-300 cursor-not-allowed",
};

const CELL = 88; // px per grid unit

export function StallMap({
  stalls,
  onSelect,
}: {
  stalls: Stall[];
  onSelect: (stall: Stall) => void;
}) {
  const hasLayout = stalls.some((s) => s.map_x || s.map_y);
  const maxX = Math.max(1, ...stalls.map((s) => s.map_x + s.map_w));
  const maxY = Math.max(1, ...stalls.map((s) => s.map_y + s.map_h));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4 text-xs">
        {Object.entries({
          available: "Available",
          reserved: "Reserved / On hold",
          confirmed: "Confirmed",
          occupied: "Occupied",
        }).map(([key, label]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={cn("h-3 w-3 rounded-sm border", STATUS_COLOR[key])} />
            {label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-surface-muted/40 p-4">
        {hasLayout ? (
          <div
            className="relative"
            style={{ width: maxX * CELL, height: maxY * CELL, minWidth: "100%" }}
          >
            {stalls.map((stall) => (
              <button
                key={stall.id}
                disabled={stall.status !== "available"}
                onClick={() => onSelect(stall)}
                style={{
                  left: stall.map_x * CELL,
                  top: stall.map_y * CELL,
                  width: stall.map_w * CELL - 8,
                  height: stall.map_h * CELL - 8,
                }}
                className={cn(
                  "absolute flex flex-col items-center justify-center rounded-[var(--radius-sm)] border-2 text-xs font-semibold transition-colors",
                  STATUS_COLOR[stall.status]
                )}
              >
                <span>{stall.stall_number}</span>
                <span className="text-[10px] font-normal opacity-80">
                  {formatPaise(stall.price_override_paise ?? stall.stall_type?.price_paise)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {stalls.map((stall) => (
              <button
                key={stall.id}
                disabled={stall.status !== "available"}
                onClick={() => onSelect(stall)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border-2 px-2 py-4 text-xs font-semibold transition-colors",
                  STATUS_COLOR[stall.status]
                )}
              >
                <span>{stall.stall_number}</span>
                <span className="text-[10px] font-normal opacity-80">
                  {formatPaise(stall.price_override_paise ?? stall.stall_type?.price_paise)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
