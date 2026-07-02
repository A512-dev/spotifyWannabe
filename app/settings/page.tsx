"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { ConfirmDialog, PageHeader } from "@/components/shared";
import { Button, Card, Select } from "@/components/ui";
import { subscriptionPrices } from "@/data/subscription-prices";
import { formatCurrencyFromCents } from "@/lib/formatters";
import { getSubscriptionLabel } from "@/lib/labels";
import { canEditProfileImage } from "@/lib/subscription";
import { useAuth } from "@/providers";

type NotificationLimit = "all" | "important_only" | "muted";
type SystemSound = "default" | "soft" | "off";
type LanguagePreference = "en" | "fa";

interface UserSettingsPreferences {
  language: LanguagePreference;
  notificationLimit: NotificationLimit;
  systemSound: SystemSound;
}

const defaultPreferences: UserSettingsPreferences = {
  language: "en",
  notificationLimit: "all",
  systemSound: "default"
};

function getPreferencesKey(userId: string) {
  return `soundwave.preferences.${userId}`;
}

function readPreferences(userId: string): UserSettingsPreferences {
  const storedValue = window.localStorage.getItem(getPreferencesKey(userId));

  if (!storedValue) {
    return defaultPreferences;
  }

  try {
    return {
      ...defaultPreferences,
      ...(JSON.parse(storedValue) as Partial<UserSettingsPreferences>)
    };
  } catch {
    return defaultPreferences;
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const { currentUser, deleteCurrentUser } = useAuth();
  const [preferences, setPreferences] = useState<UserSettingsPreferences>(defaultPreferences);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setPreferences(readPreferences(currentUser.id));
  }, [currentUser]);

  if (!currentUser) {
    return <MainAppLayout>Loading settings...</MainAppLayout>;
  }

  const subscriptionPrice = subscriptionPrices.find((item) => item.tier === currentUser.subscriptionTier);

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    window.localStorage.setItem(getPreferencesKey(currentUser.id), JSON.stringify(preferences));
    setError("");
    setSuccessMessage("Settings saved.");
  };

  const handleDeleteAccount = () => {
    const result = deleteCurrentUser();

    if (!result.ok) {
      setError(result.error ?? "Could not delete this account.");
      setDeleteDialogOpen(false);
      return;
    }

    router.replace("/signup");
  };

  return (
    <MainAppLayout>
      <PageHeader
        description="Manage account preferences, notification behavior, subscription status, and account removal."
        title="Settings"
      />
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-slate-50">Preferences</h2>
          <form className="mt-4 space-y-4" onSubmit={handleSave}>
            <Select
              label="Notification limit"
              name="notificationLimit"
              onChange={(event) =>
                setPreferences((value) => ({
                  ...value,
                  notificationLimit: event.target.value as NotificationLimit
                }))
              }
              options={[
                { label: "All notifications", value: "all" },
                { label: "Important only", value: "important_only" },
                { label: "Muted", value: "muted" }
              ]}
              value={preferences.notificationLimit}
            />
            <Select
              label="System sound"
              name="systemSound"
              onChange={(event) =>
                setPreferences((value) => ({
                  ...value,
                  systemSound: event.target.value as SystemSound
                }))
              }
              options={[
                { label: "Default", value: "default" },
                { label: "Soft", value: "soft" },
                { label: "Off", value: "off" }
              ]}
              value={preferences.systemSound}
            />
            <Select
              label="Language"
              name="language"
              onChange={(event) =>
                setPreferences((value) => ({
                  ...value,
                  language: event.target.value as LanguagePreference
                }))
              }
              options={[
                { label: "English", value: "en" },
                { label: "Persian", value: "fa" }
              ]}
              value={preferences.language}
            />
            {successMessage ? <p className="text-sm text-brand-500">{successMessage}</p> : null}
            <Button type="submit">Save settings</Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-50">Subscription</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <p>
              <span className="text-slate-500">Current tier:</span>{" "}
              {getSubscriptionLabel(currentUser.subscriptionTier)}
            </p>
            <p>
              <span className="text-slate-500">Monthly price:</span>{" "}
              {subscriptionPrice
                ? formatCurrencyFromCents(subscriptionPrice.monthlyPriceCents, subscriptionPrice.currency)
                : "Not available"}
            </p>
            <p>
              <span className="text-slate-500">Profile image editing:</span>{" "}
              {canEditProfileImage(currentUser) ? "Available" : "Locked"}
            </p>
          </div>
          <Button className="mt-5" disabled variant="secondary">
            Payment opens in Phase 2
          </Button>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-50">Delete account</h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-400">
            This removes the current mock user and signs you out of this browser session.
          </p>
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          <Button className="mt-5" onClick={() => setDeleteDialogOpen(true)} variant="danger">
            Delete account
          </Button>
        </Card>
      </section>
      <ConfirmDialog
        confirmLabel="Delete account"
        description="This action removes your mock account from local storage and cannot be undone in this session."
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteAccount}
        open={deleteDialogOpen}
        title="Delete account?"
      />
    </MainAppLayout>
  );
}
