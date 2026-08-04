# Subscriptions and payments

Tracks active/expired subscriptions, supports 1/3/6/12-month purchases, records payment
states, and activates plans only after verification. Local sandbox is the default for
development. Set PAYMENT_GATEWAY=zarinpal and configure ZARINPAL_MERCHANT_ID for the
external gateway adapter.

Expiry and seven-day warning processing is idempotent and request-driven during normal
use. `python manage.py process_subscription_expiry` exposes the same service for a daily
production scheduler.
