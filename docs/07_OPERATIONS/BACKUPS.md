# Vectoris — Backups & Recovery

**Status:** LOCKED (MVP SLAs and DB choice)  
**Owner of:** Backup and restore policy for cloud-managed data  
**Does not own:** Local file storage (user's device — not Vectoris's responsibility to back up), storage architecture (→ `../03_ARCHITECTURE/STORAGE.md`), data retention/deletion (→ `DATA_LIFECYCLE.md`)

---

## 1. Scope

This document covers backup and recovery for **cloud-managed data** only:

- Organization / user / role metadata
- Project metadata
- Takeoff run results and line-item data (if/when synced to cloud)
- Audit / correction event records
- Chat session metadata and messages
- Export artifacts (if cloud-stored)

**Out of scope for backup:** Raw drawing files on the user's device. Local-first means Vectoris does not have custodial responsibility for raw drawings — the user's own device and storage practices govern those. If raw drawings are explicitly uploaded to cloud storage (e.g., for collaboration — see `../03_ARCHITECTURE/STORAGE.md` §5), backup of those uploads falls within this document's scope.

---

## 2. Backup Principles

1. **Audit / correction event ledger is append-only and highest-priority.** This is the data the learning pipeline depends on; loss is unrecoverable in the sense that human corrections cannot be re-created.
2. **Organization/user/role data must be restorable without data loss.** Loss of org membership or role data would lock users out of their projects.
3. **Recovery must be testable.** Backups that have never been tested are not backups.
4. **RPO and RTO are LOCKED for MVP.** 
   - **RPO (Recovery Point Objective): 24 hours.**
   - **RTO (Recovery Time Objective): 8 hours.**
   These apply to the cloud metadata/state layer. As Vectoris becomes mission-critical, these targets can be tightened through an ADR.

---

## 3. Backup Responsibility by Data Store

| Data Store | Backup Responsibility | Schedule | Status |
|---|---|---|---|
| Data Store | Backup Responsibility | Schedule | Status |
|---|---|---|---|
| Cloud metadata DB (Supabase/PostgreSQL) | Managed by Supabase (automatic daily backups + point-in-time recovery on paid plans) | Meets 24h RPO | **LOCKED** |
| Object storage (Supabase / export artifacts) | Provider-managed redundancy | Provider default | **LOCKED** |
| Auth service data (Supabase Auth) | Managed by Supabase Auth | Meets 24h RPO | **LOCKED** |

---

## 4. Recovery Procedures

**Status: TBD** — recovery runbooks must be written and tested before production launch. At minimum:

- Restore cloud DB from the most recent backup to a staging environment and verify data integrity
- Document the exact steps and responsible party for each recovery scenario
- Test restoration of the correction event ledger specifically (highest-priority, append-only)

---

## 5. Disaster Recovery Scenarios

| Scenario | Current Status |
|---|---|
| Accidental mass deletion of org/project data | Supabase point-in-time recovery within the 30-day window |
| DB provider outage | Graceful degradation strategy: TBD (read from local-first cache where possible) |
| Cloud object storage loss of export artifacts | Lower priority (exports are regeneratable from source data) |
| Local device loss (user's drawings) | Out of scope — user's own backup responsibility |

---

## 6. Cross-References

- `../03_ARCHITECTURE/STORAGE.md` — what data lives where
- `DATA_LIFECYCLE.md` — retention periods and deletion (distinct from backup)
- `../OPEN_DECISIONS.md` OD-01 — DB engine selection affects backup mechanics
