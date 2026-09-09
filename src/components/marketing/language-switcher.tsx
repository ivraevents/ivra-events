"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n/locale-context";
import { LOCALES } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({
  variant = "dark",
  compact = false,
}: {
  variant?: "dark" | "light";
  /** Single premium icon-button with a popover — used in the sticky header,
   *  where space is tight. The full segmented control (below) stays for the
   *  drawer menu. */
  compact?: boolean;
}) {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);

  if (compact) {
    const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Change language"
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-[10px] font-bold text-[#c7cacd] shadow-[0_2px_10px_rgba(0,0,0,0.3)] backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95"
        >
          {current.native}
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-40 mt-2 w-32 overflow-hidden rounded-2xl border border-[#242629] bg-[#131518] p-1 shadow-[0_20px_45px_rgba(0,0,0,0.5)]">
              {LOCALES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setLocale(l.code);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors",
                    locale === l.code ? "bg-white text-[#08090a]" : "text-[#a2a5a8] hover:bg-white/5 hover:text-white"
                  )}
                >
                  {l.native}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center rounded-full border p-0.5 text-xs font-semibold",
        variant === "dark" ? "border-navy-700 bg-navy-900" : "border-border bg-surface-muted"
      )}
    >
      {LOCALES.map((l) => (
        <button
          key={l.code}
          onClick={() => setLocale(l.code)}
          aria-pressed={locale === l.code}
          className={cn(
            "rounded-full px-2.5 py-1.5 transition-colors",
            locale === l.code
              ? variant === "dark"
                ? "bg-gold-500 text-navy-950"
                : "bg-navy-900 text-white"
              : variant === "dark"
                ? "text-cloud-300 hover:text-white"
                : "text-charcoal-500 hover:text-navy-900"
          )}
        >
          {l.native}
        </button>
      ))}
    </div>
  );
}
