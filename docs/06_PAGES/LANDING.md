# Landing / Desktop Entry Architecture

## Status
RETIRED / SUPERSEDED — Root `/` resolves directly to `/auth`.

## Product Architecture Decision (Aug 2026)
The desktop application is **NOT** the Vectoris marketing/distribution website.

- The future Vectoris marketing website is a completely separate public experience with its own repository/deployable, design, layouts, storytelling, and navigation (see `MARKETING_LANDING.md`).
- The Vectoris desktop application entry surface is strictly **`/auth`** (Workstation Login / Account Access).
- Root route `/` resolves directly to `/auth`.
- Authenticated sessions start from **`/dashboard`**.

## Routing Policy
- `/` → `/auth`
- `/auth` (Success) → `/dashboard`
