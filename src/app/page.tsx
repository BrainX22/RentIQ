import type { Metadata } from "next";
import Hero from "@/components/landing/Hero";
import SocialProof from "@/components/landing/SocialProof";
import ProductWalkthrough from "@/components/landing/ProductWalkthrough";
import PricingSection from "@/components/landing/PricingSection";

export const metadata: Metadata = {
  title: "RentIQ — Free Rental Property Calculator for Real Estate Investors",
  description:
    "Instantly calculate cash flow, cap rate, cash-on-cash return, and deal score for any rental property. Trusted by 100+ real estate investors.",
  openGraph: {
    title: "RentIQ — Free Rental Property Calculator",
    description:
      "Instantly calculate cash flow, cap rate, cash-on-cash return, and deal score for any rental property. Free to start.",
    url: "/",
  },
};

export default function Home() {
  return (
    <div>
      <Hero />
      <SocialProof />
      <ProductWalkthrough />
      <PricingSection />
    </div>
  );
}
