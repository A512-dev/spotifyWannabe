# Account Feature Area

Owner: Arshia Vashani (400108728)

Owns login, listener and artist signup, password reset, profiles, preferences,
notifications, subscriptions, and payment callbacks.

Runtime account state is provided by `AuthProvider` and persisted through the Django
REST API. Tokens are stored by the API client, while role and subscription permissions
are always enforced again by the backend. The legacy mock authentication helpers are
used only by isolated Phase 1 regression tests and are not part of the runtime flow.

Role destinations:

- Listener: `/`
- Approved artist: `/artist-dashboard`
- Support: `/support`
- Administrator: `/admin`

Artist registration creates a pending application with at least one sample file or
link. Support and the administrator receive an automatic notification, and artist
access is granted only after review.
