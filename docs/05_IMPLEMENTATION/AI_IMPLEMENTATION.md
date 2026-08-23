# Vectoris — AI Implementation

**Status:** RECOMMENDED  
**Owner of:** How `AI_SYSTEM.md`'s architecture gets built  
**Does not own:** AI theory/architecture rationale (→ ../04_AI/AI_SYSTEM.md)

---

## 1. Build Order for AI Components

1. **Perception (MVP-critical):** detection + measurement pipeline, evaluated via the technical spike before any Brain investment (per `IMPLEMENTATION_FLOW.md` §2).
2. **Tool Executor + Control/Verification:** the guardrails must exist before the Brain is given autonomy — build the boundary before the thing it bounds.
3. **Brain (initial version):** starts as a capable off-the-shelf foundation model with strong prompting/tool-use scaffolding before any fine-tuning investment. Fine-tuning (`../04_AI/VECTORIS_BRAIN.md`) is a later maturity step, not a Day 1 requirement — an un-fine-tuned model with correct tool contracts and verification is a legitimate, honest MVP AI implementation.
4. **Memory:** starts as straightforward project-scoped retrieval (current documents, current takeoff state); company/user memory layers are near-term/future per `../00_PROJECT/FEATURE_MAP.md`.

## 2. Fine-Tuning Is Not a Prerequisite for MVP Launch

Per `../04_AI/VECTORIS_BRAIN.md`, fine-tuning teaches *behavior*. A well-scaffolded prompted agent with correct tool contracts, strict verification, and retrieval-based memory can satisfy the MVP's agentic requirements (`../01_PRODUCT/ACCEPTANCE_CRITERIA.md` §6) without a custom fine-tuned model. Fine-tuning is the compounding-quality investment to make once real usage data exists to fine-tune on.

## 3. Evaluation-Driven Development

Every AI-facing implementation milestone should be checked against the relevant slice of `../04_AI/EVALUATION.md`'s categories as it's built, not only at Phase 7. Perception work is checked against Document Understanding/Perception/Measurement categories as soon as a spike exists; agent work is checked against Agent Behavior as soon as tool-use exists.

## 4. Cross-References

- `../04_AI/AI_SYSTEM.md`, `VECTORIS_BRAIN.md`, `TOOL_SYSTEM.md`, `EVALUATION.md`
- `BACKEND.md`
