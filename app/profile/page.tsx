"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { PageHeader, StatCard } from "@/components/shared";
import { Avatar, Button, Card, Input, Select } from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/formatters";
import { getRoleLabel, getSubscriptionLabel } from "@/lib/labels";
import { canEditProfileImage } from "@/lib/subscription";
import { useAuth, useUserPreferences } from "@/providers";
import type { Gender } from "@/types/domain";

export default function ProfilePage() {
  const { currentUser, updateCurrentUser } = useAuth();
  const { locale, t } = useUserPreferences();
  const genderOptions = [
    { label: t("Select gender"), value: "" },
    { label: t("Female"), value: "female" },
    { label: t("Male"), value: "male" },
    { label: t("Other"), value: "other" },
    { label: t("Prefer not to say"), value: "prefer_not_to_say" }
  ];
  const [displayName, setDisplayName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setDisplayName(currentUser.displayName);
    setBirthDate(currentUser.birthDate ?? "");
    setGender(currentUser.gender ?? "");
  }, [currentUser]);

  if (!currentUser) return <MainAppLayout>{t("Loading profile...")}</MainAppLayout>;

  const canEditAvatar = canEditProfileImage(currentUser);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    if (!displayName.trim()) {
      setError(t("Display name is required."));
      return;
    }
    setSaving(true);
    const result = await updateCurrentUser({
      avatarFile: canEditAvatar ? avatarFile : null,
      birthDate: birthDate || undefined,
      displayName: displayName.trim(),
      gender: gender || undefined
    });
    setSaving(false);
    if (!result.ok) {
      setError(t(result.error ?? "Could not update your profile."));
      return;
    }
    setAvatarFile(null);
    setSuccessMessage(t("Profile updated."));
  };

  return (
    <MainAppLayout>
      <PageHeader description={t("Manage your public identity, subscription status, and profile details.")} title={t("Profile")} />
      <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card>
          <Avatar className="h-24 w-24 text-2xl" name={currentUser.displayName} src={currentUser.avatarUrl} />
          <h2 className="mt-4 text-xl font-semibold text-slate-50">{currentUser.displayName}</h2>
          <p className="text-sm text-slate-400">{currentUser.email}</p>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            <p><span className="text-slate-500">{t("Username")}:</span> {currentUser.username ?? currentUser.id}</p>
            <p><span className="text-slate-500">{t("Subscription")}:</span> {t(getSubscriptionLabel(currentUser.subscriptionTier))}</p>
            <p><span className="text-slate-500">{t("Birth date")}:</span> {currentUser.birthDate ? formatDate(currentUser.birthDate, locale) : t("Not set")}</p>
          </div>
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard label={t("Username")} value={currentUser.username ?? currentUser.id} />
          <StatCard label={t("Role")} value={t(getRoleLabel(currentUser.role))} />
          <StatCard label={t("Subscription")} value={t(getSubscriptionLabel(currentUser.subscriptionTier))} />
          <StatCard label={t("Followers")} value={formatNumber(currentUser.followerCount ?? 0, locale)} />
          <StatCard label={t("Following")} value={formatNumber(currentUser.followingCount ?? 0, locale)} />
          <StatCard label={t("Daily streams")} value={formatNumber(currentUser.dailyStreamCount ?? 0, locale)} />
        </div>
      </section>
      <section className="mt-6">
        <Card>
          <h2 className="text-lg font-semibold text-slate-50">{t("Edit profile")}</h2>
          <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSave}>
            <Input label={t("Display name")} name="displayName" onChange={(e) => setDisplayName(e.target.value)} required value={displayName} />
            <Input disabled label={t("Email")} name="email" readOnly value={currentUser.email} />
            <Input label={t("Birth date")} name="birthDate" onChange={(e) => setBirthDate(e.target.value)} type="date" value={birthDate} />
            <Select label={t("Gender")} name="gender" onChange={(e) => setGender(e.target.value as Gender | "")} options={genderOptions} value={gender} />
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-200" htmlFor="avatarFile">{t("Profile image")}</label>
              <input disabled={!canEditAvatar} id="avatarFile" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} type="file" />
              {!canEditAvatar ? <p className="mt-1 text-xs text-slate-500">{t("Profile images require Silver or Gold.")}</p> : null}
            </div>
            <div className="md:col-span-2">
              {error ? <p className="mb-3 text-sm text-red-300">{error}</p> : null}
              {successMessage ? <p className="mb-3 text-sm text-brand-500">{successMessage}</p> : null}
              <Button disabled={saving} type="submit">{saving ? t("Saving...") : t("Save profile")}</Button>
            </div>
          </form>
        </Card>
      </section>
    </MainAppLayout>
  );
}
