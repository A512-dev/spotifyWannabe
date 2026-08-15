from __future__ import annotations
from urllib.error import HTTPError, URLError

import json
import os
import uuid
import sys
from dataclasses import dataclass
from urllib.error import URLError
from urllib.request import Request, urlopen

from rest_framework.exceptions import APIException


class PaymentGatewayError(APIException):
    status_code = 502
    default_detail = "The payment gateway could not process the request."


@dataclass(frozen=True)
class PaymentRequestResult:
    authority: str
    payment_url: str
    raw: dict


@dataclass(frozen=True)
class PaymentVerificationResult:
    success: bool
    reference_id: str
    raw: dict


class LocalSandboxGateway:
    name = "local-sandbox"

    def request(self, *, transaction_id, amount_cents, currency, description, callback_url, email):
        authority = f"LOCAL-{uuid.uuid4().hex}"
        separator = "&" if "?" in callback_url else "?"
        payment_url = f"{callback_url}{separator}Authority={authority}&Status=OK&local=1"
        return PaymentRequestResult(authority=authority, payment_url=payment_url, raw={"sandbox": True})

    def verify(self, *, authority, amount_cents, status):
        success = status.upper() == "OK" and authority.startswith("LOCAL-")
        return PaymentVerificationResult(
            success=success,
            reference_id=f"LOCAL-REF-{authority[-12:]}" if success else "",
            raw={"sandbox": True, "status": status},
        )


class ZarinpalGateway:
    name = "zarinpal"

    def __init__(self) -> None:
        # Fallback to test merchant UUID if environment variable is not set
        self.merchant_id = os.getenv(
            "ZARINPAL_MERCHANT_ID",
            "c8d2f8b6-07c1-496c-9f4c-f8e8afae1955",
        ).strip()
        self.sandbox = os.getenv("ZARINPAL_SANDBOX", "true").strip().lower() in {"1", "true", "yes", "on"}

        host = "https://sandbox.zarinpal.com" if self.sandbox else "https://payment.zarinpal.com"
        self.request_url = f"{host}/pg/v4/payment/request.json"
        self.verify_url = f"{host}/pg/v4/payment/verify.json"
        self.start_url = f"{host}/pg/StartPay/"

    def _post(self, url: str, payload: dict) -> dict:
        request = Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            method="POST",
        )
        try:
            with urlopen(request, timeout=15) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            try:
                return json.loads(exc.read().decode("utf-8"))
            except Exception:
                raise PaymentGatewayError(f"Gateway HTTP error: {exc.code} {exc.reason}") from exc
        except (URLError, TimeoutError, ValueError) as exc:
            raise PaymentGatewayError(str(exc)) from exc

    def request(self, *, transaction_id, amount_cents, currency, description, callback_url, email):
        payload = {
            "merchant_id": self.merchant_id,
            "amount": int(amount_cents),
            "callback_url": callback_url,
            "description": description,
            "metadata": {"email": email, "order_id": str(transaction_id)},
        }
        raw = self._post(self.request_url, payload)
        data = raw.get("data") or {}

        # Zarinpal returns code 100 for a new payment request and 101 for an already initiated one
        if int(data.get("code", 0)) not in {100, 101} or not data.get("authority"):
            raise PaymentGatewayError(raw.get("errors") or "Payment request was rejected.")

        authority = str(data["authority"])
        return PaymentRequestResult(
            authority=authority,
            payment_url=f"{self.start_url}{authority}",
            raw=raw,
        )

    def verify(self, *, authority, amount_cents, status):
        if status.upper() != "OK":
            return PaymentVerificationResult(False, "", {"status": status})

        raw = self._post(
            self.verify_url,
            {
                "merchant_id": self.merchant_id,
                "amount": int(amount_cents),
                "authority": authority,
            },
        )
        data = raw.get("data") or {}
        code = int(data.get("code", 0))

        return PaymentVerificationResult(
            success=code in {100, 101},
            reference_id=str(data.get("ref_id") or ""),
            raw=raw,
        )


def get_gateway():
    # Automatically use local sandbox gateway when running automated tests
    if "test" in sys.argv:
        return LocalSandboxGateway()

    gateway_name = os.getenv("PAYMENT_GATEWAY", "local").lower()
    return ZarinpalGateway() if gateway_name == "zarinpal" else LocalSandboxGateway()