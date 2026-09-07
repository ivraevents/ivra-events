import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/marketing/public-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
        <h1 className="font-display text-3xl font-semibold text-navy-900">Privacy Policy</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Last updated: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </p>

        <div className="mt-6 flex flex-col gap-5 text-sm leading-relaxed text-charcoal-700">
          <p>
            This page explains what information IVRA Events collects when you use this app to
            browse events and book stalls, and how it&apos;s used.
          </p>

          <div>
            <h2 className="font-display text-lg font-semibold text-navy-900">
              Information we collect
            </h2>
            <p className="mt-2">
              Account details (name, email, mobile number), identity and business documents you
              upload for a booking (such as Aadhaar, PAN, or GST certificate), and booking-related
              information (registrations, payments, invoices, and support messages).
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-semibold text-navy-900">How it&apos;s used</h2>
            <p className="mt-2">
              To create and manage your account, process stall bookings and payments, verify the
              documents an event requires, generate invoices, and respond to support requests.
              Identity documents are only reviewed by authorized event staff for verification
              purposes.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-semibold text-navy-900">
              How it&apos;s stored
            </h2>
            <p className="mt-2">
              Data is stored with Supabase, access-controlled so you can only see your own
              records (or, for staff, only what their role requires). Uploaded documents are kept
              in a private file store, never publicly accessible.
            </p>
          </div>

          <div>
            <h2 className="font-display text-lg font-semibold text-navy-900">Your choices</h2>
            <p className="mt-2">
              You can review and update your profile at any time from the app, and can request
              access to or deletion of your data by contacting us on the{" "}
              <Link href="/contact" className="text-royal-600 underline underline-offset-2">
                Contact page
              </Link>
              .
            </p>
          </div>

          <p className="mt-4 rounded-[var(--radius-md)] border border-border bg-surface-muted px-4 py-3 text-xs text-muted-foreground">
            This page is a general starting template and isn&apos;t legal advice. Because this app
            collects government ID documents (like Aadhaar), we&apos;d recommend having it reviewed by
            a lawyer familiar with India&apos;s data protection rules before you rely on it.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
