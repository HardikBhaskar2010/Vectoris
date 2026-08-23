# Vectoris — Environments

**Status:** RECOMMENDED  
**Owner of:** Environment definitions (local/staging/production) and configuration management principles  
**Does not own:** Deployment topology (→ `../05_IMPLEMENTATION/DEPLOYMENT.md`), CI pipeline YAML (implementation phase)

---

## 1. Environment Summary

| Environment | Purpose | Who Uses It | Data |
|---|---|---|---|
| **Local / Dev** | Active development and debugging | Engineers | Synthetic/redacted test fixtures only (per `../05_IMPLEMENTATION/TESTING.md` §3 and legacy README Data Rights rules) |
| **Staging** | Pre-production integration testing and QA; production-like configuration | Engineering, QA, founder | Anonymized/synthetic data; never real customer drawings unless explicitly authorized and documented |
| **Production** | Live product serving real customers | Customers | Real customer data — full security controls active |

---

## 2. Configuration Principles

1. **No secrets in client bundles.** API keys, database credentials, and model API tokens are backend-managed secrets, never bundled into the desktop app or frontend build. See `../03_ARCHITECTURE/SECURITY.md` §2.
2. **Environment is explicit, not inferred.** Each running instance must know its environment explicitly (env var `VECTORIS_ENV` = `local` / `staging` / `production`). No "detect production by looking for a domain name" logic.
3. **Feature flags for staged rollout.** New capabilities that are not yet ready for all users can be gated via a feature flag system (tool: TBD — PostHog's feature flags are a natural default given PostHog is already in the stack for analytics). Flag state must not live in code commits.
4. **Staging is production-equivalent in configuration.** Staging must use the same DB engine, same model routing paths, and same API versions as production — differences should be in data (synthetic, not real) and infrastructure scale (smaller), not in code paths.
5. **Local development does not require cloud connectivity.** Engineers should be able to run the full MVP loop (upload a test drawing, see detections, correct, export) offline, using local model stubs or a local-served perception model. Cloud connectivity is for metadata sync, auth, and cloud perception (when authorized).

---

## 3. Secrets Management

| Secret Type | Management Approach |
|---|---|
| DB credentials | Backend environment variable — never in frontend bundle or source control |
| Model API keys (cloud perception) | Backend environment variable — never in client |
| Auth service credentials | Backend environment variable |
| Local dev secrets | `.env.local` (git-ignored) or OS keychain via Tauri |
| Staging/production secrets | Secure secrets manager (tool TBD — e.g., Render's environment variable management, Supabase's built-in secrets, or a dedicated vault) |

---

## 4. AI Model Configuration per Environment

| Environment | Perception model | Brain model | Notes |
|---|---|---|---|
| Local / Dev | Local stub or test model | Prompted foundation model (no fine-tuning required) | Real models optional; stubs acceptable for UI/API testing |
| Staging | Full model stack (same as production) | Same as production | Must use the same model routing as production |
| Production | Full model stack, cloud-processing authorized models require explicit per-org consent | Full stack | Cloud perception requires explicit consent per `../03_ARCHITECTURE/SECURITY.md` §3 |

---

## 5. Drawing Data in Non-Production Environments

**Real customer drawing packages must not appear in local or staging environments** unless:
- Explicitly authorized in writing by the owning organization
- Documented with the authorization record
- Handled under the same security controls as production

Use synthetic, redacted, or publicly available test drawings in all non-production environments. See legacy `README.md` Data Rights & Governance and `../05_IMPLEMENTATION/TESTING.md` §3.

---

## 6. Cross-References

- `../05_IMPLEMENTATION/DEPLOYMENT.md` — where things run
- `../03_ARCHITECTURE/SECURITY.md` — secrets and access control
- `../05_IMPLEMENTATION/TESTING.md` §3 — test data handling
- `OBSERVABILITY.md` — per-environment monitoring
