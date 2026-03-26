import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Properties",
  description: "Your saved rental property analyses.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
