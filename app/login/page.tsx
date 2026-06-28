"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button, Input } from "@/components/ui";
import { canAccessRoute } from "@/lib/permissions";
import { getPostLoginPath } from "@/lib/auth";
import { useAuth } from "@/providers";

function getSafeNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return null;
  }

  return nextPath;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const user = login(email, password);

    if (!user) {
      setError("Email or password is incorrect.");
      setIsSubmitting(false);
      return;
    }

    const nextPath = getSafeNextPath(searchParams.get("next"));
    const destination = nextPath && canAccessRoute(user, nextPath) ? nextPath : getPostLoginPath(user);

    router.push(destination);
  };

  return (
    <AuthLayout
      description="Use one shared login form for listeners, artists, support users, and admins."
      title="Log in"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          autoComplete="email"
          label="Email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="maya.listener@example.com"
          required
          type="email"
          value={email}
        />
        <Input
          autoComplete="current-password"
          label="Password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="password123"
          required
          type="password"
          value={password}
        />
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <Button className="w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Logging in..." : "Log in"}
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
