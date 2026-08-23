# Vectoris — Vectoris Brain

**Status:** RECOMMENDED  
**Owner of:** Brain behavior, fine-tuning philosophy  
**Does not own:** Perception model detail (→ PERCEPTION.md), tool contracts (→ TOOL_SYSTEM.md)

---

## 1. What the Brain Is

The Brain is the reasoning/planning component of the Vectoris Agent — it answers "what should I do?" It is not the same component as Perception ("what is here?"); this separation is deliberate and load-bearing (see `AI_SYSTEM.md` §1).

## 2. Recommended Direction

**A fine-tuned open-source foundation model, specialized for Vectoris behavior.** Do not train a model from scratch unless future evidence strongly justifies it (no such evidence exists today).

## 3. What Fine-Tuning Should Teach

- How Vectoris should respond (tone, structure, restraint per `../02_DESIGN/UX_PRINCIPLES.md`)
- Vectoris-specific workflows and tool usage patterns
- How to select the right tool for a request
- How to handle multiple files/documents in one reasoning pass
- How to reason about project context (what's relevant, what's not)
- When to ask clarifying questions vs. proceed
- When to refuse or stop (insufficient evidence, permission boundary, ambiguity)
- How to respect company/organization policy
- How to respect human-approval boundaries
- How to avoid hallucinating unavailable information
- How to behave as an in-application agent, not a general chatbot

## 4. What Fine-Tuning Should NOT Do

Fine-tuning is for **behavior**, not **facts**. It must not be used as a substitute for live project data. Anything that changes over time or is customer-specific — current prices, a specific project's line items, a specific organization's catalog, today's document contents — must come from retrieval, structured context, project memory, company memory, tools, or databases (see `AI_MEMORY.md`), never from baked-in model weights.

## 5. Candidate Base Models

**TBD** — requires technical spike. The evaluation criteria (not yet applied): open-source licensing suitability, fine-tuning tooling maturity, context-window sufficiency for multi-file reasoning, local-deployability (for local-first / on-device scenarios), and cost of inference at scale.

## 6. Behavior Boundaries (Enforced, Not Just Trained)

Fine-tuning shapes tendency; it does not guarantee compliance. Hard boundaries (permission checks, evidence requirements, approval gating) are enforced by the Control/Verification layer regardless of what the fine-tuned model outputs — see `TOOL_SYSTEM.md` §Verification and `MODEL_GOVERNANCE.md`. Do not rely on fine-tuning alone for safety-critical behavior.

## 7. Cross-References

- `AI_SYSTEM.md` §4 (the governing fine-tuning-vs-retrieval principle)
- `TRAINING.md` (how corrections become fine-tuning data)
- `EVALUATION.md` (how Brain behavior is measured — the "Agent Behavior" category)
