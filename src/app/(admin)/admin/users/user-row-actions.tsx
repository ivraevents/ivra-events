"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { grantRole, revokeRole, toggleSuspendUser } from "@/lib/actions/admin-users";
import { humanize } from "@/lib/utils";
import { X } from "lucide-react";

const ASSIGNABLE_ROLES = [
  "vendor",
  "canopy_provider",
  "game_provider",
  "admin",
  "support_manager",
  "support_agent",
];

export function UserRoleBadges({ userId, roles }: { userId: string; roles: string[] }) {
  const [pending, startTransition] = useTransition();

  function remove(roleKey: string) {
    if (roleKey === "user") return;
    startTransition(async () => {
      await revokeRole(userId, roleKey);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {roles.map((r) => (
        <Badge key={r} tone={r === "admin" ? "navy" : r === "user" ? "neutral" : "gold"} className="pr-1">
          {humanize(r)}
          {r !== "user" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => remove(r)}
              className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 disabled:opacity-40"
              aria-label={`Remove ${r} role`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}
    </div>
  );
}

export function AddRoleControl({ userId, roles }: { userId: string; roles: string[] }) {
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  const available = ASSIGNABLE_ROLES.filter((r) => !roles.includes(r));

  function add(roleKey: string) {
    setValue(roleKey);
    startTransition(async () => {
      await grantRole(userId, roleKey);
      setValue("");
    });
  }

  if (available.length === 0) return <span className="text-xs text-muted-foreground">All roles assigned</span>;

  return (
    <Select value={value} onValueChange={add} disabled={pending}>
      <SelectTrigger className="h-8 w-44 text-xs">
        <SelectValue placeholder="+ Grant role" />
      </SelectTrigger>
      <SelectContent>
        {available.map((r) => (
          <SelectItem key={r} value={r}>
            {humanize(r)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SuspendToggle({ userId, isSuspended }: { userId: string; isSuspended: boolean }) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await toggleSuspendUser(userId, !isSuspended);
    });
  }

  return (
    <Button
      size="sm"
      variant={isSuspended ? "outline" : "destructive"}
      loading={pending}
      onClick={toggle}
    >
      {isSuspended ? "Reinstate" : "Suspend"}
    </Button>
  );
}
