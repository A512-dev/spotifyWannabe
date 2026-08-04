# SoundWave

SoundWave is a full-stack music streaming service inspired by Spotify. The frontend is built with Next.js, React, TypeScript, and Tailwind CSS. The backend is built with Django and Django REST Framework.

Phase 1 focused on the responsive frontend and role-aware user experience. Phase 2 adds persistent backend models, REST APIs, authentication, subscriptions, media uploads, payment handling, reports, and full frontend integration.

## Team Responsibilities

The project was divided by feature ownership so that each member had a clear responsibility in both phases.

| Team member | Phase 1 responsibilities | Phase 2 responsibilities |
|---|---|---|
| Arshia Vashani - 400108728 | Home, login, signup, forgot password, profile, settings, notifications | Accounts, authentication, user profiles, preferences, follows, notifications, subscriptions, payment flow, and related frontend integration |
| Narges Sepehri (Mira) - 401106028 | Music catalog, album pages, playlists, player | Music and album models, media upload, playlists, stream registration, listening history, subscription limits, and related frontend integration |
| Poorya Amirniya - 401170518 | Artist dashboard, support dashboard, admin dashboard | Backend bootstrap, artist applications and approvals, support tickets, dynamic subscription pricing, artist accounting, operational reports, settlement flow, and related frontend integration |

Shared contracts, integration work, testing, and final validation were reviewed across the team.

## Main Features

- Listener and artist registration
- Token-based login and logout
- Password reset request flow
- User profiles, follows, preferences, and account deletion
- Artist applications with uploaded samples or external links
- Artist approval and rejection by support staff or the administrator
- Track and album creation by approved artists
- MP3, WAV, FLAC, cover image, avatar, and portfolio uploads
- Searchable music catalog and album detail pages
- Music player with queue, progress, volume, repeat, shuffle, and lyrics
- Server-verified stream sessions after the required listening duration
- Listening history
- Deterministic music recommendations based on listening history, artists, and genres
- Playlist creation, editing, ordering, and subscription-based limits
- Basic, Silver, and Gold subscriptions
- One-, three-, six-, and twelve-month billing periods
- Dynamic Silver and Gold pricing controlled by the administrator
- Local payment sandbox and optional Zarinpal adapter
- Persistent role-aware notifications, including new artist applications and subscription expiry
- Support tickets with replies, internal notes, assignment, priority, and status transitions
- Aggregated artist, support, and administrator reports, including subscription distribution and verified sales
- Stream-based artist accounting and administrator settlement confirmation
- Role-based and subscription-based access control
- Docker Compose deployment for the frontend, backend, and PostgreSQL

## Technology Stack

### Frontend

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- ESLint
- Native Node.js test runner

### Backend

- Django
- Django REST Framework
- DRF token authentication
- SQLite for local development
- Optional PostgreSQL configuration
- Pillow
- `django-cors-headers`

## Project Structure

```text
app/                        Next.js routes
components/                 Shared UI, layouts, and player components
config/                     Navigation and route-access rules
features/
  account/                  Authentication, profiles, settings, subscriptions
  music/                    Catalog, tracks, albums, playlists, player APIs
  operations/               Artist dashboard, support, admin, and reports
lib/                        API client and shared helpers
providers/                  Authentication and player state
tests/                      Frontend tests
backend/
  accounts/                 Registration, authentication, profiles, preferences, follows
  artists/                  Artist applications and approved artist profiles
  music/                    Genres, tracks, albums, streams, listening history
  playlists/                Playlist CRUD and subscription limits
  subscriptions/            Payments, activation, renewal, and expiry
  notifications/            Persistent notifications
  support/                  Tickets, messages, assignment, and status flow
  operations/               Dynamic plans and price history
  reports/                  Aggregated reports, accounting, and settlements
  common/                   Shared permissions, pagination, errors, and health check
docs/                       Phase 2 report draft
```

## Environment Files

Create the frontend environment file:

```powershell
Copy-Item .env.local.example .env.local
```

The default frontend API address is:

```text
http://127.0.0.1:8000/api
```

Create the backend environment file:

```powershell
Copy-Item .\backend\.env.example .\backend\.env
```

Default local configuration:

