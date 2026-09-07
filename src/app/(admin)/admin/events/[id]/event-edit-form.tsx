"use client";

import { useActionState } from "react";
import { Input, Textarea, FormField, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateEvent } from "@/lib/actions/admin-events";
import type { EventStatus } from "@/types/domain";

const STATUSES: EventStatus[] = ["draft", "upcoming", "registration_open", "registration_closed", "ongoing", "completed", "cancelled"];

const initial = { error: undefined as string | undefined, ok: undefined as boolean | undefined };

export function EventEditForm({ event }: { event: any }) {
  const [state, formAction, pending] = useActionState(async (_prev: typeof initial, fd: FormData) => {
    const res = await updateEvent(event.id, fd);
    return { error: res?.error, ok: res?.ok };
  }, initial);

  return (
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
        <div className="flex items-center gap-4 pt-6">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="allow_multiple_stalls" defaultChecked={event.allow_multiple_stalls} /> Allow multiple stalls</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="negotiation_enabled" defaultChecked={event.negotiation_enabled} /> Negotiation enabled</label>
        </div>
      </div>
      <FormField label="Address"><Textarea name="address" defaultValue={event.address ?? ""} /></FormField>
      <FormField label="Description"><Textarea name="description" defaultValue={event.description ?? ""} /></FormField>
      <FormField label="Terms & Conditions"><Textarea name="terms_and_conditions" defaultValue={event.terms_and_conditions ?? ""} rows={5} /></FormField>
      <Button type="submit" loading={pending} className="self-start">Save Event</Button>
    </form>
  );
}
