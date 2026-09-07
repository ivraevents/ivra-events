"use client";

import { useActionState, useState } from "react";
import { Input, FormField } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createStallType, bulkGenerateStallsAction } from "@/lib/actions/admin-events";
import { formatPaise, humanize } from "@/lib/utils";
import type { StallType } from "@/types/domain";

const initial = { error: undefined as string | undefined };

export function StallTypesPanel({ eventId, stallTypes }: { eventId: string; stallTypes: StallType[] }) {
  const [state, formAction, pending] = useActionState(async (_p: typeof initial, fd: FormData) => {
    const res = await createStallType(eventId, fd);
    return { error: res?.error };
  }, initial);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stallTypes.map((t) => (
          <div key={t.id} className="rounded-[var(--radius-md)] border border-border p-4">
            <div className="flex items-center gap-2">
              <Badge tone={t.monopoly_type === "monopoly" ? "gold" : "neutral"}>{humanize(t.monopoly_type)}</Badge>
              <Badge tone="info">{humanize(t.size_type)}</Badge>
            </div>
            <p className="mt-2 font-display text-xl font-semibold text-navy-900">{formatPaise(t.price_paise)}</p>
            <p className="text-xs text-muted-foreground">
              {t.width_ft}×{t.length_ft} ft · Advance {t.advance_kind === "percentage" ? `${t.advance_value}%` : formatPaise(t.advance_value)}
              {t.is_negotiable && " · Negotiable"}
            </p>
            <BulkGenerateInline eventId={eventId} stallTypeId={t.id} />
          </div>
        ))}
        {stallTypes.length === 0 && <p className="text-sm text-muted-foreground">No stall types configured yet — add one below.</p>}
      </div>

      <form action={formAction} className="grid grid-cols-2 gap-3 rounded-[var(--radius-md)] border border-dashed border-border p-4 sm:grid-cols-4">
        {state.error && <p className="col-span-full text-xs font-medium text-error-600">{state.error}</p>}
        <FormField label="Size" required>
          <select name="size_type" required className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm">
            <option value="half">Half</option><option value="full">Full</option>
          </select>
        </FormField>
        <FormField label="Monopoly" required>
          <select name="monopoly_type" required className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm">
            <option value="non_monopoly">Non-Monopoly</option><option value="monopoly">Monopoly</option>
          </select>
        </FormField>
        <FormField label="Width (ft)"><Input name="width_ft" type="number" step="0.1" /></FormField>
        <FormField label="Length (ft)"><Input name="length_ft" type="number" step="0.1" /></FormField>
        <FormField label="Price (₹)" required><Input name="price" type="number" required /></FormField>
        <FormField label="Advance type">
          <select name="advance_kind" className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm">
            <option value="percentage">Percentage</option><option value="fixed">Fixed (₹)</option><option value="full">Full amount</option>
          </select>
        </FormField>
        <FormField label="Advance value" required><Input name="advance_value" type="number" required defaultValue={20} /></FormField>
        <FormField label="Min price for negotiation (₹)"><Input name="min_price" type="number" /></FormField>
        <label className="col-span-2 flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="is_negotiable" /> Negotiable</label>
        <div className="col-span-full">
          <Button type="submit" loading={pending}>Add Stall Type</Button>
        </div>
      </form>
    </div>
  );
}

function BulkGenerateInline({ eventId, stallTypeId }: { eventId: string; stallTypeId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (_p: typeof initial, fd: FormData) => {
    const res = await bulkGenerateStallsAction(eventId, fd);
    if (!res?.error) setOpen(false);
    return { error: res?.error };
  }, initial);

  if (!open) {
    return (
      <Button size="sm" variant="outline" className="mt-3" onClick={() => setOpen(true)}>Generate Stalls</Button>
    );
  }

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2">
      <input type="hidden" name="stall_type_id" value={stallTypeId} />
      {state.error && <p className="text-xs font-medium text-error-600">{state.error}</p>}
      <div className="flex gap-2">
        <Input name="prefix" placeholder="Prefix e.g. A" className="w-20" defaultValue="A" />
        <Input name="start" type="number" placeholder="Start #" className="w-24" defaultValue={1} />
        <Input name="count" type="number" placeholder="Count" className="w-24" defaultValue={10} />
      </div>
      <Button size="sm" type="submit" loading={pending}>Generate</Button>
    </form>
  );
}
