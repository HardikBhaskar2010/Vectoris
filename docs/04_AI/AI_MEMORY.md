# Vectoris — AI Memory

**Status:** RECOMMENDED  
**Owner of:** Memory layers (project/company/user/session)  
**Does not own:** Tool implementations (→ TOOL_SYSTEM.md), training pipeline (→ TRAINING.md)

---

## 1. Memory Layers

Preserving and extending the legacy README's "Four Memory Layers" principle:

| Layer | Contains | Volatility | Never in Model Weights |
|---|---|---|---|
| **Project Memory** | This project's documents, detections, corrections, approvals, chat history | Medium — evolves per project | Correct — always retrieval |
| **Company Memory** | Org-specific preferences, naming conventions, recurring assemblies (future) | Medium | Correct — always retrieval |
| **User Memory** | Individual user preferences, recent activity | Low-medium | Correct — always retrieval |
| **Session Memory** | Current chat session's conversational context | High (session-scoped) | Correct — always retrieval / context window |

## 2. Hard Rule

Volatile, project-specific, or company-specific facts belong in retrieval/database layers. Model weights (via fine-tuning, see `VECTORIS_BRAIN.md`) encode **behavior**, never **current facts**. This is the same rule as `AI_SYSTEM.md` §4, restated here because Memory is the component responsible for enforcing it operationally.

## 3. Context Management & Retrieval Mechanics

Memory retrieval feeds the Brain's prompt context following the hierarchical loading strategy in `AGENT_RUNTIME.md` §5:
- **Hierarchical Indexing:** Project manifest and document directory loaded initially.
- **On-Demand Sheet Loading:** Detailed visual/OCR sheet contents loaded only when specifically queried.
- **Sliding Window & Summarization:** Sessions older than 6 turns are compacted into rolling session summaries to prevent context bloat.

## 4. Memory Must Distinguish Confidence/Provenance

Per founder instruction (§39 of brief), the AI must distinguish **known**, **inferred**, **uncertain**, and **missing** information. Memory retrieval results must carry this provenance forward so the Brain (and ultimately the user) can see whether a fact is AI-inferred, user-provided, or human-verified — mirroring the same distinction required for Project Type in `../01_PRODUCT/CORE_WORKFLOWS.md` and `../03_ARCHITECTURE/DATA_MODEL.md`.

## 5. Company Memory — Explicitly Near-Term/Future

Company memory (preferred manufacturers, naming conventions, material mappings, recurring assemblies) is **not** MVP scope — see `../00_PROJECT/FEATURE_MAP.md`. The memory architecture must not preclude it, but nothing here authorizes building it now.

## 6. Cross-References

- `AI_SYSTEM.md` §4, `VECTORIS_BRAIN.md`
- `AGENT_RUNTIME.md` (context compaction, on-demand sheet retrieval)
- `../03_ARCHITECTURE/DATA_MODEL.md` for the underlying storage of project/session data
