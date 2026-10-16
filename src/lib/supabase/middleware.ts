import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-url.supabase.co";
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-key";

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Check user authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Block any attempt to access old /admin routes and bounce to homepage
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const isAccessingAdmin = request.nextUrl.pathname.startsWith("/vasviadminspoon");
  const isLoginPage = request.nextUrl.pathname === "/vasviadminspoon/login";

  // If user is not authenticated and trying to access protected admin pages
  if (isAccessingAdmin && !isLoginPage && !user) {
    // Only enforce redirect when actual credentials are configured
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder-url.supabase.co") {
      const url = request.nextUrl.clone();
      url.pathname = "/vasviadminspoon/login";
      return NextResponse.redirect(url);
    }
  }

  // If already authenticated and visiting /vasviadminspoon/login, redirect to /vasviadminspoon dashboard
  if (isLoginPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/vasviadminspoon";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
