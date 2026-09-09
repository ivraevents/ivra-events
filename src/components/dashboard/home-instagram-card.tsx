"use client";

import { useLocale } from "@/lib/i18n/locale-context";

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

const INSTAGRAM_HANDLE = "ivra.events";

/** Compact version of the marketing site's Instagram banner, sized to sit
 *  inside the Home screen's dark panel instead of the full-bleed section. */
export function HomeInstagramCard() {
  const { t } = useLocale();

  return (
    <div className="flex flex-col items-center gap-3 rounded-[1.25rem] border border-navy-700 bg-navy-900 px-5 py-6 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]">
        <InstagramGlyph className="h-5 w-5 text-white" />
      </span>
      <div>
        <p className="font-display text-base font-semibold text-white">{t("instagram.follow", { handle: INSTAGRAM_HANDLE })}</p>
        <p className="mx-auto mt-1 max-w-xs text-xs text-cloud-300">{t("instagram.desc")}</p>
      </div>
      <a
        href={`https://instagram.com/${INSTAGRAM_HANDLE}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-navy-950"
      >
        {t("instagram.cta")}
      </a>
    </div>
  );
}
