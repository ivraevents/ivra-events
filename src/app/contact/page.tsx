import type { Metadata } from "next";
import { PublicHeader } from "@/components/marketing/public-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ContactContent } from "@/components/marketing/contact-content";
import { LocaleProvider } from "@/lib/i18n/locale-context";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <LocaleProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <PublicHeader />
        <ContactContent />
        <SiteFooter />
      </div>
    </LocaleProvider>
  );
}
