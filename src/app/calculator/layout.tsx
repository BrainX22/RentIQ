import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rental Property Calculator",
  description:
    "Analyze any rental property in seconds. Enter your numbers and get instant cash flow, cap rate, cash-on-cash return, and a deal score.",
  openGraph: {
    title: "Rental Property Calculator",
    description:
      "Analyze any rental property in seconds. Cash flow, cap rate, and deal score — all calculated client-side, instantly.",
    url: "/calculator",
  },
};

export default function CalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
