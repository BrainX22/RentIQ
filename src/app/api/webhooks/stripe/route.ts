import { NextResponse } from "next/server";

// DEPRECATED: Stripe webhook replaced by LemonSqueezy.
// See /api/webhooks/lemonsqueezy for the active handler.
export async function POST() {
  return NextResponse.json(
    { error: "This webhook endpoint is no longer active." },
    { status: 410 }
  );
}
