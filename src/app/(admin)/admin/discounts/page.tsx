import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatPaise, humanize } from "@/lib/utils";
import { BadgePercent } from "lucide-react";
import { NewDiscountDialog } from "./new-discount-dialog";
import { ToggleActiveSwitch } from "./toggle-active";

export default async function AdminDiscountsPage() {
  const supabase = await createClient();
  const [{ data: discounts }, { data: events }, { data: categories }] = await Promise.all([
    supabase.from("discounts").select("*").order("created_at", { ascending: false }),
    supabase.from("events").select("id, name").order("event_date", { ascending: false }),
    supabase.from("categories").select("id, name").eq("is_active", true),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Discounts" description="Automatic discounts applied based on event, category, size or user." actions={<NewDiscountDialog events={events ?? []} categories={categories ?? []} />} />
      {!discounts || discounts.length === 0 ? (
        <EmptyState icon={BadgePercent} title="No discounts configured" />
      ) : (
        <Table>
          <THead><TR><TH>Name</TH><TH>Value</TH><TH>Scope</TH><TH>Stackable</TH><TH>Active</TH></TR></THead>
          <TBody>
            {discounts.map((d) => (
              <TR key={d.id}>
                <TD className="font-medium text-navy-900">{d.name}</TD>
                <TD>{d.kind === "percentage" ? `${d.value}%` : formatPaise(d.value)}</TD>
                <TD className="text-xs text-muted-foreground">
                  {d.event_id ? "Event" : ""} {d.category_id ? "Category" : ""} {d.size_type ? humanize(d.size_type) : ""} {d.monopoly_type ? humanize(d.monopoly_type) : ""}
                  {!d.event_id && !d.category_id && !d.size_type && !d.monopoly_type && "All bookings"}
                </TD>
                <TD><Badge tone={d.is_stackable ? "success" : "neutral"}>{d.is_stackable ? "Stackable" : "Exclusive"}</Badge></TD>
                <TD><ToggleActiveSwitch id={d.id} isActive={d.is_active} kind="discount" /></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
