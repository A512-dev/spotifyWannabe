"use client";

import { MainAppLayout } from "@/components/layout/MainAppLayout";
import { PageHeader } from "@/components/shared";
import { Button, Card, Checkbox, Input, Select } from "@/components/ui";
import { canEditProfileImage } from "@/lib/subscription";
import { useAuth } from "@/providers";

export default function SettingsPage() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <MainAppLayout>Loading settings...</MainAppLayout>;
  }

  return (
    <MainAppLayout>
      <PageHeader
        description="Settings skeleton for account preferences, privacy, subscription controls, and notifications."
        title="Settings"
      />
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          {/* Developer 1 can split this into account, privacy, and billing forms later. */}
          <h2 className="text-lg font-semibold text-slate-50">Account preferences</h2>
          <div className="mt-4 space-y-4">
            <Input defaultValue={currentUser.displayName} label="Display name" name="displayName" />
            <Select
              defaultValue={currentUser.subscriptionTier}
              label="Subscription tier"
              name="subscriptionTier"
              options={[
                { label: "Basic", value: "basic" },
                { label: "Silver", value: "silver" },
                { label: "Gold", value: "gold" }
              ]}
            />
            <Checkbox defaultChecked label="Email me about playlist activity" name="playlistEmails" />
            <Button>Save preferences</Button>
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold text-slate-50">Subscription permissions</h2>
          <p className="mt-3 text-sm text-slate-400">
            Profile image editing is currently {canEditProfileImage(currentUser) ? "available" : "locked"} for this
            user. Developer 1 can replace this copy with upgrade prompts.
          </p>
        </Card>
      </section>
    </MainAppLayout>
  );
}
