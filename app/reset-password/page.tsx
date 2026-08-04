"use client";

import { Suspense, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button, Input } from "@/components/ui";
import { useAuth } from "@/providers";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const { confirmPasswordReset } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";
  const hasResetCredentials = Boolean(uid && token);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!hasResetCredentials) {
      setError("This reset link is incomplete or invalid.");
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const result = await confirmPasswordReset({
      uid,
      token,
      newPassword: password,
      newPasswordConfirmation: confirmation
    });
    setLoading(false);

    if (!result.ok) {
      setError(result.error ?? "The password could not be updated.");
      return;
    }
    setMessage("Your password was updated. You can now sign in.");
  };

  return (
    <AuthLayout description="Choose a new password for your SoundWave account." title="Create new password">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="New password"
          minLength={8}
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
        <Input
          label="Confirm new password"
          minLength={8}
          name="passwordConfirmation"
          onChange={(event) => setConfirmation(event.target.value)}
          required
          type="password"
          value={confirmation}
        />
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {message ? <p className="text-sm text-brand-500">{message}</p> : null}
        <Button className="w-full" disabled={loading || !hasResetCredentials} type="submit">
          {loading ? "Updating..." : "Update password"}
        </Button>
      </form>
      <Link className="mt-4 block text-sm text-slate-400 hover:text-slate-50" href="/login">
        Back to login
      </Link>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
