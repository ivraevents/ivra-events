import { Suspense } from "react";
import { AdminLoginCard } from "./admin-login-card";
import { Logo } from "@/components/ui/logo";

export default function AdminLoginPage() {
  return (
    <div className="grid min-h-screen flex-1 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy-950 p-12 text-white lg:flex">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(201,152,47,0.25), transparent 40%), radial-gradient(circle at 80% 70%, rgba(29,132,73,0.3), transparent 45%)",
          }}
        />
        <Logo dark size={44} className="relative z-10" />
        <div className="relative z-10 max-w-md">
          <h2 className="font-display text-3xl font-semibold leading-tight">Admin &amp; staff access.</h2>
          <p className="mt-4 text-sm text-cloud-300">
            Manage events, stalls, pricing, registrations and payments for IVRA Events.
          </p>
        </div>
        <p className="relative z-10 text-xs text-charcoal-300">© {new Date().getFullYear()} IVRA Events</p>
      </div>

      <div className="flex flex-col items-center justify-center gap-8 p-8">
        <div className="lg:hidden">
          <Logo size={40} />
        </div>
        <Suspense>
          <AdminLoginCard />
        </Suspense>
      </div>
    </div>
  );
}
