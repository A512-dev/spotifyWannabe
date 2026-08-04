"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { ConfirmDialog, PageHeader } from "@/components/shared";
import { Button, Card, Checkbox, Select } from "@/components/ui";
import { accountApi, type PreferenceResponse } from "@/features/account/api";
import { planApi, type SubscriptionPlanApi } from "@/features/account/plans";
import { subscriptionApi } from "@/features/account/subscriptions";
import { formatCurrencyFromCents } from "@/lib/formatters";
import { getSubscriptionLabel } from "@/lib/labels";
import { useAuth } from "@/providers";

const defaultPreferences: PreferenceResponse = {
  language: "en",
  systemSoundEnabled: true,
  notificationsEnabled: true,
  subscriptionNotifications: true,
  followedArtistNotifications: true,
  supportNotifications: true
};

export default function SettingsPage() {
  const router = useRouter();
  const { currentUser, deleteCurrentUser } = useAuth();
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [plans, setPlans] = useState<SubscriptionPlanApi[]>([]);
  const [selectedTier, setSelectedTier] = useState<"silver" | "gold">("silver");
  const [months, setMonths] = useState<1 | 3 | 6 | 12>(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    void Promise.all([accountApi.getPreferences(), planApi.list()])
      .then(([prefs, planRows]) => {
        setPreferences(prefs);
        setPlans(planRows);
      })
      .catch((requestError: Error) => setError(requestError.message));
  }, [currentUser]);

  const selectedPlan = useMemo(() => plans.find((plan) => plan.tier === selectedTier), [plans, selectedTier]);

  if (!currentUser) return <MainAppLayout>Loading settings...</MainAppLayout>;

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      const next = await accountApi.updatePreferences(preferences);
      setPreferences(next);
      setSuccessMessage("Settings saved.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpgrade = async () => {
    setError("");
    try {
      const callbackUrl = `${window.location.origin}/payment/callback`;
      const result = await subscriptionApi.initiate(selectedTier, months, callbackUrl);
      window.location.assign(result.paymentUrl);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not start payment.");
    }
  };

  const handleDeleteAccount = async () => {
    const result = await deleteCurrentUser();
    setDeleteDialogOpen(false);
    if (!result.ok) {
      setError(result.error ?? "Could not delete this account.");
      return;
    }
    router.replace("/signup");
  };

  return (
    <MainAppLayout>
      <PageHeader description="Manage synchronized preferences, subscription status, and account removal." title="Settings" />
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-slate-50">Preferences</h2>
          <div className="mt-4 space-y-4">
            <Select
              label="Language"
              name="language"
              onChange={(event) => setPreferences((value) => ({ ...value, language: event.target.value as "en" | "fa" }))}
              options={[{ label: "English", value: "en" }, { label: "Persian", value: "fa" }]}
              value={preferences.language}
            />
            <Checkbox checked={preferences.systemSoundEnabled} label="System sounds" name="systemSoundEnabled" onChange={(e) => setPreferences((v) => ({ ...v, systemSoundEnabled: e.target.checked }))} />
            <Checkbox checked={preferences.notificationsEnabled} label="Enable notifications" name="notificationsEnabled" onChange={(e) => setPreferences((v) => ({ ...v, notificationsEnabled: e.target.checked }))} />
            <Checkbox checked={preferences.subscriptionNotifications} label="Subscription expiry notifications" name="subscriptionNotifications" onChange={(e) => setPreferences((v) => ({ ...v, subscriptionNotifications: e.target.checked }))} />
            <Checkbox checked={preferences.followedArtistNotifications} label="Followed artist releases" name="followedArtistNotifications" onChange={(e) => setPreferences((v) => ({ ...v, followedArtistNotifications: e.target.checked }))} />
            <Checkbox checked={preferences.supportNotifications} label="Support ticket notifications" name="supportNotifications" onChange={(e) => setPreferences((v) => ({ ...v, supportNotifications: e.target.checked }))} />
            <Button disabled={saving} onClick={handleSave}>{saving ? "Saving..." : "Save preferences"}</Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-50">Subscription</h2>
          <p className="mt-2 text-sm text-slate-400">Current plan: {getSubscriptionLabel(currentUser.subscriptionTier)}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Select label="Plan" name="plan" onChange={(e) => setSelectedTier(e.target.value as "silver" | "gold")} options={[{ label: "Silver", value: "silver" }, { label: "Gold", value: "gold" }]} value={selectedTier} />
            <Select label="Billing period" name="months" onChange={(e) => setMonths(Number(e.target.value) as 1 | 3 | 6 | 12)} options={[1, 3, 6, 12].map((value) => ({ label: `${value} month${value > 1 ? "s" : ""}`, value: String(value) }))} value={String(months)} />
          </div>
          {selectedPlan ? (
            <p className="mt-4 text-sm text-slate-300">
              Total: {formatCurrencyFromCents(selectedPlan.periodPrices[String(months)] ?? selectedPlan.monthlyPriceCents * months, selectedPlan.currency)}
            </p>
          ) : null}
          <Button className="mt-4" onClick={handleUpgrade}>Continue to payment</Button>
        </Card>
      </section>

      <section className="mt-6">
        <Card>
          <h2 className="text-lg font-semibold text-red-300">Danger zone</h2>
          <p className="mt-2 text-sm text-slate-400">Deleting the account removes profile, playlists, history, notifications, and owned support data according to backend relationships.</p>
          <Button className="mt-4" onClick={() => setDeleteDialogOpen(true)} variant="danger">Delete account</Button>
        </Card>
      </section>

      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      {successMessage ? <p className="mt-4 text-sm text-brand-500">{successMessage}</p> : null}

      <ConfirmDialog
        confirmLabel="Delete account"
        description="This action cannot be undone."
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={() => void handleDeleteAccount()}
        open={deleteDialogOpen}
        title="Delete your account?"
      />
    </MainAppLayout>
  );
}
