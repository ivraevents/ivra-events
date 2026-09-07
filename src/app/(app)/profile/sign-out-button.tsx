"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

/**
 * Sign out now lives here, at the bottom of the Profile page — Profile is
 * its own bottom-nav tab, so there's no separate header dropdown any more
 * and this is the one place sign-out lives.
 */
export function SignOutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={loading}
      className="flex items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-white/10 bg-navy-900 px-4 py-3.5 text-sm font-semibold text-error-600 transition-colors hover:bg-white/5 disabled:opacity-60"
    >
      <LogOut className="h-4 w-4" /> {loading ? "Signing out…" : "Logout"}
    </button>
  );
}
