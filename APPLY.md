# Mira — music catalog, streaming, playlists, and player

Apply this package only after the account/subscription branch has been merged into `feature/operations-backend-phase2`, because music permissions depend on the current subscription service.
The teammate should review the implementation and run the complete checks before committing.

## Apply

```powershell
git checkout feature/operations-backend-phase2
git pull origin feature/operations-backend-phase2
git checkout -b feature/music-streaming-phase2

Expand-Archive `
  -Path "$HOME\Downloads\phase2-mira-music.zip" `
  -DestinationPath . `
  -Force

cd backend
python manage.py makemigrations music playlists
python manage.py migrate
python manage.py makemigrations --check --dry-run
python manage.py check
python manage.py test music playlists -v 2
python manage.py test -v 2
cd ..

npm run test
npm run type-check
npm run lint
npm run build
```

## Logical commits

```powershell
git add backend/music backend/artists/serializers.py backend/artists/views.py backend/artists/urls.py
git restore --staged backend/music/tests
git commit -m "feat: add music catalog and artist release APIs"

git add backend/playlists
git restore --staged backend/playlists/tests
git commit -m "feat: implement playlist management and limits"

git add features/music app/music app/playlists app/artist providers/PlayerProvider.tsx providers/AppProviders.tsx components/player components/shared/TrackCard.tsx types/domain.ts
git commit -m "feat: connect music pages and player"

git add backend/notifications/receivers.py backend/config/settings.py backend/config/urls.py backend/music/migrations backend/playlists/migrations
git commit -m "feat: integrate release notifications and media routes"

git add backend/music/tests backend/playlists/tests
git commit -m "test: cover music streaming and playlists"

git push -u origin feature/music-streaming-phase2
```

Create a pull request into `feature/operations-backend-phase2` only after all checks pass.
