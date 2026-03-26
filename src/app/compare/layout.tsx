import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Compare Properties | RentIQ",
  description:
    "Compare up to 4 saved rental properties side-by-side. Row-level winner highlighting and a weighted deal score help you find the best investment.",
  robots: { index: false }, // Protected; no value in indexing
};

export default function CompareLayout({ children }: { children: ReactNode }) {
  return children;
}
