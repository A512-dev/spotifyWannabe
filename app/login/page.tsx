"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import type { FormEvent } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button, Input } from "@/components/ui";
import { canAccessRoute } from "@/lib/permissions";
import { getPostLoginPath } from "@/lib/auth";
import { useAuth, useUserPreferences } from "@/providers";

function getSafeNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) return null;
  return nextPath;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { t } = useUserPreferences();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const result = await login(email, password);
    if (!result.ok || !result.data) {
      setError(t(result.error ?? "Email or password is incorrect."));
      setIsSubmitting(false);
      return;
    }
    const nextPath = getSafeNextPath(searchParams.get("next"));
    const destination = nextPath && canAccessRoute(result.data, nextPath) ? nextPath : getPostLoginPath(result.data);
    router.push(destination);
  };

  return (
    <>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input autoComplete="email" label={t("Email")} name="email" onChange={(e) => setEmail(e.target.value)} required type="email" value={email} />
        <Input autoComplete="current-password" label={t("Password")} name="password" onChange={(e) => setPassword(e.target.value)} required type="password" value={password} />
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <Button className="w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? t("Logging in...") : t("Log in")}
        </Button>
      </form>
      <div className="mt-4 flex justify-between text-sm text-slate-400">
        <Link className="hover:text-slate-50" href="/forgot-password">{t("Forgot password?")}</Link>
        <Link className="hover:text-slate-50" href="/signup">{t("Create account")}</Link>
      </div>
    </>
  );
}

export default function LoginPage() {
  const { t } = useUserPreferences();
  return (
    <AuthLayout description={t("Use one shared login form for listeners, artists, support users, and admins.")} title={t("Log in")}>
      <Suspense fallback={<p className="text-sm text-slate-400">{t("Loading login form...")}</p>}><LoginForm /></Suspense>
    </AuthLayout>
  );
}
