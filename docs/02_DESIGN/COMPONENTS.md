# Vectoris — Component Inventory (Conceptual)

**Status:** PROVISIONAL — conceptual inventory, not pixel specs  
**Owner of:** Reusable component list and their functional responsibility  
**Does not own:** Pixel-level specification (founder-provided design), visual tokens (→ DESIGN_SYSTEM.md)

---

## 1. Purpose

This is a **functional** inventory — what components must exist and what they must do — so that engineering and design can share vocabulary before final visuals exist. It is not a Figma/Storybook spec.

## 2. Core Components

| Component | Responsibility | Used In |
|---|---|---|
| `ProjectCard` | Summarize a project (name, status, thumbnail) | Projects, Dashboard |
| `UploadDropzone` | Accept file drag/drop or browse, show validation state | Document Upload |
| `ProcessingProgress` | Realtime job progress with stage labels | Processing |
| `DrawingCanvas` | Render drawing sheet, support pan/zoom/selection (PDF.js + canvas layer) | Drawing Viewer |
| `DetectionOverlay` | Render bounding boxes/geometry over the canvas, selectable | Drawing Viewer, Takeoff Review |
| `TakeoffTable` | Structured, sortable/filterable line-item table | Takeoff Review |
| `CorrectionControl` | Accept/reject/edit/delete affordance per detection | Takeoff Review, Drawing Viewer |
| `LineItemPanel` | Detail view of a single line item incl. evidence and correction history | Line Item Details |
| `ChatSessionPanel` | Threaded AI conversation UI, tool-call transparency | Project Overview, Sessions |
| `ExportMenu` | Format-selection overflow/hamburger menu | Takeoff Review, Export |
| `RoleBadge` | Visual role indicator (Owner/Admin/Manager/Editor/Viewer) | Org/member surfaces |
| `PermissionGate` | Conditional render wrapper enforcing role/permission | Global |
| `EmptyState` | Consistent empty-state pattern | All list/table surfaces |
| `ErrorState` | Consistent error-state pattern with retry affordance | All async surfaces |

## 3. Explicitly Not Specified Here

Colors, spacing, exact motion curves, and final layout — these belong to the founder's design work, informed by `DESIGN_SYSTEM.md` and `MOTION.md`.

## 4. Component Source Matrix

Vectoris relies on a curated set of UI libraries. The following matrix dictates which library supplies which component categories to maintain architectural consistency.

| Component Category | Primary Source |
|---|---|
| Dashboard cards | Bklit UI |
| Data tables | Bklit UI / Custom |
| AI conversation | assistant-ui |
| AI tool states | assistant-ui + Custom |
| Thinking state | Thinking Orbs |
| Premium interactions | ReactBits |
| Advanced animations | Skiper UI / ReactBits |
| Theme toggle | Skiper UI |
| Dynamic Island | Skiper UI |
| Onboarding | Driver.js |
| Core primitives | Vectoris custom design system |

> **CRITICAL RULE:** No component should be imported merely because "it looks cool." It must have a defined product role and conform to the Vectoris Design System.

## 4. Cross-References

- `DESIGN_SYSTEM.md`, `MOTION.md`
- `../06_PAGES/*` for where each component is used in context
