# Vectoris — Testing Strategy

**Status:** RECOMMENDED  
**Owner of:** Test strategy across layers  
**Does not own:** AI-specific evaluation methodology (→ ../04_AI/EVALUATION.md)

---

## 1. Layers of Testing

| Layer | Approach |
|---|---|
| Frontend unit | Component-level tests for reusable components (`../02_DESIGN/COMPONENTS.md`) |
| Frontend integration | Key workflows (`../01_PRODUCT/CORE_WORKFLOWS.md`) exercised end-to-end within the app shell |
| Backend unit | Service-level tests for Ingestion, Tool Executor, Correction/Audit Ledger logic |
| Backend integration | API contract tests against `../03_ARCHITECTURE/API_ARCHITECTURE.md` |
| AI/Perception | Not covered by conventional unit tests — governed by `../04_AI/EVALUATION.md`'s Evaluation Suite and Benchmark instead |
| End-to-end | Full upload → detect → correct → export flow against a real (test-fixture) drawing package |

## 2. Explicit Separation from AI Evaluation

Conventional pass/fail testing is appropriate for deterministic code paths (ingestion parsing, permission checks, export formatting). It is **not** appropriate as the sole quality gate for AI model behavior — that is `../04_AI/EVALUATION.md`'s job. Do not conflate "tests pass" with "the AI is good."

## 3. Test Data

Real drawing packages used for testing must comply with the legacy README's Data Rights & Governance rules (explicit documented authorization required) — carried forward unchanged. Synthetic/redacted fixtures are preferred for CI where real data cannot be used.

## 4. Framework Choices

**TBD** — deferred to implementation phase (e.g., pytest for backend, Vitest/Playwright-class tooling for frontend are reasonable defaults given the stack, not locked here).

## 5. Cross-References

- `../04_AI/EVALUATION.md`
- `../03_ARCHITECTURE/SECURITY.md` (data handling in test environments)
