"use client";

import { useState, useTransition } from "react";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusPill } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, FormField } from "@/components/ui/input";
import { updateStallAction } from "@/lib/actions/admin-events";
import { formatPaise, humanize } from "@/lib/utils";
import type { Category, Stall } from "@/types/domain";
import { Settings2 } from "lucide-react";

export function StallInventoryPanel({ eventId, stalls, categories }: { eventId: string; stalls: Stall[]; categories: Category[] }) {
  return (
    <Table>
      <THead>
        <TR><TH>Stall #</TH><TH>Type</TH><TH>Price</TH><TH>Category</TH><TH>Position</TH><TH>Status</TH><TH /></TR>
      </THead>
      <TBody>
        {stalls.map((s) => (
          <StallRow key={s.id} stall={s} eventId={eventId} categories={categories} />
        ))}
        {stalls.length === 0 && (
          <TR><TD colSpan={7} className="text-center text-sm text-muted-foreground py-8">No stalls yet — generate some from a stall type above.</TD></TR>
        )}
      </TBody>
    </Table>
  );
}

function StallRow({ stall, eventId, categories }: { stall: Stall; eventId: string; categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <TR>
      <TD className="font-medium text-navy-900">{stall.stall_number}</TD>
      <TD>{humanize(stall.stall_type?.size_type)} · {humanize(stall.stall_type?.monopoly_type)}</TD>
      <TD>{formatPaise(stall.price_override_paise ?? stall.stall_type?.price_paise)}</TD>
      <TD>{categories.find((c) => c.id === stall.preset_category_id)?.name ?? "Any"}</TD>
      <TD>({stall.map_x}, {stall.map_y})</TD>
      <TD><StatusPill status={stall.status} /></TD>
      <TD>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost"><Settings2 className="h-4 w-4" /></Button>
          </DialogTrigger>
          <DialogContent title={`Stall ${stall.stall_number}`}>
            <form
              action={(fd) => startTransition(async () => {
                await updateStallAction(stall.id, eventId, fd);
                setOpen(false);
              })}
              className="flex flex-col gap-4"
            >
              <FormField label="Status">
                <select name="status" defaultValue={stall.status} className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm">
                  <option value="available">Available</option>
                  <option value="blocked">Blocked</option>
                  <option value="occupied">Occupied</option>
                </select>
              </FormField>
              <FormField label="Preset category (optional)">
                <select name="preset_category_id" defaultValue={stall.preset_category_id ?? ""} className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm">
                  <option value="">Any category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Map X"><Input name="map_x" type="number" defaultValue={stall.map_x} /></FormField>
                <FormField label="Map Y"><Input name="map_y" type="number" defaultValue={stall.map_y} /></FormField>
                <FormField label="Width (units)"><Input name="map_w" type="number" defaultValue={stall.map_w} /></FormField>
                <FormField label="Height (units)"><Input name="map_h" type="number" defaultValue={stall.map_h} /></FormField>
              </div>
              <Button type="submit" loading={pending}>Save</Button>
            </form>
          </DialogContent>
        </Dialog>
      </TD>
    </TR>
  );
}
