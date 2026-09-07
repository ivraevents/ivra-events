"use client";

import { useActionState } from "react";
import { Input, Textarea, FormField } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { submitCanopyRegistration } from "@/lib/actions/provider-registration";

const initialState = { error: undefined as string | undefined };

export function CanopyForm({ events }: { events: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(async (_prev: typeof initialState, formData: FormData) => {
    const res = await submitCanopyRegistration(formData);
    return res ?? initialState;
  }, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error && <p className="rounded-[var(--radius-md)] bg-error-100 px-3 py-2 text-xs font-medium text-error-600">{state.error}</p>}
      <FormField label="Event" required>
        <select name="event_id" required className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm">
          {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </FormField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Full name" required><Input name="name" required /></FormField>
        <FormField label="Mobile" required><Input name="mobile" required /></FormField>
        <FormField label="Email" required><Input type="email" name="email" required /></FormField>
        <FormField label="Business name"><Input name="business" /></FormField>
        <FormField label="Canopy type"><Input name="canopy_type" placeholder="e.g. 10x10 pop-up tent" /></FormField>
        <FormField label="Capacity"><Input name="capacity" type="number" /></FormField>
        <FormField label="Width (ft)"><Input name="width_ft" type="number" /></FormField>
        <FormField label="Length (ft)"><Input name="length_ft" type="number" /></FormField>
        <FormField label="Years of experience"><Input name="experience_years" type="number" /></FormField>
      </div>
      <FormField label="Description"><Textarea name="description" /></FormField>
      <Button type="submit" size="lg" loading={pending}>Submit Registration</Button>
    </form>
  );
}
