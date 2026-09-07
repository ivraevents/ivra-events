import Link from "next/link";
import { Logo } from "@/components/ui/logo";

const columns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
  {
    title: "For Vendors",
    links: [
      { label: "Upcoming Events", href: "/#events" },
      { label: "Sign In", href: "/login" },
      { label: "My Dashboard", href: "/dashboard" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-navy-800 bg-navy-950 text-cloud-300">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:justify-between">
        <div className="max-w-xs">
          <Logo dark size={30} />
          <p className="mt-3 text-sm text-cloud-300">
            Book your stall at India&apos;s most curated flea markets — browse events,
            pick your spot, and manage everything from one place.
          </p>
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
          © {new Date().getFullYear()} IVRA Events. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
