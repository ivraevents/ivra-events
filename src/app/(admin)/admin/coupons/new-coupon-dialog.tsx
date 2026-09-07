"use client";

import { useActionState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, FormField } from "@/components/ui/input";
import { createCoupon } from "@/lib/actions/admin-misc";
import { Plus } from "lucide-react";

const initial = { error: undefined as string | undefined };

export function NewCouponDialog({ events }: { events: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(async (_p: typeof initial, fd: FormData) => {
    const res = await createCoupon(fd);
    return { error: res?.error };
  }, initial);

  return (
    <Dialog>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> New Coupon</Button></DialogTrigger>
      <DialogContent title="New Coupon">
        <form action={formAction} className="flex flex-col gap-4">
          {state.error && <p className="text-xs font-medium text-error-600">{state.error}</p>}
          <FormField label="Code" required hint="e.g. FLEA500"><Input name="code" required className="uppercase" /></FormField>
          <FormField label="Description"><Input name="description" /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Type">
              <select name="kind" className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm">
                <option value="fixed">Fixed (₹)</option><option value="percentage">Percentage</option>
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
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Usage limit (optional)"><Input name="usage_limit" type="number" /></FormField>
            <FormField label="Per-user limit"><Input name="per_user_limit" type="number" defaultValue={1} /></FormField>
          </div>
          <Button type="submit" loading={pending}>Create Coupon</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
