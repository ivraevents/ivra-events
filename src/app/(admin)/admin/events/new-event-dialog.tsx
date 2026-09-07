"use client";

import { useTransition } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea, FormField } from "@/components/ui/input";
import { createEvent } from "@/lib/actions/admin-events";
import { Plus } from "lucide-react";

export function NewEventDialog() {
  const [pending, startTransition] = useTransition();

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
          <FormField label="Description"><Textarea name="description" /></FormField>
          <Button type="submit" loading={pending}>Create Draft Event</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
