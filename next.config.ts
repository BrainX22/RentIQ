import type { NextConfig } from "next";

// ─── HTTP Security Headers ────────────────────────────────────────────────────
//
// Applied to every route via source: "/(.*)"
//
// CSP notes:
//  • script-src  — 'unsafe-inline' required: Next.js App Router injects inline
//    hydration scripts. Nonce-based CSP requires Middleware and is a post-launch
//    hardening step. 'unsafe-eval' is intentionally NOT present.
//  • style-src   — 'unsafe-inline' required: Tailwind injects inline styles.
//  • font-src    — 'self' only: next/font/google self-hosts fonts at build time;
//    no google fonts domains needed at runtime.
//  • connect-src — Supabase REST + Auth + Realtime (wss://); Stripe API + fraud
//    detection endpoints (m.stripe.com, m.stripe.network, q.stripe.com). The
//    fraud endpoints are included proactively so Stripe Elements works without
//    CSP changes when added later.
//  • frame-src   — Stripe Checkout iframes (js.stripe.com + hooks.stripe.com).
//    hooks.stripe.com is required for 3DS/SCA — omitting it silently breaks
//    European card payments.
//  • frame-ancestors — CSP equivalent of X-Frame-Options; belt-and-suspenders
//    since modern browsers prefer CSP over the legacy header.
//  • object-src  — 'none': blocks all plugins (Flash, etc.).
//  • base-uri    — 'self': prevents <base> tag injection attacks.
//  • form-action — 'self': prevents forms from submitting to external domains.

const ContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  [
    "connect-src 'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://api.stripe.com",
    "https://m.stripe.com",
    "https://m.stripe.network",
    "https://q.stripe.com",
  ].join(" "),
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const securityHeaders = [
  // Prevent clickjacking (legacy header; CSP frame-ancestors above is the modern equivalent)
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Stop MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Limit referrer information sent to third parties
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Deny unnecessary browser feature access.
  // payment=(self) is intentional: allows future Apple Pay / Google Pay via
  // Stripe Elements on this origin. Stripe Checkout (redirect) does not use it.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
  // Force HTTPS for 2 years, include subdomains, allow preload list submission.
  // NOTE: Submit domain to hstspreload.org after deploying to production domain.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Closes XSLeaks / Spectre side-channel attacks by preventing cross-origin
  // windows from holding references to this window. Safe with Stripe Checkout
  // redirect flow (no popup involved).
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Content Security Policy
  { key: "Content-Security-Policy", value: ContentSecurityPolicy },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply to every route
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
