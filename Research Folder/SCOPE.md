# Vectoris — Scope of Work

*Companion to [README.md](./README.md), [DISCOVERY.md](./DISCOVERY.md), [THESIS.md](./THESIS.md), and [Call-Summary-Shubham-Singh.md](./Call-Summary-Shubham-Singh.md)*

> [!IMPORTANT]
> **This document is the canonical statement of long-term scope.** It describes the full system Vectoris could eventually become, organized into 15 workstreams, so that every narrower decision made elsewhere (which wedge to pick, what an MVP includes, what discovery script to run) can be checked against a single source of truth for "the whole map" without confusing the map for the current plan.
>
> **The end state is large. The first product must be small.** Nothing in this document authorizes building beyond the currently validated wedge — see [THESIS.md's Six Gates](./THESIS.md#exactly-what-to-target-first--six-gates) and the [H2 Gates](./THESIS.md#h2-gates--run-in-parallel-not-instead-of) for what is actually authorized right now. Section 24 below (Out of Scope Initially) and the existing Data Rights & Governance and "What NOT to Do Next" sections in README.md/THESIS.md remain fully in force and take precedence over the ambition expressed here whenever the two are in tension.

---

## 1. Project Overview

**Project Name:** Vectoris
**Category:** AI-Native Electrical / MEP Engineering, Estimation & Commercial Intelligence
**Current Stage:** Pre-product — customer discovery, workflow validation, and technical feasibility
**Initial Domain:** Electrical contractors, MEP contractors, system integrators, and technical-commercial engineering teams

Vectoris is intended to become an AI-native system for understanding electrical/MEP project requirements and progressively transforming them into **engineered solutions, complete product lists, cost estimates, ideal pricing, and final commercial proposals**.

The long-term system is envisioned as:

```text
Customer Requirement
        ↓
Project Understanding
        ↓
Engineering / Solution Design
        ↓
Quantity Takeoff
        ↓
Product / BOM / BOQ Generation
        ↓
Company Product Catalog
        ↓
Current Product Pricing
        ↓
Material + Labor Cost
        ↓
Project Cost Estimate
        ↓
Recommended / Ideal Bid Price
        ↓
Commercial Review
        ↓
Final Pricing & Proposal
        ↓
Project Outcome
        ↓
Historical Learning / Company Memory
```

The system will follow the principle:

> **AI proposes. The expert decides. The system remembers why.**

This is the same principle already stated in README.md's "Core principle (both)" line — this document does not introduce a new philosophy, only a fuller map of where H1 and H2 sit inside it.

The current project does not assume that every stage above should be built immediately. The first objective is to identify and validate the most valuable entry point into this workflow.

---

## 2. Primary Objective

The objective of Vectoris is to determine, validate, and eventually automate the highest-value parts of electrical/MEP technical-commercial work.

The platform should ultimately help an organization answer:

> **What does this project require? What should we build/sell? Which products should be used? How much will it cost? What should we bid? How should we present the final proposal?**

The system should reduce repetitive engineering and estimating work without removing human accountability.

---

## 3. Core Product Vision

Vectoris is intended to become a **commercial engineering intelligence system** rather than a simple AI takeoff tool. The long-term product combines: Project Understanding, Engineering Intelligence, Quantity Intelligence, Product Intelligence, Pricing Intelligence, Commercial Intelligence, and Proposal Generation. Each is described in the corresponding workstream below (Sections 8–19).

---

## 4. Initial Product Hypotheses

Vectoris currently evaluates two primary entry hypotheses — unchanged from README.md and THESIS.md:

- **H1 — AI Electrical Takeoff:** Drawing → AI Detection → Quantity Takeoff → Human Verification → Approved Takeoff. Core question: *how much electrical material/components are actually required?* Crowded market (Quotr.ai, BuildVision AI, Countfire, Beam AI, Bobyard, Togal.AI) — see [README.md Competitive Landscape](./README.md#competitive-landscape).
- **H2 — AI Solution / Quotation Engineer:** Customer Requirement → Requirement Understanding → Product Selection → Engineering Configuration → BOQ → Pricing → Techno-Commercial Proposal → Human Review. Core question: *what should we sell the customer, and how can we produce a technically correct commercial proposal faster?* Surfaced by one discovery call, graded Weak-to-Medium — see [Call-Summary-Shubham-Singh.md](./Call-Summary-Shubham-Singh.md) and [THESIS.md's H2 section](./THESIS.md#h2--ai-native-techno-commercial-engineering-competitive-reality-cpq).

**H1 and H2 are two of many possible wedges into the larger workstream map below (Section 5), not the only two under consideration.** Neither is more "official" than the other; both remain unvalidated per the Gates in THESIS.md.

---

## 5. Strategic Direction

The company will not position itself as "another AI takeoff tool" or "another generic CPQ platform." The strategic objective is to identify a narrow, defensible problem inside the larger workflow.

**Potential wedges (expanded set — beyond H1/H2):**

| Candidate wedge | Status |
|---|---|
| Electrical takeoff (H1) | Scripted, scored — see THESIS.md |
| AI Solution / Quotation Engineer (H2) | Scripted, scored — see THESIS.md |
| Revision & Addenda Intelligence | Scripted, but **downgraded following an Aug 22, 2026 competitive research refresh** — Beam AI and Countfire both now ship automated revision/addenda delta detection, contradicting the wedge's original "weak competitor execution" rationale. Not dead, but no longer the clean opportunity it was described as. See [THESIS.md's Market Update](./THESIS.md#market-update--research-refresh-aug-22-2026) and its [revised wedge section](./THESIS.md#alternative-wedge-under-consideration-revision--addenda-intelligence). |
| Post-takeoff assembly mapping | Not yet scripted — see Section 6 below |
| Engineering constraint intelligence | Not yet scripted — see Workstream 5 |
| Cross-OEM solution configuration | Partially covered by H2 script (H2-3, H2-4) |
| BOQ generation | Covered only as a downstream output of H1/H2, not tested standalone |
| Product selection | Not yet scripted |
| Pricing intelligence | Touched by H1 Discovery §6 and H2 Discovery §H2-4, not a standalone wedge test |
| Bid pricing optimization | Not yet scripted; explicitly deferred — see Workstream 11 |
| Proposal QA | Not yet scripted |

The final wedge will be selected using customer evidence, technical feasibility, competitive analysis, and willingness-to-pay signals — via the Gates process in THESIS.md, not by this document.

---

## 6. Workstream 1 — Customer Discovery

**Objective:** Understand how real electrical/MEP organizations transform requirements into bids and proposals.

**H1 target users:** Electrical estimators, electrical contractors, MEP estimators, estimating managers, project estimators. **H2 target users:** System integrators, MEP contractors, data-center integrators, electrical solution providers, technical-commercial teams. The Schneider interview specifically suggested system integrators as a potential H2 target because they may combine multiple OEM product lines into one offer — this is a hypothesis requiring direct validation, not yet confirmed (see [Call-Summary-Shubham-Singh.md](./Call-Summary-Shubham-Singh.md)).

For every interview, capture: workflow, tools, time spent, manual steps, decision points, errors, existing automation, existing software, current pricing processes, product-selection processes, revision handling, customer requirements, approval workflows, willingness to pay.

The concrete H1 and H2 interview guides that implement this workstream live in [DISCOVERY.md](./DISCOVERY.md). **The candidate wedges in Section 5 above that are not yet scripted (post-takeoff assembly mapping, engineering constraint intelligence, product selection, proposal QA) do not yet have discovery questions.** Adding them is a prerequisite before treating those wedges as tested, not just theorized.

---

## 7. Workstream 2 — Workflow Mapping

```text
Requirement / Drawings Received → Document Review → Scope Understanding → Engineering / Solution Design
→ Takeoff → Revision / Addenda Reconciliation → Product Selection → BOQ / BOM → Material Mapping
→ Pricing → Labor → Cost Calculation → Margin / Commercial Review → Approval → Final Proposal → Customer
```

For each stage: human vs. automated, software used, time required, decision points, inputs, outputs, errors, rework, dependencies, pain level. The goal is to identify the **highest-value bottleneck**, not assume the longest task is the most valuable problem — consistent with the Schneider session's actual finding that solution assembly (2-3 days) and negotiation/approval (~1 week) turned out to be two structurally different bottlenecks (see [Call-Summary-Shubham-Singh.md](./Call-Summary-Shubham-Singh.md#the-two-time-estimates-and-why-theyre-different-problems)).

---

## 8. Workstream 3 — Project & Drawing Intelligence

Document ingestion (PDF, CAD-derived documents, specifications, BOQs, schedules, RFP/RFQ documents, existing quotations), sheet understanding (classification, indexing, plan identification, schedule/legend extraction, cross-reference mapping), and drawing understanding (symbols, equipment, panels, fixtures, receptacles, switches, other validated component types). Every AI decision must be traceable to its source — this is already README.md's non-negotiable auditability requirement, applied here at the workstream level.

**Expanded following the Historical BOQ Evidence review (Aug 2026) — see [README.md](./README.md#historical-boq-evidence--aug-2026):** this workstream also covers understanding that isn't purely visual/drawing-based, since the input to the system may be a drawing package, a finished BOQ, a specification, or an RFP/RFQ rather than only a drawing:

- **Project classification** — what kind of project is this (data center, PAC/HVAC, general electrical), at the level of confidence the input documents actually support
- **Scope classification** — which parts of a larger project this specific document set covers
- **System identification** — which systems are in scope (UPS, cooling, power distribution, etc.)
- **Equipment/application relationships** — what a component is *for*, not just what it is (the same relationship the Emerson BOQ's line-item descriptions already encode)
- **BOQ structure recognition** — parsing an existing BOQ's own category/line-item/quantity/UOM structure when a BOQ is the input rather than the output
- **UOM recognition** — normalizing and validating units of measure across documents and sources
- **Engineering line-item extraction** — pulling a structured line item (item, spec, quantity, UOM, application) out of unstructured or semi-structured source text

**Status:** these capabilities are conceptual additions to the long-term workstream map, not new MVP scope — see [Section 24](#24-out-of-scope-initially) and README.md's Initial Wedge for what's currently authorized.

---

## 9. Workstream 4 — Revision & Addenda Intelligence

```text
Revision A + Revision B → Semantic Difference Detection → Affected Sheets → Changed Components
→ Quantity Delta → Cost Impact
```

This is the same candidate wedge already documented in THESIS.md and scripted in DISCOVERY.md §5 — this workstream entry does not add new scope, it confirms the existing wedge fits inside the larger map.

---

## 10. Workstream 5 — Engineering & Solution Intelligence

Transform a requirement (e.g., 2MW data center, N+1 UPS, specified redundancy, cooling and voltage requirements, space constraints) into engineering constraints → compatible system architecture → components → BOQ. Understanding relationships such as capacity, redundancy, electrical ratings, equipment dependencies, panel/breaker compatibility, cooling coupling, system architecture, vendor compatibility. **Future scope only** — developed after the underlying workflow is validated, not before.

**Bidirectional framing, following the decided H1/H2 merge:** the diagram above describes the H2 ("Requirement Path") direction only. The same engineering-interpretation logic is also needed in the opposite (H1, "Drawing Path") direction — this is now a settled part of the merged pipeline, not a proposal — see [THESIS.md's Modified H1/H2 Relationship](./THESIS.md#modified-h1h2-relationship) for the full diagram and what remains to be validated at the market-evidence level:

```text
Requirement → Engineering Constraints → Architecture → Components → BOQ
                                                              ↑
                          Drawing → Observed Component → Application/System → Engineering Interpretation → Required Product/Material
```

Both directions feed the same downstream BOQ/pricing pipeline — this is the decided system shape. **What is not validated by any customer evidence is the market case for each stage** — the merge decision does not, by itself, authorize building beyond what's currently in scope; see [Section 24](#24-out-of-scope-initially).

**Application & Context Mapping** *(named capability, future scope)* — the specific sub-capability both directions above depend on: resolving a raw component or requirement down to why it's included.

```text
Component → System → Application → Location/Equipment → Reason for inclusion
```

Example, drawn directly from the Emerson BOQ: a `4C x 16 sq.mm cable` line item resolves to the `PAC system`, serving `power supply`, for an `indoor → outdoor unit` connection. This relationship — not a bare product/quantity pair — is what a finished, commercially useful BOQ line item actually contains; see [README.md's Historical BOQ Evidence](./README.md#historical-boq-evidence--aug-2026) and its downstream worked example.

---

## 11. Workstream 6 — Cross-OEM Product Intelligence

For system integrators: understanding multiple manufacturers simultaneously — product matching, approved alternatives, equivalent-product discovery, compatibility validation, multi-vendor BOQ, cross-OEM engineering rules. **Critical distinction, already established in THESIS.md's H2 section:** this is *not* generic CPQ. Existing CPQ platforms already handle generalized configuration and pricing (Salesforce, SAP, Oracle, Tacton, servicepath). The hypothesis is that electrical/MEP-specific engineering logic and cross-OEM reconciliation is the narrower, potentially-open gap — see [THESIS.md's H2 Competitive Reality](./THESIS.md#h2--ai-native-techno-commercial-engineering-competitive-reality-cpq).

---

## 12. Workstream 7 — Product Catalog Intelligence

Map required components to the company's actual product portfolio: product family, model number, SKU, specifications, ratings, approved alternatives, availability, manufacturer, compatibility, product revision, commercial status. Goal: **Requirement → Engineering Component → Actual Company Product.**

---

## 13. Workstream 8 — BOQ / BOM Generation

Produce a structured project product list (category, product, model, quantity, vendor), with every line retaining a connection to requirement, drawing, engineering decision, product catalog, quantity, and pricing source — an extension of the existing MVP Data Model's evidence-linking principle in README.md.

**Expanded BOQ line-item semantics, following the Historical BOQ Evidence review:** a finished, commercially useful BOQ line (per the GB 300 and Emerson BOQs) carries more than category/product/model/quantity/vendor. The long-term target line shape is:

Item/category · Description · Specification · Application · Where used · System/subsystem · Quantity · UOM · Product/model/SKU · Manufacturer/vendor · Source drawing/document · Engineering basis · Pricing source · Price validity/date · Human approval status

This is the same list as README.md's [Canonical Line-Item Data Model](./README.md#mvp-data-model) at the BOQ-output level specifically. It is a target schema for this workstream, not current MVP scope.

---

## 14. Workstream 9 — Pricing Intelligence

Inputs: current product price lists, supplier quotations, internal price books, approved discounts, historical transactions, vendor-specific prices, labor rates, currency, taxes, commercial rules.

**Architectural principle (already established in README.md's Four Memory Layers):** current prices must be retrieved from authoritative data sources rather than assumed by the AI model. This document does not relax that rule — volatile pricing data still belongs in the retrieval layer, never in model weights.

**Pricing is contextual, not a single lookup.** Added following the Historical BOQ Evidence review — the BOQs prove line items carry quantities, specifications, and UOMs; they do **not** prove how a company actually determines a current selling price. Treat the formula below as a data requirement to investigate in discovery, not an established fact:

```text
Company + Project Type + Project Scope + Product + Quantity + Current Price Source + Commercial Rules
    ↓
Applicable Price
```

This workstream must also keep three distinct concepts separate, since conflating them is an architectural error of the same kind as baking volatile pricing into model weights:

- **Current authoritative price** — what a supplier or internal price book says right now
- **Historical price** — what was charged or quoted previously, useful for trend/anomaly detection only
- **Recommended commercial price** — an output of Workstream 11 (Ideal Bid Pricing), not a fact retrieved from a source

---

## 15. Workstream 10 — Cost Estimation

Material cost = Product Quantity × Current Unit Price. Labor cost = Labor Units × Labor Rate. Additional cost potentially includes installation, logistics, engineering, testing, commissioning, overhead. Output: **Total Estimated Project Cost.**

---

## 16. Workstream 11 — Ideal Bid Pricing

Recommended Bid Price = Estimated Cost + Target Margin + Commercial Factors + Historical Data + Customer/Market Context.

> [!CAUTION]
> The system must **not** autonomously decide a final commercial price. The recommended price must remain explainable, adjustable, rule-based where appropriate, and human-approved. The architecture must distinguish deterministic financial calculation from AI reasoning — this is a hard rule, not a style preference, and mirrors the existing prohibition on autonomous pricing decisions in Section 24 below.

---

## 17. Workstream 12 — Commercial Intelligence

Future scenario analysis (margin sensitivity), pricing risk (stale supplier prices), historical comparison (typical margin ranges for similar projects), cost anomaly detection, and win/loss intelligence. **Long-term scope, not MVP requirements** — do not build ahead of the validated wedge.

---

## 18. Workstream 13 — Proposal Generation

Technical summary, BOQ, commercial summary, pricing, assumptions, exclusions, scope, validity, delivery information, customer proposal. Remains subject to human review and approval at every stage.

---

## 19. Workstream 14 — Human-in-the-Loop Control

**AI proposes → expert verifies → system records the decision.** Humans retain control over engineering approval, product selection, quantity corrections, pricing, margin, compliance, and the final proposal. The system must never represent an AI-generated engineering or commercial decision as automatically authoritative. This restates README.md's existing "Transparency & Auditability by Design" section as a cross-workstream rule, not a new one.

---

## 20. Workstream 15 — Company Memory

Preferred products/manufacturers, naming conventions, material mappings, labor assumptions, common assemblies, historical project decisions, approved substitutions, recurring configurations, pricing patterns, estimating behavior. Long-term goal: Vectoris learns how the company thinks about engineering and commercial decisions.

> [!CAUTION]
> This is a hypothesis for defensibility, not a current moat — identical framing to README.md's Strategic Moat Hypothesis. The four moat conditions there (legal, signal quality, measurable improvement, reproduction cost) apply unchanged. Countfire's ~10 years without demonstrated category dominance remains the live counter-evidence.

---

## 21. Data & Learning Architecture

```text
AI Prediction → Human Decision → Correction / Approval → Structured Record → Validation
→ Learning Candidate → Offline Evaluation → Improved Model / Rules
```

A correction does not automatically become training data — it must first be attributed and validated. This is the same pipeline already specified in README.md's MVP Data Model section (`Raw correction → Attribution → Validation → Training candidate → Offline evaluation → Model version → Shadow evaluation → Production`); this document does not change it.

---

## 22. Technical Development Phases

| Phase | Description |
|---|---|
| **Phase 0 — Discovery** | Customer interviews, workflow observation, competitive analysis, problem selection, evidence ledger |
| **Phase 1 — Wedge Validation** | Select the highest-value unresolved workflow |
| **Phase 2 — Technical Spike** | Build the smallest possible prototype |
| **Phase 3 — Real-World Pilot** | Use authorized real customer inputs |
| **Phase 4 — Paid Pilot** | Demonstrate measurable economic value |
| **Phase 5 — MVP** | Build production-quality software around the validated workflow |
| **Phase 6 — Expansion** | Expand into adjacent stages only after the preceding workflow proves value |

> [!NOTE]
> **Reconciling with existing frameworks:** README.md's "Technical Roadmap" (Stage 0–6) and THESIS.md's "Six Gates" (Gate 1–6) are the operational versions of Phases 0–2 above, already in motion for H1 and H2 specifically. This Phase table is the general-purpose version that would apply to *any* wedge from Section 5, including the ones not yet scripted. It does not replace the Gates — passing a Gate is how a wedge is confirmed to have earned progression from one Phase to the next.

---

## 23. Proposed Product Evolution

```text
                    Vectoris
                       │
                       ▼
              Project Understanding
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
      Drawing Path              Requirement Path
          │                         │
       Takeoff                  Solution Design
          │                         │
       Revisions                 Product Selection
          │                         │
          └────────────┬────────────┘
                       ▼
                     BOQ
                       │
                       ▼
                 Current Pricing
                       │
                       ▼
                 Cost Estimate
                       │
                       ▼
                Ideal Bid Price
                       │
                       ▼
               Final Proposal
                       │
                       ▼
                Project Outcome
                       │
                       ▼
              Company Intelligence
```

This diagram shows how the H1 ("Drawing Path") and H2 ("Requirement Path") hypotheses already documented elsewhere are expected to eventually converge on the same downstream pipeline (BOQ → Pricing → Cost Estimate → Bid Price → Proposal) — they are not, in the long run, mutually exclusive bets, even though only one should be built first.

---

## 24. Out of Scope Initially

Explicitly **not** initial MVP scope, for either H1 or H2 or any other wedge:

Full MEP platform · HVAC · Plumbing · Full ERP · CRM · Procurement marketplace · Accounting · Generic CPQ · Autonomous engineering approval · Autonomous pricing decisions · Full negotiation automation · Full supplier marketplace · Conduit/wire estimation without validation · Complete project-management suite.

> [!IMPORTANT]
> This list is broader than, and supersedes for planning purposes, the H1-specific "Explicitly out of scope" list already in README.md — that list remains correct for H1 specifically; this one applies company-wide, across every wedge in Section 5. **The project must avoid becoming a giant construction ERP before the initial wedge is proven.**

---

## 25. Success Criteria

- **Customer Value:** A real customer reports that this significantly reduces the time or effort required for the workflow.
- **Technical Value:** The system performs the target task accurately enough that human verification is still faster than doing the task manually.
- **Economic Value:** The customer can quantify time saved, labor saved, more bids handled, fewer errors, better margins, faster proposal turnaround.
- **Commercial Value:** A real company pays to continue using it.

These map directly onto README.md's existing "Success Definition" (Levels 1–4) and THESIS.md's Gates — this section restates the same bar in plain language, it does not lower it.

---

## 26. Core Metrics

**Workflow:** time to approved takeoff, time to configured solution, time to BOQ, time to estimate, time to final proposal.
**Accuracy:** detection precision/recall, configuration correctness, compliance errors, false positives, human correction rate.
**Commercial:** paid pilots, conversion, retention, revenue per customer, projects processed.
**Learning:** improvement from historical corrections, contractor-specific accuracy, reduction in correction rate, decision consistency.

These extend, but do not replace, README.md's existing Product Metrics and Adoption Metrics sections, which remain the primary MVP-stage metrics for whichever wedge is currently being validated.

---

## 27. Fundamental Product Principle

Vectoris should not aim to make engineers unnecessary. It should make their expertise **more leveraged**.

```text
Before: Expert spends most of their time doing repetitive work.
After:  AI handles repetitive work. Expert focuses on exceptions,
        engineering judgment, commercial strategy, and final approval.
```

---

## 28. Final Scope

> **To build an AI-native electrical/MEP engineering and commercial intelligence system that understands project requirements, interprets technical documentation, generates and validates quantities, selects appropriate products, assembles BOQs, retrieves current company pricing, calculates project cost, recommends commercially viable bid pricing, generates final proposals, and continuously learns from the organization's approved engineering and commercial decisions.**

But the company will **not** build this entire system at once. The immediate work is to discover the **one narrow workflow that customers urgently need**, prove it technically, prove it economically, and then expand from that wedge until the complete system becomes justified.

> [!IMPORTANT]
> **The end state is large. The first product must be small.** Every other document in this project — README.md, DISCOVERY.md, THESIS.md — operates under this constraint. Nothing in this document changes what is currently authorized to be built: that remains whatever has passed its Gate in THESIS.md, currently nothing beyond discovery and technical spikes for H1, and beyond a single discovery call for H2.

---

*Part of the Vectoris source-of-truth documentation.*
*Created: 2026-08-22 — canonical Scope of Work, reconciling the 15-workstream long-term system map with the existing H1/H2 discovery, thesis, and evidence discipline already in place.*
*Updated: 2026-08-22 (same day) — expanded Workstreams 3, 5, 8, and 9 following the Historical BOQ Evidence review (GB 300, Emerson), adding project/scope classification, a named Application & Context Mapping capability, expanded BOQ line-item semantics, and the current/historical/recommended price distinction. All additions are long-term workstream scope, not new MVP authorization.*
*Decision recorded 2026-08-22 (same day): Workstream 5's bidirectional (H1 + H2) framing reflects the founder's decision that H1 and H2 are merging into one pipeline — see [THESIS.md's Modified H1/H2 Relationship](./THESIS.md#modified-h1h2-relationship). This is a settled architecture, not a proposal; it does not expand current MVP authorization (Section 24).*
