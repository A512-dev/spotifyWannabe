"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { PageHeader, StatCard } from "@/components/shared";
import { Avatar, Button, Card, Input, Select } from "@/components/ui";
import { getProfileStats } from "@/data/profile-stats";
import { formatDate, formatNumber } from "@/lib/formatters";
import { getRoleLabel, getSubscriptionLabel } from "@/lib/labels";
import { canEditProfileImage } from "@/lib/subscription";
import { useAuth } from "@/providers";
import type { Gender } from "@/types/domain";

const genderOptions = [
  { label: "Select gender", value: "" },
  { label: "Female", value: "female" },
  { label: "Male", value: "male" },
  { label: "Other", value: "other" },
  { label: "Prefer not to say", value: "prefer_not_to_say" }
];

function getGenderLabel(gender?: Gender) {
  return genderOptions.find((option) => option.value === gender)?.label ?? "Not set";
}

export default function ProfilePage() {
  const { currentUser, updateCurrentUser } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setDisplayName(currentUser.displayName);
    setBirthDate(currentUser.birthDate ?? "");
    setGender(currentUser.gender ?? "");
    setAvatarUrl(currentUser.avatarUrl ?? "");
  }, [currentUser]);

  if (!currentUser) {
    return <MainAppLayout>Loading profile...</MainAppLayout>;
  }

  const stats = getProfileStats(currentUser.id);
  const canEditAvatar = canEditProfileImage(currentUser);

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }

    const result = updateCurrentUser({
      avatarUrl: canEditAvatar ? avatarUrl.trim() || undefined : currentUser.avatarUrl,
      birthDate: birthDate || undefined,
      displayName: displayName.trim(),
      gender: gender || undefined
    });

    if (!result.ok) {
      setError(result.error ?? "Could not update your profile.");
      return;
    }

    setSuccessMessage("Profile updated.");
  };

  return (
    <MainAppLayout>
      <PageHeader
        description="Manage your public identity, subscription status, and profile details."
        title="Profile"
      />
      <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card>
          <Avatar className="h-24 w-24 text-2xl" name={currentUser.displayName} src={currentUser.avatarUrl} />
          <h2 className="mt-4 text-xl font-semibold text-slate-50">{currentUser.displayName}</h2>
          <p className="text-sm text-slate-400">{currentUser.email}</p>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            <p>
              <span className="text-slate-500">Username:</span> {currentUser.username ?? currentUser.id}
            </p>
            <p>
              <span className="text-slate-500">Subscription:</span>{" "}
              {getSubscriptionLabel(currentUser.subscriptionTier)}
            </p>
            <p>
              <span className="text-slate-500">Birth date:</span>{" "}
              {currentUser.birthDate ? formatDate(currentUser.birthDate) : "Not set"}
            </p>
            <p>
              <span className="text-slate-500">Gender:</span> {getGenderLabel(currentUser.gender)}
            </p>
          </div>
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard label="Username" value={currentUser.username ?? currentUser.id} />
          <StatCard label="Role" value={getRoleLabel(currentUser.role)} />
          <StatCard label="Subscription" value={getSubscriptionLabel(currentUser.subscriptionTier)} />
          <StatCard label="Followers" value={formatNumber(stats.followerCount)} />
          <StatCard label="Following" value={formatNumber(stats.followingCount)} />
          <StatCard label="Daily streams" value={formatNumber(stats.dailyStreamCount)} />
        </div>
      </section>
      <section className="mt-6">
        <Card>
          <h2 className="text-lg font-semibold text-slate-50">Edit profile</h2>
          <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSave}>
            <Input
              label="Display name"
              name="displayName"
              onChange={(event) => setDisplayName(event.target.value)}
              required
              value={displayName}
            />
            <Input disabled label="Email" name="email" readOnly value={currentUser.email} />
            <Input disabled label="System username" name="username" readOnly value={currentUser.username ?? currentUser.id} />
            <Input
              label="Birth date"
              name="birthDate"
              onChange={(event) => setBirthDate(event.target.value)}
              type="date"
              value={birthDate}
            />
            <Select
              label="Gender"
              name="gender"
              onChange={(event) => setGender(event.target.value as Gender | "")}
              options={genderOptions}
              value={gender}
            />
            <Input
              disabled={!canEditAvatar}
              helperText={
                canEditAvatar
                  ? "Use a local path under /mock/avatars or another public image URL."
                  : "Profile image editing is locked for basic subscriptions."
              }
              label="Profile image URL"
              name="avatarUrl"
              onChange={(event) => setAvatarUrl(event.target.value)}
              value={avatarUrl}
            />
            <div className="md:col-span-2">
              {error ? <p className="mb-3 text-sm text-red-300">{error}</p> : null}
              {successMessage ? <p className="mb-3 text-sm text-brand-500">{successMessage}</p> : null}
              <Button type="submit">Save profile</Button>
            </div>
          </form>
        </Card>
      </section>
    </MainAppLayout>
  );
}
