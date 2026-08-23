# Vectoris — Deployment

**Status:** PROVISIONAL  
**Owner of:** Deployment topology and environments  
**Does not own:** CI pipeline YAML detail (implementation-phase), tech stack rationale (→ ../03_ARCHITECTURE/TECH_STACK.md)

---

## 1. Current Direction

**Vercel + Render — PROVISIONAL.** Likely responsibility split (proposed, not finalized):

| Surface | Likely host | Notes |
|---|---|---|
| Marketing/public web (Next.js) | Vercel | Natural fit for Next.js |
| Backend API (FastAPI) | Render | Managed Python service hosting |
| Desktop app distribution | Native installers (Tauri build artifacts) | Not "deployed" in the web sense — distributed via download/update channel, mechanism TBD |
| Cloud metadata DB | Supabase (Managed PostgreSQL) | Provider-managed |

## 2. Local-First Implication for Deployment

Because Vectoris is local-first, "deployment" for the core product experience is substantially about **desktop app distribution and update mechanics**, not just standing up cloud infrastructure. Auto-update strategy for the Tauri app: **TBD**.

## 3. Environments

See `../07_OPERATIONS/ENVIRONMENT.md` for local/staging/production environment definitions — this document owns *where things run*, that document owns *how environments are configured*.

## 4. Cross-References

- `../03_ARCHITECTURE/TECH_STACK.md`
- `../07_OPERATIONS/ENVIRONMENT.md`
