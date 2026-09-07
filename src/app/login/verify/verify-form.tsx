"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";

const RESEND_COOLDOWN_SECONDS = 30;
const MAX_ATTEMPTS = 5;

export function VerifyOtpForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") ?? "";
  const next = searchParams.get("next") ?? "/dashboard";

  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  function handleChange(i: number, val: string) {
    if (!/^\d*$/.test(val)) return;
    const next = [...digits];
    next[i] = val.slice(-1);
    setDigits(next);
    if (val && i < 5) inputsRef.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length !== 6) {
      setError("Enter the full 6-digit code.");
      return;
    }
    if (attempts >= MAX_ATTEMPTS) {
      setError("Too many attempts. Please request a new code.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    setLoading(false);
    if (error) {
      setAttempts((a) => a + 1);
      setError(error.message || "Invalid or expired code.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function resend() {
    if (cooldown > 0) return;
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) {
      setError(error.message);
      return;
    }
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setAttempts(0);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <Logo size={40} />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Enter your code</CardTitle>
          <CardDescription>We sent a 6-digit code to {email || "your email"}.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <p className="rounded-[var(--radius-md)] bg-error-100 px-3 py-2 text-xs font-medium text-error-600">
              {error}
            </p>
          )}
          <form onSubmit={verify} className="flex flex-col gap-4">
            <div className="flex justify-between gap-2">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { inputsRef.current[i] = el; }}
                  value={d}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  inputMode="numeric"
                  maxLength={1}
                  className="h-14 w-11 rounded-[var(--radius-lg)] border border-border bg-surface text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-royal-500"
                />
              ))}
            </div>
            <Button
              type="submit"
              size="lg"
              className="h-12 rounded-[var(--radius-lg)]"
              loading={loading}
              disabled={attempts >= MAX_ATTEMPTS}
            >
              Verify &amp; continue
            </Button>
          </form>
          <button
            type="button"
            onClick={resend}
            disabled={cooldown > 0}
            className="text-xs font-medium text-royal-600 disabled:text-charcoal-300"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
