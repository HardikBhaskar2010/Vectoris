# Vectoris — Estimation & Bidding Domain Specification

**Status:** RESEARCH / SPECIFICATION — not authorized scope
**Owner of:** The generalized domain model for post-takeoff Estimation and Bidding (Product/BOM, Cost, Pricing, Commercial Rules, Margin, Bid Scenarios)
**Does not own:** MVP authorization (→ `../MVP_BOUNDARY.md`), UI/page design (→ `06_PAGES/*`), the takeoff data model already built (→ `../03_ARCHITECTURE/DATA_MODEL.md` §2)
**Resolves (partially):** `OD-22` (Estimate entity model), `OD-23` (Bid/Proposal mechanics) — by supplying the domain model those decisions need; the decisions themselves remain open until Founder/Product review

---

## 0. How to Read This Document

This document is **research, not a build plan**. It exists to answer, ahead of time and with evidence instead of guesswork: *if and when Vectoris builds Estimation and Bidding, what does that domain actually look like?*

Nothing here is authorized for implementation. `../MVP_BOUNDARY.md` explicitly lists BOQ generation, pricing intelligence, commercial intelligence, margin/cost calculation, and proposal generation as **out of scope**. This document does not change that. It exists so that when a Gate is passed and that boundary is deliberately moved, the team is not starting from zero.

Per the confidentiality rule this document was produced under: every example below is synthetic. No company name, customer name, project name, employee name, SKU/part code, cost, price, discount, margin, adder percentage, or freight/labor rate from the source evidence appears anywhere in this file. Where a real number would normally illustrate a concept, the concept is described structurally instead (see §1.3).

---

## 1. Executive Summary

### 1.1 What this document establishes

A real, in-production techno-commercial workbook (an electrical/data-center infrastructure quotation, structurally similar to the "Emerson" evidence already referenced in `00_PROJECT/VISION.md` §4) was inspected to extract the **domain logic** connecting an approved takeoff to a submitted, priced proposal. That workbook is not a toy example — it is a live multi-tab spreadsheet performing exactly the "gap after takeoff" role that `README.md` (legacy) and `VISION.md` both flag as unvalidated territory for Vectoris.

The core finding: the gap after takeoff is **not one step**. It is a deterministic pipeline with a small number of distinct, separable stages — authoritative cost lookup, category-based commercial rule application, reference-price derivation, discount negotiation, rounding, and backward-calculated margin — each reading from its own versioned, conditionally-selected authoritative source. This matches, and now gives concrete shape to, the "retrieval layer, never model weights" principle already locked in `README.md`'s Four Memory Layers and inherited by `04_AI/AI_MEMORY.md`.

### 1.2 Why this matters for Vectoris

1. **It de-risks OD-22 and OD-23.** Those decisions were blocked on "what does an Estimate/Bid actually contain?" This document answers that with observed structure, not invention.
2. **It confirms the Four Memory Layers principle under real load.** The evidence shows real organizations already separating volatile pricing/cost data from stable structural logic across many parallel, dated source tables — validating (not just theorizing) that Vectoris's model-weights/retrieval-layer split is the right architecture for this domain.
3. **It surfaces entities Vectoris's current model does not yet have** — deal/opportunity context, tax classification, service/AMC rule schedules, multi-source cost provenance — which are noted as candidates below, not additions to any locked schema.
4. **It reinforces "small first product."** The full domain is large — larger than a first read of `README.md`'s BOQ line-item wish list suggested. This is a further argument, not a weaker one, for keeping Estimate/Bid out of MVP until Takeoff is proven (per `../MVP_BOUNDARY.md`).

### 1.3 A note on abstraction

Every structural claim below ("a fixed markup factor converts cost to a reference price," "commercial adders are looked up by product category," "margin is calculated backward from selling price") is drawn directly from live formulas in the evidence. No formula's actual coefficients, percentages, or lookup targets are reproduced. Where an example is needed, it uses invented placeholders (**Example Product A**, **Example Parent SKU**, **Unit Cost**, **Commercial Adder**, **Target Margin**) exactly as instructed.

---

## 2. Evidence & Confidence

| Source | What it is | Confidence label used below |
|---|---|---|
| Historical estimation/quotation workbook (electrical/data-center infrastructure domain) | A live, multi-tab, in-production commercial quotation with linked cost, pricing, BOM, and customer-facing sheets | **OBSERVED** |
| Legacy `README.md`, `THESIS.md`, `DISCOVERY.md` (DrawSpec-era) | Prior research on the "gap after takeoff" as an unvalidated hypothesis | **INFERRED / HYPOTHESIZED**, now partially upgraded to OBSERVED by §1 above |
| `docs/00_PROJECT/VISION.md`, `GLOSSARY.md`, `03_ARCHITECTURE/DATA_MODEL.md`, `OPEN_DECISIONS.md` | Current Vectoris architecture and terminology | Ground truth for naming; not itself evidence about the estimation domain |
| Customer discovery calls (e.g., the single Shubham Singh / Schneider Electric call referenced in `VISION.md`) | Anecdotal workflow description | **WEAK-TO-MEDIUM signal**, unchanged by this document |

Labels used through this document:

