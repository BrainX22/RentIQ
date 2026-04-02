import { Resend } from 'resend';
import type { DealMatch } from '@/types';

// ─── HTML Escaping ────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Formatting Helpers ───────────────────────────────────────────────────────

function formatPrice(price: number): string {
  const rounded = Math.round(price);
  return '$' + rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatCashFlow(amount: number): { text: string; color: string } {
  const formatted =
    (amount < 0 ? '-$' : '+$') + Math.abs(amount).toLocaleString('en-US');
  return {
    text: formatted,
    color: amount >= 0 ? '#059669' : '#dc2626',
  };
}

function formatCoC(value: number | null): string {
  if (value === null) return 'N/A';
  return value.toFixed(1) + '%';
}

const GRADE_COLORS: Record<DealMatch['deal_grade'], string> = {
  A: '#059669', // green
  B: '#2563eb', // blue
  C: '#d97706', // amber
  D: '#dc2626', // red
};
function gradeColor(grade: DealMatch['deal_grade']): string {
  return GRADE_COLORS[grade];
}

function plural(count: number): string {
  return count === 1 ? '' : 's';
}

// ─── Card Builder ─────────────────────────────────────────────────────────────

function buildMatchCard(match: DealMatch): string {
  const cashFlow = formatCashFlow(match.est_monthly_cash_flow);
  const badgeColor = gradeColor(match.deal_grade);

  return `
    <div style="
      background:#ffffff;
      border:1px solid #e5e7eb;
      border-radius:8px;
      padding:16px 20px;
      margin-bottom:12px;
    ">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <span style="font-size:16px;font-weight:700;color:#111827;">
          ${escapeHtml(match.property_name)}
        </span>
        <span style="
          background-color:${badgeColor};
          color:#ffffff;
          font-size:13px;
          font-weight:700;
          padding:2px 10px;
          border-radius:9999px;
          white-space:nowrap;
          margin-left:8px;
        ">Grade ${escapeHtml(match.deal_grade)}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:4px 0;color:#6b7280;font-size:13px;width:50%;">Price</td>
          <td style="padding:4px 0;color:#111827;font-size:13px;font-weight:600;">
            ${escapeHtml(formatPrice(match.property_price))}
          </td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#6b7280;font-size:13px;">Est. Monthly Cash Flow</td>
          <td style="padding:4px 0;font-size:13px;font-weight:600;color:${cashFlow.color};">
            ${escapeHtml(cashFlow.text)}
          </td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#6b7280;font-size:13px;">Est. CoC Return</td>
          <td style="padding:4px 0;color:#111827;font-size:13px;font-weight:600;">
            ${escapeHtml(formatCoC(match.est_cash_on_cash_return))}
          </td>
        </tr>
      </table>
    </div>`;
}

// ─── buildDigestHtml ─────────────────────────────────────────────────────────

export function buildDigestHtml(params: {
  matches: DealMatch[];
  userName: string | null;
  appUrl: string;
}): string {
  const { matches, userName, appUrl } = params;
  const count = matches.length;
  const greeting = escapeHtml(userName ?? 'there');
  const safeAppUrl = (() => {
    try {
      const parsed = new URL(appUrl);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return 'https://tryrentiq.com';
      }
      // Use origin + pathname without trailing slash to avoid double-slash on /dashboard
      const normalized = parsed.origin + parsed.pathname.replace(/\/$/, '');
      return escapeHtml(normalized);
    } catch {
      return 'https://tryrentiq.com';
    }
  })();

  const cards = matches.map(buildMatchCard).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Daily Deal Digest</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Inter,-apple-system,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="
      background:#7c3aed;
      border-radius:12px 12px 0 0;
      padding:28px 32px;
      text-align:center;
    ">
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
        Your Daily Deal Digest
      </h1>
    </div>

    <!-- Body -->
    <div style="
      background:#ffffff;
      border:1px solid #e5e7eb;
      border-top:none;
      border-radius:0 0 12px 12px;
      padding:28px 32px;
    ">
      <!-- Subtitle -->
      <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
        Hi ${greeting}! We found <strong>${count}</strong> new A/B-grade deal${plural(count)}
        matching your watchlist.
      </p>

      <!-- Property Cards -->
      ${cards}

      <!-- CTA Button -->
      <div style="text-align:center;margin-top:28px;">
        <a href="${safeAppUrl}/dashboard" style="
          display:inline-block;
          background:#7c3aed;
          color:#ffffff;
          font-size:15px;
          font-weight:600;
          text-decoration:none;
          padding:12px 32px;
          border-radius:8px;
        ">View on Dashboard</a>
      </div>
    </div>

    <!-- Footer -->
    <p style="
      margin:20px 0 0;
      color:#9ca3af;
      font-size:12px;
      text-align:center;
      line-height:1.6;
    ">
      You&rsquo;re receiving this because you enabled daily deal digest for your Max plan.
    </p>

  </div>
</body>
</html>`;
}

// ─── sendDailyDigest ─────────────────────────────────────────────────────────

export interface DigestEmailParams {
  to: string;
  matches: DealMatch[];
  userName: string | null;
  appUrl: string;
}

export async function sendDailyDigest(
  params: DigestEmailParams
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const { to, matches, userName, appUrl } = params;
  const count = matches.length;

  const resend = new Resend(apiKey);

  try {
    const { error: sendError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
      to,
      subject: `Your Daily Deal Digest — ${count} new A/B deal${plural(count)} found`,
      html: buildDigestHtml({ matches, userName, appUrl }),
    });
    if (sendError) {
      return { success: false, error: sendError.message };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
