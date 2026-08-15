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
import { useAuth, useUserPreferences } from "@/providers";

export default function SettingsPage() {
  const router = useRouter();
  const { currentUser, deleteCurrentUser } = useAuth();
  const { locale, preferences: appliedPreferences, setLanguage, setPreferences: applyPreferences, t } = useUserPreferences();
  const [preferences, setPreferences] = useState<PreferenceResponse>(appliedPreferences);
  const [plans, setPlans] = useState<SubscriptionPlanApi[]>([]);
  const [selectedTier, setSelectedTier] = useState<"silver" | "gold">("silver");
  const [months, setMonths] = useState<1 | 3 | 6 | 12>(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    void planApi.list()
      .then(setPlans)
      .catch((requestError: Error) => setError(requestError.message));
  }, [currentUser]);

  useEffect(() => {
    setPreferences(appliedPreferences);
  }, [appliedPreferences]);

  const selectedPlan = useMemo(() => plans.find((plan) => plan.tier === selectedTier), [plans, selectedTier]);

  if (!mounted || !currentUser) {
    return (
      <MainAppLayout>
        <span suppressHydrationWarning>Loading...</span>
      </MainAppLayout>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccessMessage("");
    try {
      const next = await accountApi.updatePreferences(preferences);
      setPreferences(next);
      applyPreferences(next);
      setSuccessMessage(t("Settings saved."));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("Could not save settings."));
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
      setError(requestError instanceof Error ? requestError.message : t("Could not start payment."));
    }
  };

  const handleDeleteAccount = async () => {
    const result = await deleteCurrentUser();
    setDeleteDialogOpen(false);
    if (!result.ok) {
      setError(t(result.error ?? "Could not delete this account."));
      return;
    }
    router.replace("/signup");
  };

  return (
    <MainAppLayout>
      <PageHeader description={t("Manage synchronized preferences, subscription status, and account removal.")} title={t("Settings")} />
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-slate-50">{t("Preferences")}</h2>
          <div className="mt-4 space-y-4">
            <Select
              label={t("Language")}
              name="language"
              onChange={(event) => {
                const language = event.target.value as "en" | "fa";
                setPreferences((value) => ({ ...value, language }));
                setLanguage(language);
              }}
              options={[{ label: t("English"), value: "en" }, { label: t("Persian"), value: "fa" }]}
              value={preferences.language}
            />
            <Checkbox checked={preferences.systemSoundEnabled} label={t("System sounds")} name="systemSoundEnabled" onChange={(e) => setPreferences((v) => ({ ...v, systemSoundEnabled: e.target.checked }))} />
            <Checkbox checked={preferences.notificationsEnabled} label={t("Enable notifications")} name="notificationsEnabled" onChange={(e) => setPreferences((v) => ({ ...v, notificationsEnabled: e.target.checked }))} />
            <Checkbox checked={preferences.subscriptionNotifications} label={t("Subscription expiry notifications")} name="subscriptionNotifications" onChange={(e) => setPreferences((v) => ({ ...v, subscriptionNotifications: e.target.checked }))} />
            <Checkbox checked={preferences.followedArtistNotifications} label={t("Followed artist releases")} name="followedArtistNotifications" onChange={(e) => setPreferences((v) => ({ ...v, followedArtistNotifications: e.target.checked }))} />
            <Checkbox checked={preferences.supportNotifications} label={t("Support ticket notifications")} name="supportNotifications" onChange={(e) => setPreferences((v) => ({ ...v, supportNotifications: e.target.checked }))} />
            <Button disabled={saving} onClick={handleSave}>{saving ? t("Saving...") : t("Save preferences")}</Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-50">{t("Subscription")}</h2>
          <p className="mt-2 text-sm text-slate-400">{t("Current plan: {plan}", { plan: t(getSubscriptionLabel(currentUser.subscriptionTier)) })}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Select label={t("Plan")} name="plan" onChange={(e) => setSelectedTier(e.target.value as "silver" | "gold")} options={[{ label: t("Silver"), value: "silver" }, { label: t("Gold"), value: "gold" }]} value={selectedTier} />
            <Select label={t("Billing period")} name="months" onChange={(e) => setMonths(Number(e.target.value) as 1 | 3 | 6 | 12)} options={[1, 3, 6, 12].map((value) => ({ label: t("{count} month", { count: new Intl.NumberFormat(locale).format(value) }), value: String(value) }))} value={String(months)} />
          </div>
          {selectedPlan ? (
            <p className="mt-4 text-sm text-slate-300">
              {t("Total: {amount}", { amount: formatCurrencyFromCents(selectedPlan.periodPrices[String(months)] ?? selectedPlan.monthlyPriceCents * months, selectedPlan.currency, locale) })}
            </p>
          ) : null}
          <Button className="mt-4" onClick={handleUpgrade}>{t("Continue to payment")}</Button>
        </Card>
      </section>

      <section className="mt-6">
        <Card>
          <h2 className="text-lg font-semibold text-red-300">{t("Danger zone")}</h2>
          <p className="mt-2 text-sm text-slate-400">{t("Account deletion removes personal profile data and access immediately. Required accounting and support audit rows remain under an anonymous inactive user.")}</p>
          <Button className="mt-4" onClick={() => setDeleteDialogOpen(true)} variant="danger">{t("Delete account")}</Button>
        </Card>
      </section>

      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      {successMessage ? <p className="mt-4 text-sm text-brand-500">{successMessage}</p> : null}

      <ConfirmDialog
        confirmLabel={t("Delete account")}
        description={t("This action cannot be undone.")}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={() => void handleDeleteAccount()}
        open={deleteDialogOpen}
        title={t("Delete your account?")}
      />
    </MainAppLayout>
  );
}