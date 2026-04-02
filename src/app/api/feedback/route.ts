import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { feedbackSchema } from "@/lib/validations";
import { feedbackSubmit, getClientIp } from "@/lib/rate-limit";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── Rate limit by IP ──────────────────────────────────────────────────────
  const ip = getClientIp(request.headers);
  const limiter = feedbackSubmit();
  const { success } = await limiter.limit(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before sending another message." },
      { status: 429 }
    );
  }

  // ── Parse + validate body ─────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const { name, email, message } = parsed.data;

  // ── Send via Resend ───────────────────────────────────────────────────────
  const recipient = process.env.FEEDBACK_RECIPIENT_EMAIL;
  if (!recipient) {
    console.error("[feedback] FEEDBACK_RECIPIENT_EMAIL not configured");
    return NextResponse.json({ error: "Feedback service unavailable." }, { status: 500 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  // Strip CRLF to prevent SMTP header injection in the subject line
  const safeName  = name  ? escapeHtml(name.replace(/[\r\n]/g, " "))  : null;
  const safeEmail = email ? escapeHtml(email.replace(/[\r\n]/g, " ")) : null;
  const sanitizedName  = name?.replace(/[\r\n]/g, " ");
  const sanitizedEmail = email?.replace(/[\r\n]/g, " ");
  const fromLine = safeName
    ? `${safeName}${safeEmail ? ` &lt;${safeEmail}&gt;` : ""}`
    : (safeEmail ?? "Anonymous");

  const { error } = await resend.emails.send({
    from: "RentIQ Feedback <onboarding@resend.dev>",
    to: recipient,
    subject: `RentIQ Feedback from ${sanitizedName ?? sanitizedEmail ?? "Anonymous"}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px">
        <h2 style="color:#F97316">New Feedback — RentIQ</h2>
        <p><strong>From:</strong> ${fromLine}</p>
        <hr/>
        <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
      </div>
    `,
  });

  if (error) {
    console.error("[feedback] Resend error:", error);
    return NextResponse.json({ error: "Failed to send feedback. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
