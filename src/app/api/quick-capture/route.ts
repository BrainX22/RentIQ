import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { urlSchema } from "@/lib/validations";
import { resolveRateLimiter, getClientIp, isRateLimitingEnabled } from "@/lib/rate-limit";

function buildCalculatorRedirect(requestUrl: string, listingUrl: string) {
  const base = new URL(requestUrl);
  return new URL(`/calculator?importUrl=${encodeURIComponent(listingUrl)}&source=bookmarklet`, base);
}

export async function GET(request: Request) {
  if (isRateLimitingEnabled()) {
    try {
      const limiter = resolveRateLimiter("/api/quick-capture", "GET");
      const ip = getClientIp(request.headers);
      const { success, reset } = await limiter.limit(ip);
      if (!success) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429, headers: { "Retry-After": String(Math.max(0, Math.ceil((reset - Date.now()) / 1000))) } }
        );
      }
    } catch (rlErr) {
      console.error("[rate-limit] Redis error — failing open:", rlErr);
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = urlSchema.safeParse({ url: url.searchParams.get("url") });

  if (!parsed.success || !["http:", "https:"].includes(new URL(parsed.data.url).protocol)) {
    return NextResponse.json(
      {
        error: "A valid HTTP/HTTPS listing URL is required.",
        usage: "Use /api/quick-capture?url=https://example.com/listing",
      },
      { status: 400 }
    );
  }

  return NextResponse.redirect(buildCalculatorRedirect(request.url, parsed.data.url));
}

export async function POST(request: Request) {
  if (isRateLimitingEnabled()) {
    try {
      const limiter = resolveRateLimiter("/api/quick-capture", "POST");
      const ip = getClientIp(request.headers);
      const { success, reset } = await limiter.limit(ip);
      if (!success) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429, headers: { "Retry-After": String(Math.max(0, Math.ceil((reset - Date.now()) / 1000))) } }
        );
      }
    } catch (rlErr) {
      console.error("[rate-limit] Redis error — failing open:", rlErr);
    }
  }

  const supabasePost = await createClient();
  const {
    data: { user: postUser },
  } = await supabasePost.auth.getUser();

  if (!postUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = urlSchema.safeParse(rawBody);
  if (!parsed.success || !["http:", "https:"].includes(new URL(parsed.data.url).protocol)) {
    return NextResponse.json(
      { error: "A valid HTTP/HTTPS listing URL is required." },
      { status: 400 }
    );
  }

  const redirectUrl = buildCalculatorRedirect(request.url, parsed.data.url).toString();

  return NextResponse.json({ redirectUrl });
}
