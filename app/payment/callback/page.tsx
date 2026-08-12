"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { subscriptionApi } from "@/features/account/subscriptions";
import { useAuth, useUserPreferences } from "@/providers";

function CallbackContent() {
  const params = useSearchParams();
  const { refreshCurrentUser } = useAuth();
  const { t } = useUserPreferences();
  const [state, setState] = useState<"loading" | "success" | "failed">("loading");
  const [message, setMessage] = useState(() => t("Verifying payment..."));

  useEffect(() => {
    const authority = params.get("Authority") ?? "";
    const status = params.get("Status") ?? "";
    if (!authority) {
      setState("failed");
      setMessage(t("The payment authority is missing."));
      return;
    }
    void subscriptionApi.verify(authority, status)
      .then(async (payment) => {
        if (payment.status === "success") {
          await refreshCurrentUser();
          setState("success");
          setMessage(t("Payment verified. Reference: {reference}", { reference: payment.referenceId ?? t("available in payment history") }));
        } else {
          setState("failed");
          setMessage(t("Payment was {status}.", { status: payment.status }));
        }
      })
      .catch((error: Error) => {
        setState("failed");
        setMessage(error.message);
      });
  }, [params, refreshCurrentUser, t]);

  return (
    <AuthLayout description={message} title={t(state === "success" ? "Payment complete" : state === "failed" ? "Payment failed" : "Payment verification")}>
      <Link className="text-brand-500" href="/settings">{t("Return to settings")}</Link>
    </AuthLayout>
  );
}

export default function PaymentCallbackPage() {
  const { t } = useUserPreferences();
  return (
    <Suspense
      fallback={
        <AuthLayout description={t("Please wait.")} title={t("Payment verification")}>
          <p className="text-sm text-slate-400">{t("Verifying payment...")}</p>
        </AuthLayout>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
