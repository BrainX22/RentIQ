"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SettingsHeader from "@/components/settings/SettingsHeader";
import ProfileSection from "@/components/settings/ProfileSection";
import SubscriptionSection from "@/components/settings/SubscriptionSection";
import PropertiesPreview from "@/components/settings/PropertiesPreview";
import SecuritySection from "@/components/settings/SecuritySection";
import DangerZone from "@/components/settings/DangerZone";
import SettingsSkeleton from "@/components/settings/SettingsSkeleton";

interface ProfileData {
  profile: {
    display_name: string;
    email: string;
    created_at: string;
    auth_provider: "email" | "google";
  };
  subscription: {
    plan_type: "free" | "pro" | "max";
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    cancel_at: string | null;
  };
  usage: {
    saves_this_month: number;
    total_properties: number;
  };
  recent_properties: Array<{
    id: string;
    property_name: string;
    monthly_cash_flow: number;
    created_at: string;
  }>;
}

export default function SettingsPage() {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        setError(payload.error ?? "Could not load settings.");
        return;
      }
      const payload = (await res.json()) as ProfileData;
      setData(payload);
    } catch {
      setError("Could not load settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const handleDisplayNameUpdate = (newName: string) => {
    setData((prev) =>
      prev ? { ...prev, profile: { ...prev.profile, display_name: newName } } : prev
    );
  };

  const handleAccountDeleted = () => {
    router.push("/");
  };

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <p className="py-24 text-center text-sm text-red-600">
          {error ?? "Something went wrong."}
        </p>
      </main>
    );
  }

  const { profile, subscription, usage, recent_properties } = data;

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-12 sm:px-6">
      <SettingsHeader
        displayName={profile.display_name}
        planType={subscription.plan_type}
        currentPeriodEnd={subscription.current_period_end}
      />

      <ProfileSection
        displayName={profile.display_name}
        email={profile.email}
        createdAt={profile.created_at}
        onDisplayNameUpdate={handleDisplayNameUpdate}
      />

      <SubscriptionSection
        planType={subscription.plan_type}
        status={subscription.status}
        currentPeriodEnd={subscription.current_period_end}
        cancelAtPeriodEnd={subscription.cancel_at_period_end}
        cancelAt={subscription.cancel_at}
        savesThisMonth={usage.saves_this_month}
        totalProperties={usage.total_properties}
      />

      <PropertiesPreview
        properties={recent_properties}
        totalCount={usage.total_properties}
      />

      <SecuritySection
        authProvider={profile.auth_provider}
        email={profile.email}
      />

      <DangerZone onAccountDeleted={handleAccountDeleted} />
    </main>
  );
}
