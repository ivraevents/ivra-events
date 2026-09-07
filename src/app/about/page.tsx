import type { Metadata } from "next";
import { PublicHeader } from "@/components/marketing/public-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { AboutContent } from "@/components/marketing/about-content";
import { LocaleProvider } from "@/lib/i18n/locale-context";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <LocaleProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <PublicHeader />
        <AboutContent />
        <SiteFooter />
      </div>
    </LocaleProvider>
  );
}
