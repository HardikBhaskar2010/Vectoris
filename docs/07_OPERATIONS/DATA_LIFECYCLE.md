# Vectoris — Data Lifecycle

**Status:** LOCKED (principles and grace period)
**Owner of:** Data retention periods, deletion procedures, export/erasure rights
**Does not own:** Backup mechanics (→ `BACKUPS.md`), storage architecture (→ `../03_ARCHITECTURE/STORAGE.md`), security access controls (→ `../03_ARCHITECTURE/SECURITY.md`)

> Retention and deletion are distinct from backup. Backup is about recovery. Lifecycle is about how long data lives before intentional deletion, and what happens when deletion is requested.

---

## 1. Data Categories and Ownership

| Data Category | Who Owns It | Where It Lives | Default Lifecycle |
|---|---|---|---|
| Raw drawing files (uploaded documents) | Customer / Org | User's local device (local-first) | User-controlled — Vectoris does not delete local files |
| Project metadata (name, type, description) | Vectoris (on behalf of Org) | Cloud DB | Retained while Org account is active; deleted on account erasure request |
| Takeoff run results (detections, line items) | Vectoris (on behalf of Org) | Cloud DB | Retained while project exists; deleted on project deletion or account erasure |
| Correction Events (audit ledger) | Vectoris (on behalf of Org) | Cloud DB | Retained for [TBD] period; subject to erasure request with restrictions (see §4) |
| AI Session messages and history | Vectoris (on behalf of Org) | Cloud DB | Retained while session exists; deleted on session deletion or account erasure |
| User identity / auth data | Auth provider + Vectoris | Cloud DB + auth provider | Retained while user account is active |
| Analytics event data (PostHog) | Vectoris | PostHog cloud | Per PostHog's retention policy + Vectoris configuration — TBD |
| Training dataset entries (opted-in) | Vectoris | Separate training store | Per consent agreement — TBD; explicitly NOT commingled with project operational data |

---

## 2. Retention Periods

## 2. Retention Periods

The grace period for cloud metadata deletion is **LOCKED at 30 days**. Other specific retention periods (like analytics and training data) remain subject to legal/product decisions.

| Data | Retention Principle | Period |
|---|---|---|
| Active project data | Retained while the project and org exist | Active account lifetime |
| Deleted project data | After user-initiated project deletion — immediate soft-delete; hard-delete after 30-day grace period | **30 days** (Locked) |
| Correction Event ledger | This is an append-only learning record; deletion must be handled carefully (see §4) | **TBD — requires product decision** |
| Inactive account data | After 30-day period of inactivity — notification, then deletion | **30 days** |
| Session messages | Retained while session exists; per project deletion policy | Active session lifetime |
| Analytics events | Per product analytics provider configuration | **TBD — configure PostHog retention** |
| Training data | Per explicit consent agreement at time of opt-in | **TBD — requires legal review** |

---

## 3. Deletion Procedures

### 3.1 Project Deletion
When a user deletes a project:
- All project metadata, takeoff runs, detections, line items, correction events scoped to that project, and session data are soft-deleted immediately
- Hard deletion (permanent) occurs after a **30-day grace period** (allowing recovery of accidental deletions)
- Raw drawing files on the user's local device are **not affected** — local files are the user's own files

### 3.2 Account / Org Deletion
When an organization account is closed:
- All projects under that org follow the project deletion procedure above
- All user identity records for org members are deleted (or dissociated from Vectoris data)
- The org's training data consent (if any) is revoked and data is removed from the training pipeline
- A confirmation is issued to the requesting admin

### 3.3 Individual User Deletion (within an active Org)
- User's auth identity is removed
- Attribution on correction events and session messages is anonymized (the event is retained; the author identity is replaced with "Deleted User") — unless full erasure is required under applicable law (see §4)
- User's role assignments are removed

---

## 4. Erasure Rights

> **Legal review required before production.** This section documents the principle, not the final implementation.

Vectoris must support the right to erasure (e.g., GDPR Article 17) for:
- Personal data that identifies an individual user
- Data associated with a user's account

**The complication with Correction Events:**
Correction Events are the structured audit record of every human edit to AI-proposed data. They carry the identity of the correcting user. Under erasure rights, a user may request that their identity be removed from these records.

Options (not yet decided — see `OPEN_DECISIONS.md` OD-12):
- Anonymize the authorship field ("Deleted User") while retaining the correction record
- Full deletion of correction events authored by the requesting user (reduces learning dataset but satisfies erasure)
- Cryptographic unlinking of identity while retaining the event structure

The chosen approach must be documented in the training consent agreement before any correction events are used for training.

---

## 5. Export Rights

Users have the right to export their own project data in a portable format before account deletion:
- Project metadata
- Takeoff line items and quantities (XLSX, CSV, JSON)
- Correction event history (JSON)
- Session transcripts (JSON)

Raw drawings are already in the user's possession (local-first) — no export is needed for those.

The export mechanism for personal data export is the same as the product Export feature (`../06_PAGES/EXPORT.md`), but includes the correction event ledger and session data in addition to the takeoff output.

---

## 6. Cross-References

- `BACKUPS.md` — backup and recovery (distinct from lifecycle)
- `../03_ARCHITECTURE/SECURITY.md` §4–5 — consent and privacy controls
- `../04_AI/TRAINING.md` §4 — training data consent
- `../07_OPERATIONS/ENVIRONMENT.md` §5 — no real customer data in non-production environments
- `OPEN_DECISIONS.md` OD-12 — retention/deletion policy (open decision requiring product/legal resolution)
