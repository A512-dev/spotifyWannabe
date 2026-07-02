# Operations Feature Area

Owner: Pourya

This feature area covers the Phase 1 operational dashboards for SoundWave:

- Artist dashboard
- Support workspace
- Admin workspace
- Artist approval review
- Support tickets
- Monthly accounting
- Subscription pricing controls
- Platform-level analytics and settings

## Related routes

- `/artist-dashboard`
- `/support`
- `/admin`

## Phase 1 scope

The current implementation uses mock data and local component state. It focuses on UI behavior, role-specific workflows, typed tables, modal interactions, approval flows, ticket handling, and accounting previews.

No real backend persistence is implemented in Phase 1.

## Artist dashboard

The artist dashboard allows approved artists to:

- View their artist profile status
- Review catalog statistics
- Create a local release draft
- Attach mock audio and cover files
- Add release metadata
- Add lyrics
- Review catalog rows
- Publish or delete local draft rows
- View monthly revenue reports

## Support workspace

The support workspace allows support users and admins to:

- View support ticket statistics
- Filter tickets by status
- Open ticket conversations
- Send customer-facing replies
- Add internal notes
- Resolve or close tickets
- Review artist approval requests
- Approve artist requests
- Reject artist requests with a reason

## Admin workspace

The admin workspace allows the system admin to:

- Update Silver and Gold subscription prices locally
- Preview billing periods for 1, 3, 6, and 12 months
- View subscription distribution
- View platform revenue summaries
- Review monthly artist accounting
- Mark artist payouts as settled
- Review users and access levels
- Toggle a mock maintenance mode

## Phase 2 backend notes

The following behavior should move to Django in Phase 2:

- Persisting subscription prices
- Persisting ticket replies and internal notes
- Persisting approval decisions
- Uploading audio and image files
- Computing revenue and accounting aggregates
- Enforcing role-based access control
- Enforcing subscription-based limits
- Returning dashboard analytics from backend endpoints

The frontend should receive aggregated reporting values from the backend instead of computing them from raw user or stream lists.