import Link from "next/link";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button, Input, Select } from "@/components/ui";

export default function SignupPage() {
  return (
    <AuthLayout
      description="Account creation skeleton with role and subscription options for Phase 1 testing."
      title="Create account"
    >
      <form className="space-y-4">
        {/* Developer 1 owns validation, invitation flows, and API integration here. */}
        <Input label="Display name" name="displayName" placeholder="Maya Stone" />
        <Input label="Email" name="email" placeholder="maya@example.com" type="email" />
        <Select
          label="Role"
          name="role"
          options={[
            { label: "Listener", value: "listener" },
            { label: "Artist", value: "artist" }
          ]}
        />
        <Select
          label="Subscription"
          name="subscriptionTier"
          options={[
            { label: "Basic", value: "basic" },
            { label: "Silver", value: "silver" },
            { label: "Gold", value: "gold" }
          ]}
        />
        <Button className="w-full" type="submit">
          Sign up
        </Button>
      </form>
      <p className="mt-4 text-sm text-slate-400">
        Already have an account?{" "}
        <Link className="text-slate-100 hover:text-brand-500" href="/login">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
