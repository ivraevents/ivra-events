"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, FormField } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function ProfileForm({ defaultName, defaultMobile, email }: { defaultName: string; defaultMobile: string; email: string }) {
  const [name, setName] = useState(defaultName);
  const [mobile, setMobile] = useState(defaultMobile);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("profiles").update({ full_name: name, mobile }).eq("id", user!.id);
      if (error) {
        setError(error.message);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="rounded-[var(--radius-md)] bg-error-100 px-3 py-2 text-xs font-medium text-error-600">{error}</p>}
      {saved && <p className="rounded-[var(--radius-md)] bg-success-100 px-3 py-2 text-xs font-medium text-success-600">Saved.</p>}
      <FormField label="Email">
        <Input value={email} disabled />
      </FormField>
      <FormField label="Full name" required>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <FormField label="Mobile" required>
        <Input value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))} maxLength={10} />
      </FormField>
      <Button onClick={save} loading={pending} className="self-start">Save changes</Button>
    </div>
  );
}
