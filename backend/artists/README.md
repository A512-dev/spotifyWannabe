# Artist application API

This app implements the artist registration review flow required by project sections 2.1, 2.11.1, 3.1, 3.3, and 3.4.

## Endpoints

- `POST /api/artists/applications/`
  - Authenticated applicant.
  - Multipart fields: `stageName`, optional `portfolioDescription`, repeated `sampleFiles`, and/or `sampleLinks`.
- `GET /api/artists/applications/`
  - Regular users receive only their own applications.
  - Support and admin users receive all applications.
  - Supports `status`, `search`, and `ordering` query parameters.
- `GET /api/artists/applications/{id}/`
  - Same visibility rules as the list endpoint.
- `POST /api/artists/applications/{id}/review/`
  - Support or admin only.
  - JSON body: `{ "decision": "approved|rejected", "reviewNote": "..." }`.
  - Rejection requires a reason.

Approving an application creates or updates an approved `ArtistProfile`, adds the account to the `artist` group, and emits the `artist_application_reviewed` signal. The notifications domain should subscribe to that signal and create the user-facing in-app notification.

Sample uploads are restricted to common audio, video, image, and PDF formats and to 50 MB per file.
