import Link from "next/link";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button, Input } from "@/components/ui";

export default function LoginPage() {
  return (
    <AuthLayout
      description="Mock login screen. Developer 1 can connect this form to real auth later."
      title="Log in"
    >
      <form className="space-y-4">
        {/* Add validation, auth API calls, and error display in the account feature area. */}
        <Input label="Email" name="email" placeholder="gheysar.listener@example.com" type="email" />
        <Input label="Password" name="password" placeholder="Enter your password" type="password" />
        <Button className="w-full" type="submit">
          Log in
        </Button>
      </form>
      <div className="mt-4 flex justify-between text-sm text-slate-400">
        <Link className="hover:text-slate-50" href="/forgot-password">
          Forgot password?
        </Link>
        <Link className="hover:text-slate-50" href="/signup">
          Create account
        </Link>
      </div>
    </AuthLayout>
  );
}
