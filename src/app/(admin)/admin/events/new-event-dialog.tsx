"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea, FormField } from "@/components/ui/input";
import { createEvent } from "@/lib/actions/admin-events";
import { Plus } from "lucide-react";
import type { EventStallMode } from "@/types/domain";

export function NewEventDialog() {
  const [pending, startTransition] = useTransition();
  const [stallMode, setStallMode] = useState<EventStallMode>("fixed");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> New Event</Button>
      </DialogTrigger>
      <DialogContent title="Create Event" description="Starts as a Draft — you can configure stalls before publishing.">
        <form
          action={(fd) => startTransition(async () => { await createEvent(fd); })}
          className="flex flex-col gap-4"
        >
          <FormField label="Event name" required><Input name="name" required /></FormField>
          <FormField label="Event date" required><Input type="date" name="event_date" required /></FormField>
          <FormField label="Venue"><Input name="venue" /></FormField>
          <FormField label="City"><Input name="city" /></FormField>
          <FormField label="Address"><Textarea name="address" /></FormField>
          <FormField label="Google Maps directions link" hint="Optional — you can add this later from the event's Details tab">
            <Input name="maps_url" type="url" placeholder="https://maps.app.goo.gl/..." />
          </FormField>
          <FormField label="Expected crowd" hint="Optional, e.g. 2000+ visitors">
            <Input name="expected_crowd" placeholder="e.g. 2000+ visitors" />
          </FormField>
          <FormField label="Description"><Textarea name="description" /></FormField>

          <FormField label="Stall Type" hint="Fixed = you'll set an exact number of half/full stalls after creating. Unfixed = one shared capacity, split between half/full as customers book.">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="stall_mode" value="fixed" checked={stallMode === "fixed"} onChange={() => setStallMode("fixed")} /> Fixed
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="stall_mode" value="unfixed" checked={stallMode === "unfixed"} onChange={() => setStallMode("unfixed")} /> Unfixed / Open
              </label>
            </div>
          </FormField>

          {stallMode === "unfixed" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="Total Stall Capacity" hint="Half-stall-equivalent units">
                <Input type="number" min={0} name="total_stall_capacity" placeholder="e.g. 16" />
              </FormField>
              <FormField label="Half Stall Price (₹)">
                <Input type="number" min={0} step="0.01" name="half_stall_price" placeholder="e.g. 1500" />
              </FormField>
              <FormField label="Full Stall Price (₹)">
                <Input type="number" min={0} step="0.01" name="full_stall_price" placeholder="e.g. 2800" />
              </FormField>
            </div>
          )}

          <Button type="submit" loading={pending}>Create Draft Event</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
