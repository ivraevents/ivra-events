import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import { Users } from "lucide-react";
import { UserRoleBadges, AddRoleControl, SuspendToggle } from "./user-row-actions";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, mobile, is_suspended, profile_complete, created_at, user_roles(role_key)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,mobile.ilike.%${q}%`);
  }

  const { data: users } = await query;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        description="Every account in the system, with role assignments and suspension status."
      />
      <form className="max-w-sm">
        <Input name="q" defaultValue={q ?? ""} placeholder="Search by name, email or mobile…" />
      </form>
      {!users || users.length === 0 ? (
        <EmptyState icon={Users} title="No users found" />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>User</TH>
              <TH>Mobile</TH>
              <TH>Roles</TH>
              <TH>Joined</TH>
              <TH>Status</TH>
              <TH />
            </TR>
          </THead>
          <TBody>
            {users.map((u: any) => {
              const roles = (u.user_roles ?? []).map((r: any) => r.role_key);
              return (
                <TR key={u.id}>
                  <TD>
                    <p className="font-medium text-navy-900">{u.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                    {!u.profile_complete && (
                      <Badge tone="warning" className="mt-1">
                        Profile incomplete
                      </Badge>
                    )}
                  </TD>
                  <TD>{u.mobile ?? "—"}</TD>
                  <TD>
                    <div className="flex flex-col gap-2">
                      <UserRoleBadges userId={u.id} roles={roles} />
                      <AddRoleControl userId={u.id} roles={roles} />
                    </div>
                  </TD>
                  <TD>{formatDateTime(u.created_at)}</TD>
                  <TD>
                    {u.is_suspended ? (
                      <Badge tone="error">Suspended</Badge>
                    ) : (
                      <Badge tone="success">Active</Badge>
                    )}
                  </TD>
                  <TD>
                    <SuspendToggle userId={u.id} isSuspended={u.is_suspended} />
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </div>
  );
}
