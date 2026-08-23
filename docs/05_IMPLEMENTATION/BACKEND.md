# Vectoris — Backend Implementation

**Status:** RECOMMENDED  
**Owner of:** Backend implementation approach  
**Does not own:** Frontend detail (→ FRONTEND.md), AI theory (→ 04_AI/AI_SYSTEM.md)

---

## 1. Stack

Python + FastAPI. See `../03_ARCHITECTURE/TECH_STACK.md` for rationale.

## 2. Service Boundaries

Mirrors `../03_ARCHITECTURE/SYSTEM_COMPONENTS.md`: API Gateway, Ingestion Service, Job Queue/Workers, Perception Service, Brain (Agent Core), Memory Service, Tool Executor, Control/Verification, Correction/Audit Ledger, Export Service.

## 3. Job Queue Technology

**LOCKED to Redis + Celery.** Satisfies `../03_ARCHITECTURE/EVENT_SYSTEM.md`'s required properties (progress, retries, cancellation, idempotency, failure recovery) while keeping the worker stack completely Python-native to align with the core backend layer. Celery provides native support for parent/child job dependencies (chains/groups) required for ingestion.

## 4. Document Processing Dependencies

OpenCV, OCR tooling (specific library TBD), and PDF-parsing libraries constitute the Ingestion/Perception pipeline's core dependencies. Exact library choices: **TBD**, technical-spike output.

## 5. AI Orchestration

The Backend hosts the Brain's orchestration logic (tool selection, multi-step reasoning loops) and calls out to Perception (local or cloud-routed per `../04_AI/PERCEPTION.md`). See `AI_IMPLEMENTATION.md` for how the conceptual AI architecture becomes running code.

## 6. Database Access Layer

Standard async SQL tooling (e.g., SQLAlchemy async or equivalent) applies for the locked Supabase/PostgreSQL backend.

## 7. Cross-References

- `../03_ARCHITECTURE/SYSTEM_COMPONENTS.md`, `EVENT_SYSTEM.md`, `DATA_MODEL.md`
- `AI_IMPLEMENTATION.md`
