import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { PublicHeader } from "@/components/marketing/public-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { LocaleProvider } from "@/lib/i18n/locale-context";

/**
 * Browsing is public — anyone can look at events and the stall map without
 * an account (signing in is only asked for when someone actually tries to
 * reserve a stall — see StallDetailDialog). That's why this route sits
 * outside the (app) group instead of behind its auth redirect.
 *
 * A signed-in vendor should still feel like they're inside the app while
 * browsing, so this layout checks auth itself: logged in gets the normal
 * AppShell (sidebar, bottom nav, "Sign in" never shown), signed out gets
 * the public marketing header/footer instead.
 */
export default async function EventsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const [{ data: profile }, { data: vendorRegistration }] = await Promise.all([
      supabase.from("profiles").select("full_name, email").eq("id", user.id).single(),
      supabase.from("registrations").select("id").eq("user_id", user.id).eq("type", "vendor").limit(1).maybeSingle(),
    ]);

    return (
      <AppShell
        navKind="user"
        userLabel={profile?.full_name || profile?.email || "Account"}
        userEmail={profile?.email || user.email || ""}
        hideProvideSection={!!vendorRegistration}
      >
        {children}
      </AppShell>
    );
  }

  return (
    <LocaleProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <PublicHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
        <SiteFooter />
      </div>
    </LocaleProvider>
  );
}
