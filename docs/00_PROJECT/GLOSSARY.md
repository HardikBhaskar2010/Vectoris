# Vectoris — Glossary

**Status:** LOCKED (definitions) — living document, append only with care  
**Owner of:** Shared vocabulary across all documentation  
**Does not own:** Decisions or opinions — this file defines terms, it does not argue positions

---

| Term | Definition |
|---|---|
| **Vectoris** | The unified product name (formerly "DrawSpec" in legacy discovery documents). |
| **H1 (Drawing Intelligence)** | Legacy hypothesis name for the drawings-in entry pathway: drawing → detection → takeoff. Not a separate product — an entry point into the Vectoris pipeline. |
| **H2 (Engineering & Commercial Intelligence)** | Legacy hypothesis name for the requirement-in entry pathway: requirement → configuration → BOQ → proposal. Not a separate product; near-term/future scope, not MVP. |
| **Takeoff** | The process of extracting quantities (counts and measurements) of components/materials from a drawing package. |
| **BOQ (Bill of Quantities)** | A structured list of required materials/components with quantities, used for costing and procurement. Downstream of takeoff; not MVP output. |
| **BOM (Bill of Materials)** | Similar to BOQ; a structured product/material list, typically manufacturing-oriented. |
| **MEP** | Mechanical, Electrical, Plumbing — the broader engineering discipline Vectoris's electrical focus sits within. |
| **CPQ (Configure-Price-Quote)** | A mature enterprise software category (Salesforce CPQ, SAP CPQ, Tacton, etc.) that H2 must be differentiated against, not re-implemented. |
| **System Integrator (SI)** | A company that combines multiple OEMs' products into a single customer-facing offer — the hypothesized H2 target customer segment (unvalidated beyond one discovery call). |
| **Application / Where-Used Mapping** | Determining what a given component or line item is functionally used for within a project (e.g., "PAC unit power supply, indoor→outdoor connection") — semantics observed in historical BOQ evidence, not yet an MVP capability. |
| **Techno-Commercial Engineering** | The combined technical (engineering-compliant configuration) and commercial (pricing/proposal) work of turning a requirement into a sellable offer. |
| **PAC (Precision Air Conditioning)** | A precision-cooling equipment category observed in the Emerson historical BOQ. |
| **SKU** | Stock keeping unit — a unique product identifier in a catalog. |
| **UOM (Unit of Measure)** | The unit a quantity is expressed in (each, meter, etc.). |
| **Document** | Any file uploaded to a project (PDF, DWG, DXF, image, scanned PDF, Excel, etc.). A Document may contain one or many Sheets. |
| **Drawing** | A Sheet (or set of Sheets) representing a spatial/plan view of a project — floor plans, power plans, lighting plans, single-line diagrams. Not all Sheets are Drawings (some are schedules, legends, or notes). |
| **Takeoff Workspace** | The primary working page for viewing drawings with AI detection overlays and performing spatial corrections. Also labeled "Drawing / Takeoff Workspace" or "Drawing Viewer" — the canonical page name in `APP_FLOW.md`. |
| **Takeoff Run** | A single execution of the AI detection/measurement pipeline against a project's uploaded documents. A project may have multiple Takeoff Runs over time (e.g., after uploading revised drawings). See `../03_ARCHITECTURE/DATA_MODEL.md`. |
| **Detection** | A single AI-proposed identification of a component or geometry on a drawing, with source evidence and (internal-only) confidence. Produced by a Takeoff Run. |
| **Line Item** | A single row of the takeoff/BOQ representing one component/material type and its quantity, traceable to evidence. |
| **Correction** | A human edit to an AI detection or line item, captured as a structured event (see `../03_ARCHITECTURE/DATA_MODEL.md`). |
| **Correction Event** | The structured data record produced when a human corrects, approves, or overrides an AI-proposed Detection or Line Item. Carries: AI value, human value, delta, correction type, correction reason, user, timestamp, model version. The atomic unit of the learning pipeline. |
| **Session** | A single AI chat/conversation thread within a project. Multiple sessions per project; not project revisions. |
| **Vectoris Brain** | The reasoning/planning component of the AI agent — the "what should I do" layer. See `../04_AI/VECTORIS_BRAIN.md`. |
| **Perception** | The "what is here" layer of the AI agent — vision, OCR, geometry, symbol detection. See `../04_AI/PERCEPTION.md`. |
| **Agent / Tool** | A discrete capability the Brain can invoke (e.g., "measure geometry," "export takeoff"). See `../04_AI/TOOL_SYSTEM.md`. |
| **Local-first** | Architectural principle that project files primarily live on the user's device; cloud handles metadata/sync, not raw drawings by default. |
| **Gate** | A discovery/validation checkpoint (from legacy `THESIS.md`) that must pass before a hypothesis becomes authorized scope. |

## Cross-References

Definitions here are referenced, not restated, throughout the documentation set.
