"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button, Input } from "@/components/ui";
import { useAuth } from "@/providers";

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
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
      setError(result.error ?? "Could not request a password reset.");
      return;
    }
    setMessage("If the account exists, reset instructions were sent.");
  };

  return (
    <AuthLayout description="Enter your account email to request secure reset instructions." title="Reset password">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input label="Email" name="email" onChange={(e) => setEmail(e.target.value)} required type="email" value={email} />
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {message ? <p className="text-sm text-brand-500">{message}</p> : null}
        <Button className="w-full" disabled={loading} type="submit">{loading ? "Sending..." : "Send reset instructions"}</Button>
      </form>
      <Link className="mt-4 block text-sm text-slate-400 hover:text-slate-50" href="/login">Back to login</Link>
    </AuthLayout>
  );
}
