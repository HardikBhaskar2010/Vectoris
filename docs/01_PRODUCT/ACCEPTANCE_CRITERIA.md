# Vectoris — Cross-Cutting Acceptance Criteria

**Status:** LOCKED  
**Owner of:** MVP-wide acceptance bar  
**Does not own:** Page-specific acceptance criteria (→ individual `06_PAGES/*` files)

---

## 1. Ingestion & Processing

- AC-1: A user can upload a multi-sheet PDF drawing package and receive a processed, sheet-classified result without the UI blocking.
- AC-2: Malformed or corrupted files fail gracefully with a clear, specific error — never a silent failure or generic crash.
- AC-3: Large packages (exact size threshold TBD, requires technical spike) show real-time progress, not an indefinite spinner.

## 2. Detection & Takeoff

- AC-4: Every detected line item links to its source sheet and source coordinates.
- AC-5: Both discrete counts and geometry/length measurements are supported as first-class line-item types.
- AC-6: No confidence score is shown as a primary UI element (internal-only per `../02_DESIGN/UX_PRINCIPLES.md`).

## 3. Human Correction

- AC-7: A user can accept, reject, edit, add, or delete any detection.
- AC-8: Every correction produces a structured event with AI value, human value, delta, user, timestamp, model version.
- AC-9: A manually created line item is stored in the same structural model as an AI-detected one, distinguished only by a `source` field.

## 4. Export

- AC-10: A user can export an approved takeoff in at least XLSX, CSV, and JSON without leaving the review screen.
- AC-11: Exported data always reflects the current structured internal state, never a stale cached copy.

## 5. Collaboration

- AC-12: A newly invited member via link can join an organization and see only the projects/role permissions granted to them.
- AC-13: Two users can have the project open concurrently without data loss (conflict resolution strategy: TBD, see `../03_ARCHITECTURE/EVENT_SYSTEM.md`).

## 6. AI Agent

- AC-14: The agent never claims to have inspected a file it did not actually process.
- AC-15: The agent asks a clarifying question rather than guessing when project context is ambiguous or insufficient.
- AC-16: Every agent-produced result traces to specific source evidence or is explicitly labeled as reasoning/inference rather than fact.

## Cross-References

- `../00_PROJECT/PRD.md` §6 Success Criteria
- `../04_AI/AI_SYSTEM.md` §Trust Principles
