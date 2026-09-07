"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/locale-context";
import { LanguageSwitcher } from "./language-switcher";

export function PublicHeader() {
  const { t } = useLocale();

  return (
    <header className="sticky top-0 z-40 border-b border-navy-800 bg-navy-950/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo dark size={32} />
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/events"
            className="hidden text-sm font-medium text-cloud-300 hover:text-white sm:block"
          >
            {t("header.upcomingEvents")}
          </Link>
          <LanguageSwitcher />
          <Button asChild size="sm" variant="gold">
            <Link href="/login">{t("header.signIn")}</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
