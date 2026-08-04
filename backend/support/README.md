# Support ticket workflow

This app implements the phase-2 backend for the support dashboard.

## Endpoints

- `GET /api/support/tickets/`
- `POST /api/support/tickets/`
- `GET /api/support/tickets/{id}/`
- `POST /api/support/tickets/{id}/messages/`
- `PATCH /api/support/tickets/{id}/status/`
- `PATCH /api/support/tickets/{id}/assignment/`

Regular users can create tickets, list their own tickets, read their own ticket conversations, and add public replies. Support users and administrators can see all tickets, write public replies or internal notes, assign tickets, and change status.

Internal notes are deliberately removed from responses sent to ordinary users.

## Query parameters

- `status=open|waiting_for_user|resolved|closed`
- `priority=low|medium|high|urgent`
- `assigned=me|unassigned` for support users
- `search=<subject, username, or email>`
- `ordering=created_at|updated_at|priority|status` with optional `-` prefix

## Notification integration

The signals in `support/signals.py` allow the account/notification app to react to new tickets, messages, and status changes without creating a direct dependency between the apps.
