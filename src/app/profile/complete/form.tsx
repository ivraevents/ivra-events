"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { User, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, FormField } from "@/components/ui/input";
import { completeProfile } from "./actions";

export function CompleteProfileForm({
  defaultName,
  defaultMobile,
  next,
}: {
  defaultName: string;
  defaultMobile: string;
  next: string;
}) {
  const [name, setName] = useState(defaultName);
  const [mobile, setMobile] = useState(defaultMobile);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    startTransition(async () => {
      const res = await completeProfile({ fullName: name, mobile });
      if (res?.error) {
        setError(res.error);
        return;
      }
      router.push(next);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && (
        <p className="rounded-[var(--radius-md)] bg-error-100 px-3 py-2 text-xs font-medium text-error-600">
          {error}
        </p>
      )}
      <FormField label="Full name" htmlFor="full_name" required>
        <Input
          id="full_name"
          required
          icon={User}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-12 rounded-[var(--radius-lg)]"
        />
      </FormField>
      <FormField label="Mobile number" htmlFor="mobile" required hint="10 digits, no country code">
        <Input
          id="mobile"
          required
          icon={Phone}
          inputMode="numeric"
          maxLength={10}
          value={mobile}
          onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
          className="h-12 rounded-[var(--radius-lg)]"
        />
      </FormField>
      <Button type="submit" size="lg" className="h-12 rounded-[var(--radius-lg)]" loading={pending}>
        Continue
      </Button>
    </form>
  );
}
