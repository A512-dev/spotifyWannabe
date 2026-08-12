"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button, Input } from "@/components/ui";
import { useAuth, useUserPreferences } from "@/providers";

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const { t } = useUserPreferences();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const result = await requestPasswordReset(email);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? t("Could not request a password reset."));
      return;
    }
    setMessage(t("If the account exists, reset instructions were sent."));
  };

  return (
    <AuthLayout description={t("Enter your account email to request secure reset instructions.")} title={t("Reset password")}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input label={t("Email")} name="email" onChange={(e) => setEmail(e.target.value)} required type="email" value={email} />
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {message ? <p className="text-sm text-brand-500">{message}</p> : null}
        <Button className="w-full" disabled={loading} type="submit">{loading ? t("Sending...") : t("Send reset instructions")}</Button>
      </form>
      <Link className="mt-4 block text-sm text-slate-400 hover:text-slate-50" href="/login">{t("Back to login")}</Link>
    </AuthLayout>
  );
}
