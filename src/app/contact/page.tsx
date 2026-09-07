import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { PublicHeader } from "@/components/marketing/public-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = { title: "Contact" };

// TODO: update with your preferred public-facing support contact details.
const CONTACT_EMAIL = "book.ivraevents@gmail.com";

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="font-display text-3xl font-semibold text-navy-900">Contact Us</h1>
        <p className="mt-4 text-sm text-charcoal-700 sm:text-base">
          Questions about an event, a booking, or bringing your stall to an IVRA Events flea
          market? We&apos;re happy to help.
        </p>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="mt-6 inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3 text-sm font-medium text-navy-900 hover:bg-surface-muted"
        >
          <Mail className="h-4 w-4 text-royal-600" /> {CONTACT_EMAIL}
        </a>
        <p className="mt-6 text-sm text-muted-foreground">
          Already registered? Sign in and use the{" "}
          <Link href="/support" className="text-royal-600 underline underline-offset-2">
            Support
          </Link>{" "}
          section for booking-specific questions — it&apos;s the fastest way to reach us about an
          existing registration.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
