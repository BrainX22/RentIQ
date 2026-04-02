import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rental Property Calculator — Analyze Cash Flow, Cap Rate & Returns",
  description:
    "Enter your numbers and instantly see cash flow, cap rate, cash-on-cash return, DSCR, and deal score. Free rental property analysis tool.",
  openGraph: {
    title: "Rental Property Calculator — RentIQ",
    description:
      "Analyze any rental property in seconds. Cash flow, cap rate, and deal score — all calculated instantly.",
    url: "/calculator",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "RentIQ Rental Property Calculator",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "Calculate cash flow, cap rate, cash-on-cash return, and DSCR for any rental property.",
  url: "https://tryrentiq.com/calculator",
};

export default function CalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
