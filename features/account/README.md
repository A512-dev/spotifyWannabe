# Account Feature Area

Owns login, signup, forgot password, profile, settings, and notifications.

## Structure Review

Your folder instincts are good:

- `app/login/page.tsx` should own the login route UI.
- `app/signup/page.tsx` should own the signup route UI.
- `app/forgot-password/page.tsx` should own the password reset route UI.
- `providers/AuthProvider.tsx` should own browser-side auth state, such as the current user.
- `lib/auth.ts` should own pure auth decisions, such as credential checks and role redirects.
- `data/auth-credentials.ts` is acceptable for Phase 1 mock auth data.

The main correction is that provider actions cannot be plain exported functions if they need React state.
Functions like `login` must be created inside `AuthProvider` and passed through context, because only the provider has access to `setCurrentUser`.

Long learning notes are better here than inside `page.tsx` files. Page files should stay focused on the route they render.

## Project Demands

The Persian project brief asks for three account flows:

1. A shared login page for all four roles: listener, artist, support, and admin.
2. A forgot-password option that sends the user to an email recovery form.
3. A signup page with a normal user form and a separate artist application form.

After login, users should go to the correct role area:

- `listener` -> `/`
- `artist` -> `/artist-dashboard`
- `support` -> `/support`
- `admin` -> `/admin`

After normal user signup, the user should become a listener and go to `/`.

After artist signup, the request should be marked pending approval. The artist should not immediately get artist dashboard access.

## Implementation Plan

### 1. Mock Auth Logic

Files:

- `data/auth-credentials.ts`
- `lib/auth.ts`
- `providers/AuthProvider.tsx`

Purpose:

- Keep fake passwords separate from user profile data.
- Let `lib/auth.ts` check email/password and return a user.
- Let `AuthProvider` store the logged-in user.

### 2. Login Page

File:

- `app/login/page.tsx`

Changes:

- Add `"use client"` because the page will use state and submit handlers.
- Import `useRouter` from `next/navigation`, not `next/router`.
- Store email, password, loading, and error state.
- On submit, call `login(email, password)` from `useAuth()`.
- If login fails, show an error.
- If login succeeds, call `router.push(getPostLoginPath(user))`.

### 3. Forgot Password Page

File:

- `app/forgot-password/page.tsx`

Changes:

- Add `"use client"`.
- Store email and message state.
- Validate that email is not empty.
- Show a neutral success message. Do not reveal whether the email exists.

### 4. Signup Page

File:

- `app/signup/page.tsx`

Changes:

- Add `"use client"`.
- Use `Tabs` for two forms: normal user signup and artist signup.
- Normal user fields: display name, email, password, confirm password, birth date, gender, privacy acceptance.
- Artist fields: email, password, stage name, portfolio/sample works.
- Use `Modal` to show the privacy policy when the privacy-policy text is clicked.

### 5. Later Route Protection

Files:

- `config/access.ts`
- maybe `components/layout/MainAppLayout.tsx`

Changes:

- Use existing route access rules to prevent users from opening pages that their role should not access.
- This should happen after the login/signup flows work.
