// rpc/src/app/how-it-works/layout.tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "How RentIQ Works — Full Feature Guide",
  description:
    "Learn how to use every RentIQ feature: the rental property calculator, comparison view, rental comps, neighborhood scoring, portfolio tracking, and daily deal alerts.",
  openGraph: {
    title: "How RentIQ Works — Full Feature Guide",
    description:
      "Learn how to use every RentIQ feature — from the free calculator to Max tier deal alerts.",
  },
};

export default function HowItWorksLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
