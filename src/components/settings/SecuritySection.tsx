"use client";

import { useState } from "react";
import { Eye, EyeOff, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

interface SecuritySectionProps {
  authProvider: "email" | "google";
  email: string;
}

export default function SecuritySection({
  authProvider,
  email,
}: SecuritySectionProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isFormValid =
    currentPassword.length > 0 &&
    newPassword.length >= 6 &&
    confirmPassword === newPassword &&
    newPassword !== currentPassword;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentPassword.length === 0) {
      newErrors.current = "Current password is required.";
    }
    if (newPassword.length < 6) {
      newErrors.new = "New password must be at least 6 characters.";
    }
    if (newPassword === currentPassword && newPassword.length > 0) {
      newErrors.new = "New password must differ from current password.";
    }
    if (confirmPassword !== newPassword) {
      newErrors.confirm = "Passwords do not match.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const supabase = createClient();

    try {
      // Step 1: Re-authenticate with current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (signInError) {
        setErrors({ current: "Current password is incorrect." });
        return;
      }

      // Step 2: Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        toast.error("Could not update password. Please try again.");
        return;
      }

      toast.success("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
    } catch {
      toast.error("Could not update password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authProvider === "google") {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Security
        </h2>
        <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <p className="text-sm text-gray-700">
            You signed in with Google. Password management is handled through
            your Google account.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
        Security
      </h2>

      <form onSubmit={(e) => void handleSubmit(e)} className="max-w-sm space-y-4">
        {/* Current Password */}
        <div className="space-y-1.5">
          <Label htmlFor="currentPassword" className="text-sm text-gray-600">
            Current Password
          </Label>
          <div className="relative">
            <Input
              id="currentPassword"
              type={showCurrent ? "text" : "password"}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              aria-invalid={!!errors.current}
              aria-describedby={errors.current ? "currentPassword-error" : undefined}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              aria-label={showCurrent ? "Hide password" : "Show password"}
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.current && (
            <p id="currentPassword-error" role="alert" className="text-xs text-red-500">{errors.current}</p>
          )}
        </div>

        {/* New Password */}
        <div className="space-y-1.5">
          <Label htmlFor="newPassword" className="text-sm text-gray-600">
            New Password
          </Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showNew ? "text" : "password"}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              aria-invalid={!!errors.new}
              aria-describedby={errors.new ? "newPassword-error" : undefined}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              aria-label={showNew ? "Hide password" : "Show password"}
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.new && (
            <p id="newPassword-error" role="alert" className="text-xs text-red-500">{errors.new}</p>
          )}
        </div>

        {/* Confirm New Password */}
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-sm text-gray-600">
            Confirm New Password
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={!!errors.confirm}
              aria-describedby={errors.confirm ? "confirmPassword-error" : undefined}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirm && (
            <p id="confirmPassword-error" role="alert" className="text-xs text-red-500">{errors.confirm}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className="bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
        </Button>
      </form>
    </section>
  );
}
