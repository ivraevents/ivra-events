import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request and enforces two
 * server-side gates that must never be trusted to the client:
 *   1. profile completion (name + mobile) before reaching the app
 *   2. admin-only access to /admin/*
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    path.startsWith("/login") ||
    path.startsWith("/auth") ||
    path === "/" ||
    path.startsWith("/_next") ||
    path.startsWith("/api/public") ||
    path === "/about" ||
    path === "/contact" ||
    path === "/privacy" ||
    path === "/events" ||
    path.startsWith("/events/");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && !isPublic && path !== "/profile/complete") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("profile_complete")
      .eq("id", user.id)
      .single();

    if (profile && !profile.profile_complete) {
      const url = request.nextUrl.clone();
      url.pathname = "/profile/complete";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
  }

  if (user && path.startsWith("/admin")) {
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
