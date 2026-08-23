# Vectoris — UX Principles

**Status:** LOCKED (principles)   
**Owner of:** Interaction philosophy — how AI/human collaboration is expressed in the UI  
**Does not own:** Visual tokens (→ DESIGN_SYSTEM.md)

---

## 1. AI Proposes, Human Decides — In Every Interaction

Every AI-originated value in the UI must be visually distinguishable from a human-approved value, and every AI value must remain editable until approved. This is the UX expression of the product's core principle (see `../00_PROJECT/VISION.md` §2).

## 2. Confidence Is Not a Primary UI Feature

Per founder decision: do not expose "97% confidence" style UI as a primary feature. Internal confidence/probability data may exist for evaluation and routing (see `../04_AI/EVALUATION.md`) but must not become the user's main trust signal. Trust is built through **evidence** (source-linked detections) and **correctability**, not through exposed probability scores.

## 3. AI Explanation Is Restrained by Default

The agent can reason internally and use explanation when useful (e.g., answering "why did you count 43?"), but the primary takeoff UI should not be cluttered with verbose AI narration by default. Explanation is available on demand (e.g., via the chat session), not forced into every row of the review table.

## 4. Correction Must Be Faster Than Doing It Manually

Per the legacy thesis's central adoption risk (`THESIS.md` Risk 2): if reviewing/correcting AI output takes as long as manual takeoff, the product has no value regardless of detection accuracy. Every correction interaction (accept/reject/edit/add/delete) must be optimized for speed — exact interaction affordances are a design decision, not specified here, but this constraint is binding on that design.

## 5. Evidence Must Always Be One Click Away

Any line item, detection, or agent-produced claim must let the user jump to its source (drawing region, document, or prior decision) without leaving their current context where feasible.

## 6. Never Silently Overwrite Approved Data

Once a human has approved a value, AI must not change it without a new, visible, human-reviewable proposal. This applies to re-processing, re-detection, and agent actions alike.

## 7. Graceful Degradation Over Silent Failure

Malformed input, ambiguous detections, or insufficient context should surface as a clear state (see each page's Error/Empty states in `../06_PAGES/*`), never as a silent gap or fabricated result.

## 8. Cross-References

- `../04_AI/AI_SYSTEM.md` §Trust Principles (system-level version of these rules)
- `DESIGN.md`, `DESIGN_SYSTEM.md` for visual expression
