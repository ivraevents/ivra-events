import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { Bell } from "lucide-react";
import Link from "next/link";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Notifications" description="Everything IVRA Events wants to tell you, in one place." />
      {!notifications || notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet" />
      ) : (
        <Card className="divide-y divide-border">
          {notifications.map((n) => (
            <Link
              key={n.id}
              href={n.link_path ?? "#"}
              className={`block p-4 hover:bg-surface-muted ${!n.is_read ? "bg-info-100/30" : ""}`}
            >
              <p className="text-sm font-semibold text-navy-900">{n.title}</p>
              {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
              <p className="mt-1 text-xs text-charcoal-300">{formatDateTime(n.created_at)}</p>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