- **OBSERVED** — directly present in the workbook's structure or formulas.
- **INFERRED** — a reasonable generalization from what was observed, not itself literally present.
- **HYPOTHESIZED** — carried forward from prior Vectoris research, not confirmed by this evidence.
- **TO VALIDATE** — requires discovery with additional organizations before treating as a general pattern (this evidence is a single organization's implementation).

> [!CAUTION]
> This is **one organization's** implementation of estimation and bidding, in one vertical (electrical/data-center infrastructure), at one point in time. Treat every OBSERVED finding as "at least one real system does this," not "all system integrators do this." `DISCOVERY.md`'s multi-organization interview discipline still applies before any of this becomes product scope.

---

## 3. Workflow Model

### 3.1 Observed workflow (this evidence)

The workbook encodes, tab-by-tab, a pipeline distinct from — and more granular than — the single "Estimating" stage in the legacy README's four-stage progression:

```
Deal / Opportunity Context (OBSERVED)
    |
    v
Scope Definition — line items by category, with embedded engineering
specification narrative (OBSERVED)
    |
    v
Authoritative Cost Lookup — routed to one of several parallel,
dated cost/price sources depending on item category (OBSERVED)
    |
    v
BOM / Assembly Expansion — parent items expand into priced
child components, which may include service/labor lines (OBSERVED)
    |
    v
Commercial Rule Application — category-scoped adders applied to
cost and/or reference price (OBSERVED)
    |
    v
Reference Price Derivation — a configured markup basis converts
cost into a list/reference price (OBSERVED)
    |
    v
Commercial Negotiation — deal-specific discount applied to
reference price (OBSERVED)
    |
    v
Margin Calculation — computed backward from final selling price
and total cost, per line and rolled up by category (OBSERVED)
    |
    v
Scenario Comparison — the same cost base evaluated under at least
two commercial configurations side by side (OBSERVED)
    |
    v
Customer-Facing Price Schedule — a filtered view exposing only
description/UOM/quantity/unit price/extended price, with cost,
margin, and adder detail withheld (OBSERVED)
    |
    v
Revision — the customer-facing document carries an explicit
revision number, implying iterative negotiation over multiple
cycles (OBSERVED, single data point: revision 8 of one deal)
```

### 3.2 Comparison against prior Vectoris research

`VISION.md` §3's long-term pipeline (`Application/Where-Used Reasoning → Product/Material Selection → BOQ/BOM Generation → Pricing Intelligence → Commercial Intelligence → Proposal Generation`) is **directionally confirmed** but under-specified at the pricing/commercial stage. The evidence shows "Pricing Intelligence" and "Commercial Intelligence" are not one stage each — they interleave: commercial adders are computed *before* the reference price in some cases and applied *as a function of* the reference price in others (see §7.3). Any future architecture document should not treat Pricing and Commercial as cleanly sequential.

### 3.3 What remains unobserved

The evidence is a completed, late-stage (revision 8) quotation. It does **not** show:

- How the *first* draft of cost/pricing was assembled from a takeoff or requirement (TO VALIDATE)
- Who performed which step, or how long each step took (TO VALIDATE — exactly the Schneider-session-style observation `DISCOVERY.md` calls for)
- What triggered each of the 8 revisions (TO VALIDATE)
- Approval workflow mechanics — who signed off before customer issuance (INFERRED to exist, given "Firm" vs. "Budgetary" offer typing in the deal-context data; mechanics not observed)

---

## 4. Domain Entities

Entities are grouped by whether they extend the **already-locked** Vectoris data model (`03_ARCHITECTURE/DATA_MODEL.md`) or are **new candidates** surfaced by this evidence. Naming follows `GLOSSARY.md` conventions where a concept already has a Vectoris name.

### 4.1 Entities that extend the existing model

| Entity | Purpose | Relationship | Source of truth | Mutable? | Versioned? | Auditable? |
|---|---|---|---|---|---|---|
| **Estimate** *(already stubbed, OD-22)* | The cost/quantity basis for a project, derived from approved Line Items | Consumes approved `LineItem`s from a `TakeoffRun`; has many `EstimateLineItem`s | Vectoris (derived + human-edited) | Yes, until locked for a `BidScenario` | Yes — each material change to inputs should version | Yes |
| **EstimateLineItem** *(already stubbed, OD-22)* | One priced line: quantity × product/assembly × cost basis | Belongs to `Estimate`; optionally links to `LineItem` (from takeoff) or is manually added | Vectoris (calculated) + human override | Yes | Inherits `Estimate` version | Yes |
| **Bid** *(already stubbed, OD-23)* | A specific commercial offer built from an `Estimate` | Consumes one `Estimate`; may have many `BidScenario`s | Vectoris (assembled) | Yes until issued; issued Bids are append-only revisions | Yes — revision-numbered, matching the OBSERVED pattern in §3.1 | Yes |

### 4.2 New entity candidates (not in the current locked model)

> [!IMPORTANT]
> These are **candidates surfaced by evidence**, not additions to `DATA_MODEL.md`. Adding them requires the same process as any schema change: a passed Gate, then an explicit update to the owning document.

| Entity | Purpose | Relationship | Source of truth | Mutable? | Versioned? | Auditable? |
|---|---|---|---|---|---|---|
| **DealContext** | Deal-level qualification metadata: offer type (e.g. budgetary vs. firm), channel (direct vs. partner), tax-status flags, warranty/service-scope defaults | One per `Project` (or per `Bid`, if a project spawns multiple deals) — TO VALIDATE which | Human-entered at deal qualification | Yes, early; should lock once a Bid is issued | INFERRED needed | Yes |
| **Product** | A sellable item: standalone or a parent assembly | Has many `ProductAssembly` components (self-referential); referenced by `EstimateLineItem` | External catalog / authoritative cost source (see §6) | Catalog-managed, not Vectoris-owned | Yes — catalogs update over time | Provenance only, not full audit |
| **ProductAssembly / BOMComponent** | A parent→child expansion: which components, in what quantity, make up a parent Product | Belongs to `Product` (parent); references `Product` or `ServiceItem` (child) | Catalog / authoritative BOM source | Catalog-managed | Yes | Provenance only |
| **ServiceItem** | A labor, testing, installation, commissioning, or logistics line — **not a physical product**, but can appear as a BOM child (OBSERVED, §6.3) or a standalone commercial line | Referenced by `EstimateLineItem` or `BOMComponent` | Internal rate table | Rate-table-managed | Yes | Provenance only |
| **CostRecord** | One authoritative unit-cost lookup result, with its source table, effective date, and category-routing rule applied | Produced for one `Product`/`ServiceItem` at estimate time | One of several parallel cost master tables (§6.2) | Immutable once recorded on an `EstimateLineItem` (a re-lookup produces a new `CostRecord`, not a mutation) | Yes — carries the source table's effective date | Yes — this **is** the audit trail's cost half |
| **PriceRecord** | One authoritative reference/list-price lookup result, distinct from `CostRecord` (OBSERVED: cost and list price can come from *different* dated sources, §6.2) | Produced for one `Product` at estimate time | Pricing catalog / ERP price table | Immutable once recorded | Yes | Yes |
| **CommercialRule** | A configurable, category- or activity-scoped adder or discount rule (allocation, logistics/RAC-style, global allocation, service-tier escalation) | Applied during `EstimateLineItem` cost/price calculation | Internal rate-table, versioned | Rule-table-managed, not per-deal | Yes — OBSERVED multi-year escalation schedules for service-tier rules | Yes, at rule-table level |
| **TaxClassification** | GST/VAT-equivalent rate and a compliance classification code (HSN/SAC-equivalent) per line item | Referenced by `EstimateLineItem` | External tax reference table | Catalog-managed | Yes — tax rates and codes change | Provenance only |
| **MarginAnalysis** | Rolled-up cost/price/margin by category (or other grouping) for one `Estimate` or `BidScenario` | Derived from `EstimateLineItem`s | Vectoris (calculated) | Recalculated on demand; not independently editable | Implicit via `Estimate` version | Yes |
| **BidScenario** | One named commercial configuration (e.g., a rule-set variant, a discount level, an alternative product mix) evaluated against the same cost base | Belongs to `Bid`; each produces its own `MarginAnalysis` | Vectoris (assembled) + human input | Yes, pre-issuance | Yes | Yes |
| **Proposal** | The customer-facing rendering of an issued `Bid` — a **subset view**: description/spec/UOM/qty/unit price/extended price only (OBSERVED, §3.1) | Generated from `Bid` (one scenario, finalized) | Vectoris (rendered) | Append-only once issued (new revision, not edit) | Yes — revision number, OBSERVED | Yes |
| **OpportunityReference** | An external CRM/sales-system identifier the deal is linked to (OBSERVED: quotation carried an external opportunity/reference ID) | Attached to `Project` or `DealContext` | External CRM (not Vectoris-owned) | Read-only reference | N/A | N/A — reference only |

### 4.3 Explicitly not modeled here

`CorrectionEvent`, `Detection`, `LineItem` (takeoff-side), `TakeoffRun` are unchanged by this document — see `03_ARCHITECTURE/DATA_MODEL.md` §2. This document only extends the pipeline **downstream** of an approved `LineItem`.

---

## 5. BOQ Line-Item Model

### 5.1 What a commercially useful line actually contains (OBSERVED)

Evaluating `README.md`'s hypothesized field list against the evidence:

| Field concept | Status | Evidence note |
|---|---|---|
| Category | **CURRENTLY JUSTIFIED** | Every line-item table groups by an explicit category field; category drives cost-source routing and commercial-rule lookup (§6.2, §7.3) — it is not cosmetic, it is a routing key |
| Description | **CURRENTLY JUSTIFIED** | Present everywhere; in trade-specific BOQs (e.g., precision-cooling works), description cells carry substantial multi-paragraph **engineering specification prose**, not short labels — see §5.2 |
| Specification | **CURRENTLY JUSTIFIED**, but observed *embedded in Description*, not as a separate structured field | See §5.2 — a real product/architecture decision, not just a data-entry habit |
| Application / Where-Used | **NOT YET VALIDATED** in this evidence — the workbook does not show an explicit "where used" field separate from description/category. `GLOSSARY.md`'s Application/Where-Used concept remains HYPOTHESIZED from other evidence (per `VISION.md` §4), not confirmed here |
| System/SubSystem | **SUPPORTED FUTURE MODEL** — category groupings (e.g., rack infrastructure vs. power vs. cooling vs. civil works) function as an implicit system grouping, but no explicit subsystem field was observed |
| Quantity | **CURRENTLY JUSTIFIED** | Present on every line; UOM is explicit and varies meaningfully (each/unit, area, length) |
| UOM | **CURRENTLY JUSTIFIED** | OBSERVED as a first-class field throughout |
| Product/Model/SKU | **CURRENTLY JUSTIFIED** | A part-code field is present and is the join key into cost/price sources — this is load-bearing, not descriptive |
| Manufacturer/Vendor | **SUPPORTED FUTURE MODEL** | Present in at least one cost-source table (third-party component catalog carries a manufacturer field) but not uniformly on every line-item table |
| Source Drawing/Document | **NOT VALIDATED** in this evidence (a commercial-stage artifact; takeoff-to-drawing traceability is out of this workbook's scope by definition — that link lives upstream, in the already-built `LineItem`/`Detection` model) |
| Engineering Basis | **CURRENTLY JUSTIFIED**, folded into Description (§5.2) | Not a separate field in this evidence, but a real information need — worth a dedicated field in a future structured model even though the source doesn't structure it that way |
| Pricing Source | **CURRENTLY JUSTIFIED**, implicit via lookup formulas, not a stored field | The *source table* an item's cost/price came from is determinable from which formula/table matched — but is not itself written back onto the line as a labeled field. This is a gap worth closing in any future Vectoris model (see §12) |
| Price Validity | **CURRENTLY JUSTIFIED** | Every cost/price source table carries an effective/as-of date at the table level (not per-row) |
| Approval Status | **NOT VALIDATED** in this evidence at the line level — approval, where it exists, appears to happen at the document/revision level (implied by "Firm" offer typing and revision numbering), not per line item |

### 5.2 A structural finding not in the original hypothesis list

**Engineering specification narrative is commonly embedded directly inside the description field**, sometimes running to multiple paragraphs describing construction, material grade, or performance requirements of the line item, alongside the commercial Supply/Installation rate and amount columns on the same row. A future structured model should treat "Description" as capable of holding substantial prose, and should not assume a short label is sufficient — either by keeping it as long-form text or by explicitly splitting "Specification" out as its own long-text field distinct from a short display Description, which the evidence suggests real users have *not* done, but which a well-designed system reasonably could.

### 5.3 Supply vs. Installation as a first-class split

For services-adjacent categories (civil works, precision-cooling installation), **Supply** and **Installation** are independently rated and independently totaled on the same BOQ line (a supply rate/amount and an installation rate/amount, both per the line's quantity and UOM). This means "installation cost" is not always a flat project-level adder — it can be a genuine per-line-item calculation. The Cost Model (§7) reflects this.

---

## 6. Product / BOM Model

### 6.1 Parent → Assembly → Components (OBSERVED)

The evidence contains a dedicated parent/child expansion structure:

```
Example Parent SKU (a "PTO"-style top-level configured product)
    |
    +-- Example Child Component A   qty per parent: N   [cost basis]
    +-- Example Child Component B   qty per parent: N   [cost basis]
    +-- Example Service Line (e.g., "startup"/commissioning)  qty per parent: fractional
```

Two findings sharpen the domain model beyond what the original task brief anticipated:

1. **BOM children are not always physical products.** At least one observed parent's component list includes a service/commissioning-type line at a fractional quantity, priced and rolled up exactly like a physical component. **The BOM model must accept `ServiceItem` as a valid child type, not only `Product`.**
2. **Parent/child status can also be flagged inline**, outside a dedicated BOM table. The main cost line-item table carries a field marking certain rows as parent-level ("assembly head") even when a full BOM breakdown sits elsewhere. A future data model should treat "is this a parent" as a property on the line item itself, not solely as membership in a separate BOM table.

### 6.2 Component cost basis — routed, not single-sourced

Unit cost for a given component is **not** looked up from one universal table. The evidence shows cost lookups routed to one of **several parallel, independently-dated internal cost-master tables**, with the routing decision made by the item's category/type. Separately, **third-party (non-self-manufactured) components** are costed from a distinct, currency-denominated vendor catalog rather than the internal manufacturing cost tables at all.

**Implication for Vectoris:** "get the authoritative cost" is not a single retrieval-layer call. It is (a) a routing/classification step — which source applies to this item — followed by (b) a lookup against that specific source, (c) each source carrying its own effective date, so **price validity must be tracked per-source, not globally**.

### 6.3 AI vs. deterministic responsibility here

Consistent with the task brief's non-negotiable rule and with Vectoris's existing "AI proposes, human decides" principle (`VISION.md` §2):

- AI **may propose** which parent/assembly a requirement maps to, and **may propose** a BOM composition for an ambiguous or configurable product.
- AI **must not** compute component quantities, extended costs, or assembly rollups. Those are the deterministic engine's job, exactly as the task brief specifies and as `04_AI/AI_SYSTEM.md`'s Control/Verification layer already implies for other domains.

---

## 7. Cost Model

### 7.1 Cost components (OBSERVED)

The internal manufacturing cost-master tables consistently break unit cost into: **Material**, **Material Overhead**, **Resource** (labor), **Outside Processing**, and **Overhead**, rolling up to a **Total Unit Cost**. This is an OBSERVED pattern (not merely the task brief's hypothesized list) — real cost data in this domain is already decomposed this way at the source.

Above the unit-cost layer, extended/project cost adds:

- **Quantity-scaled extension** (unit cost × quantity)
- **Category-scoped commercial adders** (§9) — allocation-style and logistics-style adders, applied as configurable percentages
- **A global adder**, applied on top of the already-adjusted cost, conditionally present depending on deal configuration
- **Installation/service cost**, where applicable, as its own rate × quantity line (§5.3), not folded into product unit cost

### 7.2 Cost data gaps (OBSERVED — an exception, not a hypothetical)

Several entries in the internal cost-master tables carry **zero or blank cost values** — real components with no current authoritative cost on record. Any deterministic cost engine built on this pattern must treat "no cost found" as a first-class, visible exception state (see §15), not silently default to zero and continue.

### 7.3 The cost → price ordering is not strictly linear

A subtlety worth flagging explicitly: not every commercial adder is applied *to cost*. At least one adder category is applied as a percentage *of the computed selling price*, meaning the "cost buildup" and "price derivation" stages are interleaved rather than strictly sequential (cost fully resolved, then price computed once). A future calculation engine must support adders that reference either basis, configured per rule — not assume a single linear cost → adders → price pipeline.

### 7.4 Distinguishing current / historical / estimated cost

| Concept | Status in evidence |
|---|---|
| **Current authoritative cost** | The dated master-table lookup at estimate time — OBSERVED, this is the default and only cost basis used |
| **Historical cost** | Not explicitly modeled in this evidence — the workbook always reads the *current* dated table; no observed mechanism preserves what cost was used in a prior revision once the source table is updated. **This is a gap**: an issued Bid revision should freeze its cost basis, and this evidence does not show that happening. Flagged as an Open Question (§19) |
| **Estimated / provisional cost** | Not observed as a distinct state — items either have a current cost or a gap (§7.2); there is no "rough estimate, to be firmed up" flag observed |

---

## 8. Pricing Model

### 8.1 Separating cost, reference price, and commercial (selling) price

Three distinct concepts, all OBSERVED as separate in the evidence:

1. **Unit Cost** — from the routed cost-master lookup (§6.2, §7.1).
2. **Reference/List Price** — derived from Unit Cost via a **configured markup factor** (a fixed multiplier converting cost to a list-price basis). This is a pricing-catalog concept, distinct from cost, and is itself looked up/derived independently — not invented at quote time.
3. **Selling Price** — the Reference Price after a deal-specific discount percentage is applied, quantity-extended, and rounded to a whole currency unit.

### 8.2 Provenance requirement (directly answers the task brief's core question)

> "Where did this price come from?" and "When was this price valid?"

The evidence shows this is answerable **only by knowing which lookup table and formula path was used** — the workbook itself does not write the answer back as a stored field per line. This is the single clearest gap between "what a spreadsheet gets away with" and "what an auditable product needs." **Any Vectoris `PriceRecord`/`CostRecord` must store the source table identity and its effective date explicitly, as data — not leave it implicit in a formula, the way this evidence does.** This is a concrete, evidence-backed requirement for §12.

### 8.3 AI's role in pricing (hard boundary, consistent with task brief)

AI must never memorize or invent a current price. Every price used in a calculation must trace to a `PriceRecord` or `CostRecord` with a real source and date. This matches the already-locked Vectoris principle (`README.md`'s Four Memory Layers: "volatile pricing → retrieval layer, never model weights") and is now reinforced by direct evidence of how real pricing sources are structured and dated.

---

## 9. Commercial Rule Engine

### 9.1 Rule categories (OBSERVED)

| Rule category | Scope | Basis it applies to |
|---|---|---|
| Allocation-style adder | Product category / business activity | Applied to extended cost |
| Logistics-style adder ("RAC"-equivalent) | Product category, and conditionally toggled per deal | Applied partly to cost, partly to selling price (§7.3) |
| Global allocation adder | Deal-wide, conditional on configuration | Applied to already-adjusted cost |
| Commercial discount | Negotiated per deal | Applied to reference price |
| Tax (GST-equivalent) | Per line item, by classification code | Applied at the customer-facing/compliance layer, separate from margin math |
| Service-tier escalation (AMC-equivalent) | Multi-year, by service tier | Recurring, **year-over-year escalating** — a materially different rule shape from the one-time adders above |

### 9.2 A distinct rule *shape* for recurring service pricing

The one-time commercial adders above are simple percentages. Service/maintenance pricing (observed as a multi-year schedule differentiated by service tier, with a defined starting percentage and a year-over-year increase) is structurally different: it is a **schedule**, not a scalar. **`CommercialRule` as a domain entity must support both shapes** — scalar rules and multi-period escalating schedules — not assume every rule is a single percentage.

### 9.3 Calculation chain (generalized, no confidential coefficients)

```
Authoritative Cost Basis
    |
    v
Applicable Category/Activity Rules  →  Adjusted Cost
    |
    v
Configured Markup Factor  →  Reference Price
    |
    v
Negotiated Discount  →  Recommended Selling Price
    |
    v
Quantity Extension + Rounding  →  Final Line Amount
    |
    v
Margin = (Final Line Amount − Adjusted Cost) / Final Line Amount
```

This chain is deterministic end-to-end. No step in it should ever be delegated to an LLM's arithmetic — every step is exact-value, auditable computation.

---

## 10. Margin Model

### 10.1 Gross/product margin vs. project/net margin

The evidence computes margin **per line item** (selling price vs. adjusted cost) and then **rolls up by category** via aggregation — matching a Gross/Product margin concept. A **project/net margin** — i.e., margin after project-level costs not tied to any single product line (see §10.2) — is not separately observed as a distinct rollup, though category-level rollups could in principle be summed to approximate one.

### 10.2 Additional project-level costs identified in evidence

Beyond per-line product cost, the evidence includes cost categories that affect overall project economics but are not attached to individual product SKUs:

- **Civil/interior works** (floor preparation, containment) — its own Supply/Installation BOQ, separate from the product cost sheet entirely
- **Factory Acceptance Testing** — priced by **equipment capacity class**, not by BOQ line item, and includes a **travel/logistics** sub-component

A true project/net margin calculation must be able to pull these in as line items in their own right, not just as an undifferentiated "other costs" bucket.

### 10.3 Scenario-aware margin

Margin was observed calculated **twice, side by side**, under two different commercial-rule configurations for the same underlying cost base (see §11) — confirming that `MarginAnalysis` must belong to a `BidScenario`, not directly to an `Estimate`, since the same estimate can legitimately produce different margins under different commercial assumptions.

### 10.4 Hard boundary (per task brief, reinforced by evidence)

The deterministic engine computes margin. AI may **surface** a margin figure or **flag** an unusual margin (e.g., "this line's margin is well below this category's typical range") as a decision-support signal — a capability directly anticipated by the legacy README's Decision Intelligence vision — but AI never sets, adjusts, or approves a price or margin autonomously.

---

## 11. Bid Scenarios

### 11.1 Confirmed by evidence: side-by-side scenario comparison

The Summary-level rollup in the evidence computes category-level cost, price, and margin **under two configurations of the same commercial rule set** (a toggle-dependent adder, present vs. absent), laid out as parallel columns for direct comparison. This is a real, in-use instance of exactly the `BidScenario` concept the task brief anticipates — not merely a plausible future feature.

### 11.2 Scenario types — status against evidence

| Scenario type (from task brief) | Status |
|---|---|
| Base Scenario | **CONFIRMED-shape** — the primary cost/price/margin calculation is exactly this |
| Alternative commercial-configuration scenario (adder on/off) | **CONFIRMED** — directly observed |
| Budgetary vs. Firm scenario | **SUPPORTED FUTURE MODEL** — the deal-context data distinguishes "Budgetary" vs. "Firm" offer types, but the evidence doesn't show two full parallel calculations for the same deal under each; only the type flag was observed |
| Customer Target Scenario | **NOT VALIDATED** in this evidence |
| Negotiation Scenario (revision-over-revision) | **SUPPORTED FUTURE MODEL** — the revision-numbering pattern (§3.1) strongly implies successive negotiation states exist, but the evidence is a single point-in-time revision, not a revision history |
| Alternative Solution Scenario (different product/engineering mix) | **NOT VALIDATED** in this evidence |

### 11.3 What each scenario must carry (per task brief, unchanged by evidence)

Cost, Selling Price, Discount, Margin, Assumptions, Scope, Risk, Approval Status — the evidence confirms the first four are already being computed this way in practice; Assumptions/Scope/Risk/Approval Status are not observed as structured fields (they are, at best, implicit in free-text remarks columns seen in the civil/engineering BOQs) and remain product-design decisions, not evidence-confirmed requirements.

---

## 12. Human Approval Model

Unchanged in principle from `VISION.md` §2 and the task brief: **AI proposes → human verifies → system records the decision.** This evidence adds two concrete observations about *where* human judgment currently enters a real workflow, useful for scoping future approval checkpoints:

1. **Deal-level judgment calls are captured as an explicit qualification checklist** before commercial work proceeds (offer type, partner channel, tax status, warranty/service terms) — i.e., some human decisions happen *before* any line-item math, as gating context, not as line-by-line approval.
2. **Free-text engineering remarks embedded in BOQ rows** (e.g., a scope caveat noted inline against a civil-works line) function as an informal, unstructured record of a human judgment call that a structured system should probably promote to a real field (an `Adjustment`/note with attribution) rather than lose in a comment cell.

No per-line explicit "approved by / approved at" field was observed; approval, where it exists in this evidence, is implicit in the document/revision being issued at all. A future Vectoris implementation should not assume line-level approval state exists just because the domain conceptually needs it — this must be designed, not inferred from this evidence.

---

## 13. AI vs. Deterministic Responsibilities

Adapted from the task brief's ownership matrix, adjusted where evidence sharpens a boundary:

| Capability | AI | Deterministic Engine | Human |
|---|---|---|---|
| Drawing interpretation | ✓ | | ✓ |
| Quantity proposal | ✓ | | ✓ |
| Product / assembly matching (incl. which parent an item belongs to) | ✓ | | ✓ |
| BOM expansion (incl. service-line children, §6.3) | Proposal | ✓ | ✓ |
| Cost-source routing (which master table applies) | | ✓ — this is a classification **rule**, not free-form AI judgment, once category is known | ✓ (defines the routing rules) |
| Unit cost / price retrieval | | ✓ | |
| Cost buildup (adders, adjusted cost) | | ✓ | |
| Reference price derivation | | ✓ | |
| Discount application | Proposal (may suggest a range) | ✓ (executes the arithmetic) | ✓ (sets/approves the actual discount) |
| Margin calculation | | ✓ | |
| Margin/price anomaly flagging (Decision Intelligence-style) | ✓ | (reads deterministic output) | ✓ (acts on the flag) |
| Scenario generation | ✓ (proposes configurations to compare) | ✓ (computes each scenario) | ✓ (selects/approves one) |
| Deal-context qualification (offer type, tax status, etc.) | Proposal (may pre-fill from a requirement doc) | | ✓ |
| Final pricing decision | | | ✓ |
| Final bid/proposal approval and issuance | | | ✓ |

---

## 14. Provenance & Auditability

### 14.1 The chain, per line item, as it must exist (per task brief; not fully present in the evidence, see §8.2)

```
BOQ / Estimate Line
    |
    v
Quantity Source (takeoff LineItem, or manually entered — traceable either way)
    |
    v
Product / Assembly Selection (AI-proposed or human-selected — which, recorded)
    |
    v
CostRecord (source table identity + effective date + routing rule applied)
    |
    v
PriceRecord (source + effective date, where distinct from cost)
    |
    v
CommercialRule(s) Applied (which rules, their values at time of use — not "current value," the value *as applied*)
    |
    v
Calculated Cost / Price / Margin
    |
    v
Human Approval (if/when this checkpoint is designed — see §12)
```

### 14.2 The key gap this evidence surfaces

The evidence workbook computes correctly but **does not persist most of this chain as data** — it is recoverable only by knowing which formula and which lookup table produced a given cell, which is fragile and not queryable. **Every rule and rate applied to a calculation must be captured at the value it had when applied**, not just referenced by name — because commercial rules change over time (§9.2's escalating schedules make this concrete: "the AMC rate" is meaningless without a year, and equally "the allocation adder" is meaningless without a date), and an old, issued Bid must remain explainable even after the current rule tables move on. This is the single most important requirement this document adds to `03_ARCHITECTURE/DATA_MODEL.md`'s existing auditability principles.

---

## 15. Exceptions & Edge Cases

| Situation | Status | What AI should do | What deterministic logic should do | When to ask a human |
|---|---|---|---|---|
| Missing/zero authoritative cost | **OBSERVED** (§7.2) | Never fabricate a cost | Flag the line as blocked/incomplete, exclude from totals or clearly mark as provisional | Always — a human must supply or approve a cost before the line is final |
| Stale price (source older than an organization-defined threshold) | INFERRED necessary, not directly observed (no staleness flag seen, but every source is dated) | May surface a staleness warning | Compute the effective-date delta; enforce a threshold if configured | When staleness exceeds threshold |
| Multiple possible cost sources for one category | **OBSERVED** (§6.2's routing) | May propose the likely category if ambiguous | Deterministic routing rule decides, once category is confirmed | If category itself is ambiguous |
| Ambiguous specification (long free-text spec, §5.2) | **OBSERVED** | May extract/propose structured fields from the prose | N/A | If extraction confidence is low |
| Product unavailable / discontinued | Not observed directly; catalogs will have this in practice | May propose an alternative | N/A | Always, before substituting |
| Quantity uncertain | Out of this document's scope — belongs to the existing takeoff/`LineItem` model | — | — | Existing takeoff HITL flow applies |
| Manual/engineering-added item (not from takeoff) | **OBSERVED** (civil/PAC BOQs contain items with no drawing-detection origin at all) | May propose based on requirement text | Same cost/price pipeline applies regardless of origin | Origin should be recorded (`manual` vs. `ai_detected`), consistent with existing `LineItem.source` field |
| Customer-specific pricing/discount | **OBSERVED** (deal-specific discount, §8.1) | Never set | Applies whatever discount is entered | Human sets/approves |
| Differing UOMs across sources | Not directly observed as a conflict, but multiple UOM fields exist across sheets | May flag a mismatch | Should normalize or block on mismatch | When a mismatch is detected |
| Parent/child (BOM) changes mid-estimate | Not observed directly; PC-style expansion is static in this evidence | May propose an updated expansion | Recalculate rollups | Always, before re-issuing |
| Revised drawings / changed quantities feeding into an existing estimate | Out of scope here — governed by existing `TakeoffRun`/`CorrectionEvent` model plus the not-yet-built Revision/Addenda work | — | — | Existing model + future Revision work |
| Optional scope / exclusions | Not observed as a structured field; present only as free-text remarks (§12.2) | May draft exclusion language from requirement gaps | N/A | Always — this is customer-facing commercial language |
| Alternative products for the same requirement | Not observed directly | May propose alternatives | Prices each identically via the same pipeline | Human selects |
| Cross-currency cost sources (observed: a component catalog priced in a different currency than the deal's) | **OBSERVED** | — | Must apply a defined, versioned exchange/conversion basis, itself a `PriceRecord`-like retrieval, never an AI-estimated rate | If no current conversion basis exists |

---

## 16. Estimation Page Implications (information only, not UI design)

A future Estimation surface must be able to show the estimator, for any line:

- Which quantity source it came from (takeoff-linked or manual)
- Which product/assembly it resolved to, and whether AI-proposed or human-selected
- Its cost basis: source table + effective date (closing the §8.2 gap)
- Its price basis: source + effective date, if distinct from cost
- Which commercial rules applied, and their value *as applied*
- Resulting margin, and whether it falls inside or outside a typical range for its category (Decision-Intelligence-style signal)
- Approval/lock state
- Any exception flags (§15) blocking finalization

This directly answers the task brief's "why is Vectoris proposing this?" requirement — every item above is provenance the evidence shows is *computable* but is not, in the source workbook, *stored and displayed* as first-class data. That gap is the product opportunity.

## 17. Bidding Page Implications (information only, not UI design)

A future Bid workspace must conceptually support:

- Scope summary (rolled up from the Estimate)
- The BOQ itself, with the per-line provenance above
- Cost and pricing scenario comparison (§11 — already a real, in-use pattern)
- Margin by category and, if project-level costs (§10.2) are included, an approximate net margin
- Risk/exception summary (unresolved items from §15)
- Approval state and revision history (the "R8"-style pattern observed)
- Proposal generation — a filtered customer-facing render (§3.1's Customer-Facing Price Schedule pattern) that deliberately withholds cost, margin, and internal rule detail

---

## 18. Backend Implications

| Data category | Where it belongs | Rationale |
|---|---|---|
| Raw customer requirements, drawings, project-specific BOQ drafts | Local-first, per existing `STORAGE.md` principle | Confidential, customer-owned — same reasoning as existing takeoff drawings |
| Cost master tables, price catalogs, commercial rule tables | Company-scoped authoritative source (could be Vectoris-hosted retrieval layer, or a connector to the org's existing ERP/pricing system) | Volatile, shared across projects within an org, must be dated/versioned — this is exactly the "retrieval layer, never model weights" layer already locked in `README.md`/`AI_MEMORY.md` |
| CostRecord / PriceRecord / applied CommercialRule values | Cloud metadata store (Supabase/PostgreSQL, per the existing `DATA_MODEL.md` ADR), as immutable records tied to the Estimate/Bid | Must survive source-table changes for audit (§14.2) — this is metadata, not raw project files, so it fits the existing local-first split cleanly |
| AI reasoning/proposals about product/BOM mapping | Ephemeral to a session unless promoted to a recorded proposal a human acts on | Consistent with existing `AI_MEMORY.md`/`TRAINING.md` handling of AI output vs. recorded decisions |

No new backend platform decision is implied — this domain fits the already-LOCKED architecture (`ARCHITECTURE_DECISIONS_SUMMARY.md`, `DATA_MODEL.md`'s Supabase ADR). The addition is **new entities and a stricter provenance requirement**, not new infrastructure.

---

## 19. Versioning

What must version, based on evidence + task brief:

| Item | Versioning need | Evidence basis |
|---|---|---|
| Product / catalog definitions | Yes | Cost/price master tables are explicitly dated at the table level |
| BOM / assembly definitions | Yes (inferred) | Not directly observed changing, but products evolve; an issued Bid must reference the BOM as it was |
| Cost / price validity | Yes — per source table, not globally | §6.2 — multiple parallel sources, each independently dated |
| Commercial rules | Yes — including multi-year schedules (§9.2) | Escalating service-tier schedules are explicitly year-keyed |
| Project / requirement revisions | Out of scope here (existing takeoff model) | — |
| Drawing revisions | Out of scope here (existing takeoff model) | — |
| Bid scenarios | Yes | §11 — parallel scenario computation observed |
| Approvals | Yes, once designed (§12) | Not observed as structured, but required for the audit chain (§14) to mean anything |
| Issued proposals/quotations | Yes — explicit revision numbering | **Directly observed** (revision 8 of one deal) |

**The central versioning risk, stated plainly:** an issued Bid/Proposal must remain explainable even after the cost tables, price tables, and commercial rules it used have since changed. The evidence workbook does **not** solve this — it always reads current tables. A future Vectoris implementation should not copy that gap; it should snapshot the values-as-applied onto the `CostRecord`/`PriceRecord`/`CommercialRule`-application records described in §14.

---

## 20. MVP vs. Future Scope

Consistent with, and not overriding, `../MVP_BOUNDARY.md` (which remains authoritative):

| Horizon | Item |
|---|---|
| **MVP (do not add)** | Nothing in this document is MVP. `MVP_BOUNDARY.md`'s exclusion of BOQ generation, pricing intelligence, commercial intelligence, and proposal generation stands unchanged. |
| **Next (candidate, post-Gate)** | A minimal `Estimate`/`EstimateLineItem` model that captures quantity → single authoritative cost source → simple markup, **without** multi-source routing, scenario comparison, or escalating service schedules — i.e., a deliberately smaller slice of §7–§9 than the full evidence shows, to avoid building the whole observed system at once |
| **Next (candidate)** | Provenance fields on `CostRecord`/`PriceRecord` (source + effective date) even before full commercial-rule support exists — this is cheap to add early and expensive to retrofit, echoing `README.md`'s own stated reason for building the takeoff data model's audit fields early |
| **Future** | Multi-source cost routing (§6.2), commercial rule engine with scalar + schedule rule shapes (§9), scenario comparison (§11), Proposal generation with the customer-facing filtered view (§3.1, §17), DealContext/OpportunityReference entities (§4.2) |
| **Future, explicitly flagged as needing more discovery, not just engineering** | Approval workflow mechanics (§12) — no structured line-level or document-level approval state was observed; this needs product design plus discovery with multiple organizations, not extraction from a single evidence source |

---

## 21. Open Questions / Discovery Required

1. **Is the routed multi-source cost lookup (§6.2) common across system integrators, or specific to this organization's manufacturing/vendor mix?** Single-organization evidence; needs multi-org discovery per `DISCOVERY.md`'s existing interview framework.
2. **How are the observed 8 revisions actually driven?** Customer feedback, internal review, scope change, pricing renegotiation — unknown from a single point-in-time artifact. Directly answerable only by workflow observation (as `DISCOVERY.md`'s Schneider-session guide already calls for), not by reading a finished spreadsheet.
3. **Does line-level approval exist anywhere in real organizations, or is document/revision-level approval (as this evidence implies) the norm?** Affects whether `EstimateLineItem` needs its own approval state at all.
4. **How is historical cost/price actually preserved when a Bid is revised?** This evidence shows a gap (§7.4, §19), not a solved pattern — worth asking directly in discovery whether organizations have separate mechanisms (e.g., manual snapshot copies) this workbook simply didn't show.
5. **Is the Application/Where-Used semantic (already HYPOTHESIZED per `GLOSSARY.md` and `VISION.md`) present in *other* organizations' BOQs even though absent from this specific evidence?** This document's silence on it should not be read as disconfirming evidence — it's one artifact.
6. **What does "OpportunityReference" actually need to carry, and is CRM integration (vs. a passive reference field) in scope for any future horizon?** Not addressed by `PRODUCT_SCOPE.md` at all today.
7. **Do other organizations' service/AMC pricing follow the same multi-year escalating-schedule shape (§9.2), or is that specific to this vertical/organization?**
8. **Should Vectoris's future commercial rule engine be organization-configurable (each SI defines their own adders), or does the market converge on a smaller common rule vocabulary?** Directly affects whether `CommercialRule` should be a flexible rule-authoring system or a fixed set of parameterized types.

---

## 22. Cross-References

- `../00_PROJECT/VISION.md` — long-term pipeline this document sharpens the pricing/commercial stage of
- `../00_PROJECT/GLOSSARY.md` — term definitions this document follows and extends (candidates only)
- `../03_ARCHITECTURE/DATA_MODEL.md` §3 — the `Estimate`/`EstimateLineItem`/`Bid` stubs this document gives shape to (OD-22, OD-23)
- `../OPEN_DECISIONS.md` — OD-22, OD-23, and this document's own §21 additions
- `../MVP_BOUNDARY.md` — authoritative scope boundary; unchanged by this research
- `../04_AI/AI_SYSTEM.md`, `../04_AI/AI_MEMORY.md` — AI/deterministic split and memory-layer principles this document's §13–14 apply to the estimation domain specifically
- Legacy `README.md` (Four Memory Layers, Decision Intelligence vision) — the principles this evidence validates

---

*This document is confidentiality-safe by construction: no company, customer, project, or employee name, no SKU/part code, and no cost, price, discount, margin, or rate value from the source evidence appears above. It describes a generalized domain model and workflow, not a specific organization's commercial position.*

*Last updated: 2026-08-26*
