"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-context";

// TODO: update with your preferred public-facing support contact details.
const CONTACT_EMAIL = "book.ivraevents@gmail.com";

export function ContactContent() {
  const { t } = useLocale();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-navy-900">{t("contact.title")}</h1>
      <p className="mt-4 text-sm text-charcoal-700 sm:text-base">{t("contact.intro")}</p>
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className="mt-6 inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3 text-sm font-medium text-navy-900 hover:bg-surface-muted"
      >
        <Mail className="h-4 w-4 text-royal-600" /> {CONTACT_EMAIL}
      </a>
      <p className="mt-6 text-sm text-muted-foreground">
        {t("contact.alreadyRegisteredPre")}{" "}
        <Link href="/support" className="text-royal-600 underline underline-offset-2">
          {t("contact.supportLink")}
        </Link>{" "}
        {t("contact.alreadyRegisteredPost")}
      </p>
    </main>
  );
}
