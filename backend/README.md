# SoundWave Backend

Django REST Framework backend for Phase 2 of the SoundWave project.

## Local setup

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py makemigrations accounts notifications subscriptions music playlists
python manage.py migrate
python manage.py test
python manage.py runserver
```

The default database is SQLite. Set the PostgreSQL variables in `.env` to use PostgreSQL.
The default payment gateway is the deterministic local sandbox.

## API prefixes

- `/api/accounts/`
- `/api/artists/`
- `/api/music/`
- `/api/playlists/`
- `/api/subscriptions/`
- `/api/notifications/`
- `/api/support/`
- `/api/reports/`
- `/api/operations/`

Run `python manage.py process_subscription_expiry` periodically to expire ended subscriptions and create seven-day warnings.
