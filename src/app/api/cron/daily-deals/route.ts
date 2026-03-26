import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  filterMatchingProperties,
  DEAL_FINDER_WINDOW_DAYS,
} from "@/lib/deal-finder/auto-calculator";
import { sendDailyDigest } from "@/lib/email/daily-digest";
import type { DealMatch } from "@/types";

// ─── GET /api/cron/daily-deals ────────────────────────────────────────────────
// Vercel Cron-only endpoint. Finds A/B-grade deals for each eligible Max user
// and sends a daily email digest when matches are found.

// Vercel runtime: allow up to 60 seconds for the cron batch
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  // ── Auth: Vercel Cron Bearer token ─────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron/daily-deals] CRON_SECRET env var not set");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${cronSecret}`;
  const actual = authHeader ?? "";
  const isValid =
    actual.length === expected.length &&
    timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
  if (!isValid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── App URL for email CTA links ─────────────────────────────────────────────
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    `https://${request.headers.get("host") ?? "rpc.app"}`;

  const adminClient = createAdminClient();

  // ── Fetch eligible users: Max + active/trialing + email_digest = true ───────
  const { data: eligibleUsers, error: eligibleError } = await adminClient
    .from("subscriptions")
    .select(
      `
      user_id,
      plan_type,
      status,
      watchlist_criteria!inner (
        city,
        max_price,
        min_target_return,
        email_digest
      )
    `
    )
    .in("status", ["active", "trialing"])
    .eq("plan_type", "max")
    .eq("watchlist_criteria.email_digest", true)
    .limit(100);

  if (eligibleError) {
    console.error("[cron/daily-deals] Failed to fetch eligible users:", eligibleError.message);
    return NextResponse.json({ error: "Failed to fetch eligible users" }, { status: 500 });
  }

  if (!eligibleUsers || eligibleUsers.length === 0) {
    return NextResponse.json({ data: { processed: 0, matched: 0, emailed: 0 } });
  }

  // ── Batch-fetch all user emails before the per-user loop (avoids N+1) ───────
  const userIds = eligibleUsers.map((row) => (row as { user_id: string }).user_id);
  const emailMap = new Map<string, string>();
  await Promise.all(
    userIds.map(async (uid) => {
      const { data } = await adminClient.auth.admin.getUserById(uid);
      if (data?.user?.email) {
        emailMap.set(uid, data.user.email);
      }
    })
  );

  let processedCount = 0;
  let matchedCount = 0;
  let emailedCount = 0;

  const windowStart = new Date(
    Date.now() - DEAL_FINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  for (const row of eligibleUsers) {
    try {
      const userId = row.user_id as string;

      // ── Fetch properties saved in the last DEAL_FINDER_WINDOW_DAYS days ──────
      const { data: properties } = await adminClient
        .from("properties")
        .select("*")
        .eq("user_id", userId)
        .gt("created_at", windowStart)
        .limit(50);

      // ── Build criteria from the watchlist row ─────────────────────────────
      // watchlist_criteria is joined with !inner so it always exists.
      // Guard against Supabase returning it as a single-element array (!inner join).
      const rawWc = Array.isArray(row.watchlist_criteria)
        ? row.watchlist_criteria[0]
        : row.watchlist_criteria;
      if (!rawWc) continue;
      const wc = rawWc as {
        city: string | null;
        max_price: number | null;
        min_target_return: number | null;
      };
      const criteria = {
        city: wc.city ?? null,
        max_price: wc.max_price ?? null,
        min_target_return: wc.min_target_return ?? null,
      };

      // ── Filter to A/B-grade deals matching watchlist criteria ─────────────
      const passingDeals = filterMatchingProperties(properties ?? [], criteria);

      processedCount++;

      if (passingDeals.length === 0) {
        continue;
      }

      // ── Upsert into deal_matches (idempotent — duplicates silently skipped) ─
      for (const deal of passingDeals) {
        const { error: upsertError } = await adminClient.from("deal_matches").upsert(
          {
            // id uses property id as placeholder — upsert does not return the PK
            user_id: userId,
            property_id: deal.id,
            property_name: deal.property_name,
            property_price: deal.property_price,
            est_monthly_cash_flow: deal.monthly_cash_flow,
            est_cash_on_cash_return: deal.cash_on_cash_return,
            deal_score_value: deal.dealScore,
            deal_grade: deal.dealGrade,
            matched_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,property_id",
            ignoreDuplicates: true,
          }
        );
        if (upsertError) {
          console.error(
            `[cron/daily-deals] Upsert error for property ${deal.id}:`,
            upsertError.message
          );
          // Don't increment matchedCount for this deal
          continue;
        }
        matchedCount++;
      }

      // ── Send email digest ─────────────────────────────────────────────────
      const userEmail = emailMap.get(userId);

      if (!userEmail) {
        console.warn(`[cron/daily-deals] No email found for user ${userId}`);
        continue;
      }

      // Build DealMatch shape for the email template
      const matchesForEmail: DealMatch[] = passingDeals.map((deal) => ({
        id: deal.id,
        user_id: userId,
        property_id: deal.id,
        property_name: deal.property_name,
        property_price: deal.property_price,
        est_monthly_cash_flow: deal.monthly_cash_flow,
        est_cash_on_cash_return: deal.cash_on_cash_return,
        deal_score_value: deal.dealScore,
        deal_grade: deal.dealGrade as "A" | "B" | "C" | "D",
        matched_at: new Date().toISOString(),
        dismissed_at: null,
      }));

      const { success } = await sendDailyDigest({
        to: userEmail,
        matches: matchesForEmail,
        userName: null,
        appUrl,
      });

      if (success) {
        emailedCount++;
      }
    } catch (err) {
      console.error(
        `[cron/daily-deals] Error processing user ${(row as { user_id: string }).user_id}:`,
        err
      );
      // Continue to next user — don't let one failure abort the whole run
    }
  }

  return NextResponse.json({
    data: { processed: processedCount, matched: matchedCount, emailed: emailedCount },
  });
}
