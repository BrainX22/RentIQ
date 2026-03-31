"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProfileSectionProps {
  displayName: string;
  email: string;
  createdAt: string;
  onDisplayNameUpdate: (name: string) => void;
}

function formatMemberSince(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function ProfileSection({
  displayName,
  email,
  createdAt,
  onDisplayNameUpdate,
}: ProfileSectionProps) {
  const [name, setName] = useState(displayName);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isChanged = name.trim() !== displayName;
  const trimmedName = name.trim();
  const isValid = trimmedName.length >= 1 && trimmedName.length <= 50;

  const handleBlur = () => {
    if (trimmedName.length === 0) {
      setError("Display name is required.");
    } else if (trimmedName.length > 50) {
      setError("Display name must be 50 characters or fewer.");
    } else {
      setError(null);
    }
  };

  const handleSave = async () => {
    if (!isChanged || !isValid) return;
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: trimmedName }),
      });

      const payload = (await res.json()) as {
        error?: string;
        profile?: { display_name: string };
      };

      if (!res.ok) {
        toast.error(payload.error ?? "Could not update display name.");
        return;
      }

      toast.success("Display name updated.");
      onDisplayNameUpdate(payload.profile?.display_name ?? trimmedName);
    } catch {
      toast.error("Could not update display name. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
        Profile
      </h2>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="displayName" className="text-sm text-gray-600">
            Display Name
          </Label>
          <div className="flex gap-2">
            <Input
              id="displayName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleBlur}
              maxLength={50}
              aria-describedby={error ? "displayName-error" : undefined}
              aria-invalid={!!error}
              className="max-w-xs"
            />
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={!isChanged || !isValid || isSaving}
              className="bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
          {error && (
            <p id="displayName-error" role="alert" className="text-xs text-red-500">
              {error}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-sm text-gray-600">Email</p>
          <p className="text-sm text-gray-900">{email}</p>
        </div>

        <div className="space-y-1">
          <p className="text-sm text-gray-600">Member since</p>
          <p className="text-sm text-gray-900">{formatMemberSince(createdAt)}</p>
        </div>
      </div>
    </section>
  );
}
