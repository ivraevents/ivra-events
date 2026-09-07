import type { Metadata } from "next";
import { PublicHeader } from "@/components/marketing/public-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PrivacyContent } from "@/components/marketing/privacy-content";
import { LocaleProvider } from "@/lib/i18n/locale-context";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LocaleProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <PublicHeader />
        <PrivacyContent />
        <SiteFooter />
      </div>
    </LocaleProvider>
  );
}
