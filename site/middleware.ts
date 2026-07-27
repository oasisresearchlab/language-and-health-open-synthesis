import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { gateDecision } from "@/lib/gate";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Auth not configured (local/dev without env) → don't gate.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refreshes the session cookie and tells us if a user is signed in.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const decision = gateDecision(request.nextUrl.pathname, !!user);
  if (decision === "unauthorized") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (decision === "redirect-login") {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return response;
}

export const config = {
  matcher: ["/review", "/review/:path*", "/api/pdf/:path*"],
};
