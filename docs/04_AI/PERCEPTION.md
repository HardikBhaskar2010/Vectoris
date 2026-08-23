# Vectoris — Perception Layer

**Status:** LOCKED (Hybrid Execution Router architecture) · TBD (specific model weights)  
**Owner of:** Vision/OCR/geometry/document-understanding layer  
**Does not own:** Brain reasoning (→ VECTORIS_BRAIN.md), tool contracts (→ TOOL_SYSTEM.md)

---

## 1. Responsibility

Perception answers "what is here?" — it does not decide what to do with the answer (that's the Brain's job). It covers: vision, OCR, geometry, extraction, classification, document understanding, symbol detection.

## 2. Required Capabilities (MVP)

| Capability | Description |
|---|---|
| Document ingestion parsing | Extract structure from PDF (native and scanned) |
| Sheet classification | Identify sheet type (floor plan, schedule, legend, notes) |
| Symbol/component detection | Locate and classify electrical components with bounding-box evidence |
| Discrete counting | Aggregate detected instances into counts |
| Geometry/length measurement | Measure cable tray, conduit, and similar linear/area quantities |
| OCR | Extract text (labels, schedules, legends) from raster/scanned content |

## 3. Hybrid Execution Router (Locked Architecture)

The architecture is **LOCKED** to the Hybrid Execution Router. It does not lock the entire perception layer to one model prematurely. Required support:

- Local perception models (default)
- Cloud perception models (policy-controlled)
- The Execution Router dynamically decides location based on privacy policy, permissions, model availability, hardware capability, task requirements, and network.
- Fallback models (if primary fails or is unavailable)
- Model versioning (every detection traceable to the model version that produced it — see `MODEL_GOVERNANCE.md`)

## 4. Local-First Rule (Binding)

The system remains **local-first** by default. Customer drawings are not silently uploaded to cloud models. Cloud processing is only used when permitted and explicitly governed by the applicable policy (see `../03_ARCHITECTURE/SECURITY.md` §3).

## 5. Candidate Models

**Gemini** is currently a candidate for cloud perception — **CANDIDATE / PROVISIONAL status**, not locked. Local model candidates: **TBD**, requires technical spike evaluating accuracy on real, messy contractor drawings (per legacy `THESIS.md` Risk 1) against local-deployability constraints.

## 6. Determining Actual Models

The technical spike (Phase 0.5, see `../05_IMPLEMENTATION/DEVELOPMENT_PHASES.md`) is responsible for determining exact perception models — this document intentionally does not pre-decide that outcome.

## 7. Cross-References

- `AI_SYSTEM.md`, `VECTORIS_BRAIN.md`
- `../03_ARCHITECTURE/SECURITY.md` §Cloud Processing Consent
- `EVALUATION.md` §Perception category
