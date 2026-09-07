"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/locale-context";

export function AboutContent() {
  const { t } = useLocale();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-navy-900">{t("about.title")}</h1>
      <div className="mt-6 flex flex-col gap-4 text-sm leading-relaxed text-charcoal-700 sm:text-base">
        <p>{t("about.p1")}</p>
        <p>{t("about.p2")}</p>
        <p>
          {t("about.p3Pre")}{" "}
          <Link href="/contact" className="text-royal-600 underline underline-offset-2">
            {t("about.p3Link")}
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
