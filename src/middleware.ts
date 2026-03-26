import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js middleware — runs on every request before page/API handlers.
 *
 * Responsibilities:
 *  1. Refresh the Supabase auth session and enforce protected routes
 *
 * Rate limiting is handled per-route in each API handler, which allows
 * fine-grained per-endpoint configuration and avoids double-counting.
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
