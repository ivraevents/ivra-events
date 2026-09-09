import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/misc";
import { StatusPill } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { EventEditForm } from "./event-edit-form";
import { StallTypesPanel } from "./stall-types-panel";
import { StallInventoryPanel } from "./stall-inventory-panel";
import { CategoriesPanel } from "./categories-panel";
import type { Category, Stall, StallType } from "@/types/domain";

export default async function AdminEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase.from("events").select("*").eq("id", id).single();
  if (!event) notFound();

  const [{ data: stallTypes }, { data: stalls }, { data: categories }, { data: eventCategories }] = await Promise.all([
    supabase.from("stall_types").select("*").eq("event_id", id),
    supabase.from("stalls").select("*, stall_type:stall_types(*)").eq("event_id", id).order("stall_number"),
    supabase.from("categories").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("event_categories").select("category_id, monopoly_scope").eq("event_id", id),
  ]);

  const scopes: Record<string, string> = Object.fromEntries((eventCategories ?? []).map((ec) => [ec.category_id, ec.monopoly_scope]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={event.name} actions={<StatusPill status={event.status} />} />

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="stall-types">Stall Types</TabsTrigger>
          <TabsTrigger value="inventory">Stall Inventory ({stalls?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="categories">Categories &amp; Monopoly</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card><CardContent>
            <EventEditForm
              event={event}
              stalls={(stalls as unknown as Stall[])?.map((s) => ({ id: s.id, stall_type_id: s.stall_type_id, status: s.status })) ?? []}
              stallTypes={(stallTypes as StallType[])?.map((t) => ({ id: t.id, size_type: t.size_type, monopoly_type: t.monopoly_type, price_paise: t.price_paise })) ?? []}
            />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="stall-types">
          <Card><CardContent>
            <StallTypesPanel eventId={id} stallTypes={(stallTypes as StallType[]) ?? []} />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="inventory">
          <StallInventoryPanel eventId={id} stalls={(stalls as unknown as Stall[]) ?? []} categories={(categories as Category[]) ?? []} />
        </TabsContent>

        <TabsContent value="categories">
          <Card><CardContent>
            <CategoriesPanel eventId={id} categories={(categories as Category[]) ?? []} scopes={scopes} />
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
