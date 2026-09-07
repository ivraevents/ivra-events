"use client";

import { useActionState } from "react";
import { Input, Textarea, FormField } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { sendUserNotification, broadcastNotification } from "@/lib/actions/admin-notifications";

type ActionState = { error?: string; ok?: boolean; count?: number };
const initial: ActionState = {};

export function SendToUserForm({ users }: { users: { id: string; full_name: string | null; email: string | null }[] }) {
  const [state, formAction, pending] = useActionState(async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
    return (await sendUserNotification(formData)) ?? initial;
  }, initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send to a User</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-3">
          {state?.error && <p className="rounded-[var(--radius-md)] bg-error-100 px-3 py-2 text-xs font-medium text-error-600">{state.error}</p>}
          {state?.ok && <p className="rounded-[var(--radius-md)] bg-success-100 px-3 py-2 text-xs font-medium text-success-600">Notification sent.</p>}
          <FormField label="Recipient" required>
            <select name="user_id" required className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm">
              <option value="">Select a user…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name ?? "Unnamed"} ({u.email})
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Title" required><Input name="title" required maxLength={120} /></FormField>
          <FormField label="Message"><Textarea name="body" /></FormField>
          <FormField label="Link path" hint="Optional in-app deep link, e.g. /bookings/abc123">
            <Input name="link_path" placeholder="/dashboard" />
          </FormField>
          <Button type="submit" loading={pending} className="self-start">Send Notification</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function BroadcastForm() {
  const [state, formAction, pending] = useActionState(async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
    return (await broadcastNotification(formData)) ?? initial;
  }, initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Broadcast</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-3">
          {state?.error && <p className="rounded-[var(--radius-md)] bg-error-100 px-3 py-2 text-xs font-medium text-error-600">{state.error}</p>}
          {state?.ok && (
            <p className="rounded-[var(--radius-md)] bg-success-100 px-3 py-2 text-xs font-medium text-success-600">
              Sent to {state.count} recipient{state.count === 1 ? "" : "s"}.
            </p>
          )}
          <FormField label="Audience" required>
            <select name="role_key" className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm">
              <option value="">Everyone</option>
              <option value="vendor">Vendors</option>
              <option value="canopy_provider">Canopy Providers</option>
              <option value="game_provider">Game / Entertainment Providers</option>
            </select>
          </FormField>
          <FormField label="Title" required><Input name="title" required maxLength={120} /></FormField>
          <FormField label="Message"><Textarea name="body" /></FormField>
          <FormField label="Link path"><Input name="link_path" placeholder="/events" /></FormField>
          <Button type="submit" variant="gold" loading={pending} className="self-start">Broadcast</Button>
        </form>
      </CardContent>
    </Card>
  );
}
