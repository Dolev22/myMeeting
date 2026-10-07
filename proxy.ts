import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "@/lib/supabase/env";

// Refreshes the Supabase Auth session cookie on every request so server
// components always see an up-to-date session. This is Next.js 16's
// `proxy` convention (the renamed `middleware`), not an auth guard by
// itself — route-level redirects still happen in app/(dashboard)/layout.tsx
// and app/(auth)/layout.tsx.
export async function proxy(request: NextRequest) {
  // The standalone demo (app/demo) has no Supabase session to refresh and
  // must keep working when Supabase is paused or unreachable, so it never
  // reaches the client below. This is only a skip, not a grant: the real
  // app's routes are unaffected and still require a real session.
  const { pathname } = request.nextUrl;
  if (pathname === "/demo" || pathname.startsWith("/demo/")) {
    return NextResponse.next({ request });
  }

  // No Supabase env (fresh clone): there is no session to refresh. Every
  // protected layout then sees "signed out" and redirects to /login.
  if (!isSupabaseConfigured()) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
