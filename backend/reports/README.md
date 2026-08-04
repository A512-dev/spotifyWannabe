# Reports and artist accounting

This app owns the phase-2 reporting boundary for artist, support, and administrator dashboards.

## Responsibilities

- Monthly artist accounting rows with unique listener and stream totals.
- Backend calculation of the artist net payout from gross revenue and platform fee.
- Administrator-only settlement confirmation with an audit timestamp and actor.
- Artist-only financial overview for the authenticated approved artist.
- Support overview for ticket and artist-application queues.
- Administrator overview that aggregates accounting and operations data in the backend.
- Current subscription-tier distribution and verified subscription sales by currency.

## Formula boundary

The project statement says artist rewards depend on unique listeners and streams, but the supplied PDF does not provide a concrete numerical formula. Therefore the administrator supplies explicit per-stream and per-unique-listener rates. The backend aggregates verified stream events, calculates the gross amount and platform fee, and stores an auditable monthly record. No financial aggregation is delegated to the frontend.

## Endpoints

- `GET /api/reports/artist-revenue/`
- `POST /api/reports/artist-revenue/` (administrator only)
- `POST /api/reports/artist-revenue/generate/` (administrator only; aggregates stream events)
- `GET /api/reports/artist-revenue/{id}/`
- `POST /api/reports/artist-revenue/{id}/settle/` (administrator only)
- `GET /api/reports/artist/overview/`
- `GET /api/reports/support/overview/`
- `GET /api/reports/admin/overview/`
