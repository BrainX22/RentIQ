import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — RentIQ",
  description: "How RentIQ collects, uses, and protects your data.",
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "April 1, 2026";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="prose prose-gray max-w-none">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mt-1">Last updated: {LAST_UPDATED}</p>

        <p className="mt-6 text-gray-600">
          RentIQ (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) operates the rental property calculator at{" "}
          <strong>getrentiq.com</strong>. This policy explains what data we collect, how we use
          it, and your rights regarding that data.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-10">1. What We Collect</h2>
        <ul className="text-gray-600 mt-3 space-y-2 list-disc pl-5">
          <li>
            <strong>Email address and password hash</strong> — when you create an account.
            Passwords are never stored in plain text; they are hashed by Supabase Auth.
          </li>
          <li>
            <strong>Saved property data</strong> — property names and the calculator inputs and
            results you choose to save. This data belongs to you and is only accessible by your
            account.
          </li>
          <li>
            <strong>Usage data</strong> — anonymous page view counts via Plausible Analytics.
            Plausible is cookie-free and collects no personally identifiable information.
          </li>
          <li>
            <strong>Feedback form submissions</strong> — if you submit feedback, your message and
            any optional name or email you provide.
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900 mt-10">2. How We Use Your Data</h2>
        <ul className="text-gray-600 mt-3 space-y-2 list-disc pl-5">
          <li>To provide the core service (calculator, property saving, dashboard).</li>
          <li>
            To send deal digest emails — only if you are a Max tier subscriber and have enabled
            email notifications in your watchlist settings.
          </li>
          <li>To respond to feedback you submit.</li>
          <li>To measure and improve the product using anonymous analytics.</li>
        </ul>
        <p className="mt-3 text-gray-600">
          We do not sell your data. We do not use your data for advertising.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-10">3. Third-Party Services</h2>
        <p className="text-gray-600 mt-3">
          We use the following third-party services to operate RentIQ:
        </p>
        <ul className="text-gray-600 mt-3 space-y-2 list-disc pl-5">
          <li>
            <strong>Supabase</strong> — authentication and database. Your account credentials and
            saved properties are stored on Supabase servers.
          </li>
          <li>
            <strong>LemonSqueezy</strong> — payment processing and billing (Merchant of Record).
            LemonSqueezy handles all payment transactions. RentIQ never sees or stores your
            payment card details.
          </li>
          <li>
            <strong>Resend</strong> — transactional email delivery (deal digest, feedback
            forwarding).
          </li>
          <li>
            <strong>Plausible</strong> — privacy-friendly, cookie-free analytics. No personal
            data or IP addresses are stored.
          </li>
          <li>
            <strong>Vercel</strong> — hosting and edge delivery.
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900 mt-10">4. Cookies</h2>
        <p className="text-gray-600 mt-3">
          RentIQ sets authentication cookies strictly for the purpose of keeping you signed in.
          These are functional cookies — no advertising or tracking cookies are used. Plausible
          Analytics operates without cookies entirely.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-10">5. Data Retention</h2>
        <p className="text-gray-600 mt-3">
          We retain your data for as long as your account is active. You may delete your account
          at any time from <strong>Settings → Danger Zone</strong>. Upon deletion, your profile
          and saved properties are permanently removed from our systems within 30 days.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-10">6. Your Rights</h2>
        <p className="text-gray-600 mt-3">
          You have the right to access, correct, or delete your personal data at any time.
          To delete your account, use the in-app account deletion feature. For other requests,
          contact us at the address below.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-10">7. Changes to This Policy</h2>
        <p className="text-gray-600 mt-3">
          We may update this policy from time to time. The date at the top of this page reflects
          the most recent revision. Continued use of RentIQ after changes constitutes acceptance
          of the updated policy.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-10">8. Contact</h2>
        <p className="text-gray-600 mt-3">
          Questions about this policy? Use the{" "}
          <Link href="/#feedback" className="text-orange-500 underline">
            feedback form
          </Link>{" "}
          on our homepage.
        </p>
      </div>
    </main>
  );
}
