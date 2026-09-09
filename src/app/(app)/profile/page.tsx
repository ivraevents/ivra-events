import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Wallet, Plus, History, ClipboardList, LifeBuoy, Info, Bell, Pencil } from "lucide-react";
import { SignOutButton } from "./sign-out-button";

const LINKS = [
  { label: "Wallet", href: "/wallet", icon: Wallet },
  { label: "Add Funds", href: "/wallet/add", icon: Plus },
  { label: "Fund History", href: "/wallet/history", icon: History },
  { label: "My Bookings", href: "/bookings", icon: ClipboardList },
  { label: "Support", href: "/support", icon: LifeBuoy },
  { label: "About Us", href: "/about", icon: Info },
];

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, mobile, created_at")
    .eq("id", user!.id)
    .single();

  const memberSince = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(profile?.created_at ?? user!.created_at)
  );
  const initial = (profile?.full_name || profile?.email || "U").charAt(0).toUpperCase();

  return (
    <div className="-mx-4 -mt-4 flex flex-col gap-5 rounded-b-[1.5rem] bg-[#08090a] px-4 pb-8 pt-5 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pt-8">
      <div className="flex items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-white/10 bg-[#131518] p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#ffd83d] text-lg font-semibold text-[#08090a]">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold text-white">{profile?.full_name || "Your Account"}</p>
            <p className="truncate text-xs text-[#a2a5a8]">{profile?.email}</p>
            {profile?.mobile && <p className="text-xs text-[#a2a5a8]">{profile.mobile}</p>}
          </div>
        </div>
        <Link
          href="/profile/edit"
          aria-label="Edit profile"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/15"
        >
          <Pencil className="h-4 w-4" />
        </Link>
      </div>

      <p className="-mt-2 text-xs text-[#75797d]">Member since {memberSince}</p>

      <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-white/10 bg-[#131518] px-4 py-3.5">
        <span className="flex items-center gap-2.5 text-sm font-medium text-[#a2a5a8]">
          <Bell className="h-4 w-4" /> Notifications
        </span>
        <span className="rounded-full bg-[#43e59a]/15 px-2.5 py-1 text-xs font-semibold text-[#43e59a]">On</span>
      </div>

      <div className="flex flex-col divide-y divide-white/10 overflow-hidden rounded-[var(--radius-lg)] border border-white/10 bg-[#131518]">
        {LINKS.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-white transition-colors hover:bg-white/5"
          >
            <Icon className="h-4 w-4 text-[#ffd83d]" /> {label}
          </Link>
        ))}
      </div>

      <SignOutButton />
    </div>
  );
}
