"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ArrowRight } from "lucide-react";
import { GoogleIcon } from "@/components/ui/google-icon";

export function LoginCard() {
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"choose" | "email">("choose");
  const [loading, setLoading] = useState<"google" | "otp" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  async function continueWithGoogle() {
    setLoading("google");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(null);
    }
  }

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading("otp");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setLoading(null);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(`/login/verify?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`);
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Welcome to IVRA Events</CardTitle>
        <CardDescription>Sign in to browse flea markets and manage your bookings.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && (
          <p className="rounded-[var(--radius-md)] bg-error-100 px-3 py-2 text-xs font-medium text-error-600">
            {error}
          </p>
        )}

        <Button
          variant="outline"
          size="lg"
          className="h-12 rounded-[var(--radius-lg)]"
          onClick={continueWithGoogle}
          loading={loading === "google"}
        >
          <GoogleIcon className="h-4 w-4" />
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or using other method
          <span className="h-px flex-1 bg-border" />
        </div>

        {mode === "choose" ? (
          <Button variant="primary" size="lg" className="h-12 rounded-[var(--radius-lg)]" onClick={() => setMode("email")}>
            <Mail className="h-4 w-4" />
            Continue with Email OTP
          </Button>
        ) : (
          <form onSubmit={sendOtp} className="flex flex-col gap-3">
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
            <Button type="submit" size="lg" className="h-12 rounded-[var(--radius-lg)]" loading={loading === "otp"}>
              Send 6-digit code
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground">
          No passwords. We&apos;ll email you a one-time code, or you can continue with Google.
        </p>
      </CardContent>
    </Card>
  );
}
