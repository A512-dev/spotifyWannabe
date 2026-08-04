# SoundWave — Phase 2 Development Report Draft

> This document is the working source for the mandatory final PDF. Each team member must review the contribution section and correct it to match the commits and work they actually completed.

## 1. Team responsibilities

### Phase 1

- **Mira:** music catalog, album details, playlists, player components, and track/album interactions.
- **Poorya:** artist dashboard, support dashboard, admin dashboard, tables, tickets, artist approvals, and accounting UI.
- **Arshia:** login, signup, password recovery, profile, settings, notifications, and home page.

### Phase 2

- **Mira:** `music` and `playlists` backend domains, track/album media handling, stream events, listening history, playlist limits, player integration, catalog search, and music-page integration.
- **Poorya:** `artists`, `support`, `reports`, and `operations` domains; artist approval, support tickets, accounting, settlements, dynamic pricing, operational dashboards, and cross-domain integration.
- **Arshia:** `accounts`, `subscriptions`, and `notifications` domains; authentication, profile/preferences, password reset, follows, subscription purchase/expiry, payment flow, and account-page integration.

## 2. Development process and conventions

- Branch names use `feature/<domain>-phase2`.
- Commit messages use Conventional Commit-style prefixes such as `feat:`, `fix:`, `test:`, and `docs:`.
- Python modules, model fields, and API internals use `snake_case`.
- TypeScript variables and JSON contracts use `camelCase`.
- Django apps are organized by business domain rather than by technical layer.
- API responses expose string identifiers and ISO-formatted dates.
- Secrets and machine-specific values are stored in `.env` and `.env.local`, not source code.
- Every change is checked using Django system checks, backend tests, TypeScript checking, linting, and a production frontend build before merge.

## 3. Project structure

### Backend

- `common`: timestamp model, pagination, error formatting, and shared permissions.
- `accounts`: listener/artist registration, token authentication, profile, preferences, follows, and password reset.
- `artists`: artist applications, sample works, approved artist profiles, and approval decisions.
- `music`: genres, albums, tracks, media files, stream events, listening history, and catalog APIs.
- `playlists`: playlists, ordered playlist items, playback history, and plan limits.
- `subscriptions`: user subscriptions, payment transactions, gateway abstraction, renewal, and expiry.
- `notifications`: role-aware persistent notifications and domain-event receivers.
- `support`: tickets, ticket messages, assignment, status transitions, and internal notes.
- `reports`: backend aggregation of artist streams/listeners/revenue and administrative summaries.
- `operations`: centrally persisted subscription prices, feature rules, and price-change audit history.

### Frontend

- `app`: Next.js App Router pages.
- `features`: API clients grouped by account, music, and operations domains.
- `providers`: authenticated-user and player state.
- `components`: reusable layout, player, shared, and primitive UI components.
- `lib/api.ts`: one token-aware API client and consistent error handling.
- `types/domain.ts`: shared frontend contracts aligned with serializer responses.

## 4. Backend models and relationships

- A Django user has one `UserProfile` and one `UserPreference`.
- A user can follow other users through `UserFollow`.
- An artist request belongs to one user and contains one or more `ArtistSampleWork` entries.
- Approval creates one approved `ArtistProfile` for that user.
- An `ArtistProfile` owns many albums and tracks. A track may belong to an album and may have collaborator artists.
- A `StreamEvent` belongs to one track and listener. Counted events generate listening history and report input.
- A playlist belongs to one user and contains ordered `PlaylistItem` rows.
- A `UserSubscription` links a user to a centrally managed `SubscriptionPlan` for a bounded time interval.
- A `PaymentTransaction` records pending, successful, failed, or canceled payment outcomes.
- Notifications belong to one recipient and are generated from application, release, support, accounting, and subscription events.
- Tickets belong to a requester and optionally an assigned support user; each ticket contains ordered messages.
- `ArtistRevenueRecord` stores backend-generated monthly aggregates and settlement state.

## 5. REST design decisions

Only operations that make sense for each resource are exposed:

