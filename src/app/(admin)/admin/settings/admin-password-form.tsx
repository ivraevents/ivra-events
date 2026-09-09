"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input, FormField } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Lets the signed-in admin set (or change) the password used to sign in at
 * /admin-login. This is the "set it up from the admin panel" step: there's
 * no separate admin sign-up flow — you get in the first time the normal way
 * (email code or Google at /login, since that's the only option before a
 * password exists), then set a password here, and use /admin-login with
 * email + password from then on.
 */
export function AdminPasswordForm({ email }: { email: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setError(null);
    setSaved(false);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (error) {
      setError(error.message);
      return;
    }
    setPassword("");
    setConfirm("");
    setSaved(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Set or change the password for signing in at <span className="font-medium text-navy-900">/admin-login</span> as{" "}
        <span className="font-medium text-navy-900">{email}</span>. This is separate from the Google/email-code sign-in
        vendors and customers use.
      </p>
      {error && <p className="rounded-[var(--radius-md)] bg-error-100 px-3 py-2 text-xs font-medium text-error-600">{error}</p>}
      {saved && (
        <p className="rounded-[var(--radius-md)] bg-success-100 px-3 py-2 text-xs font-medium text-success-600">
          Password updated.
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="New password">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </FormField>
        <FormField label="Confirm password">
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
        </FormField>
      </div>
      <Button onClick={save} loading={pending} className="self-start">
        Save Password
      </Button>
    </div>
  );
}