- SQLite database
- Local payment sandbox
- Frontend on port `3000`
- Backend on port `8000`
- Uploaded media under `backend/media/`

## Local Setup

### Frontend dependencies

From the repository root:

```powershell
npm ci
```

### Backend environment

```powershell
py -m venv .\backend\.venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
. .\backend\.venv\Scripts\Activate.ps1
python -m pip install -r .\backend\requirements.txt
```

### Backend database

```powershell
if (!(Test-Path .\backend\.env)) {
    Copy-Item .\backend\.env.example .\backend\.env
}

cd backend
python manage.py migrate
python manage.py check
cd ..
```

## Running the Project

Use two PowerShell terminals.

### Terminal 1: Django backend

```powershell
cd backend
. .\.venv\Scripts\Activate.ps1
python manage.py runserver 127.0.0.1:8000
```

Backend health check:

```text
http://127.0.0.1:8000/api/health/
```

Django administration:

```text
http://127.0.0.1:8000/admin/
```

### Terminal 2: Next.js frontend

```powershell
npm run dev
```

Frontend:

```text
http://localhost:3000
```

### Docker Compose

Docker starts PostgreSQL, the Django backend, and the production Next.js frontend together:

```powershell
docker compose up --build
```

Open `http://localhost:3000`. The API is exposed at `http://localhost:8000/api`.
Database and uploaded media are stored in named Docker volumes. Stop the containers with:

```powershell
docker compose down
```

Create the single system administrator after the containers are running:

```powershell
docker compose exec backend python manage.py createsuperuser
```

## Verification

### Frontend

```powershell
npm run type-check
npm run lint
npm run test
npm run build
```

Validated on the delivery version:

```text
29 tests passed
TypeScript type-check passed
ESLint passed
Next.js production build passed (15 generated routes)
```

### Backend

```powershell
cd backend
python manage.py makemigrations --check --dry-run
python manage.py check
python manage.py test -v 2
```

Validated on the delivery version:

```text
Found 115 test(s).
No changes detected
System check identified no issues
OK
```

## Roles and Access Control

- **Listener:** playback, playlists, settings, subscriptions, notifications, and support tickets
- **Artist:** listener capabilities plus release management and artist reports after approval
- **Support:** artist application review and support ticket management
- **Administrator:** pricing, reports, accounting, settlements, and all support capabilities

Administrator access uses Django superuser status and the backend enforces at most one active superuser. Support access uses membership in the `support` group. Artist access requires an approved artist profile.

Security-sensitive access checks are enforced by the backend.

## Subscription Tiers

| Feature | Basic | Silver | Gold |
|---|---:|---:|---:|
| Daily streams | 60 | Unlimited | Unlimited |
| Playlists | 6 | 100 | Unlimited |
| Profile image upload | No | Yes | Yes |
| Track download | No | Yes | Yes |
| Early access | No | No | Yes |
| Advanced statistics | No | No | Yes |

Silver and Gold prices are stored in the database and can be changed from the administrator dashboard without changing source code.

## Payment Flow

The default backend configuration uses:

```text
PAYMENT_GATEWAY=local
```

The local sandbox creates a payment transaction, redirects to the frontend callback, verifies the transaction, and activates the selected subscription.

The optional Zarinpal adapter can be enabled through `backend/.env`.

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

## Subscription Lifecycle Processing

Subscription state is refreshed automatically when subscription-dependent data or notifications are requested. This makes expiry and seven-day warnings work during normal application use without an external scheduler. The idempotent management command remains available for a daily production schedule:

```powershell
cd backend
python manage.py process_subscription_expiry
```

## Documentation

The Phase 2 report draft is available at:

```text
docs/phase2-report-draft.md
```

The final group report must be reviewed by all team members and exported as PDF before submission.

## Optional Items Implemented

- Dockerization: `docker compose up --build` starts PostgreSQL, Django, and Next.js.
- Selected bonus activity: a deterministic, non-random music recommender. Artist affinity has the highest weight, genre affinity has the second-highest weight, and counted popularity is used only as a tie-breaker and cold-start fallback. Already-listened tracks are excluded from the recommendation candidates.

The legacy `data/` fixtures and `lib/auth.ts` are retained only for isolated Phase 1 regression tests. Runtime authentication, catalogs, playlists, and dashboards use the Django REST API.
