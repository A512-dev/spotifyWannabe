"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button, Input } from "@/components/ui";
import { useAuth } from "@/providers";

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    const result = requestPasswordReset(email);

    if (!result.ok) {
      setError(result.error ?? "Please enter a valid email.");
      return;
    }

    setSuccessMessage("If an account exists for this email, password recovery instructions have been sent.");
  };

  return (
    <AuthLayout
      description="Enter your account email to start password recovery."
      title="Reset password"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          autoComplete="email"
          label="Email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="maya@example.com"
          required
          type="email"
          value={email}
        />
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {successMessage ? <p className="text-sm text-brand-500">{successMessage}</p> : null}
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
