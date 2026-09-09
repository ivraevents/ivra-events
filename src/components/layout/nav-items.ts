import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, CalendarDays, ClipboardList, Store, User, FileText,
  Wallet, Receipt, Bell, LifeBuoy, Users, PackageSearch, MapPinned,
  Crown, Handshake, Tent, Gamepad2, FolderLock, CreditCard, BadgePercent,
  Ticket, Headphones, ScrollText, Settings, ShieldAlert, Home, Info, Lock, Gift,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Renders as the raised, oversized "floating" button in the middle of
   *  the bottom bar instead of an inline tab — at most one item should set
   *  this. */
  raised?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

/**
 * Stall vendors and canopy/game providers are kept as separate vendor
 * types — once someone has registered a stall (a "vendor" registration),
 * the "Provide" section (canopy / games registration) is hidden for them,
 * rather than showing both paths on every account. `getUserNav` is a
 * function (not a plain constant) so AppShell can pass that one flag
 * through without needing to know anything else about the vendor.
 */
export function getUserNav({ hideProvideSection = false }: { hideProvideSection?: boolean } = {}): NavSection[] {
  const sections: NavSection[] = [
    {
      items: [
        { label: "Dashboard", href: "/", icon: LayoutDashboard },
        { label: "Browse Events", href: "/events", icon: CalendarDays },
        { label: "Wallet", href: "/wallet", icon: Wallet },
      ],
    },
    {
      title: "My Activity",
      items: [
        { label: "My Registrations", href: "/registrations", icon: ClipboardList },
        { label: "My Bookings", href: "/bookings", icon: Store },
        { label: "Documents", href: "/documents", icon: FileText },
        { label: "Payments", href: "/payments", icon: CreditCard },
        { label: "Invoices", href: "/invoices", icon: Receipt },
      ],
    },
  ];

  if (!hideProvideSection) {
    sections.push({
      title: "Provide",
      items: [
        { label: "Canopy Registration", href: "/register/canopy", icon: Tent },
        { label: "Games & Entertainment", href: "/register/game", icon: Gamepad2 },
      ],
    });
  }

  sections.push(
    {
      title: "Account",
      items: [
        { label: "Profile", href: "/profile", icon: User },
        { label: "Notifications", href: "/notifications", icon: Bell },
      ],
    },
    {
      title: "Help & Legal",
      items: [
        { label: "Support", href: "/support", icon: LifeBuoy },
        { label: "About IVRA Events", href: "/about", icon: Info },
        { label: "Privacy Policy", href: "/privacy", icon: Lock },
      ],
    }
  );

  return sections;
}

/** @deprecated use getUserNav() — kept only so nothing else importing the old constant breaks. */
export const userNav: NavSection[] = getUserNav();

/**
 * Nav shown to a signed-out visitor browsing the now-public Home page —
 * only what makes sense without an account (browsing events, the two
 * "become a provider" registration flows, and help/legal). Anything that
 * needs an account (Wallet, My Bookings, Documents, Profile, …) is left
 * out here; a signed-out visitor who taps one of those elsewhere (e.g. the
 * bottom nav) is simply asked to sign in, same as before.
 */
export function getGuestNav(): NavSection[] {
  return [
    {
      items: [
        { label: "Home", href: "/", icon: Home },
        { label: "Browse Events", href: "/events", icon: CalendarDays },
        { label: "Register / Sign In", href: "/login", icon: User },
      ],
    },
    {
      title: "Provide",
      items: [
        { label: "Canopy Registration", href: "/register/canopy", icon: Tent },
        { label: "Games & Entertainment", href: "/register/game", icon: Gamepad2 },
      ],
    },
    {
      title: "Help & Legal",
      items: [
        { label: "Support", href: "/support", icon: LifeBuoy },
        { label: "About IVRA Events", href: "/about", icon: Info },
        { label: "Privacy Policy", href: "/privacy", icon: Lock },
      ],
    },
  ];
}

export const adminNav: NavSection[] = [
  { items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard }] },
  {
    title: "Events & Stalls",
    items: [
      { label: "Events", href: "/admin/events", icon: CalendarDays },
      { label: "Stall Management", href: "/admin/stalls", icon: MapPinned },
      { label: "Monopoly Management", href: "/admin/monopoly", icon: Crown },
      { label: "Negotiations", href: "/admin/negotiations", icon: Handshake },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Vendors", href: "/admin/vendors", icon: PackageSearch },
      { label: "Registrations", href: "/admin/registrations", icon: ClipboardList },
      { label: "Canopy Providers", href: "/admin/canopy", icon: Tent },
      { label: "Games & Entertainment", href: "/admin/games", icon: Gamepad2 },
      { label: "KYC Approval", href: "/admin/documents", icon: FolderLock },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Payments", href: "/admin/payments", icon: CreditCard },
      { label: "Discounts", href: "/admin/discounts", icon: BadgePercent },
      { label: "Coupons", href: "/admin/coupons", icon: Ticket },
      { label: "Invoices", href: "/admin/invoices", icon: Receipt },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Support", href: "/admin/support", icon: Headphones },
      { label: "Notifications", href: "/admin/notifications", icon: Bell },
      { label: "Reports", href: "/admin/reports", icon: ScrollText },
      { label: "Audit Logs", href: "/admin/audit-logs", icon: ShieldAlert },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

/**
 * Short lists for the mobile bottom tab bar — a "More" tab (which opens the
 * full drawer above) covers everything else, mirroring the Home / Visitors /
 * Task / Report / More pattern from the Navrathan CRM app.
 */
// 5 tabs, with "Booking" rendered as the raised floating button in the
// middle. Profile is reached from the header avatar, not a tab, so it
// isn't duplicated here.
export const userBottomNav: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Offer", href: "/events", icon: Gift },
  { label: "Booking", href: "/bookings", icon: Store, raised: true },
  { label: "Wallet", href: "/wallet", icon: Wallet },
  { label: "Support", href: "/support", icon: LifeBuoy },
];

export const adminBottomNav: NavItem[] = [
  { label: "Home", href: "/admin", icon: Home },
  { label: "Events", href: "/admin/events", icon: CalendarDays },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Reports", href: "/admin/reports", icon: ScrollText },
];
