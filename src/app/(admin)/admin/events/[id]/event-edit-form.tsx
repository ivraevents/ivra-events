"use client";

import { useActionState, useMemo, useState } from "react";
import { Input, Textarea, FormField } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateEvent } from "@/lib/actions/admin-events";
import { EventBannerUpload } from "./event-banner-upload";
import { computeCapacitySummary } from "@/lib/stall-capacity";
import { formatPaise } from "@/lib/utils";
import type { EventStallMode, EventStatus, Stall, StallType } from "@/types/domain";

const STATUSES: EventStatus[] = ["draft", "upcoming", "registration_open", "registration_closed", "ongoing", "completed", "cancelled"];

const initial = { error: undefined as string | undefined, ok: undefined as boolean | undefined };

export function EventEditForm({
  event,
  stalls,
  stallTypes,
}: {
  event: any;
  stalls: Pick<Stall, "id" | "stall_type_id" | "status">[];
  stallTypes: Pick<StallType, "id" | "size_type" | "monopoly_type" | "price_paise">[];
}) {
  const [state, formAction, pending] = useActionState(async (_prev: typeof initial, fd: FormData) => {
    const res = await updateEvent(event.id, fd);
    return { error: res?.error, ok: res?.ok };
  }, initial);

  const [stallMode, setStallMode] = useState<EventStallMode>(event.stall_mode ?? "fixed");

  const summary = useMemo(
    () =>
      computeCapacitySummary({
        stallMode,
        totalStallCapacity: event.total_stall_capacity,
        fullStallUnitRatio: event.full_stall_unit_ratio ?? 2,
        stalls,
        stallTypes,
      }),
    [stallMode, event.total_stall_capacity, event.full_stall_unit_ratio, stalls, stallTypes]
  );

  const currentHalfPrice = stallTypes.find((t) => t.size_type === "half" && t.monopoly_type === "non_monopoly")?.price_paise;
  const currentFullPrice = stallTypes.find((t) => t.size_type === "full" && t.monopoly_type === "non_monopoly")?.price_paise;

  return (
    <div className="flex flex-col gap-6">
      <EventBannerUpload eventId={event.id} bannerUrl={event.banner_url ?? null} />

      <div className="rounded-[var(--radius-md)] border border-border p-4">
        <p className="text-sm font-semibold text-navy-900">Stall Capacity</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Total Capacity" value={summary.totalCapacity} />
          <Stat label="Overall Remaining" value={summary.overallRemaining} />
          <Stat label="Half Available" value={summary.halfAvailable} />
          <Stat label="Half Booked" value={summary.halfBooked} />
          <Stat label="Full Available" value={summary.fullAvailable} />
          <Stat label="Full Booked" value={summary.fullBooked} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {stallMode === "unfixed"
            ? "Updates automatically as bookings and cancellations come in — nothing to type here. Half/Full availability share one capacity pool, so booking one changes what's left for the other."
            : "Updates automatically as bookings come in. Add or change the exact number of half/full stalls from the Stall Types and Stall Inventory tabs."}
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        {state.error && <p className="rounded-[var(--radius-md)] bg-error-100 px-3 py-2 text-xs font-medium text-error-600">{state.error}</p>}
        {state.ok && <p className="rounded-[var(--radius-md)] bg-success-100 px-3 py-2 text-xs font-medium text-success-600">Saved.</p>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Event name" required><Input name="name" defaultValue={event.name} required /></FormField>
          <FormField label="Event date" required><Input type="date" name="event_date" defaultValue={event.event_date} required /></FormField>
          <FormField label="Venue"><Input name="venue" defaultValue={event.venue ?? ""} /></FormField>
          <FormField label="City"><Input name="city" defaultValue={event.city ?? ""} /></FormField>
          <FormField label="Max stalls per user"><Input type="number" name="max_stalls_per_user" defaultValue={event.max_stalls_per_user} /></FormField>
          <FormField label="Reservation hold (minutes)"><Input type="number" name="reservation_minutes" defaultValue={event.reservation_minutes} /></FormField>
          <FormField label="Status">
            <select name="status" defaultValue={event.status} className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm">
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </FormField>
          <FormField label="Expected crowd" hint="Free text, e.g. 2000+ visitors">
            <Input name="expected_crowd" defaultValue={event.expected_crowd ?? ""} placeholder="e.g. 2000+ visitors" />
          </FormField>
          <div className="flex items-center gap-4 pt-6">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="allow_multiple_stalls" defaultChecked={event.allow_multiple_stalls} /> Allow multiple stalls</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="negotiation_enabled" defaultChecked={event.negotiation_enabled} /> Negotiation enabled</label>
          </div>
        </div>

        <FormField label="Address"><Textarea name="address" defaultValue={event.address ?? ""} /></FormField>
        <FormField label="Google Maps directions link" hint="Open the venue in Google Maps, tap Share, and paste the link here">
          <Input name="maps_url" type="url" defaultValue={event.maps_url ?? ""} placeholder="https://maps.app.goo.gl/..." />
        </FormField>
        <FormField label="Description"><Textarea name="description" defaultValue={event.description ?? ""} /></FormField>

        <div className="rounded-[var(--radius-md)] border border-border p-4">
          <FormField label="Stall Type" hint="Fixed = you set an exact number of half/full stalls (Stall Types tab). Unfixed = you set one total capacity, and customers pick half or full as it's available.">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="stall_mode" value="fixed" checked={stallMode === "fixed"} onChange={() => setStallMode("fixed")} /> Fixed
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="stall_mode" value="unfixed" checked={stallMode === "unfixed"} onChange={() => setStallMode("unfixed")} /> Unfixed / Open
              </label>
            </div>
          </FormField>

          {stallMode === "unfixed" ? (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="Total Stall Capacity" hint="In half-stall-equivalent units — a full stall counts as 2 by default">
                <Input type="number" min={0} name="total_stall_capacity" defaultValue={event.total_stall_capacity ?? ""} placeholder="e.g. 16" />
              </FormField>
              <FormField label="Half Stall Price (₹)">
                <Input type="number" min={0} step="0.01" name="half_stall_price" defaultValue={currentHalfPrice != null ? currentHalfPrice / 100 : ""} placeholder="e.g. 1500" />
              </FormField>
              <FormField label="Full Stall Price (₹)">
                <Input type="number" min={0} step="0.01" name="full_stall_price" defaultValue={currentFullPrice != null ? currentFullPrice / 100 : ""} placeholder="e.g. 2800" />
              </FormField>
              {(currentHalfPrice != null || currentFullPrice != null) && (
                <p className="col-span-full text-xs text-muted-foreground">
                  Current: Half {currentHalfPrice != null ? formatPaise(currentHalfPrice) : "not set"} · Full {currentFullPrice != null ? formatPaise(currentFullPrice) : "not set"}.
                  Changing a price only affects new bookings — anyone already booked keeps the price they booked at.
                </p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Configure the exact number of half/full stalls and their pricing from the Stall Types and Stall Inventory tabs below.
            </p>
          )}
        </div>

        <FormField label="Terms & Conditions"><Textarea name="terms_and_conditions" defaultValue={event.terms_and_conditions ?? ""} rows={5} /></FormField>
        <Button type="submit" loading={pending} className="self-start">Save Event</Button>
      </form>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-sm)] bg-surface-muted px-3 py-2">
      <p className="font-display text-lg font-semibold text-navy-900">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
