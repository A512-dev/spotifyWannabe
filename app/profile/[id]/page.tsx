"use client";

import { use, useEffect, useState } from "react";
import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { EmptyState, PageHeader, StatCard } from "@/components/shared";
import { Avatar, Badge, Button, Card } from "@/components/ui";
import { accountApi } from "@/features/account/api";
import { ApiError } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/formatters";
import { getRoleLabel, getSubscriptionLabel } from "@/lib/labels";
import { useAuth } from "@/providers";
import type { PublicUser } from "@/types/domain";

export default function PublicUserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { currentUser } = useAuth();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void accountApi.getUser(id)
      .then(setUser)
      .catch((requestError) => setError(requestError instanceof ApiError ? requestError.message : "User could not be loaded."))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleFollow = async () => {
    if (!user) return;
    const result = user.isFollowing ? await accountApi.unfollowUser(user.id) : await accountApi.followUser(user.id);
    setUser((value) => value ? { ...value, isFollowing: result.isFollowing, followerCount: result.followerCount } : value);
  };

  if (loading) return <MainAppLayout>Loading user...</MainAppLayout>;
  if (!user) return <MainAppLayout><EmptyState description={error || "The requested user does not exist."} title="User not found" /></MainAppLayout>;

  return (
    <MainAppLayout>
      <PageHeader description="Public account information and listening summary." title={user.displayName} />
      <section className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <Avatar className="h-24 w-24 text-2xl" name={user.displayName} src={user.avatarUrl} />
          <h2 className="mt-4 text-xl font-semibold text-slate-50">{user.displayName}</h2>
          <p className="text-sm text-slate-400">@{user.username ?? user.id}</p>
          <div className="mt-4 flex flex-wrap gap-2"><Badge>{getRoleLabel(user.role)}</Badge><Badge tone={user.subscriptionTier === "gold" ? "success" : "neutral"}>{getSubscriptionLabel(user.subscriptionTier)}</Badge></div>
          {currentUser?.id !== user.id ? <Button className="mt-4 w-full" onClick={() => void toggleFollow()} variant={user.isFollowing ? "secondary" : "primary"}>{user.isFollowing ? "Unfollow" : "Follow"}</Button> : null}
        </Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Followers" value={formatNumber(user.followerCount ?? 0)} />
          <StatCard label="Following" value={formatNumber(user.followingCount ?? 0)} />
          <StatCard label="Daily streams" value={formatNumber(user.dailyStreamCount ?? 0)} />
          <StatCard label="Member since" value={formatDate(user.createdAt)} />
        </div>
      </section>
    </MainAppLayout>
  );
}
