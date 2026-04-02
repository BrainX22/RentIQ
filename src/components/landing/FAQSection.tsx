"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "Is this financial advice?",
    a: "No. RentIQ is a calculation tool, not a financial advisor. All numbers are estimates based on the inputs you provide. Always consult a licensed financial advisor or real estate professional before making investment decisions.",
  },
  {
    q: "What's the difference between Free, Pro, and Max?",
    a: "Free lets you run unlimited calculations and save up to 5 properties per month. Pro ($9/mo) gives you unlimited saves, a dashboard, and the comparison view. Max ($19/mo) adds rental comps, neighborhood scoring, and a deal finder that emails you matching properties daily.",
  },
  {
    q: "How accurate are the calculations?",
    a: "The math is exact — we use standard real estate formulas for mortgage amortization, NOI, cap rate, cash-on-cash return, and DSCR. The results are only as accurate as the inputs you provide. Use real numbers from your market: actual tax bills, insurance quotes, and local vacancy rates.",
  },
  {
    q: "Can I cancel my subscription anytime?",
    a: "Yes. There are no long-term contracts. You can cancel anytime from your settings page and you'll keep access until the end of your billing period. Refunds are handled by our payment processor, LemonSqueezy.",
  },
  {
    q: "What data is used for Rental Comps?",
    a: "Rental Comps use HUD Fair Market Rent (FMR) data — official government figures published annually for every ZIP code in the US. It shows the local market median rent by bedroom count. This is updated each year when HUD publishes new data.",
  },
  {
    q: "Is my saved data secure?",
    a: "Yes. Your data is stored in Supabase (PostgreSQL) with row-level security — only you can access your properties. Passwords are hashed by Supabase Auth. You can permanently delete your account and all associated data at any time from Settings → Danger Zone.",
  },
  {
    q: "What payment methods are accepted?",
    a: "Payments are processed by LemonSqueezy, which supports all major credit and debit cards (Visa, Mastercard, Amex), PayPal, and other regional methods depending on your country. RentIQ never sees or stores your payment details.",
  },
  {
    q: "Can I use the calculator without signing up?",
    a: "Absolutely. The calculator is fully functional without an account — just open it and start entering numbers. You only need an account to save properties, access your dashboard, or use Pro/Max features.",
  },
];

export default function FAQSection() {
  return (
    <section
      id="faq"
      className="bg-white py-20 px-4 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-3xl">
        {/* Heading */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-base text-gray-500">
            Everything you need to know about RentIQ.
          </p>
        </div>

        {/* Accordion */}
        <Accordion type="single" collapsible className="divide-y divide-gray-100">
          {FAQS.map((faq, i) => (
            <AccordionItem key={faq.q} value={faq.q} className="border-none py-1">
              <AccordionTrigger className="text-left text-base font-medium text-gray-900 hover:text-orange-500 hover:no-underline [&[data-state=open]]:text-orange-500">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-gray-600 pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
