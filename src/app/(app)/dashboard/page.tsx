import { redirect } from "next/navigation";

// The Home screen this used to render now lives at "/" itself, since it's
// public (signed-in or not) rather than gated behind this (app) group's
// login check — see src/app/page.tsx. This route is kept only so old
// bookmarks/links to /dashboard still land somewhere sensible.
export default function DashboardRedirectPage() {
  redirect("/");
}
