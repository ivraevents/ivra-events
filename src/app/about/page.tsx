import type { Metadata } from "next";
import { PublicHeader } from "@/components/marketing/public-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="font-display text-3xl font-semibold text-navy-900">About IVRA Events</h1>
        <div className="mt-6 flex flex-col gap-4 text-sm leading-relaxed text-charcoal-700 sm:text-base">
          <p>
            IVRA Events organizes curated flea markets and lifestyle exhibitions, and gives
            vendors a straightforward way to find events, pick a stall, and handle the paperwork
            that comes with it — all from one place.
          </p>
          <p>
            Instead of juggling phone calls and spreadsheets, vendors can browse upcoming
            markets, see a live map of available stalls, apply, upload the documents an event
            needs, pay securely, and get their GST or non-GST invoice — without leaving the app.
          </p>
          <p>
            Have a question about an upcoming event, or want to bring your stall to one of our
            markets? Reach out any time from the{" "}
            <a href="/contact" className="text-royal-600 underline underline-offset-2">
              contact page
            </a>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
