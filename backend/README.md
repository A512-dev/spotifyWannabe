# SoundWave Backend

Django REST Framework backend for phase 2 of the SoundWave project.

## Local setup (Windows PowerShell)

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py test
python manage.py runserver
```

The API health endpoint is available at `http://127.0.0.1:8000/api/health/`.
