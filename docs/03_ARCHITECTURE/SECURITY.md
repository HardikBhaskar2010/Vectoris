# Vectoris — Security Architecture

**Status:** RECOMMENDED (principles) · TBD (specific mechanisms/certifications)  
**Owner of:** AuthN/Z, tenancy, encryption, consent  
**Does not own:** Legal certifications (do not invent — mark TBD), UI permission surfaces (→ page docs)

---

## 1. Scope

Project drawings and engineering/commercial documents are treated as **confidential customer data** by default, regardless of project size or customer type.

## 2. Required Controls

| Area | Requirement | Status |
|---|---|---|
| Authentication | Supabase Auth (integrated with DB) | **LOCKED** |
| Authorization | Role-based, scoped at org/project/session levels (see `../01_PRODUCT/USER_ROLES.md`) | RECOMMENDED |
| Tenant isolation | PostgreSQL Row Level Security (RLS) + application-level filtering; no cross-organization access | **LOCKED** |
| Encryption in transit | TLS for all network communication | RECOMMENDED |
| Encryption at rest | Cloud metadata encrypted at rest (Supabase-managed at minimum); local file encryption TBD | TBD (local files) |
| Secure file access | Signed URLs / scoped tokens for any cloud-stored artifact | RECOMMENDED |
| Audit trails | Every AI action and human correction auditable (see `../04_AI/MODEL_GOVERNANCE.md`) | LOCKED principle |
| Secrets management | No secrets in client bundles; backend-managed secrets store | RECOMMENDED |
| Local secure storage | OS-native secure storage for local tokens/credentials (Tauri) | RECOMMENDED |

## 3. Cloud Processing Consent

Per founder instruction: if drawings are ever sent to a cloud perception model, this requires explicit user/organization authorization, must respect org policy, must be auditable, and must be configurable (on/off, per-organization). No cloud upload of raw customer drawings may occur silently. See `STORAGE.md` §4.

## 4. Model Training Consent

Mirrors the legacy README's Data Rights & Governance section, carried forward as binding: customer/project data does not enter global model training by default. If a customer accepts a data-improvement policy, eligible/anonymized/appropriate data may contribute — exact legal/privacy mechanics are **TBD**, and require legal counsel before any production data collection. This is a decision item, not an implementation detail — see `../OPEN_DECISIONS.md`.

## 5. Retention & Deletion

Retention periods, deletion request handling, and data lifecycle policy for cloud metadata is **LOCKED** to a **30-day grace period** post-soft-deletion. See `../07_OPERATIONS/DATA_LIFECYCLE.md` for operational framing. Other privacy/legal policies and mechanisms remain **TBD**.

## 6. No Invented Compliance Claims

This document does not claim SOC 2, ISO 27001, GDPR, or any other certification/compliance status. Any such claim requires an actual completed audit/process and must be added only when true, with evidence.

## 7. Cross-References

- `../01_PRODUCT/USER_ROLES.md` (role/permission definitions enforced here)
- `STORAGE.md` (data placement this secures)
- `../04_AI/MODEL_GOVERNANCE.md` (AI-specific auditability)
- `../07_OPERATIONS/DATA_LIFECYCLE.md`
