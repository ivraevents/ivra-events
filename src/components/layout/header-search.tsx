"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

/**
 * The one search box for the whole app — lives in the sticky header so
 * it's reachable from anywhere, not just the home screen. Submitting
 * takes you to /events?q=... which does the actual filtering.
 */
export function HeaderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => (pathname === "/events" ? searchParams.get("q") ?? "" : ""));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/events?q=${encodeURIComponent(trimmed)}` : "/events");
  }

  return (
    <form onSubmit={onSubmit} className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-navy-700 bg-navy-900 px-3.5 py-2.5">
      <Search className="h-4 w-4 shrink-0 text-charcoal-300" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search events, cities or venues"
        className="w-full min-w-0 bg-transparent text-sm text-white placeholder:text-charcoal-300 focus:outline-none"
      />
    </form>
  );
}
