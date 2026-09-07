"use client";

import { useActionState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, FormField } from "@/components/ui/input";
import { createDiscount } from "@/lib/actions/admin-misc";
import { Plus } from "lucide-react";

const initial = { error: undefined as string | undefined };

export function NewDiscountDialog({ events, categories }: { events: { id: string; name: string }[]; categories: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(async (_p: typeof initial, fd: FormData) => {
    const res = await createDiscount(fd);
    return { error: res?.error };
  }, initial);

  return (
    <Dialog>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> New Discount</Button></DialogTrigger>
      <DialogContent title="New Discount">
        <form action={formAction} className="flex flex-col gap-4">
          {state.error && <p className="text-xs font-medium text-error-600">{state.error}</p>}
          <FormField label="Name" required><Input name="name" required /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Type">
              <select name="kind" className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm">
                <option value="percentage">Percentage</option><option value="fixed">Fixed (₹)</option>
              </select>
            </FormField>
            <FormField label="Value" required><Input name="value" type="number" required /></FormField>
          </div>
          <FormField label="Event (optional)">
            <select name="event_id" className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm">
              <option value="">Any event</option>
              {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </FormField>
          <FormField label="Category (optional)">
            <select name="category_id" className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm">
              <option value="">Any category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Max discount (₹, optional)"><Input name="max_discount" type="number" /></FormField>
            <FormField label="Per-user limit"><Input name="per_user_limit" type="number" defaultValue={1} /></FormField>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_stackable" /> Stackable with other discounts</label>
          <Button type="submit" loading={pending}>Create Discount</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
