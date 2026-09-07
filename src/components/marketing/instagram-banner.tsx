"use client";

import { useLocale } from "@/lib/i18n/locale-context";

/** Small inline glyph — lucide-react no longer ships brand/social icons. */
function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

/**
 * Update this if the real IVRA Events Instagram username ever changes.
 */
const INSTAGRAM_HANDLE = "ivra.events";

export function InstagramBanner() {
  const { t } = useLocale();

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col items-start gap-5 rounded-[var(--radius-xl)] border border-gold-500/30 bg-navy-950 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-start gap-4 sm:items-center">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]">
            <InstagramGlyph className="h-6 w-6 text-white" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-400">
              {t("instagram.eyebrow")}
            </p>
            <p className="mt-1 font-display text-lg font-semibold">
              {t("instagram.follow", { handle: INSTAGRAM_HANDLE })}
            </p>
            <p className="mt-1 max-w-md text-sm text-cloud-300">{t("instagram.desc")}</p>
          </div>
        </div>
        <a
          href={`https://instagram.com/${INSTAGRAM_HANDLE}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-cloud-300/30 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          {t("instagram.cta")} ↗
        </a>
      </div>
    </section>
  );
}
