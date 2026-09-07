import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { formatDateTime, formatPaise, humanize } from "@/lib/utils";
import { Handshake } from "lucide-react";
import { NegotiationRespondActions } from "./respond-actions";

export default async function AdminNegotiationsPage() {
  const supabase = await createClient();
  const { data: negotiations } = await supabase
    .from("negotiation_requests")
    .select("*, negotiation_offers(*), stall_allocations(profiles(full_name, email), stalls(stall_number, events(name)))")
    .in("status", ["pending", "countered"])
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Negotiations" description="Respond to vendor price negotiation requests." />
      {!negotiations || negotiations.length === 0 ? (
        <EmptyState icon={Handshake} title="No open negotiations" />
      ) : (
        <div className="flex flex-col gap-4">
          {negotiations.map((n: any) => {
            const latestOffer = n.negotiation_offers?.slice().sort((a: any, b: any) => b.created_at.localeCompare(a.created_at))[0];
            return (
              <Card key={n.id}>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-navy-900">
                        {n.stall_allocations?.profiles?.full_name} · {n.stall_allocations?.stalls?.events?.name} · Stall {n.stall_allocations?.stalls?.stall_number}
                      </p>
                      <p className="text-xs text-muted-foreground">Original price: {formatPaise(n.original_price_paise)}</p>
                    </div>
                    <StatusPill status={n.status} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {n.negotiation_offers?.slice().reverse().map((o: any) => (
                      <p key={o.id} className="text-sm text-charcoal-700">
                        <span className="font-medium">{humanize(o.kind)}</span>
                        {o.price_paise ? ` · ${formatPaise(o.price_paise)}` : ""}
                        {o.message ? ` — "${o.message}"` : ""}
                        <span className="ml-2 text-xs text-charcoal-300">{formatDateTime(o.created_at)}</span>
                      </p>
                    ))}
                  </div>
                  {n.status === "pending" && (
                    <NegotiationRespondActions negotiationId={n.id} suggestedPrice={(latestOffer?.price_paise ?? 0) / 100} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
