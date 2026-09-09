"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { userBottomNav, adminBottomNav } from "./nav-items";

/**
 * Fixed mobile tab bar. The user app's 4 tabs (Home / Booking / Wallet /
 * Support) use a "squircle" icon-button treatment — a soft glass chip when
 * idle, a gold-to-orange gradient with a glow when active — for a premium,
 * app-like feel rather than a flat icon-and-label row. Hidden on large
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
        dark ? "border-navy-800 bg-navy-950/95 backdrop-blur-xl" : "border-border bg-surface"
      )}
      aria-label="Primary"
    >
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium"
          >
            {dark ? (
              <span
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-2xl border transition-all duration-200 active:scale-90",
                  active
                    ? "border-transparent bg-gradient-to-br from-gold-500 to-[#ff9135] text-navy-950 shadow-[0_6px_16px_rgba(201,152,47,0.4)] -translate-y-0.5"
                    : "border-white/5 bg-white/[0.04] text-cloud-300"
                )}
              >
                <Icon className="h-[19px] w-[19px]" />
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
                    ? "font-semibold text-gold-400"
                    : "font-semibold text-navy-900"
                  : dark
                    ? "text-cloud-300"
                    : "text-charcoal-500"
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
      {/* The user app's 4 tabs already cover everything — the header's
          hamburger opens the same full drawer, so a second "More" tab here
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
