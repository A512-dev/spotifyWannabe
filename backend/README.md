# SoundWave Backend

Django REST Framework backend for Phase 2 of SoundWave.

## Application Ownership

| Application | Main responsibility |
|---|---|
| `accounts` | Registration, login/logout, profiles, preferences, follows |
| `artists` | Artist applications, samples, approval, rejection, artist profiles |
| `music` | Genres, tracks, albums, uploads, streams, listening history |
| `playlists` | Playlist CRUD, ownership, ordering, subscription limits |
| `subscriptions` | Payment transactions, activation, renewal, expiry |
| `notifications` | Persistent notifications and read/delete actions |
| `support` | Tickets, replies, internal notes, assignment, status transitions |
| `operations` | Dynamic subscription plans and price audit history |
| `reports` | Aggregated reports, artist accounting, settlements |
| `common` | Health check, permissions, pagination, shared exceptions |

## Local Setup

From the repository root:

```powershell
py -m venv .\backend\.venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
. .\backend\.venv\Scripts\Activate.ps1
python -m pip install -r .\backend\requirements.txt

if (!(Test-Path .\backend\.env)) {
    Copy-Item .\backend\.env.example .\backend\.env
}

cd backend
python manage.py migrate
python manage.py check
```

The committed migrations are sufficient for normal setup. Verify model and migration consistency with:

```powershell
python manage.py makemigrations --check --dry-run
```

Expected output:

```text
No changes detected
```

## Running the Backend

```powershell
python manage.py runserver 127.0.0.1:8000
```

Health check:

```text
http://127.0.0.1:8000/api/health/
```

Django administration:

```text
http://127.0.0.1:8000/admin/
```

## Tests

```powershell
python manage.py check
python manage.py test -v 2
```

Validated result on the delivery version:

```text
Found 120 test(s).
...
OK
```

## Environment

The default local database is SQLite. PostgreSQL can be enabled through the variables in `.env`.

The default payment gateway is:

```text
PAYMENT_GATEWAY=local
```

Uploaded files are stored under:

```text
backend/media/
```

When `DEBUG=true`, Django serves local media files during development. In the Docker deployment, Nginx serves `/media/` and `/static/` from shared named volumes while Django runs with `DEBUG=false`.

## Authentication and Roles

DRF token authentication is used by the frontend API client.

- Django superuser: administrator
- User in the `support` group: support agent
- User with an approved artist profile: artist
- Other authenticated user: listener

Backend permissions enforce both role-based and subscription-based restrictions.

## API Prefixes

- `/api/accounts/`
- `/api/artists/`
- `/api/music/`
- `/api/playlists/`
- `/api/subscriptions/`
- `/api/notifications/`
- `/api/support/`
- `/api/reports/`
- `/api/operations/`

## Subscription Processing

Subscription status is refreshed whenever the user accesses subscription-aware APIs or
their notifications. This automatically expires ended subscriptions and creates one
deduplicated seven-day warning notification. For an additional deployment-level sweep,
the same idempotent service can also be run periodically with:

```powershell
python manage.py process_subscription_expiry
```

The command is safe to repeat.

## Reports and Accounting

Aggregated values are calculated in the backend. The frontend receives prepared totals and counts instead of raw lists. Administrator reports include the active Basic/Silver/Gold distribution and successfully verified subscription sales for the selected period (the current month by default).

Artist revenue records can be generated from server-verified counted stream events through the administrator dashboard, viewed by the relevant roles, and marked as settled only by the administrator. Unique listeners are calculated from distinct stream-event listeners for each report period.

## Optional Delivery Features

- Docker Compose runs PostgreSQL, Django/Gunicorn, the Nginx API/media gateway, and the production Next.js application.
- The home API returns deterministic, content-based recommendations using listening-history artist and genre affinity; popularity is only a stable tie-breaker and cold-start fallback.
