"use client";

import { useTransition } from "react";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { setEventCategoryMonopoly } from "@/lib/actions/admin-events";
import type { Category } from "@/types/domain";

export function CategoriesPanel({
  eventId, categories, scopes,
}: { eventId: string; categories: Category[]; scopes: Record<string, string> }) {
  const [pending, startTransition] = useTransition();

  return (
    <Table>
      <THead>
        <TR><TH>Category</TH><TH>Monopoly Scope</TH></TR>
      </THead>
      <TBody>
        {categories.map((c) => (
          <TR key={c.id}>
            <TD className="font-medium text-navy-900">{c.name}</TD>
            <TD>
              <select
                defaultValue={scopes[c.id] ?? "event_category"}
                disabled={pending}
                onChange={(e) => startTransition(async () => { await setEventCategoryMonopoly(eventId, c.id, e.target.value); })}
                className="h-9 rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm"
              >
                <option value="event_category">Per-category exclusivity</option>
                <option value="event_wide">Event-wide exclusivity</option>
                <option value="none">Monopoly disabled</option>
              </select>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
