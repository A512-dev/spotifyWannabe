import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { PageHeader, StatCard } from "@/components/shared";
import { Avatar, Button, Card } from "@/components/ui";
import { currentUser } from "@/data/current-user";
import { getRoleLabel, getSubscriptionLabel } from "@/lib/labels";
import { canEditProfileImage } from "@/lib/subscription";

export default function ProfilePage() {
  return (
    <MainAppLayout>
      <PageHeader
        description="Account profile skeleton for identity, subscription, and public profile controls."
        title="Profile"
      />
      <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card>
          {/* Developer 1 can connect image upload and profile editing here. */}
          <Avatar className="h-20 w-20 text-xl" name={currentUser.displayName} src={currentUser.avatarUrl} />
          <h2 className="mt-4 text-xl font-semibold text-slate-50">{currentUser.displayName}</h2>
          <p className="text-sm text-slate-400">{currentUser.email}</p>
          <Button className="mt-4" disabled={!canEditProfileImage(currentUser)} variant="secondary">
            Edit profile image
          </Button>
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard label="Role" value={getRoleLabel(currentUser.role)} />
          <StatCard label="Subscription" value={getSubscriptionLabel(currentUser.subscriptionTier)} />
          <StatCard label="Email verified" value={currentUser.isEmailVerified ? "Yes" : "No"} />
          <StatCard label="Artist profile" value={currentUser.artistProfileId ?? "Not linked"} />
        </div>
      </section>
    </MainAppLayout>
  );
}

