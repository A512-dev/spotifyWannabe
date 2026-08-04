# Operations Feature Area

Owner: Poorya Amirniya (401170518)

This feature area covers the integrated operational dashboards for SoundWave:

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

All operational data is loaded from and written to the Django REST API. Backend permissions remain authoritative for approvals, support actions, pricing, report access, accounting generation, and settlement.

## Artist dashboard

The artist dashboard allows approved artists to:

- View their artist profile status
- Review catalog statistics
- Create and publish releases through multipart API requests
- Upload real audio and cover files
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

- Update persisted Silver and Gold subscription prices
- Preview billing periods for 1, 3, 6, and 12 months
- View subscription distribution
- View verified subscription sales and subscription-tier distribution
- Review monthly artist accounting
- Mark artist payouts as settled
- Review users and access levels
- Generate monthly artist accounting from verified stream events

Aggregated report values are computed by Django. The frontend only renders the returned counts, currency totals, and chart distribution.
