"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { subscriptionApi } from "@/features/account/subscriptions";
import { useAuth } from "@/providers";

function CallbackContent() {
  const params = useSearchParams();
  const { refreshCurrentUser } = useAuth();
  const [state, setState] = useState<"loading" | "success" | "failed">("loading");
  const [message, setMessage] = useState("Verifying payment...");

  useEffect(() => {
    const authority = params.get("Authority") ?? "";
    const status = params.get("Status") ?? "";
    if (!authority) {
      setState("failed");
      setMessage("The payment authority is missing.");
      return;
    }
    void subscriptionApi.verify(authority, status)
      .then(async (payment) => {
        if (payment.status === "success") {
          await refreshCurrentUser();
          setState("success");
          setMessage(`Payment verified. Reference: ${payment.referenceId ?? "available in payment history"}`);
        } else {
          setState("failed");
          setMessage(`Payment was ${payment.status}.`);
        }
      })
      .catch((error: Error) => {
        setState("failed");
        setMessage(error.message);
      });
  }, [params, refreshCurrentUser]);

  return (
    <AuthLayout description={message} title={state === "success" ? "Payment complete" : state === "failed" ? "Payment failed" : "Payment verification"}>
      <Link className="text-brand-500" href="/settings">Return to settings</Link>
    </AuthLayout>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout description="Please wait." title="Payment verification">
          <p className="text-sm text-slate-400">Verifying payment...</p>
        </AuthLayout>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
