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
Enter credentials and submit; follow a sign-up flow; follow a password-reset flow; accept an invitation via a link (carries role and org context).

## AI Behavior
None. No AI on the auth surface.

## Data Requirements
User credentials (not stored client-side beyond the active session token). For invitation links: organization ID, assigned role, invite expiry.

## API Requirements
Auth endpoint (login / create account / token refresh / logout). Auth provider: **TBD** — see `../03_ARCHITECTURE/SECURITY.md` §2.

## State Model

### Loading
Form submitting — disable inputs, show inline loading indicator.
### Empty
Default: empty form ready for input.
### Success
Navigate to Dashboard (or to the page the user was redirected from, if applicable).
### Error
Authentication failure (wrong credentials, expired invite, account not found) — specific, actionable inline message. Never a generic "error" without context.
### Permission denied
An expired or already-used invitation link must show a clear, specific message, not a generic auth failure.
### Offline
Auth requires connectivity; must display a clear "no connection — cannot sign in" message rather than a silent hang.

## Accessibility
Form fields have explicit labels; error messages are programmatically associated with inputs; submit is keyboard-reachable.

## Keyboard Interaction
Tab through fields; Enter to submit; standard form navigation.

## Motion
Minimal — per `../02_DESIGN/MOTION.md`. Form error shake or similar micro-feedback on validation failure is acceptable.

## Responsive / Window Behavior
Desktop app window model; form must be usable at minimum supported window size.

## Acceptance Criteria
- AC: A user can sign in with valid credentials and land on Dashboard.
- AC: An invalid credential attempt produces a clear, specific inline error.
- AC: Following an organization invitation link pre-populates or contextualizes the auth flow correctly.
- AC: A session-expired redirect brings the user back to their intended destination post-auth where feasible.

## Dependencies
`DASHBOARD.md`, `../01_PRODUCT/USER_ROLES.md` (invitation mechanics)

## Open Questions
- Auth provider: TBD — see `OPEN_DECISIONS.md` OD-10.
- Sign-up flow detail (email verification, onboarding wizard, etc.) — TBD.
- SSO / provider-based auth (Google, etc.) — not yet specified; TBD if required at MVP.
- Password-reset flow — TBD (required before production, not specified at this level).