- Registration and login are dedicated actions rather than generic user CRUD.
- Users can retrieve public profiles but cannot enumerate or alter other accounts.
- Artist applications can be created/read; review is a dedicated staff-only action.
- Tracks and albums support create/read/partial-update/delete for approved owners.
- Stream registration, statistics, and download authorization are dedicated track actions.
- Playlists support required CRUD plus add/remove/reorder/playback actions.
- Subscription plans are readable, but only Silver and Gold prices can be partially updated by the sole administrator.
- Payment verification is handled through a callback action and is idempotent.
- Accounting records are readable by artists/support/admin according to scope; creation/generation/settlement are administrator-only.

## 6. Access control

Role permissions and subscription permissions are enforced in the backend, not only hidden in the UI:

- listeners cannot create music or inspect operational reports;
- artists can modify only their own tracks and albums after approval;
- support users can review artists and manage support tickets but cannot settle payouts or change prices;
- only the administrator can settle payouts, generate accounting records, or change subscription prices;
- Basic users have 60 counted streams per day and 6 playlists;
- Silver users have 100 playlists, downloads, and profile images;
- Gold users have unlimited playlists, early access, downloads, profile images, and advanced statistics.

## 7. File handling

Django media storage keeps artist samples, user avatars, artist images, album covers, track covers, track audio, and playlist covers under separate paths. Upload serializers validate required files, supported extensions, sizes, ownership, and metadata. The frontend uses `FormData` for multipart requests.

## 8. Reporting and accounting

Raw stream rows are never sent to the frontend for aggregation. The backend computes stream counts, unique listeners, currency breakdowns, artist totals, ticket counts, approval counts, and payment states. The project statement does not contain the promised numeric reward formula, so per-stream, per-listener, and platform-fee rates are explicit administrator inputs when a revenue period is generated rather than hidden constants in React.

## 9. Payment flow

The subscription service supports 1, 3, 6, and 12 month purchases. A transaction is created as pending, sent through a gateway adapter, verified through a callback, and only then activates or extends a subscription. A local sandbox adapter keeps development and demonstration deterministic; an external gateway adapter can be enabled through environment variables.

## 10. Testing

Backend tests cover authentication, profile restrictions, artist applications, permissions, media CRUD, early access, stream counting, daily limits, playlists, payments, notification ownership, tickets, reports, settlements, pricing, and cross-domain workflows. Frontend tests and type/build checks cover reusable components and page integration. The final submitted counts should be copied from the last successful test runs.

## 11. Maintainability

- Business rules are kept in service functions rather than React components.
- DRF serializers validate contracts and translate snake-case model fields to camel-case API fields.
- ViewSets and mixins avoid duplicated CRUD code.
- Domain signals decouple notifications from artist, support, music, and report services.
- Centralized API clients avoid repeated fetch and token code.
- Database constraints protect uniqueness and valid state even when requests bypass the UI.

## 12. Use of AI-assisted development

AI-assisted tools were used for design review, scaffolding suggestions, code review, test-case generation, and debugging guidance. The team remained responsible for reading the generated code, aligning it with the project statement, running migrations and tests, correcting failures, and explaining the final design during delivery.

### Example to include in the final PDF

Include one short before/after example from each phase. A suitable Phase 2 example is a generated test case for an unauthorized artist attempting to edit another artist's track, followed by the team-reviewed permission class and the passing test result.

### Strengths observed

- rapid generation of repetitive serializers, tests, and API client code;
- useful detection of missing permission and edge-case checks;
- faster comparison of implementation against the long project statement.

### Weaknesses observed

- generated code still required integration testing across independently owned domains;
- migrations and framework-version behavior had to be verified locally;
- assumptions about external payment services and missing reward formulas required explicit human decisions;
- UI code occasionally needed refactoring after replacing Phase 1 mock state with asynchronous API state.

## 13. Final verification checklist

- Run all migrations on a clean database.
- Run the complete backend test suite.
- Run frontend tests, type checking, linting, and production build.
- Demonstrate all four roles with separate accounts.
- Demonstrate failed permission attempts as well as successful workflows.
- Verify multipart upload and media playback.
- Verify Basic/Silver/Gold limits.
- Verify successful and failed payment callbacks.
- Verify all three required dashboards with real backend data.
- Export this reviewed report to PDF.
