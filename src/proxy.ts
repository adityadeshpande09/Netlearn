import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

export async function proxy(request: NextRequest) {
  const settings = getSupabaseConfig();
  if (
    !settings ||
    !request.cookies.getAll().some(({ name }) => name.startsWith("sb-"))
  )
    return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const client = createServerClient<Database>(
    settings.url,
    settings.publishableKey,
    {
      cookieOptions: {
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
      },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookies, headers) {
          cookies.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // Recreate with refreshed request cookies while retaining earlier response cookies.
          const previous = response.cookies.getAll();
          response = NextResponse.next({ request });
          previous.forEach((cookie) => response.cookies.set(cookie));
          cookies.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([name, value]) =>
            response.headers.set(name, value),
          );
        },
      },
    },
  );
  try {
    await client.auth.getClaims();
  } catch {
    // Public lessons remain available during an auth outage. RLS protects all data access.
  }
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}
export const config = { matcher: ["/account", "/learn/:path*"] };
