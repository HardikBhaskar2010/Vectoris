# Landing

## Status
RECOMMENDED

## Design Reference

**No direct design screen.**
- The existing design `09_Landing_Product_Entry.png` represents the **Next.js marketing website**, NOT this desktop app shell screen. 
- See `MARKETING_LANDING.md` for the public marketing site specification.
- This `LANDING.md` describes the minimal, unauthenticated state of the Tauri app shell when a user first launches it without an active session.

## Purpose
Unauthenticated entry point. Presents Vectoris to a first-time or returning visitor who is not yet signed in.

## User Goal
Understand what Vectoris is and initiate sign-in or sign-up.

## Entry Conditions
Unauthenticated access to the app root, or an expired session redirect.

## Exit Conditions
Navigates to Auth (sign-in or sign-up). Authenticated user who lands here by mistake is redirected to Dashboard.

## Information Architecture
Product positioning (brief), primary CTA (Sign in / Get started), secondary link (sign-up if not yet a member). No marketing deep-dives — the Landing page within the desktop app is minimal; the full marketing experience lives on the separate Next.js marketing site (see `../03_ARCHITECTURE/TECH_STACK.md` §5).

> **Note:** The desktop app's Landing page and the public marketing website are different surfaces. The marketing site is a separate Next.js deployable (Vercel). The Landing page in this document spec is the app-shell's unauthenticated screen — not the full marketing homepage.

## Layout
TBD — founder-owned. Minimal by design: this is not the marketing site.

## Components
Primary CTA button, wordmark/logo, brief product statement. No `ProjectCard`, no nav.

## User Interactions
Click Sign In → Auth. Click Get Started / Sign Up → Auth (sign-up flow).

## AI Behavior
None. No AI on the unauthenticated surface.

## Data Requirements
None — fully static.

## API Requirements
None (auth itself is handled on the Auth page).

## State Model

### Loading
App shell loading — minimal.
### Empty
N/A — Landing is always populated (it is a static surface).
### Success
Standard Landing display.
### Error
App-level load failure — `ErrorState`.
### Permission denied
N/A.
### Offline
Must display a meaningful offline state (app shell visible, connectivity-lost message) rather than a blank screen — user should understand why the app isn't loading.

## Accessibility
Standard; CTA must be keyboard-reachable and have descriptive label.

## Keyboard Interaction
Tab → CTA; Enter to activate.

## Motion
Minimal — entry transition from app shell load. Per `../02_DESIGN/MOTION.md`.

## Responsive / Window Behavior
Desktop app window model; must be readable at minimum supported window size.

## Acceptance Criteria
- AC: An unauthenticated user can reach Auth from Landing.
- AC: An authenticated user who navigates to the root is redirected to Dashboard without seeing Landing.

## Dependencies
`AUTH.md`

## Open Questions
- Whether Landing has any animated/illustration element or is purely text+CTA — TBD, founder design decision.
