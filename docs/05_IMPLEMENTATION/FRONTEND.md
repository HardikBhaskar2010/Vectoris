# Vectoris — Frontend Implementation

**Status:** RECOMMENDED  
**Owner of:** Frontend implementation approach  
**Does not own:** Backend detail (→ BACKEND.md), visual design (→ 02_DESIGN)

---

## 1. Stack

React + TypeScript + Vite, wrapped in Tauri (Rust shell). See `../03_ARCHITECTURE/TECH_STACK.md` for the ADR.

## 2. Structural Principles

- **State management:** approach TBD (React Query/TanStack Query for server state is a reasonable default given async job-heavy backend interactions; local UI state via React's built-in state or a lightweight store). Not locked.
- **Drawing viewer:** PDF.js for rendering + React-Konva (or equivalent canvas abstraction) for the interaction layer (detections, bounding boxes, measurement) — see `../02_DESIGN/COMPONENTS.md` `DrawingCanvas`/`DetectionOverlay`.
- **Realtime updates:** consumes whatever mechanism `../03_ARCHITECTURE/EVENT_SYSTEM.md` locks (SSE/WebSocket/polling).
- **Theming:** dark/light via design tokens in `../02_DESIGN/DESIGN_SYSTEM.md`; system-theme-aware.
- **Type safety:** API contract types shared/generated from backend schema where feasible (mechanism TBD — e.g., OpenAPI-generated types from FastAPI).

## 3. Native Integration (via Tauri)

Filesystem access (local drawing files), OS-level file dialogs, and any local-compute hooks are exposed to the React layer via Tauri's Rust-backed command bridge, not via browser-only APIs.

## 4. What This Document Does Not Decide

Component visuals, exact folder structure, testing framework specifics (→ `TESTING.md`), and state-management library lock-in are left open pending implementation-phase decisions informed by the technical spike and founder design work.

## 5. Cross-References

- `../03_ARCHITECTURE/TECH_STACK.md`, `../02_DESIGN/*`
- `../06_PAGES/DRAWING_VIEWER.md` for viewer-specific behavior
