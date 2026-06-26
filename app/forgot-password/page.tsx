import Link from "next/link";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button, Input } from "@/components/ui";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      description="Password reset skeleton. Email delivery and token handling belong in the auth feature."
      title="Reset password"
    >
      <form className="space-y-4">
        {/* Replace with reset email request once backend auth exists. */}
        <Input label="Email" name="email" placeholder="maya@example.com" type="email" />
        <Button className="w-full" type="submit">
          Send reset link
        </Button>
      </form>
      <Link className="mt-4 block text-sm text-slate-400 hover:text-slate-50" href="/login">
        Back to login
      </Link>
    </AuthLayout>
  );
}

