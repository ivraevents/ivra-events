import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatPaise, formatDate } from "@/lib/utils";
import { Ticket } from "lucide-react";
import { NewCouponDialog } from "./new-coupon-dialog";
import { ToggleActiveSwitch } from "../discounts/toggle-active";
import { DuplicateCouponButton } from "./duplicate-button";

export default async function AdminCouponsPage() {
  const supabase = await createClient();
  const [{ data: coupons }, { data: events }] = await Promise.all([
    supabase.from("coupons").select("*").order("created_at", { ascending: false }),
    supabase.from("events").select("id, name").order("event_date", { ascending: false }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Coupons" description="Code-based discounts vendors enter at checkout." actions={<NewCouponDialog events={events ?? []} />} />
      {!coupons || coupons.length === 0 ? (
        <EmptyState icon={Ticket} title="No coupons yet" />
      ) : (
        <Table>
          <THead><TR><TH>Code</TH><TH>Value</TH><TH>Usage Limit</TH><TH>Expires</TH><TH>Active</TH><TH /></TR></THead>
          <TBody>
            {coupons.map((c) => (
              <TR key={c.id}>
                <TD className="font-mono font-semibold text-navy-900">{c.code} {c.is_draft && <Badge tone="neutral" className="ml-2">Draft</Badge>}</TD>
                <TD>{c.kind === "percentage" ? `${c.value}%` : formatPaise(c.value)}</TD>
                <TD>{c.usage_limit ?? "Unlimited"}</TD>
                <TD>{c.ends_at ? formatDate(c.ends_at) : "No expiry"}</TD>
                <TD><ToggleActiveSwitch id={c.id} isActive={c.is_active} kind="coupon" /></TD>
                <TD><DuplicateCouponButton id={c.id} /></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
