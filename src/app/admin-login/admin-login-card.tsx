"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, FormField } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Mail } from "lucide-react";

/**
 * Admin/staff sign-in — email + password only, deliberately separate from
 * the public /login page (which stays Google + email-code, for vendors and
 * customers). There's no Google button and no OTP option here on purpose.
 *
 * A password is set for an admin account from Admin -> Settings once
 * they're already signed in (via the public flow, the one time before they
 * have a password) — this page is just where that password gets used
 * afterwards.
 */
export function AdminLoginCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin";

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Admin Sign In</CardTitle>
        <CardDescription>For IVRA Events staff. Customers and vendors should use the regular sign-in page.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && (
          <p className="rounded-[var(--radius-md)] bg-error-100 px-3 py-2 text-xs font-medium text-error-600">
            {error}
          </p>
        )}
        <form onSubmit={signIn} className="flex flex-col gap-3">
          <FormField label="Email" required>
            <Input
              type="email"
              required
              autoFocus
              icon={Mail}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-[var(--radius-lg)]"
            />
          </FormField>
          <FormField label="Password" required>
            <Input
              type="password"
              required
              icon={Lock}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-[var(--radius-lg)]"
            />
          </FormField>
          <Button type="submit" size="lg" className="h-12 rounded-[var(--radius-lg)]" loading={loading}>
            Sign In
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
