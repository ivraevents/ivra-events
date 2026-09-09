"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { userBottomNav, adminBottomNav } from "./nav-items";

/**
 * Fixed mobile tab bar. The user app's 5 tabs (Home / Offer / Booking /
 * Wallet / Support) use a "squircle" icon-button treatment — a soft glass
 * chip when idle, a green gradient with a glow when active — for a premium,
 * app-like feel. "Booking" (the item flagged `raised` in nav-items.ts)
 * renders as an oversized floating button that pokes above the bar, always
 * green, like a primary action. The bar itself uses a slightly lighter
 * "chrome" tone than the page body above it, so it reads as a distinct
 * footer layer instead of blending into the content. Hidden on large
 * screens where the sidebar already covers navigation.
 */
export function BottomNav({
  navKind,
  onMore,
}: {
  navKind: "user" | "admin";
  onMore: () => void;
}) {
  const items = navKind === "admin" ? adminBottomNav : userBottomNav;
  const pathname = usePathname();
  const dark = navKind === "user";

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t pb-[env(safe-area-inset-bottom)] lg:hidden",
        dark ? "border-[#242629] bg-[#101214]/95 backdrop-blur-xl" : "border-border bg-surface"
      )}
      aria-label="Primary"
    >
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;

        if (dark && item.raised) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium"
            >
              <span
                className={cn(
                  "-mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8ff5c4] via-[#43e59a] to-[#0e9f6e] text-[#08090a] ring-[3px] ring-[#101214] transition-transform active:scale-90",
                  "shadow-[0_6px_16px_rgba(67,229,154,0.3)]"
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className={cn("mt-0.5", active ? "font-semibold text-[#43e59a]" : "text-[#a2a5a8]")}>
                {item.label}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium"
          >
            {dark ? (
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-2xl border transition-all duration-200 active:scale-90",
                  active
                    ? "border-transparent bg-gradient-to-br from-[#8ff5c4] via-[#43e59a] to-[#0e9f6e] text-[#08090a] shadow-[0_3px_10px_rgba(67,229,154,0.25)] -translate-y-0.5"
                    : "border-white/5 bg-white/[0.04] text-[#a2a5a8]"
                )}
              >
                <Icon className="h-[15px] w-[15px]" />
              </span>
            ) : (
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                  active ? "bg-navy-900 text-white" : "text-charcoal-500"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
            )}
            <span
              className={cn(
                "transition-colors",
                active
                  ? dark
                    ? "font-semibold text-[#43e59a]"
                    : "font-semibold text-navy-900"
                  : dark
                    ? "text-[#a2a5a8]"
                    : "text-charcoal-500"
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
      {/* The user app's 5 tabs already cover everything — the header's menu
          button opens the same full drawer, so a second "More" tab here
          would just be a duplicate. Admin keeps it since its bottom nav is
          a short subset of a much longer sidebar. */}
      {navKind === "admin" && (
        <button
          type="button"
          onClick={onMore}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full text-charcoal-500">
            <MoreHorizontal className="h-4 w-4" />
          </span>
          <span className="text-charcoal-500">More</span>
        </button>
      )}
    </nav>
  );
}
