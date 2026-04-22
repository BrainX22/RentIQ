import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Terms of Service — RentIQ",
  description: "RentIQ terms of service, subscription terms, and disclaimers.",
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "April 1, 2026";

export default function TermsPage() {
  return (
    <>
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="prose prose-gray max-w-none">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Terms of Service</h1>
        <p className="text-sm text-gray-500 mt-1">Last updated: {LAST_UPDATED}</p>

        <p className="mt-6 text-gray-600">
          These Terms of Service govern your use of RentIQ (&ldquo;Service&rdquo;), operated at{" "}
          <strong>getrentiq.com</strong>. By using the Service you agree to these terms.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-10">1. Description of Service</h2>
        <p className="text-gray-600 mt-3">
          RentIQ is a web-based rental property analysis tool that calculates financial metrics
          such as cash flow, cap rate, cash-on-cash return, and deal scores based on user-supplied
          inputs. The Service is offered under three tiers: Free, Pro, and Max.
        </p>
        <ul className="text-gray-600 mt-3 space-y-2 list-disc pl-5">
          <li><strong>Free</strong> — unlimited calculations, up to 5 saved properties per month.</li>
          <li><strong>Pro ($9/month)</strong> — unlimited saves, dashboard, comparison view.</li>
          <li>
            <strong>Max ($19/month)</strong> — all Pro features plus rental comps, neighborhood
            scoring, deal finder, and daily email digest.
          </li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900 mt-10">
          2. Not Financial Advice
        </h2>
        <p className="text-gray-600 mt-3">
          <strong>
            RentIQ is a calculation tool, not a licensed financial advisor, real estate broker, or
            investment advisor.
          </strong>{" "}
          All outputs are estimates based solely on the data you enter. Results do not constitute
          financial, investment, legal, or tax advice. You are solely responsible for any investment
          decisions you make. Always consult a qualified professional before making real estate
          investments.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-10">3. Accounts</h2>
        <p className="text-gray-600 mt-3">
          You must provide a valid email address to create an account. You are responsible for
          maintaining the security of your account credentials. Notify us immediately of any
          unauthorised use via the{" "}
          <Link href="/#feedback" className="text-orange-500 underline">
            feedback form
          </Link>
          .
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-10">4. Payments and Billing</h2>
        <p className="text-gray-600 mt-3">
          Pro and Max subscriptions are billed monthly via{" "}
          <strong>LemonSqueezy</strong>, our payment processor and Merchant of Record. LemonSqueezy
          handles all billing, sales tax, and compliance. Subscription fees are charged in advance
          at the start of each billing period.
        </p>
        <p className="mt-3 text-gray-600">
          You may cancel at any time from your Settings page. Cancellation takes effect at the end
          of the current billing period. Refund requests are governed by LemonSqueezy&apos;s refund
          policy.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-10">5. Acceptable Use</h2>
        <p className="text-gray-600 mt-3">You agree not to:</p>
        <ul className="text-gray-600 mt-3 space-y-2 list-disc pl-5">
          <li>Use the Service for any unlawful purpose.</li>
          <li>Attempt to gain unauthorised access to any other user&apos;s data.</li>
          <li>Reverse-engineer, scrape, or systematically extract data from the Service.</li>
          <li>Resell or redistribute access to the Service.</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900 mt-10">6. Intellectual Property</h2>
        <p className="text-gray-600 mt-3">
          All content, code, trademarks, and design elements of RentIQ are owned by RentIQ and are
          protected by copyright and intellectual property laws. Your saved property data belongs
          to you.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-10">7. Limitation of Liability</h2>
        <p className="text-gray-600 mt-3">
          To the maximum extent permitted by law, RentIQ shall not be liable for any indirect,
          incidental, or consequential damages arising from your use of — or inability to use —
          the Service, including losses resulting from investment decisions made using the tool.
          Our total liability shall not exceed the amount you paid us in the 12 months preceding
          the claim.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-10">8. Termination</h2>
        <p className="text-gray-600 mt-3">
          You may terminate your account at any time from Settings → Danger Zone. We reserve the
          right to suspend or terminate accounts that violate these terms. Upon termination, your
          data will be deleted in accordance with our{" "}
          <Link href="/privacy" className="text-orange-500 underline">
            Privacy Policy
          </Link>
          .
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-10">9. Changes to Terms</h2>
        <p className="text-gray-600 mt-3">
          We may update these terms from time to time. The date at the top of this page reflects
          the most recent revision. Continued use of the Service after changes constitutes
          acceptance.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 mt-10">10. Contact</h2>
        <p className="text-gray-600 mt-3">
          Questions about these terms? Use the{" "}
          <Link href="/#feedback" className="text-orange-500 underline">
            feedback form
          </Link>
          .
        </p>
      </div>
    </main>
    <Footer />
    </>
  );
}
