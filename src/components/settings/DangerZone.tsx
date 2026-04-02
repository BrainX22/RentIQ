"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DangerZoneProps {
  onAccountDeleted: () => void;
}

export default function DangerZone({ onAccountDeleted }: DangerZoneProps) {
  const [confirmation, setConfirmation] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const isConfirmed = confirmation === "DELETE" && currentPassword.length > 0;

  const handleDelete = async () => {
    if (!isConfirmed) return;
    setIsDeleting(true);

    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE", currentPassword }),
      });

      const payload = (await res.json()) as { error?: string; deleted?: boolean };

      if (!res.ok || !payload.deleted) {
        toast.error(payload.error ?? "Could not delete account. Please try again.");
        return;
      }

      toast.success("Account scheduled for deletion.");
      onAccountDeleted();
    } catch {
      toast.error("Could not delete account. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="rounded-xl border border-red-200 bg-red-50/30 p-6 shadow-sm">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-red-600">
        Danger Zone
      </h2>
      <p className="mb-4 text-sm text-gray-600">
        Permanently delete your account and all associated data. Your data will
        be recoverable for 30 days after deletion.
      </p>

      {!isOpen ? (
        <Button
          type="button"
          onClick={() => setIsOpen(true)}
          className="gap-1.5 bg-red-600 text-white hover:bg-red-700"
        >
          <AlertTriangle className="h-4 w-4" />
          Delete Account
        </Button>
      ) : (
        <div className="space-y-3 rounded-lg border border-red-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-900">
            Are you sure? This will cancel your subscription and mark your
            account for deletion.
          </p>
          <p className="text-sm text-gray-600">
            Type <strong>DELETE</strong> to confirm.
          </p>
          <Input
            id="deleteConfirmation"
            aria-label="Type DELETE to confirm account deletion"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="DELETE"
            autoComplete="off"
            className="max-w-xs"
          />
          <div className="space-y-1.5">
            <Label htmlFor="deletePassword" className="text-sm text-gray-700">
              Current password
            </Label>
            <Input
              id="deletePassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your password"
              className="max-w-xs"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setConfirmation("");
                setCurrentPassword("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!isConfirmed || isDeleting}
              onClick={() => void handleDelete()}
              className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete My Account"
              )}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
