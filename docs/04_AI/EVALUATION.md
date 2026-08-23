# Vectoris — AI Evaluation

**Status:** RECOMMENDED  
**Owner of:** Evaluation suite categories and benchmark dataset  
**Does not own:** Training pipeline mechanics (→ TRAINING.md)

---

## 1. Principle

There is no single "AI accuracy" metric. Vectoris maintains a permanent, **versioned Vectoris Evaluation Suite** spanning multiple independent categories, because a model can be strong in one dimension (e.g., detection precision) and weak in another (e.g., tool-selection correctness) — collapsing these into one number hides real failure modes.

## 2. Evaluation Categories

| Category | Measures |
|---|---|
| **Document Understanding** | PDF parsing correctness, sheet classification accuracy, document identification |
| **Perception** | Symbol detection precision/recall, component classification accuracy, geometry localization accuracy |
| **Measurement** | Count accuracy, length/area measurement accuracy |
| **Engineering Reasoning** | Specification interpretation, application reasoning, requirement extraction (near-term scope) |
| **Agent Behavior** | Tool selection correctness, tool argument correctness, context retention, multi-file reasoning, clarification behavior, refusal behavior, hallucination resistance |
| **Output Quality** | Takeoff correctness, export correctness, traceability (can every output be traced to evidence?) |

Agent Behavior evaluation must measure whether the agent took the **correct path**, not only whether the final answer happened to be right — a correct answer reached via a fabricated tool call or skipped evidence check is a failure, not a pass.

## 3. The Vectoris Benchmark

A versioned benchmark dataset of real-world difficult cases, including: clean PDFs, scanned PDFs, low-resolution scans, rotated drawings, large drawing sets, dense drawings, different electrical standards, different project types, mixed document packages, multi-file projects, ambiguous symbols, missing information, conflicting information, revision/addendum cases, adversarial cases, and known failure cases.

Each benchmark item should have ground truth where feasible. Benchmark construction: **TBD** — depends on availability of real, authorized drawing packages (see `../03_ARCHITECTURE/SECURITY.md` and the legacy README's Data Rights & Governance rules, which apply unchanged to any benchmark data sourced from real customer material).

## 4. What "Good Evaluation" Means Here

> Never use "the model feels smarter" as an evaluation methodology.

Every model/prompt/architecture change that could affect AI behavior must be checked against the Evaluation Suite and Benchmark before being considered validated — this is a binding practice, not a nice-to-have, given the legacy thesis's repeated caution against unvalidated confidence.

## 5. Cross-References

- `TRAINING.md` (what feeds evaluation)
- `MODEL_GOVERNANCE.md` (how evaluation results gate deployment)
- `../05_IMPLEMENTATION/TESTING.md` (how this fits the broader test strategy)
