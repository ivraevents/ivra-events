"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { getUserNav, adminNav } from "./nav-items";
import { createClient } from "@/lib/supabase/client";
import { NotificationBell } from "./notification-bell";
import { BottomNav } from "./bottom-nav";
import { InstallAppButton } from "./install-app-button";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import { LanguageSwitcher } from "@/components/marketing/language-switcher";

export function AppShell({
  navKind,
  badge,
  userLabel,
  userEmail,
  hideProvideSection,
  children,
}: {
  navKind: "user" | "admin";
  badge?: string;
  userLabel: string;
  userEmail: string;
  /** True once this account already has a stall registration — canopy/game
   *  provider registration is then a separate, mutually-exclusive vendor
   *  path and stops showing up in their menu. */
  hideProvideSection?: boolean;
  children: React.ReactNode;
}) {
  // Icon components (functions) can never cross the Server -> Client
  // Component boundary as props — only serializable data can. AppShell is a
  // Client Component ("use client" above), so it imports the icon-bearing
  // nav data itself rather than receiving it from the server layout.
  const nav = navKind === "admin" ? adminNav : getUserNav({ hideProvideSection });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const SidebarContent = (
    <div className="flex h-full flex-col bg-navy-950 text-cloud-100">
      <div className="flex items-center justify-between px-5 py-5">
        <Logo dark size={32} />
        {badge && (
          <span className="rounded-full bg-gold-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-400">
            {badge}
          </span>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {nav.map((section, i) => (
          <div key={i} className="mb-4">
            {section.title && (
              <p className="px-3 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-wider text-charcoal-300">
                {section.title}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors",
                      active ? "bg-white/10 text-white" : "text-cloud-300 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <LocaleProvider>
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">{SidebarContent}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72">{SidebarContent}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur sm:px-6">
          <button
            className="rounded-md p-2 text-charcoal-500 hover:bg-surface-muted lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-1.5 sm:gap-2">
            <LanguageSwitcher variant="light" />
            <InstallAppButton />
            <NotificationBell />
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full border border-border bg-surface px-2 py-1.5 text-sm hover:bg-surface-muted"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-900 text-xs font-semibold text-white">
                  {userLabel.charAt(0).toUpperCase()}
                </span>
                <span className="hidden max-w-[10rem] truncate text-sm font-medium sm:inline">{userLabel}</span>
                <ChevronDown className="h-3.5 w-3.5 text-charcoal-500" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-40 mt-2 w-56 rounded-[var(--radius-md)] border border-border bg-surface p-1 shadow-[var(--shadow-elevated)]">
                  <div className="px-3 py-2 text-xs text-muted-foreground truncate">{userEmail}</div>
                  <Link
                    href="/profile"
                    className="block rounded-[var(--radius-sm)] px-3 py-2 text-sm hover:bg-surface-muted"
                    onClick={() => setMenuOpen(false)}
                  >
                    Profile settings
                  </Link>
                  <button
                    onClick={signOut}
                    className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-error-600 hover:bg-error-100"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">{children}</main>
      </div>

      <BottomNav navKind={navKind} onMore={() => setMobileOpen(true)} />

      {mobileOpen && (
        <button
          className="fixed right-4 top-4 z-50 rounded-full bg-navy-950 p-2 text-white lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
    </LocaleProvider>
  );
}
