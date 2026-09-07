"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { useLocale } from "@/lib/i18n/locale-context";

export function SiteFooter() {
  const { t } = useLocale();

  const columns = [
    {
      title: t("footer.companyHeading"),
      links: [
        { label: t("footer.about"), href: "/about" },
        { label: t("footer.contact"), href: "/contact" },
        { label: t("footer.privacy"), href: "/privacy" },
      ],
    },
    {
      title: t("footer.vendorsHeading"),
      links: [
        { label: t("footer.upcomingEvents"), href: "/#events" },
        { label: t("footer.signIn"), href: "/login" },
        { label: t("footer.myDashboard"), href: "/dashboard" },
      ],
    },
  ];

  return (
    <footer className="border-t border-navy-800 bg-navy-950 text-cloud-300">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:justify-between">
        <div className="max-w-xs">
          <Logo dark size={30} />
          <p className="mt-3 text-sm text-cloud-300">{t("footer.tagline")}</p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:gap-16">
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-300">
                {col.title}
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-cloud-300 hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-navy-800">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-charcoal-300 sm:px-6">
          © {new Date().getFullYear()} IVRA Events. {t("footer.rights")}
        </p>
      </div>
    </footer>
  );
}
