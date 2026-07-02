# Mock media assets

These images are local placeholders for the Phase 1 frontend. They are referenced from the mock data files in `data/`.

## Folders

- `avatars/`: user profile photos
- `artists/`: artist profile and banner images
- `albums/`: album and track cover art
- `playlists/`: playlist cover art

## Replacing an image

The fastest option is to replace a file with your own image and keep the same filename. For example, replacing `avatars/maya.png` immediately updates every mock user that points to `/mock/avatars/maya.png`.

If you want to use a different filename, update the related field in the mock data:

- `avatarUrl` in `data/users.ts`
- `profileImageUrl` or `bannerImageUrl` in `data/artists.ts`
- `coverImageUrl` in `data/albums.ts`, `data/tracks.ts`, or `data/playlists.ts`

Keep image files inside `public/` so Next.js can serve them as normal static assets.
