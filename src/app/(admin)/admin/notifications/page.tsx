import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, humanize } from "@/lib/utils";
import { Bell } from "lucide-react";
import { SendToUserForm, BroadcastForm } from "./composer";

export default async function AdminNotificationsPage() {
  const supabase = await createClient();

  const [{ data: notifications }, { data: users }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, type, title, body, is_read, created_at, profiles(full_name, email)")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("profiles").select("id, full_name, email").order("full_name").limit(500),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notifications"
        description="Oversight of every in-app notification sent, plus tools to notify users directly."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SendToUserForm users={users ?? []} />
        <BroadcastForm />
      </div>

      {!notifications || notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications have been sent yet" />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Recipient</TH>
              <TH>Type</TH>
              <TH>Title</TH>
              <TH>Sent</TH>
              <TH>Read</TH>
            </TR>
          </THead>
          <TBody>
            {notifications.map((n: any) => (
              <TR key={n.id}>
                <TD>
                  <p className="font-medium text-navy-900">{n.profiles?.full_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{n.profiles?.email}</p>
                </TD>
                <TD><Badge tone="neutral">{humanize(n.type)}</Badge></TD>
                <TD>
                  <p className="text-sm text-navy-900">{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
                </TD>
                <TD>{formatDateTime(n.created_at)}</TD>
                <TD>{n.is_read ? <Badge tone="success">Read</Badge> : <Badge tone="warning">Unread</Badge>}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
