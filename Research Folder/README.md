# Vectoris — AI-Native Electrical Estimating & Techno-Commercial Engineering

*Companion to [DISCOVERY.md](./DISCOVERY.md), [THESIS.md](./THESIS.md), [Call-Summary-Shubham-Singh.md](./Call-Summary-Shubham-Singh.md), and [SCOPE.md](./SCOPE.md)*

> **Status:** Pre-product — Customer discovery & technical validation. H1 and H2 have merged into one pipeline with two entry points (decided, Aug 2026 — see below); a broader long-term scope now exists in [SCOPE.md](./SCOPE.md).
> **Initial vertical:** Electrical / MEP contractors, OEMs, and system integrators
> **Long-term vision:** A system that turns a messy customer requirement into a trustworthy, commercially viable technical proposal — via a single merged pipeline with two entry points: electrical quantity takeoff (H1, drawing-in) and AI-assisted solution configuration and quotation (H2, requirement-in). The full 15-workstream long-term system map, of which H1 and H2 are two entry points into the same pipeline, is documented in [SCOPE.md](./SCOPE.md).

> [!NOTE]
> **SCOPE.md is the map; this document (and THESIS.md's Gates) is the current plan.** SCOPE.md deliberately describes a much larger system than anything currently authorized to be built. Its existence does not mean more than H1/H2 discovery and technical spikes are in scope today — see [SCOPE.md §24](./SCOPE.md#24-out-of-scope-initially) and the Gates in THESIS.md for what is actually authorized right now.

---

## TL;DR

- **What it is:** Vectoris is one AI-native electrical/MEP techno-commercial pipeline with two merged entry points: **H1**, quantity takeoff from drawings, and **H2**, AI-assisted solution configuration and quotation ("techno-commercial engineering"). The merge itself is a decided architecture, not a hypothesis; the market evidence behind each stage is not yet validated, and H2's stages rest on markedly thinner evidence than H1's (see the "H1 and H2 — Merged Pipeline" section above).
- **H1 product sketch:** Upload electrical drawings → AI produces a traceable first-pass takeoff → estimator reviews, corrects, approves → every correction becomes structured data.
- **H2 product sketch:** Customer requirement → AI selects and configures compatible products across product lines → BOQ → pricing → techno-commercial proposal draft → human review.
- **Core principle (both):** AI proposes. The human decides. The system remembers why.
- **H1 product progression:**
  - **Takeoff** — turn drawings into a verified first-pass quantity list
  - **Estimating** — connect verified quantities to materials, labor, and current prices
  - **Decision Intelligence** — surface unusual mappings, stale pricing, revision changes, and deviations from historical patterns
  - **Learning System** — each verified estimate makes future estimates faster and more accurate for that contractor
- **MVP scope:** Neither H1 nor H2 has an MVP committed yet. H1's original MVP scope (electrical quantity takeoff only) remains documented below as a fallback/comparison case. H2 has no MVP spec yet — see Gate H2-1 in THESIS.md before writing one.
- **Why now *(Hypothesis)*:** For H1, multiple funded competitors (Quotr, BuildVision AI, Beam AI, Countfire) already ship the "AI takeoff + human review" pattern today — it is the current industry baseline, not an emerging trend. For H2, the pattern ("AI configures a solution and drafts a quote") is also an existing, well-funded category — Configure-Price-Quote (CPQ) — with deep incumbents (Salesforce, SAP, Oracle, Tacton) and new AI-native entrants. Neither hypothesis is whitespace; both require finding the specific unaddressed niche within an already-served market.
- **Current stage:** No product built. Customer discovery and technical validation before writing production code.
- **Central hypothesis:** Electrical estimators can be made materially faster by combining domain-specific drawing intelligence with a continuously improving, evidence-backed estimating workflow — where verified human corrections, contractor-specific data, and current pricing information improve the system over time.
- **Evidence Ledger:** [View current evidence →](#evidence-ledger)

> [!WARNING]
> **Wedge Under Review (Post-Desk-Research, Aug 2026):** The standalone takeoff-first wedge as originally scoped is significantly more contested than assumed, with multiple funded competitors shipping AI takeoff + estimator review today. Customer discovery had been evaluating an alternative wedge — **Revision & Addenda Intelligence** — before a discovery call surfaced a second, structurally different hypothesis (H2, below). Both are now open; neither is validated. See [THESIS.md](./THESIS.md#alternative-wedge-under-consideration) and the [Schneider/Shubham call summary](./Call-Summary-Shubham-Singh.md) for details.
>
> **Update, Aug 22, 2026:** A follow-up competitive research pass found that the Revision & Addenda wedge is now *also* materially contested — Beam AI ships an automated addenda/revision variance report today, and Countfire was acquired by Valsoft. A new electrical-specific competitor (Drawer.AI) was also identified. See [THESIS.md's Market Update section](./THESIS.md#market-update--research-refresh-aug-22-2026) for the full findings and what they change.

> [!IMPORTANT]
> Everything in this document beyond the problem description is a hypothesis until validated with real users and real drawings. Sections are labelled **Known**, **Hypothesis**, or **Unknown** where relevant.

---

## H1 and H2 — Merged Pipeline, Two Entry Points

> [!CAUTION]
> H2 currently rests on **one discovery call with one person at one OEM** (Shubham Singh, BD Manager for data centers at Schneider Electric — see [call summary](./Call-Summary-Shubham-Singh.md)). By the signal-strength framework in [DISCOVERY.md](./DISCOVERY.md), his reaction grades as **Weak-to-Medium** ("that's really impressive," no commitment, no named budget, no pilot request) — not the strong validation it can feel like in the moment. **This does not affect the merge decision below** — H1 and H2 are merging into one pipeline regardless, as an architectural call, not a market claim. What the weak evidence *does* affect is sequencing: the downstream/requirement-entry stages that H2 originally covered (solution configuration, CPQ-style pricing) still need real validation before they're built, even though they're now understood as later stages of one pipeline rather than a separate product bet.

> [!IMPORTANT]
> **Decision (Aug 2026, following review of two historical BOQs — see [Historical BOQ Evidence](#historical-boq-evidence--aug-2026) below):** H1 and H2 are merging. This is a founder decision, not a hypothesis under test. H1 and H2 are no longer framed as mutually exclusive product bets — they are two entry points into one unified technical-commercial pipeline. Two historical BOQs (a data-center electrical/infrastructure BOQ and a PAC/HVAC precision-cooling BOQ) showed a workflow that looks less like "pick takeoff OR pick solution configuration" and more like a single pipeline with two possible entry points: **Project → understand scope → extract requirements/quantities → determine application/where used → map to products/materials → BOQ → current company pricing → cost/commercial output.** H1 (drawings in) and H2 (requirements in) converge on the same downstream steps — line items, application mapping, product selection, BOQ, pricing.
>
> **What is and isn't decided here:** the *architecture* — that H1 and H2 sit on one pipeline rather than being two competing products — is now settled. What remains unvalidated, and still requires the evidence discipline everywhere else in this document, is everything about the *market*: whether real customers feel this pain, at which entry point they'd actually start, whether they'd pay for it, and in what order the pipeline stages should be built. Nothing about MVP sequencing has changed — see [Initial Wedge](#initial-wedge--what-we-are-not-building) below, which still stands: the first thing built is still H1's narrow takeoff-only scope, now understood as "stage one of the merged pipeline" rather than "one of two competing bets."

Vectoris is now built around two structurally different **entry points into one merged pipeline** (see the Decision box above), both electrical/MEP-adjacent, both pre-validation at the market level. **These are the only two with a completed discovery script today, but they are not the only candidate wedges** — [SCOPE.md §5](./SCOPE.md#5-strategic-direction) lists others under consideration (post-takeoff assembly mapping, engineering constraint intelligence, standalone product selection, proposal QA, bid pricing optimization) that do not yet have discovery questions written. Revision & Addenda Intelligence, the one alternative wedge that *is* already scripted, is documented separately below and in THESIS.md.

### H1 — Drawing Intelligence *(formerly "AI Electrical Takeoff")*
**Flow:** Drawing → detected components → verified quantities → evidence-backed line items.
**The job:** "How much stuff is there, and what is it?"
**Status:** Original thesis. Competitive landscape is crowded (Quotr, BuildVision AI, Beam AI, Countfire, Togal, Bobyard, Drawer.AI — see Competitive Landscape below). Fully documented in this README, DISCOVERY.md, and THESIS.md as originally scoped.

### H2 — Engineering & Commercial Intelligence *(formerly "AI Solution / Quotation Engineer")*
**Flow:** Line items + project context + company data → application/where-used → product selection → BOQ → current pricing → cost/commercial output → techno-commercial proposal → human review.
**The job:** "What should we actually sell the customer, and can we get them a proposal fast?" — and, per the pipeline framing above, also: "what does a verified takeoff need to become before it's a submittable number?"
**Why it's interesting:** It attacks a step closer to the revenue-generating decision than takeoff does, and the discovery call suggests the underlying pain — assembling a comprehensive multi-product-line solution across teams — scales *inversely* with company size: large OEMs split it across many specialized teams; small system integrators do the whole thing with one or two people. That's exactly where software creates leverage, *if* the pain is real beyond one respondent. The historical BOQs add a second, independent reason it's interesting: they show real completed line items already carry application/where-used semantics ("PAC unit power supply, indoor → outdoor connection") that a pure symbol-counting takeoff would never capture — see the Historical BOQ Evidence section below.
**Why it's risky:** This is not empty space. It is a well-known, mature enterprise software category — **Configure-Price-Quote (CPQ)** — with deep-pocketed, deeply entrenched incumbents (Salesforce CPQ, SAP CPQ, Oracle CPQ, ServiceNow CPQ, Tacton, Infor, Epicor) and an emerging "AI-native CPQ" startup wave (e.g., servicepath, now Gartner's Sole Visionary in the 2026 CPQ Magic Quadrant) already pitching almost exactly this loop: LLM plans a configuration, drafts a proposal, feedback improves guidance over time. See the CPQ Competitive Landscape below and [THESIS.md](./THESIS.md#h2--ai-native-techno-commercial-engineering-competitive-reality-cpq).
**Status:** Not yet documented as a full product spec. The merge with H1 is decided; H2's own stages still need broader discovery before they're built (see Gate H2-1 below).

> [!NOTE]
> **H1 and H2 are merging — decided, not a caution.** "Drawing Intelligence" and "Engineering & Commercial Intelligence" describe two entry points into one pipeline, not two alternative products. A drawing-derived line item (H1 output) and a requirement-derived line item (H2 input) are treated as the same underlying data structure going forward. See [THESIS.md's "Modified H1/H2 Relationship"](./THESIS.md#modified-h1h2-relationship) for the fuller diagram. What remains unvalidated is the market evidence for each stage of the merged pipeline — not whether the pipeline itself is the right shape, which is now a settled product decision.

### What the Schneider/Shubham call actually established (and didn't)

| Established (real signal) | Not established (do not assume) |
|---|---|
| Solution assembly across multiple product lines takes ~2-3 days at a large OEM, done by multiple teams | That the same pain exists, at the same severity, for the actual target customer (small/mid system integrators) |
| Unit/list pricing itself is available "within a second" from an internal portal — pricing lookup is *not* the bottleneck | That AI-assisted configuration is meaningfully faster than what a system integrator already does today |
| Negotiation from list price toward a customer's target price can take up to a week — but this is a margin/discount **approval** process, not a computation problem | That this negotiation timeline is solvable by better AI configuration — it may require workflow/approval routing instead, a different problem |
| One BD manager reacted positively to the AI-configuration concept and said "every company is working on that" | That this is willingness to pay, a committed pilot, or evidence beyond one person's opinion |
| Shubham suggested system integrators (not large OEMs like Schneider) are the better target customer for this idea | That system integrators actually feel this pain — this is a hypothesis from an OEM-side employee, not from an SI |

**Immediate implication:** the next discovery round needs to interview system integrators directly, ask directly whether they already use CPQ tooling (Salesforce CPQ, SAP CPQ, or similar) and what's missing for electrical/MEP/data-center work specifically, and separately probe the "solution assembly" bottleneck from the "negotiation/approval" bottleneck, since they likely need different solutions. See the H2 Discovery Script in [DISCOVERY.md](./DISCOVERY.md#h2-discovery-script--ai-solution--quotation-engineer).

---

## Historical BOQ Evidence — Aug 2026

> [!CAUTION]
> **What this evidence is, and is not.** Two historical BOQs have been reviewed as workflow evidence:
> 1. **GB 300** — a data-center electrical/infrastructure BOQ
> 2. **Emerson Climate Technologies, Noida** — a PAC/HVAC precision-cooling infrastructure BOQ
>
> These documents are **not customer-validation evidence.** Two documents cannot establish what customers need, what they'd pay for, or which project types are representative. They are evidence of: project types encountered, BOQ structure, engineering context, material/application relationships, units and quantity conventions, and the information required downstream of takeoff. Treat every observation below as "this is what these two documents contain," not "this is what the market looks like."

**Observed patterns across the two BOQs:**
- Data-center electrical infrastructure
- UPS / power distribution
- Panels and protection
- Cable and cable-tray systems
- Chiller / pump-related electrical work
- PAC / precision cooling infrastructure
- Refrigerant piping
- Drainage
- Humidifier-related utilities
- Installation / testing / commissioning
- Fabrication and accessory items

The Emerson BOQ specifically contains PAC units, copper refrigerant lines, condenser cabling, power cabling, drainage, R-410A refrigerant, extended piping kits, humidifier water piping, drain pumps, and cable trays.

### Project Classification — a first-class concept

The clearest gap this evidence exposed: the current docs have no explicit concept of *project type* as something the system reasons about. The two BOQs suggest this matters:

```text
Project Type
   ↓
Project Subtype
   ↓
Systems in Scope
   ↓
Relevant Engineering Rules
   ↓
Expected BOQ Categories
```

| Project class | Evidence |
|---|---|
| Data Center / Critical Infrastructure | GB 300 BOQ |
| PAC / Precision Cooling / HVAC infrastructure | Emerson BOQ |
| Electrical infrastructure | Both |
| Mechanical-electrical interface | Both |

> [!CAUTION]
> Label this table **"Observed in historical BOQs,"** not "target market segments." Two files are nowhere near enough evidence to claim these are the dominant project types Vectoris should build for — they're the only two project types anyone has actually looked at yet. See [THESIS.md's Historical BOQ Evidence — Initial Observation](./THESIS.md#historical-boq-evidence--initial-observation) for the explicit Observed / Not Established split.

---

## Competitive Reality

> [!WARNING]
> AI takeoff is no longer an empty category. Competitors now offer combinations of automated takeoff, estimator review, electrical-specific detection, auditability, pricing, and estimating workflows. "AI takeoff" and "human-in-the-loop" are not sufficient differentiation. Product-market validation must identify an unresolved workflow problem that current products fail to solve for the target customer.

This reality sharpens the thesis: the question is no longer *can AI count electrical symbols*, but *what does the system learn from every estimate* — and whether that accumulation creates something competitors cannot easily copy.

### Tomorrow: Schneider BD Session

The Schneider session is the first structured observation opportunity. The objective is not to validate the thesis — it is to observe the complete workflow from drawing receipt to bid submission and find the real bottleneck.

**Capture:** drawing intake → takeoff → pricing → review → approval → bid submission. Observe every decision point where software is ignored and manual work resumes. Note all artifacts (drawings, spreadsheets, price lists, correction examples) — only with explicit authorization.

See the full [Schneider session guide →](./DISCOVERY.md#schneider-session-objectives)

---

## The Problem

### Current Estimating Workflow *(Research-derived / directional)*

*This workflow model is drawn from secondary industry research, not from personal observation of target customers. Individual claims should be upgraded to Observed only after direct interviews and workflow observation.*

A typical electrical bid involves:

1. Receiving a construction drawing package (PDF, CAD, or printed)
2. Reviewing electrical floor plans, power plans, lighting plans, single-line diagrams
3. Locating legends, panel schedules, notes, and specifications
4. Manually identifying electrical symbols and components
5. Counting or measuring quantities — by hand or with a pointer tool
6. Transcribing quantities into Excel or estimating software
7. Applying labor assumptions (often from NECA labor unit tables) and material prices
8. Rechecking the estimate for errors
9. Preparing and submitting the bid

Many processes still depend heavily on human review, spreadsheets, manual takeoff, and experienced judgment — even at firms using dedicated estimating software.

### Quantified Pain *(Research — directional)*

| Method | Avg. time for commercial estimate | Error rate |
|--------|----------------------------------|------------|
| Manual (Excel / paper) | 6–12 hours | ~38% contain a material pricing error >5% of job cost |
| Software-assisted | 1–3 hours | ~9% |

*Secondary industry sources. Treat as directional. Verify in interviews.*

### The Gap After Takeoff *(Hypothesis — validate tomorrow)*

Even after quantities are extracted, a significant gap remains between an approved takeoff and a priced, bid-ready estimate:

- Mapping approved quantities to materials, assemblies, and vendor catalogs
- Applying current material prices (which change frequently)
- Applying labor assumptions (NECA tables, contractor-specific factors, or historical norms)
- Incorporating contractor-specific preferences (preferred vendors, materials, labor factors)

**The key discovery question:** Is the actual bottleneck the counting step, or the step that comes after? This could completely change what Vectoris becomes.

### Market Context *(Known — directional)*

**Labor shortage is structural.** The U.S. electrical trade requires approximately 80,000 new electricians per year, but retirements consistently outpace new entrants. Roughly 41% of the construction workforce is projected to retire by 2031.

**Software adoption is growing but incomplete.** Global construction estimating software market size estimates range widely from $1.0B to $4.0B depending on definition and source (e.g., narrow takeoff software vs. broader construction ERP), with reported CAGR of ~8–11%. Many small and mid-sized contractors still rely heavily on spreadsheets.

**AI adoption is early and trust-sensitive.** Cultural resistance, ambiguous ROI, and concerns about AI reliability in high-stakes financial decisions are the primary adoption barriers.

> [!NOTE]
> Market size estimates carry significant variance and methodology differences between market research firms ($1.0B–$4.0B spread). Treat all figures as low-confidence directional context.

---

## The Product

### What It Does

A contractor uploads an electrical drawing package. AI produces a first-pass quantity takeoff. Every detected item is linked back to its location in the source drawing. The estimator reviews, corrects, and approves — with every correction captured as structured data.

### Example Interaction

`
LED Fixture  x  Qty: 183  x  Confidence: [per item]

Detected on:
  E-103:  87 locations  [view]
  E-104:  31 locations  [view]
  E-105:  49 locations  [view]
  E-106:  16 locations  [view]

Actions: Accept | Reject | Edit quantity | Add note | Flag for review
`

> [!NOTE]
> Illustrative only. No accuracy benchmarks established. This product does not yet exist.

### Downstream Example — Why a Line Item Needs More Than a Count

The example above is a detection example (H1 MVP scope only). The Historical BOQ Evidence below shows that a *commercially useful* line item — the kind that actually appears in a finished BOQ — carries more semantics than a bare count. This is illustrative of the eventual pipeline, not something the current MVP builds:

`
Raw Takeoff (H1 MVP output)
  Item: Power Cable
  Specification: 4C x 16 sq.mm
  Quantity: 22.5
  UOM: MTR
  Source: Drawing E-XXX

  |
  v  (not yet built — future enrichment step)

Engineering Line Item
  Application: PAC unit power supply
  Where Used: Indoor -> Outdoor equipment connection
  Project Type: Precision Cooling / PAC

  |
  v  (not yet built — future enrichment step)

BOQ Line
  Company Product: [matched SKU]
  Quantity: 22.5 MTR
  Current Unit Price: [retrieved]
  Total: [calculated]
`

The Emerson BOQ is direct evidence this application-level context is real: its descriptions encode relationships like indoor-to-outdoor piping/cabling and PAC installation/testing, not just bare product names and quantities — see [Historical BOQ Evidence](#historical-boq-evidence--aug-2026) below. **This is an illustration of a future pipeline stage, not a claim that the MVP produces this today** — see [Initial Wedge](#initial-wedge--what-we-are-not-building).

---

## Transparency & Auditability by Design

AI-generated quantities are never treated as authoritative. Every quantity must remain traceable to its source drawing, review state, assumptions, and final human approval.

**This is a non-negotiable product requirement, not a differentiator.** Quotr.ai and BuildVision AI already offer source-linked results, confidence indicators, and estimator-controlled workflows. Auditability is table stakes — the condition for entry, not the reason to choose Vectoris.

### What this means in practice

- Every detected item linked to its source location in the drawing
- AI output clearly labelled as AI-generated, with per-item confidence indicators
- Estimator sees AI predictions and source drawings side-by-side
- Human corrections override AI output unconditionally
- Audit trail: AI prediction → human edits → final approved quantity → estimating assumptions

### Why it still matters for the product

Human corrections are the most valuable training signal. A system designed for auditability from day one captures structured correction data. The audit trail is simultaneously the trust mechanism and the foundation of the learning system.

---

## Target Customer

### H1 Primary Customer *(Hypothesis)*

Small and mid-sized electrical contractors who regularly prepare commercial or industrial bids.

**Profile hypothesis:**
- Electrical subcontractor bidding commercial or industrial projects
- 10–200 employees
- Currently using Excel, Bluebeam, or basic takeoff software
- Estimates more than 4–6 projects per month

> [!NOTE]
> This profile is a hypothesis. Customer interviews should validate or refine it.

### H1 Candidate Segments *(Hypothesis — discovery decides)*

Do not select a target segment before discovery. The selection criterion is: **strongest combination of pain + estimating volume + willingness to adopt + access to usable feedback data.**

| Segment | Pain hypothesis | Feedback data hypothesis | Adoption risk |
|---------|----------------|------------------------|---------------|
| SMB electrical contractors (10–50 staff) | High | Medium volume | Low friction, low ACV |
| Mid-size estimating teams (50–200 staff) | High | High volume | Process friction |
| Specialist estimating firms | Very high | High quality, high volume | Unknown switching cost |
| Industrial / EPC electrical teams | High | Very high volume | Procurement friction |
| Design-build contractors | Medium | Medium | Scope ambiguity |

### H2 Candidate Customer *(Hypothesis — single-source, needs broad validation)*

Per the Schneider/Shubham call, the strongest hypothesis is **not** large OEMs like Schneider itself — Shubham explicitly redirected toward smaller players:

> "The best thing is to go with some system integrators... the companies who are taking multiple components from different OEMs and they are merging in a single offer... it will be a best use case for them."

**Profile hypothesis (unvalidated beyond one opinion):**
- System integrators / MEP contractors who assemble multi-vendor electrical & data-center solutions (UPS, cooling, power distribution, racks) into a single customer offer
- Small teams (1-2 people) currently doing solution design, BOQ assembly, and pricing themselves, without the specialized-team structure a large OEM has
- Bidding on data-center, industrial, or large commercial electrical/MEP projects with multi-product-line scope

> [!CAUTION]
> This profile comes from a single OEM-side BD manager's opinion about a customer segment he does not belong to. It is a hypothesis to test directly with system integrators, not a validated target. See the H2 Discovery Script in [DISCOVERY.md](./DISCOVERY.md#h2-discovery-script--ai-solution--quotation-engineer).

### Potential High-Value Early Customers *(Hypothesis)*

> [!NOTE]
> This assumes estimators care about the learning system — a hypothesis not yet validated. Validate before optimizing customer selection around it.

If the learning hypothesis is true, high-value early customers are estimating teams with enough bid volume to generate repeated, structured feedback data — not simply the smallest contractor willing to pay.

This makes the Schneider access potentially valuable — not because Schneider proves the market, but because a sophisticated estimating environment is a high-quality observation context for understanding real workflow patterns.

### User vs. Economic Buyer

| Role | Description |
|------|-------------|
| **User** | Estimator or project estimator performing the daily takeoff work |
| **Economic buyer** | Contractor owner, estimating manager, or operations manager approving software spend |

Both must be understood. The user must find the tool faster. The buyer must see measurable ROI.

---

## Initial Wedge — What We Are Not Building

The first product is **electrical quantity takeoff only**.

> [!IMPORTANT]
> **Data infrastructure is in scope. Downstream estimating functionality is not.** The MVP data model (correction taxonomy, reviewer IDs, model versioning, structured audit records) is intentionally built now — because building it later requires retrofitting. But capturing that data is not the same as building the learning system, the estimating layer, or the contractor memory. Those are Stage 3+ and must be earned.

### In scope (MVP)

- PDF and construction drawing ingestion
- Sheet classification and splitting
- Electrical symbol/component detection
- Quantity extraction with source evidence
- Side-by-side drawing + takeoff review interface
- Human correction and approval workflow
- Structured correction data capture (see data model below)
- Basic takeoff export (Excel/CSV)

### Explicitly out of scope (do not build yet)

- Full material and labor estimating
- HVAC or plumbing takeoff, full MEP platform
- Project management, CRM, accounting, procurement
- Automated bid generation, ERP integration, real-time pricing databases
- Pricing, labor mapping, or assembly intelligence

> **The first job:** Turn electrical drawings into a trustworthy, editable, evidence-backed first-pass takeoff.
>
> Nothing else earns the right to be built until this works.

> [!NOTE]
> This list is H1-specific. [SCOPE.md §24](./SCOPE.md#24-out-of-scope-initially) carries a broader, company-wide out-of-scope list (full ERP, CRM, generic CPQ, autonomous pricing decisions, full negotiation automation, and more) that applies regardless of which wedge — H1, H2, or another candidate — ends up being built first.

---

## MVP Data Model

The MVP must not just output 183 x LED Fixture. Every interaction must produce a structured record from day one — building the data infrastructure the learning system will eventually run on.

### Data Record

`json
{
  "item": "LED Fixture Type A",
  "quantity_ai": 181,
  "quantity_approved": 183,
  "source_sheets": ["E-103", "E-104"],
  "source_page": "E-103",
  "source_coordinates": { "x": 412, "y": 887, "w": 24, "h": 24 },
  "evidence_region": "bbox",
  "confidence_ai": 0.87,
  "model_version": "vectoris-detect-v0.3",
  "corrections": 2,
  "correction_type": "quantity_adjusted",
  "correction_reason": "missed",
  "review_status": "approved",
  "reviewer_id": "estimator_abc",
  "timestamp": "2026-08-19T14:22:00Z",
  "project_id": "proj_abc123",
  "contractor_id": "contractor_xyz"
}
`

### Correction Taxonomy

| Code | Meaning |
|------|---------|
| missed | AI failed to detect a real component |
| alse_positive | AI detected something that isn't there |
| wrong_symbol | AI identified the wrong symbol type |
| wrong_classification | Symbol found, but classified incorrectly |
| duplicate | AI counted the same component more than once |
| scope_excluded | Component exists but is out of this estimate's scope |
| sheet_conflict | Quantity conflicts with another sheet |
| manual_override | Estimator preference; not a model error |
| other | Requires manual annotation |

### Critical Principle — Not Every Correction Is a Training Example

> [!IMPORTANT]
> A human correction may represent a model error, hidden project knowledge, a scope decision, a business rule, an estimator preference, or an inconsistency between sheets. Only corrections that are **attributed, validated, and confirmed as model errors** become training candidates. The correction taxonomy exists to make this distinction.

The production learning pipeline is:

`
Raw correction
    ↓
Attribution (what kind of correction is this?)
    ↓
Validation (is this a model error or a scope/preference decision?)
    ↓
Training candidate
    ↓
Offline evaluation (does this improve performance on held-out drawings?)
    ↓
Model version
    ↓
Shadow evaluation (run new model alongside old; compare outputs)
    ↓
Production
`

**Do not let: human correction → automatic retraining** become the architecture. That is asking for model drift.

### Canonical Line-Item Data Model *(Long-term target — not MVP UI fields)*

> [!IMPORTANT]
> The Data Record above is the actual MVP schema and remains what gets built now. The list below is the **long-term canonical shape** a line item eventually needs once H1 and H2 converge on a shared downstream pipeline (see [Modified H1/H2 Relationship](./THESIS.md#modified-h1h2-relationship) in THESIS.md) — informed by the Historical BOQ Evidence below, where real finished BOQs carry this much context. Do not treat this as a to-do list for the current MVP; it is a north star for schema design so later stages don't require a destructive rewrite.

Project · Project Type · System · Category · Item / Requirement · Description · Where Used / Application · Specification · Quantity · UOM · Source Drawing / Document · Source Location · Engineering Rationale · Product Mapping · Manufacturer · Model / SKU · Pricing Source · Unit Price · Price Date · Human Approval · Confidence

The current MVP populates a deliberate subset of this: Item, Description, Specification, Quantity, UOM, Source, Confidence, and Approval (see the Data Record above). Application/Where Used, Product Mapping, and Pricing fields are explicitly **Stage 4+** — see [Initial Wedge](#initial-wedge--what-we-are-not-building) and [SCOPE.md's Workstream 8](./SCOPE.md#13-workstream-8--boq--bom-generation) for the fuller BOQ line-item semantics this model feeds into.

---
## Competitive Landscape

### Competitive Framework

| Category | Current tools | Key limitation | Potential gap |
|----------|--------------|----------------|---------------|
| Manual workflows | Excel, paper takeoff | High error rate; no audit trail | Structured AI-first alternative |
| Traditional takeoff platforms | Bluebeam, PlanSwift | Estimator-initiated; AI assists but does not lead | AI-proposed first pass, estimator verifies |
| AI takeoff (multi-trade) | Togal.AI, STACK, Kreo, Bobyard | General-purpose; varying electrical depth | Electrical-specialized detection + verification UX |
| AI + human review (electrical-specific) | Quotr.ai, BuildVision AI (`buildvisionai.com`) | Already shipping the workflow thesis; differentiation must be deeper | Contractor-specific learning and estimating intelligence |
| AI + contractor learning (electrical) | Countfire | Acquired by Valsoft/TAG Software Group (June 2026) after ~10 years independent; claims "learns how you work"; also now advertises automatic spec/version comparison | The live natural experiment for the learning hypothesis — outcome ambiguous (real exit, but via consolidator acquisition, not standalone dominance) |
| AI + outsourced human review | Beam AI | Reviewer is vendor staff, not the contractor's estimator; 24-72h turnaround; $48.5M raised; **now ships automated addenda/revision variance detection** (Aug 2026) | Real-time workflow where the contractor's estimator stays in the loop — the addenda/revision gap this framework previously called open is now contested |
| Electrical-specific conduit & routing | **Drawer.AI** *(added Aug 2026)* | Narrow, ~$5M-raised competitor; automated branch/conduit routing, wire sizing, voltage-drop calculations to Revit | Directly contests the "conduit/wire is an open gap" assumption elsewhere in this document — a small, focused team is already shipping it |
| Enterprise construction platforms | Autodesk Forma | BIM-linked; designed for GCs; not SMB-accessible | Narrow, affordable electrical-specific entry point |
| Specialized electrical software | ConEst | AI in databases/pricing, not drawing interpretation; decades of data already accumulated | Drawing-first AI — but ConEst's data depth is formidable |

### Capabilities Table

| Competitor | Electrical depth | Takeoff | Estimator review | Current pricing |
|-----------|-----------------|---------|-----------------|----------------|
| **Quotr.ai** | **High** — electrical-specific symbology, confidence scoring | AI-generated | Explicit review workflow | Pricing shifting; now also pushing a **factory-direct procurement wedge** (220+ vetted factories, claimed 40–50% below retail) alongside takeoff — see note below |
| **BuildVision AI** *(buildvisionai.com)* | **High** — electrical-specific workflow *(Note: distinct from buildvision.io procurement)* | AI-generated, plan-linked | Explicit review workflow | ~$299–$499/mo; integrated pricing & quote generation |
| **Countfire** | **High** — specialized electrical takeoff; automated symbol selection & counting; automatic spec/version comparison | Algorithmic / AI auto-count | Explicit review/verification interface | Tiered subscription (~$3,000–$5,000+/yr per user); **acquired by Valsoft/TAG Software Group, June 2026** |
| **Bobyard** | Moderate — multi-trade takeoff | AI auto-count | User review | Freemium / low-cost tier from ~$35/mo |
| **Togal.AI** | Moderate — fixtures, outlets, panels; conduit is user-initiated | AI-generated | User-initiated | ~$199–$299/user/month |
| **STACK** | Moderate — general, not electrical-specialized | AI-generated | Allows user review and editing | Custom quote |
| **Bluebeam** | Moderate — estimator-initiated pattern match | Pattern-initiated | User-initiated | Seat license |
| **Autodesk Forma** | Moderate — strongest on Revit-linked workflows | Symbol detection | Unknown — verify | Autodesk Estimate (linked) |
| **Kreo** | Moderate — multi-trade | AI-generated | Unknown — verify | Tiered SaaS |
| **Beam AI** | High — conduit, cable, low-voltage, fire alarm ($48M+ raised) | AI-generated | Vendor staff (outsourced, 24-72h) | Per-project / enterprise; **now ships automated Addendum Variance Report** (structured revision-delta detection, not just overlay) |
| **Drawer.AI** *(new, added Aug 2026)* | High — electrical-specific; symbol/tag detection, panel-schedule linkage, **automated conduit routing with wire sizing and voltage-drop calc** | AI-generated | Built-in QA tools | ~$5M raised (seed); Austin, TX; exports to Revit |
| **ConEst** | High — specialized electrical | Traditional | N/A | Deep: 140,000+ items, pricing feeds |
| **Vectoris** | TBD — core thesis | Core MVP | Core MVP | Stage 4+ (retrieval layer) |

### Intelligence Table

*(These dimensions are hypotheses about competitors — verify before using for positioning decisions)*

| Competitor | Contractor memory | Learning from corrections | Historical intelligence | Key integrations |
|-----------|------------------|--------------------------|------------------------|-----------------|
| **Quotr.ai** | ? — claims electrical-specific training; verify whether per-contractor memory exists | ? — verify | ? — verify | Unknown — verify; **also building a supply-chain moat** (220+ factory network) rather than relying on data/learning alone |
| **BuildVision AI** *(buildvisionai.com)* | ? — not publicly documented | ? — verify | ? — verify | Unknown — verify |
| **Countfire** | **Claims historical learning** ("estimates that learn how you work"); ~10 years independent, now part of Valsoft/TAG Software Group | Claims learning from user selections/past projects | Project/symbol history | Excel, CSV, estimating links |
| **Bobyard** | Not known | Not known | Not known | Unknown — verify |
| **Togal.AI** | Not known | Not known | Not known | Procore, estimating links |
| **STACK** | Not known | Not known | Not known | STACK ecosystem |
| **Bluebeam** | Not known | Not known | Not known | Studio, SharePoint |
| **Autodesk Forma** | Not known | Not known | Not known | Autodesk ecosystem |
| **Kreo** | Not known | Not known | Not known | Excel, BI tools |
| **Beam AI** | Not applicable (vendor-side) | Internal vendor models (1,100+ customer datasets) | Not known | Estimating exports; **Addendum Variance Report now a shipped feature** |
| **Drawer.AI** *(new, added Aug 2026)* | Not publicly documented | Not known | Not known | Revit (routing export) |
| **ConEst** | **Strong** — contractor-specific database and assembly management | **Strong** — decades of structured item/labor data | **Strong** — 500,000+ assemblies, NECA labor | ConEst Connect; pricing feeds |
| **Vectoris** | Core hypothesis | Core hypothesis | None yet | Excel/CSV (MVP); estimating systems (Stage 4+) |

> [!IMPORTANT]
> Competitor capabilities refreshed via live web research, Aug 22, 2026. **This market is moving fast — treat every "TBD"/"unknown" cell as due for re-verification before any positioning decision, not as settled.**
> - **BuildVision Distinction:** `buildvisionai.com` (electrical/MEP takeoff SaaS) is distinct from `buildvision.io` (MEP procurement platform funded by Norwest). Do not conflate their traction or funding.
> - **Countfire as Natural Experiment — updated:** Countfire marketed electrical-specialized takeoff with "learning how you work" for ~10 years, then was acquired by Valsoft (TAG Software Group) in June 2026 — a serial vertical-software consolidator, not a standalone breakout. This is genuinely ambiguous evidence for the Learning Hypothesis: a real, durable commercial outcome (800+ customers, 5 countries), but arguably not the kind of outcome a defensible data-compounding moat would produce. See [THESIS.md's Learning Hypothesis discussion](./THESIS.md#why-the-thesis-is-plausible) for the full reasoning.
> - **Beam AI has closed the addenda/revision gap.** As of Aug 2026, Beam AI ships an automated "Addendum Variance Report" — structured quantity-delta detection across revisions, not manual overlay. This directly affects the Revision & Addenda alternative wedge discussed in THESIS.md; that section has been revised accordingly.
> - **Drawer.AI is a newly identified, narrow, electrical-specific competitor** (~$5M raised) that already ships automated conduit routing and wire sizing — the exact capability this project's own Technical Feasibility Assessment (below) rates as the hardest, lowest-feasibility item. Worth direct comparison in discovery, not just the larger funded players.
> - **Quotr and BuildVision AI** remain the most important direct competitors shipping the takeoff + review pattern today, though Quotr appears to be diversifying its differentiation strategy toward supply-chain/procurement rather than competing purely on takeoff accuracy.

### H2 Competitive Landscape — Configure-Price-Quote (CPQ)

> [!WARNING]
> What H2 describes — "customer requirement → AI selects compatible products → assembles a compliant solution → generates BOQ → pulls pricing → drafts a techno-commercial proposal → human review" — is not a new category. It is a textbook description of **Configure-Price-Quote (CPQ)**, one of the most mature and heavily incumbent-owned segments of enterprise software. This table exists so H2 is never pitched, built, or evaluated as if this competitive set didn't exist.

| Competitor | Type | What they already do | Why they matter to H2 |
|---|---|---|---|
| **Salesforce CPQ / Revenue Cloud** | Enterprise incumbent | Product bundling, complex pricing/discounting, advanced approvals, AI-assisted recommendations | Default CPQ inside any Salesforce shop — deep CRM lock-in is a real moat H2 would face |
| **SAP CPQ** | Enterprise incumbent | Variant configuration, quoting, embedded AI for pricing/cross-sell, tight S/4HANA/ERP integration | Default inside SAP-run manufacturers/OEMs — exactly the kind of company Shubham described |
| **Oracle CPQ Cloud** | Enterprise incumbent | Complex product structures, rules/constraints engine, global pricing, AI-driven insights | Same lock-in dynamic as SAP/Salesforce, different ERP ecosystem |
| **ServiceNow CPQ** | Enterprise incumbent | AI-driven configuration logic across any sales channel, workflow orchestration | Newer but well-capitalized entrant explicitly marketing "AI solves complex product and pricing rules, fast" |
| **Tacton** | Vertical incumbent (~25 yrs) | Symbolic-AI-based configuration for manufacturers — guarantees every configuration is valid/manufacturable | Closest incumbent to H2's "compliant solution assembly" framing, already at industrial/engineering customers |
| **Infor / Epicor CPQ** | Vertical incumbent | CAD-linked configuration, automatic BOM/BOQ generation from selections, engineering-to-manufacturing bridge | Epicor explicitly generates BOMs/BOQs and assembly instructions from configuration today — functionally close to H2's stated MVP |
| **ServiceCPQ** | Engineering-to-order specialist | "Fully engineered solutions from customer requirements... CPQ manages the commercial and BOQ layer" for industrial equipment; 90-day pilot motion | Nearly identical framing to H2, already selling into engineered/complex-equipment manufacturers |
| **servicepath** ("AI-native CPQ") | AI-native startup | Domain-tuned LLMs plan configurations, draft proposals with citations, feedback loop improves guidance over time | This is, close to verbatim, the loop H2 describes — already built, already pitched, by a funded startup |

**What this means for H2, honestly:**
1. **General-purpose CPQ is not whitespace.** It is a multi-billion-dollar category with 20+ year incumbents and deep CRM/ERP integration moats that are harder to unseat than a $300/month takeoff tool.
2. **The one plausible gap:** none of the above appear to be *vertically specialized* for electrical/MEP/data-center solution engineering specifically — the redundancy math (N+1, 2N), cooling-capacity coupling, panel/breaker compliance, and multi-OEM catalog reconciliation Shubham described. General CPQ configures against a single company's own rule set; it's unclear any of them handle cross-OEM, engineering-heavy compliance logic well. **This narrower niche — vertical AI-configuration for electrical/MEP system integrators — is the actual hypothesis to test, not "AI CPQ" broadly.**
3. **GTM and business-model implications differ sharply from H1.** CPQ deployments are typically long-cycle, enterprise, heavily customized to each customer's own product catalog and pricing rules — closer to an implementation-services-plus-software model than a self-serve SaaS motion. This changes what an MVP, a pilot, and a pricing model should look like; do not port the H1 SaaS pricing hypothesis over uncritically.

### Differentiation Hypothesis

The opportunity is not simply AI-powered takeoff or human-in-the-loop review. Multiple competitors increasingly provide both.

The potential differentiation is deeper electrical-specific understanding combined with an evidence-backed estimating data layer that learns from verified estimator corrections, contractor-specific mappings, historical estimating behavior, and continuously updated pricing inputs.

**This hypothesis remains unvalidated and must be tested against Quotr.ai, BuildVision AI, ConEst, and the customer's existing workflow.**

The competitive stack aspired to:

`
Domain-specific interpretation
+ Workflow integration
+ Contractor memory
+ Decision history
+ Estimate outcome data
+ Integrations
`

The thesis: competitors can copy a feature. They cannot easily copy years of embedded estimating decisions from the same workflow. **This is a hypothesis, not a moat — until measurable improvement exists.**

---

## Learning System *(Hypothesis)*

The core product hypothesis: every verified takeoff makes the next estimate faster, more accurate, and more tailored to the contractor. This requires deliberately architecting the data loop from day one.

### Long-Term Learning Loop *(vision, not current product)*

The following describes the full data flywheel once estimating intelligence is built. In the MVP, only the first four steps — Drawing → AI Prediction → Estimator Correction → Approved Takeoff — are real. The remainder are the architecture to build toward.

`
Real Drawing
    |
    v
AI Prediction
    |
    v
Estimator Correction (+ correction_type + correction_reason)
    |
    v
Approved Takeoff
    |
    v
Material Mapping
    |
    v
Current Price (retrieval layer — not model weights)
    |
    v
Final Estimate
    |
    v
Project Outcome
    |
    v
Learning Signal (validated corrections only)
    |
    +----------> Model + Mapping + Workflow Improvement
`

The hypothesis is that this loop compounds. Whether 100 corrections produce meaningful model improvement, whether customers permit data reuse, and whether competitors already have superior datasets are all open questions — addressed directly in the Risk Matrix.

### Three Types of Learning *(Hypothesis)*

**1. Model learning** — Use validated, attributed corrections to improve symbol classification, electrical context understanding, drawing-specific recognition, and ambiguity handling.

**2. Retrieval / knowledge learning** — Use external or customer-owned data for current prices (via database/retrieval — never baked into model weights), vendor catalogs, labor unit tables, internal price books, and historical estimates.

**3. Contractor-specific learning** — Learn preferred manufacturers, naming conventions, material mappings, labor assumptions, and recurring assemblies unique to each contractor. Over dozens of bids, the product becomes tuned to how that estimating team actually works.

---

## Strategic Moat Hypothesis

> [!IMPORTANT]
> This section describes a hypothesis about long-term defensibility. It is not a claim about current advantage.

The hypothesis is that Vectoris becomes defensible not by having a better vision model, but by accumulating structured estimating decisions that competitors cannot cheaply reproduce.

The proposed loop:

`
Prediction
    |
    v
Human decision (accept, reject, correct, annotate)
    |
    v
Structured correction (attributed + typed + validated)
    |
    v
Validated learning signal
    |
    v
Future improvement (measurably better on future drawings)
`

**This only becomes a moat if all four conditions are met:**

1. **Legal:** The data is legally usable under explicit documented permission from customers
2. **Signal quality:** The correction signal is genuinely informative — not too sparse, not too inconsistent across contractors
3. **Measurable improvement:** Future performance measurably improves compared to a model without the corrections
4. **Reproduction cost:** Competitors cannot cheaply reproduce the same decision history (they may already have substantial data from other customers)

If any of these conditions fails, the data flywheel does not become a moat.

> [!CAUTION]
> Quotr already claims thousands of audits and electrical-specific training. ConEst has 140,000+ items and decades of structured estimating data. Do not assume an early data advantage. The learning hypothesis must be actively validated — not assumed from product design.

---

## Decision Intelligence *(Long-Term Product Direction — Hypothesis)*

The eventual product destination — earned only after Takeoff, then Estimating, are validated — is something that helps estimators make better decisions, not merely count faster.

### What Decision Intelligence Looks Like

When an estimator uploads a new project, the system could eventually surface:

- Unusual material mappings compared to historical jobs
- Quantities that changed between drawing revisions
- Stale pricing (current prices older than N days for key materials)
- Unusual labor assumptions relative to the contractor's historical patterns
- Items that differ significantly from how comparable past jobs were estimated
- Potentially risky estimating decisions (large quantities on low-confidence detections)
- Estimate-vs-actual discrepancies from completed projects

### The Key Distinction

> Vectoris should eventually help the estimator make better estimating decisions — not merely count faster.

The eventual product experience:

`
Estimator uploads new project.

Vectoris says:

  83% of this scope matches your team's historical estimating patterns.
  14 items differ from your normal material mappings.
  6 detections are low confidence.
  3 drawing revisions changed quantities from the previous set.
  Current supplier pricing is 8 days old for 4 materials.

Estimator reviews everything. Nothing is submitted without approval.
`

**This is not the MVP.** This is the destination that the MVP data model is secretly building toward.

### Product Progression (Revisited)

| Stage | Product capability | Earning condition |
|-------|-------------------|-----------------|
| Takeoff | Drawing → verified first-pass quantity list | Measurably faster than manual |
| Estimating | Quantities → materials + labor + current price | Takeoff validated |
| Decision Intelligence | Surfaces risks, deviations, and anomalies | Estimating validated |
| Learning System | Each estimate improves future estimates | Sustained usage + measurable improvement |

---

## Technical Architecture

### Why AI Is Relevant Now

1. Hybrid CV + VLM pipelines are now standard in industry practice
2. Fine-tuning on domain-specific labeled data can significantly improve precision and recall for engineering drawings vs. general-purpose models
3. A human-in-the-loop correction workflow means imperfect detection is acceptable — if the interface makes correction faster than doing the takeoff manually
4. The market is shifting from automated counting toward systems that connect drawing interpretation, verified quantities, contractor-specific knowledge, and changing cost data

### The Four Memory Layers

> [!IMPORTANT]
> These memory types must remain logically separated. Mixing them — especially baking volatile pricing into model weights — is an architectural error that creates technical debt and stale behavior.

| Layer | What it contains | Volatility | Implementation |
|-------|-----------------|------------|----------------|
| **Model memory** | Electrical drawing interpretation — symbol classification, context understanding, ambiguity handling | Low — trained, versioned, slow to change | Fine-tuned vision model |
| **Retrieval knowledge** | Current prices, vendor catalogs, material specs, labor tables, internal price books | High — changes daily/weekly | Database + RAG layer |
| **Contractor memory** | How a specific company estimates — preferred materials, naming conventions, labor assumptions, recurring assemblies | Medium — evolves per project | Structured store per contractor |
| **Project memory** | What happened in a specific drawing set/revision — detections, corrections, approvals, final quantities | Immutable once finalized | Append-only audit log |

**Hard rule:**

`
Volatile pricing data  →  retrieval layer (database / RAG)
Electrical drawing interpretation  →  model weights (fine-tuned, versioned)
`

Never bake mutable pricing or catalog data into model weights.

### Architecture Diagram

`
         Drawing Package
               |
       Vision / Detection
         (model memory)
               |
     Electrical Interpretation
               |
      Evidence-backed Quantity
               |
     +----------+-----------+
     |                      |
Price Retrieval      Contractor Memory
(retrieval layer)    (contractor-specific)
     |                      |
     +----------+-----------+
                |
        Project Memory
     (this drawing set)
                |
        Estimate Engine
                |
       Human Approval
                |
        Audit Trail
`

### MVP Architecture (What to Actually Build First)

`
Input Layer
  +-- PDF upload
  +-- Sheet splitting / page rendering
  +-- Sheet classification (floor plan / schedule / legend / notes)

Detection Layer  <- core technical spike
  +-- Symbol detection (common electrical components in PDF format)
  +-- Bounding box / region evidence per detection
  +-- Per-detection confidence
  +-- Quantity aggregation per component type

Verification Layer  <- core UX spike
  +-- Side-by-side drawing + takeoff view
  +-- Accept / Reject / Edit / Add per item
  +-- Navigate from takeoff item to drawing location
  +-- Structured correction recording (type + reason + reviewer + timestamp)

Output Layer
  +-- Approved takeoff table (with full structured correction metadata)
  +-- CSV / Excel export
`

### Technical Feasibility Assessment

| Capability | Feasibility | Challenge | Note |
|-----------|------------|-----------|------|
| PDF ingestion + rendering | High | Low | Mature tooling |
| Sheet classification | High | Low-Medium | Works well with VLMs |
| Common symbol detection | Medium-High | Medium | Drawing variability is the key variable |
| Bounding box evidence | High | Low-Medium | Standard in CV pipelines |
| Per-item confidence scoring | Medium | Medium | Calibration is non-trivial |
| Panel schedule extraction | Medium | Medium-High | Table structure helps; quality varies |
| Conduit measurement | Low-Medium *(revised: proven feasible by Drawer.AI, Aug 2026 — see note)* | High | Routing often implied, not explicit; Drawer.AI already ships automated branch/conduit routing with wire sizing, so "infeasible for anyone" is no longer accurate — "infeasible for Vectoris on its current timeline, and already owned by a focused competitor" is the honest framing |
| Wire/cable quantity | Low *(same revision as above)* | Very High | Inference problem, not detection; Drawer.AI ships voltage-drop and wire-sizing calculations, so treat this as "someone else's hard-won specialization to compete against," not "commonly agreed to be unsolved" |
| Cross-sheet spatial reasoning | Low-Medium | High | Requires sheet registration |
| Drawing revision comparison | **Low-Medium, revised up from Low** | High | Needs structured content representation; Beam AI (Addendum Variance Report) and Countfire (spec comparison) both ship structured revision-delta detection as of Aug 2026, evidence the underlying technical problem is solvable at production quality, not merely a research question |

> [!CAUTION]
> Conduit measurement and wire quantity estimation remain fundamentally different problem classes from symbol counting, and Vectoris should still not promise either on its current roadmap. **What has changed (Aug 2026):** this is no longer a claim that the capability is broadly unsolved industry-wide — Drawer.AI already ships it — so the reason to defer is competitive focus and resourcing, not technical impossibility. Similarly, drawing revision comparison is no longer an unclaimed technical frontier; Beam AI and Countfire both ship structured versions of it today. See [THESIS.md's Market Update](./THESIS.md#market-update--research-refresh-aug-22-2026) for sourcing.

### Key Technical Unknowns

1. **Drawing variability in practice.** Clean vector PDFs vs. scanned, hand-annotated drawings from small contractors are different problems. The spike must use real, diverse packages.
2. **False positive rate.** False positives may be worse than missed detections: they add correction work and destroy trust.
3. **Training data availability.** High-quality labeled electrical drawing datasets are rare. The earliest prototype relies on zero-shot or few-shot approaches.

---
## Key Hypotheses

### Core Product Hypothesis
> Electrical estimators can be made materially faster by combining domain-specific drawing intelligence with a continuously improving, evidence-backed estimating workflow — where verified human corrections, contractor-specific estimating data, and current pricing information improve the system over time.

### Technical Hypothesis
> AI can detect common electrical components in real contractor drawing packages with sufficient precision and recall that a human verification workflow produces a completed takeoff faster than the manual alternative.

### Trust Hypothesis
> Estimators will incorporate an AI-generated takeoff into their real workflow when every detection is linked to its source drawing location and every item can be corrected before approval.

### Business Hypothesis
> The economic value of saved estimator time — or additional bids submitted — is large enough to support a SaaS subscription price that makes this business viable.

### Differentiation Hypothesis
> The potential differentiation is deeper electrical-specific understanding combined with an evidence-backed estimating data layer that learns from verified estimator corrections, contractor-specific mappings, historical estimating behavior, and continuously updated pricing inputs. Multiple competitors increasingly provide AI takeoff and human-in-the-loop review.

### Learning Hypothesis
> Repeated, permissioned estimator corrections and approved estimating data can produce measurable improvements in electrical drawing interpretation, material mapping, and estimating accuracy that generic models and static software databases cannot easily reproduce.

*This hypothesis remains unvalidated. Do not assume it. Design experiments to test it.*

---

## Evidence Ledger

**Update after every interview, prototype test, and validation experiment.**

| Claim | Type | Evidence | Confidence | Next validation |
|-------|------|----------|------------|----------------|
| Estimators spend 6-12h on manual commercial estimates | Research finding | Secondary industry benchmarks | Medium | Observe real workflows |
| Software-assisted estimating is at 1-3h for many | Research finding | Industry benchmarks | Medium | Confirm in interviews |
| ~38% of manual estimates have >5% pricing error | Research finding | Secondary source; primary origin unclear | Low | Seek primary source |
| Estimators spend significant time on repetitive counting | Hypothesis | Inferred from workflow | Low | Interviews + observation |
| The post-takeoff gap (pricing, labor, mapping) is a significant bottleneck | Hypothesis | Implied by competitor messaging | Low | Observe complete bid workflow |
| AI can detect common electrical symbols in real drawings | Technical hypothesis | VLM + CV literature; industry implementations | Low | Technical spike on 5+ real packages |
| A verification UX is faster than manual if detection rate is adequate | Product hypothesis | HITL design patterns | Low | Shadow workflow test |
| Contractors will trust AI takeoffs with visual evidence | Hypothesis | Industry HITL adoption data | Low | Interviews; prototype exposure |
| Contractors will pay $150-400/user/month | Business hypothesis | Not validated | Very low | Pricing interviews; LOI |
| Countfire operated contractor-learning takeoff for ~10 years without evident standalone category dominance, then was acquired by Valsoft/TAG Software Group (June 2026) | Competitive evidence, **updated Aug 2026** | Secondary competitor research; Valsoft/Vista Point Advisors press releases | Medium | Ask contractors directly why they do/don't use it; treat the acquisition as ambiguous evidence on the learning-moat question specifically |
| Quotr's own published accuracy drops from 95-99% (vector) to 80-88% (scans) | Competitive evidence | Published vendor benchmarks | Medium | Replicate on own test set with real scanned packages |
| Quotr.ai is diversifying toward a factory-direct procurement/marketplace differentiation (220+ vetted factories, claimed 40–50% below retail), not just takeoff accuracy | Competitive evidence, **new Aug 2026** | Quotr's own blog/marketing (Jun 2026) | Medium — self-reported by vendor | Verify claimed savings and factory count independently before treating as a benchmark |
| Beam AI ships an automated "Addendum Variance Report" — structured revision-delta detection, not manual overlay | Competitive evidence, **new Aug 2026** | Beam AI's own product pages (ibeam.ai) | High — vendor's own stated feature, consistent across multiple pages | Test the actual quality of Beam AI's variance detection directly, don't assume it's flawless just because it exists |
| Countfire also advertises automatic drawing/spec version comparison | Competitive evidence, **new Aug 2026** | Countfire product pages via Software Advice | Medium | Same as above — verify real-world quality, not just marketing claims |
| Drawer.AI (Austin, TX; ~$5M raised; founded 2021) already ships automated conduit/branch routing, wire sizing, and voltage-drop calculations for electrical drawings, exporting to Revit | Competitive evidence, **new Aug 2026** | Drawer.AI's own site; Crunchbase-style funding aggregator | Medium-High | Directly test Drawer.AI's own product against real messy contractor drawings before assuming this space is closed off |
| servicepath is now Gartner's "Sole Visionary" in the 2026 CPQ Magic Quadrant, explicitly serving systems integrators/VARs; overall CPQ market ~$5.8B, ~16% 3-yr CAGR | Competitive evidence, **new Aug 2026** | servicepath's own site, citing Gartner and MGI Research (Feb 2026) | Medium — vendor-reported analyst recognition, not independently verified against the primary Gartner report | Pull the primary Gartner MQ report if H2 discovery proceeds further; do not rely solely on the vendor's framing |
| Drawing variability is manageable | Technical hypothesis | Not tested | Unknown | Test on 5+ diverse real packages |
| Conduit and wire quantity are automatable | Technical hypothesis — **partially confirmed by a competitor, not by Vectoris** | Drawer.AI ships this in production (Aug 2026); Vectoris has not attempted or tested it | Low for Vectoris specifically; the underlying capability is proven feasible in general | Still defer for Vectoris's own roadmap; if ever revisited, benchmark directly against Drawer.AI rather than starting from a blank technical-feasibility assumption |
| Contractor corrections data creates proprietary training signal | Strategic hypothesis | Logical; competitors may already have similar data | Low | Data rights in agreements; validate with measurable improvement |
| Quotr/BuildVision do not already solve our target customer pain | Competitive hypothesis | Not yet tested | Unknown | Ask directly in interviews |
| Estimators care about the system learning from their corrections | Learning hypothesis | Not yet tested | Unknown | The learning question in discovery script |
| **(H2)** Solution assembly across product lines takes ~2-3 days at a large OEM, done across multiple specialized teams | Discovery finding | Single interview (Shubham Singh, Schneider Electric BD) | Low — one source | Interview 5+ system integrators on their own assembly time |
| **(H2)** Unit/list pricing is fast (near-instant via internal portal); it is not the estimating bottleneck | Discovery finding | Single interview | Low — one source | Confirm pricing lookup speed is similarly fast for SIs, not just large OEMs with mature portals |
| **(H2)** Negotiation from list price to target price (~1 week) is a margin/discount approval process, not a computation problem | Discovery finding | Single interview | Low — one source | Test whether this is better solved by approval-workflow tooling than by AI configuration |
| **(H2)** Small system integrators (1-2 people) feel this pain more acutely than large OEMs with dedicated teams | Hypothesis, sourced from an OEM employee's opinion about a segment he isn't in | Single interview, secondhand opinion | Very low | Must be tested directly with system integrators, not inferred from an OEM source |
| **(H2)** "AI configures a solution from a requirement and drafts a proposal" is not whitespace — it is the CPQ category, already served by Salesforce, SAP, Oracle, Tacton, and AI-native entrants like servicepath | Competitive evidence | Direct vendor research (Aug 2026) | Medium-High | Ask system integrators directly what CPQ tooling they use today and what it's missing for electrical/MEP work |
| Shubham Singh's positive reaction to the H2 concept represents strong customer validation | **Explicitly rejected as a claim** — see signal-strength framework in DISCOVERY.md | One enthusiastic but non-committal response | **Weak-to-Medium per own framework** | Do not treat as validation; seek a "would pay" or "can I pilot this" signal instead |

---

## Validation Framework — Six Gates

**Each gate must be passed before the next becomes the primary focus. Evidence from early gates may redefine later ones.**

### Gate 1 — Pain *(Immediate)*

**Question:** Is the problem meaningful and economically significant?

**Validation:** 10-20 contractor interviews + 3+ observed takeoff sessions

**Kill condition:** Contractors describe the workflow as manageable, or say existing tools substantially solve the problem.

**Pass condition:** 7+ of 10 estimators describe meaningful, unresolved friction with counting or drawing interpretation that current tools do not address.

---

### Gate 2 — Workflow *(Immediate — observe tomorrow)*

**Question:** Where exactly is the bottleneck?

**Validation:** Observe complete bid workflow from drawing receipt to bid submission. Map every step, decision point, and tool used.

**Key discovery question:** Is the actual bottleneck counting, scope coverage, revisions, pricing, labor, supplier quotes, assemblies, risk, or bid preparation?

**Outcome:** A revised hypothesis about what Vectoris should actually solve first.

---

### Gate 3 — Technical *(Weeks 2-3)*

**Question:** Can AI produce a useful first-pass detection on real drawings?

**Inputs:** 5+ diverse real drawing packages (varied scan quality, symbol styles, project types)

| Metric | Hypothesized target | What it actually tests |
|--------|---------------------|----------------------|
| True positive rate | >70% on common components | Can AI find what's there? |
| False positive rate | <20% | How much correction work does AI create? |
| Missing component rate | <30% | How much scope does AI cover? |
| Sheet coverage | >90% | How broadly does AI process the package? |
| Processing time | <10 min per sheet | Is it fast enough to be practical? |

> [!CAUTION]
> A 90% detector that takes longer to verify than manual takeoff is worse than a 70% detector that produces a dramatically faster completed takeoff. Detection rate is a means, not the goal.

**Kill condition:** Detection rates so low that verification takes longer than manual, or drawing variability prevents consistent results across the test set.

---

### Gate 4 — Adoption *(Weeks 3-4)*

**Question:** Will estimators voluntarily use this inside their existing workflow?

**Validation:** Shadow workflow test — AI-assisted alongside manual on the same real project

| Metric | How to measure |
|--------|---------------|
| Time to approved takeoff | Wall clock from upload to approved takeoff |
| Time to bid-ready estimate | Wall clock from upload to priced, submittable bid |
| Correction rate | % of AI items requiring human correction |
| Trust signal | Would estimator use this on a real bid? |
| Net time delta | AI-assisted vs. manual on identical project |

**Pass condition:** >30% time reduction in time to approved takeoff, AND at least one estimator says they would use this on a real bid without prompting.

**Kill condition:** Estimators correct or discard AI output frequently enough that the workflow is no faster than manual.

---

### Gate 5 — Economics *(After adoption validated)*

**Question:** Will the company pay for this?

**Validation:** Pricing interviews, willingness-to-pay probes, letter of intent

**Pass condition:** Any contractor commits to pay before the full product is built.

---

### Gate 6 — Learning *(After product is in real use)*

**Question:** Does repeated usage measurably improve the system?

**Validation:** Compare model performance on future drawings from contractors who have generated correction data vs. drawings without prior history.

**Pass condition:** Measurable improvement in detection quality or estimating accuracy from contractor-specific correction data — verified in blind evaluation, not just informal observation.

**Kill condition:** Corrections are too sparse, too inconsistent, too convention-specific, or legally unusable. Competitors demonstrate similar or better learning from larger datasets.

---

### Success Metrics Summary

| Gate | Metric | Signal strength |
|------|--------|----------------|
| 1 — Pain | 7+ of 10 estimators confirm meaningful unresolved friction | Strong |
| 1 — Pain | 3+ estimators voluntarily share real drawing packages | Strong |
| 2 — Workflow | Clear description of the bottleneck after takeoff | Shapes future direction |
| 2 — Workflow | Any estimator describes correction data "being lost" after estimate | Very strong for learning hypothesis |
| 3 — Technical | >70% true positive on common components in real packages | Continue |
| 4 — Adoption | AI-assisted takeoff >30% faster than manual | Strong |
| 4 — Adoption | Estimator says "I would use this on a real bid" unprompted | Very strong |
| 4 — Adoption | Estimator continues using the tool after the first project | Very strong |
| 5 — Economics | Any contractor commits to pay before the full product is built | Strongest |
| 6 — Learning | Measurable model improvement from correction data in blind evaluation | Validates learning moat hypothesis |

> [!NOTE]
> **Thresholds are decision rules for this experiment, not universal industry benchmarks.** A 68% true positive rate with 3-second correction time may be a better product than 75% with 45-second correction time. A 28% workflow time reduction for a 12-hour manual process may be more valuable than 35% on a 2-hour one. Use these numbers to structure decisions, not to rationalize stopping or continuing with false precision.

---

## Product Metrics

> **Principle:** Model accuracy is a means. Workflow time saved is the product outcome. Do not optimize detection rate at the expense of estimator workflow speed.

### Primary Metric

**Time to Approved Takeoff** — wall clock from drawing upload to estimator-approved takeoff.

Eventually: **Time to Bid-Ready Estimate** — wall clock from drawing upload to priced, submittable bid.

### Workflow Efficiency Benchmark

Run alongside the technical spike. For every prototype test, measure:

| Metric | What it tests |
|--------|--------------|
| Correction time / item | How long does each correction take? |
| Time per approved sheet | How fast does the estimator move through sheets? |
| Time per approved scope item | End-to-end throughput |
| False-positive cleanup burden | How much time do AI errors add vs. save? |
| Manual fallback rate | What % of items does the estimator handle entirely manually? |

### Supporting Metrics

| Metric | What it measures |
|--------|-----------------|
| Detection precision | % of AI detections that are correct |
| False-positive correction rate | Effort to clean up incorrect detections |
| Drawing scope coverage | % of drawing scope captured by AI |
| Revision handling time | Time to re-process a revised drawing set |
| Price freshness (Stage 4+) | Age of pricing data used in estimate |
| Material mapping accuracy (Stage 4+) | % of items correctly mapped to contractor's preferred materials |
| Estimator override rate | % of AI suggestions changed (should decrease over time if learning works) |

---

## Adoption Metrics

*Gate 4 — Adoption — requires more than a successful demo.*

> [!IMPORTANT]
> A technically successful demo that isn't voluntarily reused is not a product.

| Metric | Why it matters |
|--------|---------------|
| First-use completion rate | Does the estimator finish the first session, or abandon mid-way? |
| Second-project reuse rate | Does the estimator come back without prompting? |
| Time-to-value | How long from first upload to first moment of "this saved me time"? |
| Manual fallback rate | How often does the estimator bypass the AI and do it manually anyway? |
| Export / integration usage | Are approved takeoffs being used downstream, or sitting in the tool? |
| Estimator retention (at 30 days) | Is the tool still in use one month after introduction? |

**The critical question:** Does the estimator voluntarily come back?

---

## Business Model *(Hypothesis — multiple models to test)*

> [!IMPORTANT]
> The business model is a hypothesis. Do not lock in per-seat SaaS as the default before testing alternatives. The primary validation question is: **what are customers currently paying to solve this problem?** — not what should our SaaS cost.

### Model Options

| Model | Fits when | Validation question | Risk |
|-------|-----------|--------------------|----|
| Per-seat SaaS | Regular, high-volume estimating teams | Would you pay monthly for a tool you use every week? | Budget sensitivity; churn risk if slow weeks |
| Per-project | Sporadic estimating usage | Would you pay per bid for a tool you use occasionally? | Low LTV if projects are infrequent |
| Usage-based | Variable team size | Would you prefer to pay only for what you use? | Revenue unpredictability |
| Enterprise annual | Large teams with procurement process | Would your firm sign an annual contract? | Long sales cycle |
| Hybrid | Mixed team compositions | Would a base rate + per-project overage work? | Complexity |

**Market comps & pricing anchors:**
- **High-end SaaS:** Quotr.ai ($299.90–$499.90/mo), BuildVision AI ($299–$499/mo), Togal.AI ($199–$299/user/mo), Countfire (~$3,000–$5,000+/yr).
- **Low-end SaaS:** Bobyard (from ~$35/mo).
- **Service / Gig alternative:** Freelance takeoff estimators at $15–$75/job.

**Hypothesis range:** $100–400/user/month for a tool that reliably saves 2+ hours per estimate.

> [!WARNING]
> **Competitive Pricing Reality:** Vectoris would be a completely new, unproven entrant entering at incumbent-comparable pricing ($150–400/mo) with zero case studies, zero brand recognition, and unproven accuracy. This represents a distinct competitive headwind that must be tested early in customer discovery.

**What needs to be validated:**
- What is the value threshold for this customer segment?
- Is the buyer the estimator or the contractor owner?
- Is the relevant comparison a software subscription or an outsourced service (Beam AI / freelance)?
- Would contractors pay before the product is polished? A letter of intent from even one contractor is the strongest early signal.

---

## Integration Strategy *(Hypothesis)*

> **Principle:** Get inserted into the workflow before trying to replace the workflow.

Vectoris should initially augment existing estimating software rather than require contractors to replace it. Switching cost is a significant adoption barrier; plugging into the existing workflow removes it.

### Output Strategy (Stage 1-3)

- Excel and CSV export (compatible with most estimating workflows)
- PDF summary for review and sign-off
- API for custom integrations

### Integration Targets (Stage 4+)

Potential downstream integrations once the takeoff and estimating layers are validated:

| System | Why it matters |
|--------|---------------|
| ConEst / Accubid | Dominant electrical estimating software — connecting directly removes a major workflow friction |
| STACK | Growing AI-forward platform with broad contractor adoption |
| Procore, Autodesk | GC-side systems where subcontractors often report quantities |

**Validation question:** Which integration would most reduce switching friction for the target customer? Ask in interviews.

---

## Distribution / GTM Hypothesis

> [!IMPORTANT]
> No distribution strategy has been validated.

**Hypothesis for early customer acquisition:**
1. Direct outreach via professional network → interviews → prototype pilots → paid pilots
2. Industry associations (NECA chapters, regional electrical contractor associations)
3. Word of mouth within contractor networks if early pilots demonstrate value
4. Estimator-focused content (longer-term)

**Not yet addressed:**
- How to acquire customers beyond the founding network
- Whether the buyer (contractor owner) or user (estimator) is the right sales entry point
- Whether product-led or sales-led motion is appropriate at SMB scale

---

## Data Rights & Governance

> [!CAUTION]
> This section describes non-negotiable constraints, not recommendations. Violating these rules puts the company's legal standing and customer trust at risk.

### Core Rule

Access to customer drawings, workflows, or data does not equal permission to use that data for model training.

Schneider access is a workplace observation opportunity, not a data acquisition event. Treat every interaction with customer-owned information accordingly.

### What Requires Explicit Documented Authorization

Before any of the following enter any system, pipeline, or storage:

- Construction drawings and specifications
- Completed estimates and takeoffs
- Pricing and supplier quotes
- Internal labor assumptions and crew rates
- Actual project costs
- Any data that could be used as a model training example

**Required:** Written, specific authorization naming the data type, the permitted use, and the retention period. Generic "terms of service" agreements are not sufficient for model training use.

### Hard Rules

1. **No confidential or employer-owned data enters training pipelines without documented permission.** This applies to Schneider data and all future customer data.
2. **Do not treat raw construction drawings as training data unless explicit rights and documented authorization specifically permit that use.** Whether drawings can be used for model training depends on ownership, contracts, jurisdiction, and specific use case. Prefer derived training signals (detections, corrections, approved quantities) over raw drawings regardless, as these are both safer and more useful. Seek legal counsel before making any assumption about permissibility.
3. **Data rights must be designed into every pilot agreement before signing.** Not negotiated after.
4. **Model training use must be explicitly distinguished from product use.** A customer can agree to use Vectoris without agreeing to have their corrections used for training.
5. **Seek legal counsel before any production data collection.** The legal landscape around AI training data is evolving rapidly.

---

## Risk Matrix

| Risk | Probability | Impact | Mitigation / Validation |
|------|-------------|--------|--------------------------|
| Drawing variability makes AI unreliable | High | High | Test on 5+ diverse real packages; easy correction UX regardless of detection quality |
| AI detection accuracy insufficient | Unknown | High | Technical spike is primary validation; workflow time is the real bar |
| Quotr or BuildVision already solve the exact pain | Medium | High | Ask directly in interviews; test competitor tools on target drawings |
| Existing tools adequate for target customers | Medium | High | Probe current tool satisfaction directly; look for remaining friction |
| Contractors refuse to change workflow | Medium | High | Shadow test; don't ask them to change — run alongside existing process |
| Estimator doesn't trust AI output | Medium | High | HITL design; measure trust, not just accuracy |
| Economic buyer and user are misaligned | Medium | Medium | Interview both roles |
| Willingness to pay insufficient | Unknown | High | Pricing interviews; test LOI |
| Distribution bottleneck | Medium | High | Identify secondary channels before end of discovery |
| Construction drawings contractually sensitive | High | High | Data rights in every agreement; security from day one |
| **Competitive response from incumbents** | **High** | **High** | Learning system must compound faster than feature-copying; incumbents & well-funded startups (Beam AI, Quotr) moving fast |
| **Beam AI roadmap overlap** | **High** | **High** | Beam AI ($48.5M raised, $30.5M Series B Nov 2025) is explicitly expanding from takeoff into estimating and bidding — the same multi-stage roadmap Vectoris has planned, with far more capital and 1,100+ existing customers generating correction data today. Track public releases; evaluate pivot to alternative wedge if overlap tightens. |
| **Beam AI has already shipped automated addenda/revision variance detection** *(confirmed Aug 2026)* | **Realized, not hypothetical** | **High** | Beam AI's "Addendum Variance Report" auto-detects changes across addenda/revisions and surfaces structured quantity deltas today — the exact product this project's own "Revision & Addenda Intelligence" alternative wedge proposed to build, on the premise that competitors only offered crude overlay. That premise is now disproven. See THESIS.md's Market Update section. Any pursuit of this wedge needs a sharper differentiation claim than "nobody does this." |
| **Drawer.AI already ships conduit/wire quantity estimation** *(confirmed Aug 2026)* | **Realized, not hypothetical** | **Medium** | Contradicts this document's own "do not promise conduit or wire quantity estimation" guidance as a *competitive* matter (the guidance to defer for Vectoris's own timeline still holds, but the assumption that this is an unsolved, differentiating gap does not). Drawer.AI is a narrow, modestly-funded (~$5M) electrical-specific competitor — worth direct comparison in discovery, not just the larger funded players. |
| Data-moat non-reproducibility | High | High | Quotr claims thousands of audits; ConEst has decades of structured data; Countfire has operated for ~10 years without category dominance. Measurable improvement required |
| Customers won't grant data rights | Medium | High | Design rights into agreements from day one; hypothesis fails without permission |
| **Learning hypothesis fails** | Medium | High | Corrections too sparse, inconsistent, or convention-incompatible; competitors have larger datasets; improvement unmeasurable; customers don't permit data use |
| Conduit/wire much harder than symbol counting | High | Medium | Do not promise or build until symbol counting validates |
| **(H2) CPQ incumbents already own the general pattern** | **High** | **High** | Salesforce CPQ, SAP CPQ, Oracle CPQ, Tacton, Infor/Epicor CPQ, and AI-native entrants (servicepath) already do configuration + BOQ/BOM + AI-drafted proposals. Differentiation must be a specific electrical/MEP/data-center engineering gap these tools don't serve, not "AI CPQ" broadly. |
| **(H2) CRM/ERP lock-in moat favors incumbents, not Vectoris** | High | High | Salesforce/SAP/Oracle CPQ benefit from being the default inside their own ecosystems — a harder wall than Vectoris faced in the H1 takeoff market. Any H2 GTM plan must account for this, likely via narrow vertical focus rather than horizontal competition. |
| **(H2) Single-source validation risk** | **High** (current state) | High if unaddressed | H2 currently rests on one call with one OEM-side BD manager. Signal graded Weak-to-Medium per DISCOVERY.md's own framework. Must not proceed to spec or build before 5+ system-integrator interviews. |
| **(H2) Two different bottlenecks conflated** | Medium | Medium | "Solution assembly" (2-3 days, multi-team) and "negotiation/margin approval" (~1 week) are different problems with likely different solutions (AI configuration vs. approval-workflow tooling). Do not build one feature assuming it solves both. |
| **(H2) GTM/business model mismatch with H1 assumptions** | Medium | High | CPQ-style deployments are typically long-cycle, enterprise, and catalog-specific — closer to implementation services than self-serve SaaS. Do not reuse H1's per-seat SaaS pricing hypothesis without testing. |

---

## Data & Learning Flywheel

| Data type | Value | Defensibility | Legal sensitivity |
|-----------|-------|--------------|------------------|
| Raw construction drawings | Low | Low | **High** — client-confidential |
| AI detection predictions | Low alone | Low | Low |
| Human corrections (attributed + typed) | High | Medium-High | Low |
| Approved takeoff quantities | Medium | Medium | Medium |
| Contractor-specific symbol mappings | High | High | Low |
| Material mappings | Medium-High | Medium | Low |
| Labor unit assignments | Medium | Medium | Medium |
| Estimate vs. actual project cost | Very high | Very high | **High** — commercially sensitive |

> [!CAUTION]
> Do not claim a data moat. Call it a hypothesis until measurable model improvement exists in blind evaluation. The data becomes valuable only when it creates measurable improvement.

---

## Technical Roadmap

> [!NOTE]
> This roadmap is the H1-specific operational version of the general-purpose Phase 0–6 framework in [SCOPE.md §22](./SCOPE.md#22-technical-development-phases), which applies to any candidate wedge (H1, H2, or others). Stage 0 here corresponds to Phase 0 (Discovery), Stages 1–2 to Phase 2 (Technical Spike), etc. Progression between stages is still gated by the Six Gates in THESIS.md, not by this roadmap alone.

### Stage 0 — Discovery (Now)
Prove the pain. Map the complete workflow. Find the real bottleneck. Observe the Schneider BD session.

### Stage 1 — Detection (Weeks 2-3)
Prove AI can interpret real electrical drawings with sufficient accuracy to be useful.

### Stage 2 — Verification (Weeks 3-4)
Prove AI + estimator beats manual in time to approved takeoff.

### Stage 3 — Learning (After MVP validates)
Use validated, attributed corrections to improve electrical recognition and contractor-specific mappings. Establish measurable model improvement from real correction data.

### Stage 4 — Estimating Intelligence
Connect approved quantities to materials, labor, and current prices via retrieval layer. Implement contractor-specific material and labor mappings.

### Stage 5 — Decision Intelligence
Revision comparison, stale pricing alerts, deviation from historical patterns, estimate-vs-actual analysis, and risk flagging.

### Stage 6 — MEP (Conditional)
Only after electrical works deeply. MEP is a vision, not a plan.

---

## Long-Term Vision

| Stage | Description |
|-------|-------------|
| Today | AI-assisted electrical quantity takeoff |
| Near-term | AI-native electrical estimating with contractor-specific learning |
| Later | Decision Intelligence — helping estimators make better decisions, not merely count faster |
| Eventually | A system that learns how a specific estimating team thinks — and gets measurably better with every estimate |

The long-term opportunity is not "AI for construction." It is: the system that learns how electrical contractors understand their costs, refine their estimating judgment over time, and win better projects at better margins.

The company earns the right to move up this ladder only by solving each previous problem well.

> [!CAUTION]
> **The learning system is not the product until customers prove that the first workflow deserves to exist.** Elegant architecture — correction ontologies, vector stores, contractor memory, fine-tuning pipelines, evaluation frameworks — can be built months before the market validates the problem. Do not let the architecture pull the product somewhere the customer didn't ask it to go. The estimator may actually want revision comparison, not a learning loop. Find out first.

---

## Success Definition

| Level | Name | Success criterion |
|-------|------|-----------------|
| **Level 1** | Prototype | AI-assisted takeoff is measurably faster than manual on the same real project |
| **Level 2** | Product | Estimators voluntarily come back and use Vectoris on a second project without prompting |
| **Level 3** | Learning System | Future jobs from a contractor who has generated correction history perform measurably better than baseline in blind evaluation |
| **Level 4** | Company | Customers bid faster, increase estimating capacity, and/or improve estimate quality enough to pay meaningful, recurring revenue |

Each level must be earned. Level 2 does not begin until Level 1 is proven. The learning system does not exist until Level 3 is demonstrated in evaluation, not just asserted in product design.

---

## Founding Principles

**Do not build what sounds impressive. Build what contractors repeatedly prove they need.**

**Do not make AI the product. Make the outcome the product.**

**Do not remove the expert. Make the expert dramatically faster.**

**Do not assume the market. Talk to the people doing the work.**

**Do not scale before validation. First prove: real contractor + real drawing + real takeoff + real time saved.**

**Do not hide AI errors. Surface them, explain them, and make them easy to correct.**

**Do not claim a data moat. Earn it with measurable improvement in blind evaluation.**

**Do not fight competitors on the sentence. Fight them on what the system learns from every estimate.**

### Do Not Optimize For

- Benchmark accuracy at the expense of estimator workflow speed
- Model complexity or architectural elegance
- Number of detected symbols
- Feature count
- MEP breadth before electrical depth is proven
- Dataset size without measurable improvement
- A demo that impresses but doesn't get reused

**Optimize for better real-world estimating outcomes.**

---

## Sources & Research

| Claim area | Source type | Notes |
|-----------|-------------|-------|
| Estimating time benchmarks (6-12h manual, 1-3h software) | Secondary industry benchmarks; trade publications | Directional; treat as approximate |
| Manual estimate error rate (~38% >5% error) | Secondary industry research | Primary source unclear — verify |
| Labor shortage statistics | NECA; AGC; U.S. Bureau of Labor Statistics (2024-2026) | Widely corroborated |
| AI adoption barriers in construction | RICS; ASCE; Penn State; MDPI (2025-2026) | Consistent across sources |
| Competitor capabilities and pricing | Direct product research; company websites (mid-2026) | Verify before positioning decisions |
| Market size ($1.0B–$4.0B spread) | Grand View; Market.us; Mordor; Dataintelo; industry reports | Wide variance depending on scope (takeoff vs. full ERP); treat as low-confidence |
| VLM/CV feasibility for engineering drawings | BlueprintSymVL; Florence-2 literature; industry implementations | Hybrid pipelines proven; domain accuracy requires domain testing |
| Data moat and legal considerations | IP litigation reporting; GDPR/DPDPA guidance; AI legal commentary | Evolving landscape; seek legal counsel before production data collection |
| **(H2) CPQ market and vendor capabilities** | Direct vendor research: Salesforce, SAP, Oracle, ServiceNow, Tacton, Infor, Epicor, ServiceCPQ, servicepath (Aug 2026) | Verify before positioning decisions; this is a fast-moving, AI-adding category |
| **(H2) Schneider/Shubham discovery call findings** | Single primary interview (Shubham Singh, BD Manager – Data Centers, Schneider Electric, Aug 2026) | See [Call-Summary-Shubham-Singh.md](./Call-Summary-Shubham-Singh.md); one source, treat all findings as directional pending broader interviews |

---

## Scope of Work — Full Long-Term System Map

→ See [SCOPE.md](./SCOPE.md)

*The 15-workstream long-term vision (Project Understanding → Engineering/Solution Design → BOQ → Pricing → Cost Estimate → Bid Price → Proposal → Company Memory), the expanded candidate-wedge list, the general Phase 0–6 framework, and the company-wide out-of-scope list. Read this alongside, not instead of, the Gates in THESIS.md — SCOPE.md is the map, THESIS.md's Gates are what's currently authorized.*

---

## Customer Discovery Script & Schneider Session Guide

→ See [DISCOVERY.md](./DISCOVERY.md)

*Includes: full interview guide, competitive discovery questions, the learning hypothesis questions, the structured Schneider BD session objectives, and the new H2 discovery script for system integrators.*

---

## Honest Thesis Assessment

→ See [THESIS.md](./THESIS.md)

*Includes: what makes this a strong bet, the competitive reality for both H1 and H2, execution risks, thesis scorecard, exactly what to target first, and what NOT to do next.*

---

## Schneider / Shubham Singh Discovery Call

→ See [Call-Summary-Shubham-Singh.md](./Call-Summary-Shubham-Singh.md)

*Structured summary of the call that surfaced H2, with direct quotes, a signal-strength assessment, and what it does and doesn't establish.*

---

*This document is a working source of truth for an early-stage product thesis. It is not a marketing document or an investor pitch. It will be wrong in important ways. Update it when evidence contradicts it.*

*Last updated: 2026-08-22 — H2 hypothesis added following Schneider/Shubham Singh discovery call; cross-linked to SCOPE.md (new canonical long-term Scope of Work); competitive tables, feasibility assessment, risk matrix, and evidence ledger refreshed following live market research (Beam AI addenda-variance feature, Countfire/Valsoft acquisition, Drawer.AI competitor, Quotr procurement pivot, servicepath Gartner recognition); added the downstream worked example (Power Cable → PAC application → BOQ) and the long-term Canonical Line-Item Data Model, both following the Historical BOQ Evidence review; fixed two THESIS.md cross-references that previously pointed to sections that didn't exist yet.*
*Decision recorded 2026-08-22 (same day): H1 and H2 are merging into one pipeline with two entry points — a founder decision, not a hypothesis. Section renamed to "H1 and H2 — Merged Pipeline, Two Entry Points"; framing throughout this document updated accordingly. Market-level evidence for each pipeline stage remains unvalidated and is unaffected by this decision — see the Decision box in that section for the exact boundary between what's settled and what still needs discovery.*