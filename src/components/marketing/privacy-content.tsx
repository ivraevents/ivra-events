"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/locale-context";

export function PrivacyContent() {
  const { t, locale } = useLocale();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-navy-900">{t("privacy.title")}</h1>
      <p className="mt-2 text-xs text-muted-foreground">
        {t("privacy.lastUpdated")}:{" "}
        {new Date().toLocaleDateString(locale === "en" ? "en-IN" : locale, {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>

      <div className="mt-6 flex flex-col gap-5 text-sm leading-relaxed text-charcoal-700">
        <p>{t("privacy.intro")}</p>

        <div>
          <h2 className="font-display text-lg font-semibold text-navy-900">
            {t("privacy.collectHeading")}
          </h2>
          <p className="mt-2">{t("privacy.collectBody")}</p>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold text-navy-900">
            {t("privacy.useHeading")}
          </h2>
          <p className="mt-2">{t("privacy.useBody")}</p>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold text-navy-900">
            {t("privacy.storeHeading")}
          </h2>
          <p className="mt-2">{t("privacy.storeBody")}</p>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold text-navy-900">
            {t("privacy.choicesHeading")}
          </h2>
          <p className="mt-2">
            {t("privacy.choicesBodyPre")}{" "}
            <Link href="/contact" className="text-royal-600 underline underline-offset-2">
              {t("privacy.choicesLink")}
            </Link>
            .
          </p>
        </div>

        <p className="mt-4 rounded-[var(--radius-md)] border border-border bg-surface-muted px-4 py-3 text-xs text-muted-foreground">
          {t("privacy.disclaimer")}
        </p>
      </div>
    </main>
  );
}
