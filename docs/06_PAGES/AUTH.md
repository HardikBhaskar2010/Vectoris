# Auth

## Status
RECOMMENDED

## Design Reference

Primary:
`../../designs/stitch/03_Authentication_SignUp.png`

Implementation reference:
`../../designs/stitch/03_Authentication_SignUp.html`

Reference purpose:
Visual and UX reference for the auth/sign-up surface. The design uses the **Light theme** — the only screen in the design set rendered in light mode by default, which may indicate a product decision that auth sits outside the main app chrome.

**Design vs. documented behavior:**
- The design shows a sign-up form (Full Name, Email, Password fields) with a "Create Account" primary action and a "Sign In" secondary link — the auth surface covers both sign-in and sign-up, toggling between them
- The light theme (`#F1ECE6` background, `#7D4047` rosewood accent) matches the documented light theme design system
- No provider-based auth (Google, etc.) is visible in the design — consistent with TBD status in `OPEN_DECISIONS.md` OD-10
- The form is centered with the Vectoris wordmark above — minimal framing with no app navigation

## Purpose
Authentication surface — sign-in, sign-up, and session management for Vectoris users.

## User Goal
Authenticate (sign in to an existing account or create a new one) to gain access to the Dashboard.

## Entry Conditions
From Landing (explicit CTA), or from a session-expiry redirect anywhere in the app.

## Exit Conditions
Successful authentication → Dashboard. Cancel (from session-expiry redirect) may return to Landing if no prior context exists.

## Information Architecture
Sign-in form (email + password, or provider-based auth — TBD), sign-up option, forgot-password link. Organization invitation links (per `../01_PRODUCT/USER_ROLES.md` §4) may carry a pre-filled email or org context when the user follows an invite link — Auth must handle this state gracefully.

## Layout
TBD — founder-owned. Typically minimal: centered form, wordmark, no navigation.

## Components
Auth form, error inline display. No app-navigation components (user is not yet authenticated).

## User Interactions
Enter credentials and submit; follow a sign-up flow; request a password reset ("Forgot password?"); receive neutral dispatch confirmation; open password reset link (via browser or desktop deep link `vectoris://auth-callback`); establish recovery session; set new password; view success confirmation and return to sign in; accept an invitation via a link (carries role and org context).

## AI Behavior
None. No AI on the auth surface.

## Data Requirements
User credentials (not stored client-side beyond the active session token). For invitation links: organization ID, assigned role, invite expiry. For password recovery: recovery session token (consumed immediately and cleared from URL).

## API Requirements
Auth endpoints (login / create account / token refresh / logout / resetPasswordForEmail / updateUser / onAuthStateChange). Auth provider: **Supabase Auth** with PostgreSQL and Row Level Security.

## State Model

### Loading
Form submitting — disable inputs, show inline loading indicator.

### Empty
Default: empty form ready for input.

### Success
- Sign in / Sign up: Navigate to Dashboard (or Onboarding if no organization).
- Password Update: Display success confirmation screen with "Continue to sign in" CTA.

### Error
Authentication failure (wrong credentials, expired invite, network failure) — specific, actionable inline message.

### Forgot Password States
- **Idle:** Operator enters work email.
- **Submitting:** Dispatching recovery email.
- **Sent (Neutral Confirmation):** Displays "Check your work email" with enumeration protection (never reveals account non-existence). Provides 60s cooldown resend control.
- **Blocked:** Validation or rate-limit notice.

### Password Reset States
- **Recovery Session:** URL contains `#access_token=...&type=recovery` or deep link event. `PASSWORD_RECOVERY` event triggers reset mode without forwarding to Dashboard.
- **Ready:** Operator inputs new password and confirmation (minimum 8 characters).
- **Submitting:** Calling `supabase.auth.updateUser({ password })`.
- **Success:** Password updated successfully.
- **Expired / Invalid:** Link is expired or already used. Shows dedicated "Reset link expired" view with CTA to request a new link.

### Accessibility
Form fields have explicit labels; error messages are programmatically associated with inputs (`aria-invalid`, `aria-describedby`); submit is keyboard-reachable.

### Keyboard Interaction
Tab through fields; Enter to submit; standard form navigation.

### Motion
Subtle and functional — per `../02_DESIGN/MOTION.md`. Form error shake on validation failure and sliding pill transition between tabs.

### Responsive / Window Behavior
Desktop app window model; split-panel layout on desktop; single-column form on mobile/narrow windows.

## Acceptance Criteria
- AC: A user can sign in with valid credentials and land on Dashboard.
- AC: An invalid credential attempt produces a clear, specific inline error.
- AC: A user can click "Forgot password?", enter their work email, and receive a neutral confirmation without account enumeration.
- AC: Clicking a recovery email opens Vectoris (`vectoris://auth-callback` or web `/auth?mode=reset`) in password reset mode without triggering premature dashboard redirects.
- AC: A user can enter a new password (min 8 characters) and confirmation to update their password.
- AC: An expired or invalid recovery token displays an informative expired state with an option to request a fresh link.
- AC: Following an organization invitation link pre-populates or contextualizes the auth flow correctly.

## Dependencies
`DASHBOARD.md`, `../01_PRODUCT/USER_ROLES.md` (invitation mechanics)

## Open Decisions & Status
- Auth provider: **Supabase Auth** (RESOLVED).
- Password-reset flow: **Implemented** with email enumeration protection, desktop deep link support, and recovery session safeguards.
- SSO / provider-based auth: Reserved for future enterprise scope.
