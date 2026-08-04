# Operations API

This app owns administrator-controlled subscription pricing.

## Responsibilities

- Persist Basic, Silver, and Gold plan rules.
- Keep Silver and Gold prices changeable without code changes.
- Produce quotes for 1, 3, 6, and 12 month billing periods.
- Restrict price changes and price history to the single administrator.
- Record an audit row for every actual price change.

The plan feature flags follow the project statement and are not editable through the API.
User subscriptions and payment transactions remain in the account/subscription domain.
