import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { formatPaise, humanize } from "@/lib/utils";
import { MapPinned } from "lucide-react";
import type { Stall, StallType } from "@/types/domain";

/**
 * Cross-event "Stall Management" overview — the sidebar has linked here
 * (/admin/stalls) since the nav was first built, but this page never
 * existed, so it 404'd. Actual stall *editing* (adding a stall type,
 * setting its price, generating numbered stalls) already lives per-event
 * under Admin -> Events -> an event -> Stall Types / Stall Inventory
 * tabs — that's the right place for it, since pricing and inventory are
 * always specific to one market. This page is the missing overview: every
 * event's stall types and pricing at a glance, with a link into each
 * event's own tabs to actually manage them.
 */
export default async function AdminStallsPage() {
  const supabase = await createClient();

  const [{ data: events }, { data: stallTypes }, { data: stalls }] = await Promise.all([
    supabase.from("events").select("id, name, status").order("event_date", { ascending: false }),
    supabase.from("stall_types").select("*").order("price_paise"),
    supabase.from("stalls").select("id, event_id, stall_type_id, status"),
  ]);

  const stallsByType = new Map<string, Stall[]>();
  for (const s of (stalls ?? []) as Pick<Stall, "id" | "event_id" | "stall_type_id" | "status">[]) {
    const list = stallsByType.get(s.stall_type_id) ?? [];
    list.push(s as Stall);
    stallsByType.set(s.stall_type_id, list);
  }

  const typesByEvent = new Map<string, StallType[]>();
  for (const t of (stallTypes ?? []) as StallType[]) {
    const list = typesByEvent.get(t.event_id) ?? [];
    list.push(t);
    typesByEvent.set(t.event_id, list);
  }

  const eventsWithTypes = (events ?? []).filter((e) => (typesByEvent.get(e.id)?.length ?? 0) > 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Stall Management"
        description="Every event's stall types and pricing, at a glance. Add or edit stall types and pricing from an event's own page."
      />

      {eventsWithTypes.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title="No stall types configured yet"
          description="Open an event and add stall types (with pricing) from its Stall Types tab."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {eventsWithTypes.map((event) => {
            const types = typesByEvent.get(event.id) ?? [];
            return (
              <div key={event.id} className="rounded-[var(--radius-lg)] border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href={`/admin/events/${event.id}`}
                    className="font-display text-lg font-semibold text-navy-900 hover:text-royal-600"
                  >
                    {event.name}
                  </Link>
                  <Link href={`/admin/events/${event.id}`} className="text-xs font-medium text-royal-600">
                    Manage stalls →
                  </Link>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {types.map((t) => {
                    const inventory = stallsByType.get(t.id) ?? [];
                    const available = inventory.filter((s) => s.status === "available").length;
                    return (
                      <div key={t.id} className="rounded-[var(--radius-md)] border border-border p-3">
                        <div className="flex items-center gap-2">
                          <Badge tone={t.monopoly_type === "monopoly" ? "gold" : "neutral"}>{humanize(t.monopoly_type)}</Badge>
                          <Badge tone="info">{humanize(t.size_type)}</Badge>
                        </div>
                        <p className="mt-2 font-display text-lg font-semibold text-navy-900">{formatPaise(t.price_paise)}</p>
                        <p className="text-xs text-muted-foreground">
                          {inventory.length > 0
                            ? `${available} of ${inventory.length} stalls available`
                            : "No stalls generated yet"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
