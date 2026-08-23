# Vectoris — Honest Thesis Assessment

*Companion to [README.md](./README.md), [DISCOVERY.md](./DISCOVERY.md), and [SCOPE.md](./SCOPE.md)*

*This document records a direct, unvarnished evaluation of this startup idea's strength, weaknesses, competitive threats, and what must happen next. Update it as evidence arrives.*

> [!WARNING]
> **H1 and H2 have merged into one pipeline (decided, Aug 2026) — see [Modified H1/H2 Relationship](#modified-h1h2-relationship) below.** They are assessed individually in this document because their market evidence is still separate and at very different strengths, not because they are competing products anymore. H1 (electrical takeoff) is fully assessed below as originally scoped. H2 (AI Solution/Quotation Engineer — "AI-native techno-commercial engineering") was surfaced by a single discovery call and is assessed in its own section below. H2's stages rest on meaningfully thinner evidence than H1's did even at H1's most contested — treat the evidence gap between the two as a reason for sequencing caution on H2's stages specifically, not as a reason to question the merge decision itself.

> [!WARNING]
> ## Market Update — Research Refresh (Aug 22, 2026)
> A live web check of the competitive landscape turned up four material developments not reflected elsewhere in this document until now. **The most important one directly weakens this document's own prior "best bet" (Revision & Addenda Intelligence).** Listed in order of impact:
>
> 1. **Beam AI now ships an automated "Addendum Variance Report."** Per Beam AI's own product pages (ibeam.ai, Aug 2026), the platform auto-detects changes across addenda/revisions and produces a structured variance report of quantity changes and new items — not the "simple pixel/vector overlay" this document previously characterized as the competitive baseline. Countfire's product pages also advertise automatic comparison between drawing/spec versions. **This directly contradicts the "Weak Competitor Execution" pillar of the Revision & Addenda wedge case below — that pillar is now false as stated and the section has been revised accordingly.**
> 2. **Countfire was acquired by Valsoft (via its TAG Software Group subsidiary) in June 2026** — a 800+-customer, 5-country business, per Valsoft's press release and Vista Point Advisors' deal announcement. Countfire is no longer an independently-operating bootstrapped company; it is now part of a serial vertical-market-software acquirer with a buy-and-hold-forever operating model (comparable to Constellation Software). This changes how to read the "Countfire as natural experiment for the learning hypothesis" argument — see the Learning Hypothesis discussion below.
> 3. **A previously undocumented direct competitor: Drawer.AI** (Austin, TX; founded 2021; ~$5M raised, per Crunchbase/PitchBook-style aggregator data) — electrical-specific takeoff software that also performs automated conduit/branch routing, wire sizing, and voltage-drop calculations, exporting to a coordination-ready Revit model. This directly contradicts this document's own Technical Feasibility Assessment, which rated conduit/wire estimation "Low" feasibility and instructed the team not to promise it. Someone is already shipping it, on a modest funding base. Added to the competitive tables in README.md.
> 4. **Quotr.ai has pivoted part of its positioning toward a procurement/marketplace wedge** — factory-direct material sourcing across a claimed 220+ vetted factories at 40–50% below retail — plus an AI drawing-chat agent, per Quotr's own blog (Jun 2026). This is a different differentiation strategy than pure takeoff+review accuracy, worth tracking since it changes what "beating Quotr" would require.
> 5. **servicepath, the closest AI-native CPQ analog cited for H2, is now Gartner's "Sole Visionary" in the 2026 CPQ Magic Quadrant**, explicitly serving systems integrators and VARs, in a CPQ market sized at ~$5.8B growing ~16% CAGR (Gartner/MGI Research, per servicepath's own site, Feb 2026). This reinforces — does not weaken — this document's existing conclusion that H2 is not whitespace.
>
> **Net effect on the previous recommendation:** the case made in the prior conversation turn — that Revision & Addenda Intelligence was "the best bet" among the candidate wedges — does not survive this research. It is downgraded below. No new "best bet" is substituted without evidence; the honest updated position is that *every currently-scripted wedge (H1 standalone, H2 as broad CPQ, and Revision/Addenda) is more contested than this document previously stated*, which argues for narrower differentiation and more discovery before committing, not for picking a different single wedge on the strength of desk research alone.

> [!CAUTION]
> **[SCOPE.md](./SCOPE.md) now documents a 15-workstream long-term system** — engineering intelligence, cross-OEM configuration, pricing intelligence, ideal bid pricing, proposal generation, company memory, and more. That document is explicit that "the end state is large, the first product must be small," but its sheer scope is itself a risk: the more impressive the full map looks, the easier it is to unconsciously start building toward it before any wedge has passed its Gates. Every scorecard, gate, and "what NOT to do" item below applies with equal force regardless of how much larger SCOPE.md makes the destination look.

---

## Why the Thesis Is Plausible

**The underlying problem category appears economically significant — the severity of unresolved pain for the specific target customer remains to be validated.**
Estimating errors don't just waste time — they directly destroy project margins on jobs already won. A bad takeoff can turn a profitable bid into a loss. That the *category* of problem is real and economically painful is widely corroborated. Whether our specific target customer (small and mid-sized electrical subcontractors) experiences it as *sufficiently large and currently unresolved by existing tools* is the central question customer discovery must answer.

**The labor shortage is a structural tailwind.**
The U.S. electrical trade needs ~80,000 new electricians per year, but retirements consistently outpace new entrants. ~41% of the construction workforce retires by 2031. Experienced estimator time is becoming scarcer and more expensive.

**The human-in-the-loop design is table stakes, not differentiation.**
The #1 reason AI fails in construction is trust. Contractors will not use an unverified black box for financially critical bids. A system that shows its work, links detections to source drawings, and lets the estimator review and correct is the non-negotiable entry bar for this category.

**The wedge is sharp and testable.**
"Electrical quantity takeoff only" (or alternatively "Revision & Addenda Intelligence") is a specific, bounded, technically measurable problem that can be tested in weeks rather than years.

**The learning system hypothesis is unproven and challenged by historical analogs.**
If verified corrections, approved takeoffs, and contractor-specific estimating data can be accumulated and used to measurably improve the system, that could create defensibility. However, Countfire operated an electrical-specific learning takeoff tool independently for ~10 years without achieving category dominance — and was acquired by Valsoft (TAG Software Group) in June 2026, a serial vertical-market-software consolidator, rather than growing into a dominant standalone platform or an outsized VC-scale outcome. **This is genuinely ambiguous evidence, not a clean kill signal either way:** an 800+-customer, 5-country acquisition is a real, durable outcome that validates the underlying category is commercially viable — but it is also consistent with "learning from corrections" not being the compounding moat the docs originally hypothesized, since a true runaway data-moat business would be a more likely candidate for a large standalone raise or IPO than a roll-up acquisition. Treat the acquisition as inconclusive on the learning-moat question specifically, while treating it as mild positive evidence that the broader takeoff-software category itself has real revenue and exit value.

**Founder-market access is a genuine edge.**
Direct access to real contractors through an existing industry network is rare at this stage. It gets you in the room for discovery.

---

## Historical BOQ Evidence — Initial Observation

> [!CAUTION]
> Two historical BOQs (GB 300 — data-center electrical/infrastructure; Emerson Climate Technologies, Noida — PAC/HVAC precision cooling) have been reviewed as workflow evidence, not customer-validation evidence. The split below follows the same discipline as every other evidence claim in this document: what the documents actually show, versus what they do not establish about the market. See [README.md's Historical BOQ Evidence section](./README.md#historical-boq-evidence--aug-2026) for the fuller writeup and the observed-patterns list.

**Observed:**
- Data-center electrical/infrastructure work appears in the GB 300 BOQ.
- PAC/precision cooling infrastructure appears in the Emerson BOQ.
- Both BOQs contain detailed specifications, units of measure, quantities, and application-specific descriptions rather than bare product names — e.g., a cable line item described by its role ("PAC unit power supply, indoor → outdoor connection"), not just its gauge.
- Both BOQs combine material, accessory, fabrication, and installation/testing/commissioning line items in a single structure.
- Some line items encode a relationship between a system and an application (what the item is *for*), not merely a standalone product and quantity — this is the concrete artifact behind the "Application/Where Used" concept discussed in README.md's updated MVP Data Model and SCOPE.md's Workstream 5 and 8.

**Not established:**
- That data-center and PAC/HVAC infrastructure are the dominant project types Vectoris should build for — two documents are not a market sample.
- That every target customer's workflow produces BOQs with this same structure or level of application detail.
- That pricing, rather than solution assembly or product selection, is the primary bottleneck — the BOQs show *what* a finished output looks like, not *where the time went* to produce it.
- That AI product selection is the primary bottleneck, or any bottleneck at all — same limitation as above.
- That customers would pay for automated BOQ generation specifically, as opposed to some other step in the pipeline.
- That historical BOQ structure of this kind is representative across companies, industries, or project sizes.

**Why this matters for discovery, not just architecture:** these two documents are the first artifacts that let the team observe a finished *output* independent of anyone's self-report about the process. The next round of interviews should ask directly to see a comparable artifact (see the new BOQ-mapping questions in [DISCOVERY.md](./DISCOVERY.md#h1-post-takeoff--boq-mapping)) so that self-reported bottleneck claims can be checked against what the actual finished work product contains.

---

## Modified H1/H2 Relationship

> [!IMPORTANT]
> **This is a decided architecture, not a hypothesis.** Following the Historical BOQ Evidence above, the founder has decided that H1 and H2 are merging into one pipeline with two entry points. This is settled at the architecture level. It does **not** change what is currently authorized to *build* (see [README.md's Initial Wedge](./README.md#initial-wedge--what-we-are-not-building) and the Gates below, which remain unchanged), and it does **not** validate either entry point's market evidence — that discipline still applies in full. What it does resolve is the standing question of whether H1 and H2 are competing bets or one pipeline: they are one pipeline.

The original framing treated H1 (drawing → takeoff) and H2 (requirement → configured solution → proposal) as two independent, competing entry points. The historical BOQs are the evidence that prompted the decision below: H1 and H2 are two **entry points into the same downstream pipeline**, not mutually exclusive product bets — a drawing-derived line item and a requirement-derived line item converge on the same structure once they reach "application," "product selection," and "BOQ."

```text
H1 (Drawing Intelligence)
Drawing
  ↓
Takeoff
  ↓
Line Items
  ↓
          ┌───────────────────┐
          │  Project Context   │
          │  Engineering Logic │
          │  Application       │
          └─────────┬──────────┘
                     ↓
H2 (Engineering & Commercial Intelligence)
Product Selection
  ↓
BOQ
  ↓
Pricing
  ↓
Cost
  ↓
Proposal
```

**What this decision means:** the "Application/Where Used" mapping step (README.md's updated example — a power cable line item resolving to "PAC unit power supply, indoor → outdoor connection") is not H2-specific. It is the same enrichment step whether the line item originated from a drawing detection (H1) or a customer requirement (H2). H1-vs-H2 is now a choice of *entry point* into one pipeline, not a choice of *product*.

**What this decision explicitly does not do:**
- It does not imply H1's MVP should expand to include this enrichment step now — README.md's out-of-scope list (pricing, labor mapping, assembly intelligence) still applies. The merge is architectural; MVP scope is unchanged.
- It does not imply H2's stages are validated, narrower, or safer to build than the Gates in this document already say. H2's own evidence is still Weak-to-Medium, and Gate H2-1 through H2-4 still gate whether or when its stages get built.
- It does not resolve whether the "Application/Where Used" step is itself a valuable bottleneck worth building soon, only that it exists as an artifact in both historical BOQs and now has a defined place in the merged pipeline.

**What discovery still needs to establish:** whether customers actually experience takeoff and solution-assembly as connected steps in one workflow, and — now that the pipeline shape is fixed — which stage of it is the highest-value place to build next. This is folded into Gate 2 below.

---

## The Competitive Reality

> [!WARNING]
> The competitive window is far tighter than originally assumed. The "AI takeoff + human review" pattern is not an emerging opportunity — it is already in production across multiple funded competitors.

| Competitor | Funding / Stage | Capabilities & Positioning | Why they matter |
|-----------|-----------------|---------------------------|----------------|
| **Countfire** | **Acquired by Valsoft/TAG Software Group, June 2026** (was bootstrapped, ~10 yrs prior) | Electrical-specialized takeoff; automatic symbol selection; automatic spec/version comparison; claims "estimates that learn how you work"; 800+ customers, 5 countries | **Most important analog, updated.** Closest live test of the learning hypothesis. Ambiguous outcome: real, durable exit via consolidator acquisition (not runaway standalone growth) — see Learning Hypothesis discussion above. |
| **Quotr.ai** | Seed-stage | Electrical-specific symbology, confidence scoring, contractor price books, labor rates, review workflow | **Most direct competitor.** Explicitly running the AI takeoff + estimator review + price book playbook ($299.90–$499.90/mo). |
| **Beam AI** | **$48.5M raised** ($30.5M Series B Nov 2025) | AI + human expert review, claims +/-1% accuracy; expanding from takeoff into estimating & bid intelligence | **Massive capital & roadmap threat.** 1,100+ customers generating correction data; building Stage 4–5 today. |
| **BuildVision AI** *(buildvisionai.com)* | Seed-stage SaaS | Plan-linked AI takeoff, estimator review, quote generation, electrical workflows | Already shipping the full takeoff-to-quote workflow pattern ($299–$499/mo). *(Note: distinct from buildvision.io procurement platform).* |
| **Bobyard** | **$35M Series A** | Fast AI auto-count for multi-trade takeoff | Low-cost entry barrier (from ~$35/mo) putting downward pressure on basic symbol counting. |
| **Togal.AI** | Funded ($3.5M+) | AI symbol auto-count, drawing comparison, natural language queries | Well-known brand among GCs and multi-trade subcontractors ($199–$299/user/mo). |
| **STACK** | Established platform | Floor Plan AI + conversational AI; full takeoff & estimating suite | Broad distribution and existing customer lock-in across subcontractors. |
| **ConEst** | Incumbent | 140,000+ electrical items, 500,000+ assemblies, decades of pricing/labor data | Industry standard database depth; impossible to out-database. |
| **Drawer.AI** *(new, added Aug 2026)* | Seed (~$5M raised); founded 2021, Austin TX | Electrical-specific symbol/tag detection linked to panel schedules; **automated branch/conduit routing with wire sizing and voltage-drop calculations**; exports to a coordination-ready Revit model | **Most direct threat to any "conduit/wire is a future differentiator" argument.** Proves the hardest technical problem in Vectoris's own feasibility table is already being solved by a modestly-funded, narrowly-focused competitor. |

**The Brutal Truth:**

"AI takeoff + human review" is the current baseline. Entering with that exact pitch means competing on feature parity against competitors with millions in venture funding, established customer bases, and years of head start.

The remaining open space:
1. Deeper electrical-specific interpretation on real, messy contractor scans where competitors drop below 85% accuracy
2. Workflow-specific wedges (like Revision / Addenda reconciliation) that competitors handle poorly
3. Embedded workflow integrations that augment existing software rather than demanding full migration

---

## Alternative Wedge Under Consideration: Revision & Addenda Intelligence

> [!WARNING]
> **This section has been downgraded following the Aug 22, 2026 research refresh above.** This wedge was previously framed as a superior, less-contested alternative to standalone takeoff. That framing rested substantially on pillar 3 below ("Weak Competitor Execution"), which is now demonstrably false: Beam AI ships a structured, automated Addendum Variance Report today, and Countfire advertises automatic spec/drawing-version comparison. The wedge is not dead — but it is no longer the clean, under-defended opportunity this document previously described it as, and it should not be treated as "the answer" without discovery evidence that specifically probes why estimators would prefer Vectoris's version over what Beam AI and Countfire already ship.

### Why This Was Considered a Superior Wedge (Original Case):

1. **A Workflow Problem, Not a Pure Vision Problem:**
   - Counting symbols is increasingly commoditized by general foundation models.
   - Reconciling what changed across 50 revised sheets during an active 3-week bid is a complex, workflow-heavy spatial and scoping problem that general vision models cannot solve out of the box.
2. **High Severity / Urgent Pain:**
   - Addenda arrive mid-bid under tight deadlines. Missing a revised light fixture schedule or re-routed feeder line directly destroys project margin.
3. ~~**Weak Competitor Execution:**~~ **[Retracted — see warning above.]**
   - ~~Existing tools offer simple pixel/vector overlay (turning old blue, new red). They rarely extract structured delta quantities.~~ Beam AI's Addendum Variance Report and Countfire's automatic spec comparison both claim to do close to exactly this (auto-detect changes, surface quantity deltas, resubmit an updated bid-ready takeoff). Whether their execution is actually *good* — accurate, fast, trustworthy on messy real drawings — is untested by this team and is now the real open question, not whether the feature category exists.
4. **Faster Time-to-Value:**
   - An estimator who won't trust an AI to count their entire building from scratch *will* eagerly use a tool to catch what changed in Addendum #3 — this pillar still stands; it just no longer implies Vectoris would be first, or the only option, to offer it.

### What Remains Potentially Defensible

If Revision & Addenda Intelligence is still pursued, the surviving rationale is narrower than before: not "nobody does this," but a claim that **Vectoris could do it meaningfully better or faster on messy, real (non-Beam-customer) contractor drawings, or embedded inside a different workflow** (e.g., real-time same-session detection rather than Beam AI's 24–72 hour done-for-you turnaround). That is now the specific, falsifiable claim discovery must test — not the existence of the feature category.

**Experimentation in Discovery:** Ask dedicated revision questions (see [DISCOVERY.md](./DISCOVERY.md#5--revisions-and-addenda-alternative-wedge-candidate)), and — critically, per the updated script — ask directly whether the contractor has seen or used Beam AI's or Countfire's addenda-handling features specifically, and if so, why they would or wouldn't switch.

---

## H2 — AI-Native Techno-Commercial Engineering: Competitive Reality (CPQ)

> [!WARNING]
> H2 ("customer requirement → AI product selection & configuration → BOQ → pricing → techno-commercial proposal → human review") is not new ground. It is a precise description of **Configure-Price-Quote (CPQ)**, a 20+ year old enterprise software category with deep-pocketed incumbents. This section exists so H2 is never evaluated as if it were whitespace.

### Where H2 Came From, and Why It's Compelling

A single discovery call with Shubham Singh, BD Manager for data centers at Schneider Electric, described a workflow — customer requirement → consultant/PMC → techno-commercial documents → solution design across multiple product lines and teams → pricing → sales → offer → negotiation — where the 2-3 day bottleneck is *not* pricing itself (available "within a second" from an internal portal) but assembling a compliant, comprehensive multi-product-line solution across specialized teams. He noted this pain concentrates hardest at smaller organizations that don't have Schneider's team structure, and reacted positively to the idea of an AI model trained on a company's own product data that could combine product lines into a solution.

**Why this is a genuinely sharper problem than H1's takeoff wedge:** takeoff answers "how much stuff is there" — a counting problem. H2 answers "what should we actually sell the customer" — a decision closer to the revenue-generating moment, with a real, specific, hard-to-automate sub-problem (cross-OEM, engineering-compliant configuration) that isn't just symbol detection wearing a different label.

### The CPQ Competitive Landscape

| Competitor | Type | What they already do | Relevance to H2 |
|---|---|---|---|
| **Salesforce CPQ / Revenue Cloud** | Enterprise incumbent | Bundling, complex pricing/discount rules, advanced approvals, AI-assisted recommendations | Default inside any Salesforce shop; deep CRM lock-in |
| **SAP CPQ** | Enterprise incumbent | Variant configuration, embedded AI pricing/cross-sell, S/4HANA/ERP integration | Default inside SAP-run manufacturers — plausibly includes Schneider-like OEMs |
| **Oracle CPQ Cloud** | Enterprise incumbent | Rules/constraints engine, global pricing, AI-driven insights | Same lock-in dynamic, different ecosystem |
| **ServiceNow CPQ** | Enterprise incumbent | AI-driven configuration and workflow orchestration across channels | Newer, well-capitalized, explicitly AI-marketed |
| **Tacton** | Vertical incumbent, ~25 yrs | Symbolic-AI configuration guaranteeing valid/manufacturable configurations | Closest incumbent analog to H2's "compliant solution assembly" framing |
| **Infor / Epicor CPQ** | Vertical incumbent | CAD-linked configuration, automatic BOM/BOQ generation, engineering-to-manufacturing bridge | Already generates BOM/BOQ from configuration — functionally close to H2's stated MVP |
| **ServiceCPQ** | Engineering-to-order specialist | "Fully engineered solutions from customer requirements... CPQ manages the commercial and BOQ layer"; 90-day pilot motion for industrial equipment | Near-identical framing to H2, already selling to complex-equipment manufacturers |
| **servicepath** ("AI-native CPQ") | AI-native startup, now category-recognized | Domain-tuned LLMs plan configurations, draft proposals with citations, feedback loop improves guidance; named Gartner's **"Sole Visionary" in the 2026 CPQ Magic Quadrant** (per servicepath's own site, citing Gartner, Feb 2026); explicitly serves systems integrators and VARs | This is, close to verbatim, the H2 loop — already built, pitched, *and now analyst-recognized* by a funded startup. The CPQ market overall is sized at ~$5.8B (2026), ~16% 3-yr CAGR (MGI Research, per servicepath). This raises, not lowers, the bar for H2's "narrow, defensible gap" framing. |

### The Brutal Truth on H2

General-purpose CPQ is arguably a **harder** market to break into than H1's electrical takeoff space was, for two reasons: (1) the incumbents are larger, older, and better capitalized than Quotr/Countfire/Beam AI ever were, and (2) they benefit from **CRM/ERP lock-in** — being the default CPQ inside a Salesforce or SAP shop is a moat that a standalone AI tool cannot easily out-feature.

**The one plausible gap:** none of the CPQ vendors above appear to be vertically specialized for electrical/MEP/data-center solution engineering specifically — the redundancy math (N+1, 2N), cooling-capacity coupling, panel/breaker compliance, and multi-OEM (not single-catalog) reconciliation Shubham described. General CPQ configures within one company's own rule set; it is unclear whether any of them handle the specific engineering compliance logic of electrical/MEP systems well, or reconciliation across multiple *different* OEMs' catalogs (as a system integrator would need) rather than one manufacturer's own product line.

**The actual hypothesis to test is therefore narrower than "H2" as currently phrased:** *vertical AI-configuration for electrical/MEP system integrators, specifically handling cross-OEM compliance and BOQ assembly* — not "AI CPQ" as a category, which is already served.

### Business Model and GTM Implications (Different from H1)

CPQ-style products are typically **long-cycle, enterprise, and heavily customized to each customer's own product catalog, pricing rules, and compliance logic** — closer to an implementation-services-plus-software model than H1's self-serve SaaS hypothesis. A pilot likely looks like a scoped integration with one system integrator's actual catalog, not a free-trial signup. Do not port H1's $150-400/user/month SaaS pricing hypothesis onto H2 without testing; the buying process, sales cycle, and price point are all likely to look different.

### What H2 Still Needs Before It's a Product Spec

1. **5+ system integrator interviews** (not OEM-side people), using the H2 Discovery Script in [DISCOVERY.md](./DISCOVERY.md#h2-discovery-script--ai-solution--quotation-engineer), testing whether the pain, the CPQ gap, and the willingness to pay are real beyond one enthusiastic OEM employee.
2. **A direct answer to "what CPQ tooling do you already use, and what's missing for electrical/MEP work"** from those interviews — this is the single fastest way to find out whether H2 is whitespace or already-served.
3. **Confirmation that "solution assembly" and "negotiation/approval" are actually separable problems**, and which one the target customer cares more about — conflating them risks building a feature that solves neither well.

---

## The Four Execution Risks

### Risk 1: Drawing variability breaks the prototype
Clean vector PDFs from large engineering firms work well in demos. Real contractor drawing packages (scanned blueprints, skewed pages, hand annotations, non-standard legends) degrade model accuracy significantly (Quotr drops to 80–88% on scans).
- **Mitigation:** Test the technical spike on 5+ diverse, messy contractor packages. Measure scan degradation explicitly.

### Risk 2: The verification UX is not actually faster
If reviewing, clicking, correcting, and re-counting false positives takes as long as manual takeoff in Bluebeam, the product offers zero value regardless of model accuracy.
- **Mitigation:** Shadow workflow test. Measure end-to-end wall-clock time to approved takeoff. Win condition: >30% time reduction.

### Risk 3: Small/mid contractors won't pay incumbent SaaS pricing for an unproven tool
Entering at $150–$400/month with no brand, no case studies, and unproven accuracy when Bobyard starts at $35/mo and Quotr has established traction creates high sales friction.
- **Mitigation:** Test willingness to pay early; explore per-project or usage-based pricing models; price against value delivered rather than copying competitor SaaS tiers.

### Risk 4: Beam AI's roadmap overlap
Beam AI ($48.5M raised, $30.5M Series B Nov 2025) is explicitly expanding from takeoff into estimating and bidding — the exact multi-stage roadmap Vectoris has planned, backed by far more capital and 1,100+ active customer accounts generating correction data.
- **Mitigation:** Track Beam AI's public releases and case studies over the next 2 quarters. If they successfully ship contractor-specific memory or deep estimating intelligence before Vectoris reaches Gate 3, pivot away from the generic estimating path toward a specialized, unaddressed workflow wedge (e.g., Revision/Addenda or field-to-estimating loop).

---

## Thesis Scorecard — H1 (Electrical Takeoff)

| Dimension | Assessment | Score | Notes |
|-----------|------------|-------|-------|
| Problem severity | Category pain is real; specific sub pain unproven | **Medium-High** | Real economic cost, but existing workarounds exist |
| Market timing | AI takeoff is baseline, not frontier | **Medium** | Crowded wedge; window for standalone takeoff has largely closed |
| Technical feasibility (symbol counting) | Feasible with hybrid CV+VLM | **Medium** | Drawing scan variability is the key performance hurdle |
| Technical feasibility (revisions/addenda) | Highly feasible; competitive differentiation now contested | **Medium-High feasibility / Low-Medium differentiation** | Structured diffing is a tractable engineering challenge, but Beam AI (Addendum Variance Report) and Countfire (spec comparison) both already ship the feature category as of Aug 2026 — see Market Update above. Feasibility rating unchanged; differentiation rating downgraded. |
| Technical feasibility (conduit/wire) | Hard inference problem, but demonstrably shipped elsewhere | **Low, revised from "Very Low"** | Defer; do not promise on Vectoris's current timeline — but note Drawer.AI (Austin, TX, ~$5M raised) already ships automated branch/conduit routing with wire sizing and voltage-drop calculations to Revit as of Aug 2026 (see Market Update above). This proves the problem is tractable with enough focused investment, not that Vectoris should attempt it now — a well-funded, purpose-built competitor already owns this specific sub-problem. |
| Competitive differentiation | Stated differentiators already shipped by competitors | **Low / Contested** | Quotr, BuildVision AI, Beam AI, Countfire all claim similar workflows |
| Learning system hypothesis | Unvalidated; historic analog ambiguous | **Unvalidated** | Countfire has operated ~10 yrs without compounding category dominance |
| Business model & pricing | Unvalidated; price resistance likely | **Unvalidated** | Must validate willingness to pay for an unproven entrant |
| Founder-market access | Direct contractor network | **Strong** | Essential advantage for customer discovery and testing |
| Execution discipline | Epistemic honesty & validation-first | **Strong** | Rapidly updating thesis based on real evidence |

## Thesis Scorecard — H2 (AI Solution / Quotation Engineer)

| Dimension | Assessment | Score | Notes |
|-----------|------------|-------|-------|
| Problem severity | Real at one OEM; unknown at target segment (SIs) | **Unknown — single source** | Must be tested directly with system integrators |
| Market timing | CPQ is a mature category; "AI-native CPQ" is a live, funded sub-wave | **Low-Medium** | Not early; competing against 20+ year incumbents plus new AI entrants |
| Technical feasibility (configuration + BOQ generation) | Plausible; CPQ incumbents already do parts of this | **Medium** | The hard part is compliance/engineering logic, not UI or basic rule-matching |
| Technical feasibility (cross-OEM catalog reconciliation) | Largely untested; incumbents seem single-catalog-focused | **Unknown** | Potential genuine gap — needs technical validation, not assumption |
| Competitive differentiation | Vague as "AI CPQ"; possibly real if narrowed to electrical/MEP compliance logic | **Low broad / Possibly Medium narrow** | Must narrow the pitch before it's evaluable |
| Learning/moat hypothesis | Not yet assessed for H2 specifically | **Unassessed** | Apply the same four-condition moat test used for H1 before assuming one exists |
| Business model & pricing | Unknown; likely enterprise/implementation-heavy, not self-serve SaaS | **Unvalidated, different shape than H1** | Do not reuse H1's SaaS pricing hypothesis |
| Founder-market access | One OEM contact; system-integrator access unconfirmed | **Unknown — needs building** | Schneider access does not extend to the actual H2 target segment |
| Evidence base | One call, one person, one company | **Very Low** | The single biggest weakness of H2 right now — treat as hypothesis, not thesis |
| Execution discipline | Same validation-first posture applied to H2 as to H1 | **Strong, if maintained** | Risk: excitement about H2 outrunning the evidence discipline that correctly killed H1's overconfidence |

---

## Exactly What to Target First — Six Gates

```
Gate 1 — Pain & Unresolved Friction:
  -> Validation: 10-20 contractor interviews + competitive discovery
  -> Pass Condition: 7+ of 10 estimators describe meaningful friction that is
     SPECIFICALLY UNRESOLVED by tools they have already tried (not just absence of software).
  -> Kill Condition: Estimators say Bluebeam, Countfire, or Quotr already solve their takeoff pain adequately.

Gate 2 — Workflow & Bottleneck Mapping:
  -> Validation: Observe complete bid workflows (starting with Schneider BD session), and, per the
     Modified H1/H2 Relationship above, ask each interviewee to walk through their own pipeline
     end-to-end rather than assuming H1 and H2 are separate workflows for them.
  -> Learn: Where is the true bottleneck? Measure each of the following independently, not as a
     single undifferentiated "estimating is slow":
       - Drawing interpretation
       - Quantity takeoff
       - Engineering / application mapping (what a line item is actually for)
       - Product selection
       - BOQ assembly
       - Current-price retrieval
       - Cost calculation
       - Commercial / margin approval
       - Proposal generation
  -> Outcome: Confirm whether to proceed with Takeoff, Revision Intelligence, or a downstream step
     (application mapping, BOQ assembly) that the Historical BOQ Evidence above suggests may matter
     more than initial counting for some customers. Do not assume the longest self-reported step is
     the most valuable one to fix — cross-check against actual BOQ artifacts where possible.

Gate 3 — Technical Feasibility Spike:
  -> Validation: Run detection and revision-diffing on 5+ real contractor packages.
  -> Pass Condition: >70% true positive on common components; false positives correctable in <2 min.

Gate 4 — Adoption & Workflow Time:
  -> Validation: Shadow workflow test (AI vs. manual on identical real project).
  -> Pass Condition: >30% end-to-end time reduction + estimator voluntarily requests to reuse on next bid.

Gate 5 — Economics & Willingness to Pay:
  -> Validation: Paid pilot or signed Letter of Intent (LOI) before production build.

Gate 6 — Learning & Compounding Signal:
  -> Validation: Blind evaluation of model trained on contractor corrections vs. baseline.
  -> Pass Condition: Statistically significant improvement in accuracy on subsequent packages.
```

## H2 Gates — Run in Parallel, Not Instead Of

```
Gate H2-1 — Pain Beyond One Source:
  -> Validation: 5+ interviews with system integrators / MEP contractors (NOT large OEMs),
     using the H2 Discovery Script in DISCOVERY.md.
  -> Pass Condition: 4+ of 5 describe meaningful, specific friction assembling multi-vendor
     solutions/BOQs/proposals that current tools (including any CPQ software) don't resolve.
  -> Kill Condition: Interviewees already use Salesforce/SAP CPQ or similar and consider the
     electrical/MEP gap adequately handled, or the pain turns out to be OEM-specific
     (i.e., a Schneider-scale-only problem, not felt by smaller integrators).

Gate H2-2 — Bottleneck Separation:
  -> Validation: Direct questions (H2-3 block in DISCOVERY.md) on whether "solution assembly"
     and "negotiation/approval" are actually distinct problems for the interviewee.
  -> Outcome: Confirms which sub-problem to build for first — they may need different solutions
     (AI configuration vs. approval-workflow tooling) — and whether both are even in scope.

Gate H2-3 — CPQ Competitive Reality Check:
  -> Validation: Ask directly what CPQ/configuration tooling interviewees use today, and what's
     specifically missing for electrical/MEP work.
  -> Pass Condition: A specific, named, electrical/MEP-specific gap in existing CPQ tooling that
     interviewees confirm unprompted (not led into agreeing with).
  -> Kill Condition: Interviewees report existing CPQ tools (or simple internal processes) already
     handle this adequately, with no specific unresolved complaint.

Gate H2-4 — Technical Feasibility Spike (only after H2-1 through H2-3 pass):
  -> Validation: Attempt cross-OEM product configuration + BOQ generation against a real,
     redacted requirement and real product catalogs (with authorization).
  -> Pass Condition: A configuration a domain expert would judge substantially correct and
     compliant, generated meaningfully faster than manual assembly.
  -> Kill Condition: Compliance/engineering correctness is unreliable enough that expert review
     takes as long as doing it manually — a wrong configuration is a much higher-stakes error
     than a takeoff miscount, so the bar here should be higher, not the same, as H1's Gate 3.
```

---

## What NOT to Do Next

> [!CAUTION]
> These are the failure modes most likely to kill this company before finding product-market fit.

- **Do NOT treat "AI takeoff + human review" as your differentiator.** It is now the baseline description of at least five funded competitors' current products. Lead with a specific, named unresolved gap.
- **Do NOT build a polished UI before validating detection accuracy on messy scans.**
- **Do NOT fall in love with the learning system architecture before proving the first workflow deserves to exist.**
- **Do NOT assume Countfire or Quotr's presence means the market is unapproachable — but do NOT assume their customers are happy without asking.**
- **Do NOT promise conduit or wire quantity estimation.**
- **Do NOT test prototypes only on clean, high-resolution CAD exports.**
- **Do NOT confuse "that's a cool idea" with a commitment to pay.**
- **Do NOT build pricing, labor, or procurement features into the MVP.**
- **(H2) Do NOT treat one enthusiastic OEM-side reaction as validated demand.** Shubham Singh's response grades as Weak-to-Medium on this document's own signal-strength table. Run the H2 Discovery Script with system integrators before writing a single line of a product spec.
- **(H2) Do NOT pitch or build H2 as "AI CPQ" without narrowing it.** General configuration + BOQ + AI-drafted quotes is an already-served, incumbent-owned category (Salesforce, SAP, Oracle, Tacton, servicepath). The only defensible framing found so far is a narrow one: electrical/MEP-specific, cross-OEM compliance-aware configuration for system integrators. If discovery doesn't confirm that narrower gap, H2 has the same "already shipped by others" problem H1 did.
- **(H2) Do NOT conflate the "solution assembly" bottleneck with the "negotiation/approval" bottleneck.** They appear to be different problems (an assembly/computation problem vs. an internal discount-authority problem) that likely need different solutions. Test them separately before building either.
- **(H2) Do NOT reuse H1's SaaS pricing/business-model assumptions.** CPQ-style products typically sell enterprise, long-cycle, and catalog-specific — closer to implementation services than self-serve SaaS. Test this directly rather than assuming $150-400/user/month applies.
- **Do NOT let H2's novelty and excitement erase the validation discipline that correctly identified H1's competitive problems.** The same rigor that found Countfire, Beam AI, and the CPQ landscape must be applied to every future claim about H2, especially ones that feel exciting.
- **Do NOT treat SCOPE.md's 15-workstream long-term system as a build plan.** It is a map of where H1 and H2 could eventually lead, written to keep near-term decisions consistent with a coherent long-term direction — not an approved backlog. Cross-OEM configuration, ideal bid pricing, commercial intelligence, and company memory (SCOPE.md §§10–17, 20) are explicitly future scope there too. Nothing in SCOPE.md moves any of them into the current Gates.

---

*Part of the Vectoris source-of-truth documentation.*  
*Last updated: 2026-08-22 — added H2 (AI Solution/Quotation Engineer) competitive reality, scorecard, gates, and cautions following the Schneider/Shubham Singh discovery call; added scope-discipline caution referencing SCOPE.md's 15-workstream long-term map; added Aug 22 Market Update research refresh that downgrades the Revision & Addenda wedge, updates the Countfire/learning-hypothesis discussion, and adds Drawer.AI and servicepath's Gartner recognition to the competitive picture; added "Historical BOQ Evidence — Initial Observation" and "Modified H1/H2 Relationship" sections (previously linked from README.md but not yet written) following review of the GB 300 and Emerson BOQs, and sharpened Gate 2's bottleneck list accordingly.*
*Decision recorded 2026-08-22 (same day): the "Modified H1/H2 Relationship" section is upgraded from an architectural hypothesis to a decided architecture — H1 and H2 are merging into one pipeline, per the founder's explicit decision. This is a settled product-shape call, not new market validation; every Gate, scorecard, and evidence-discipline requirement elsewhere in this document remains fully in force for both hypotheses' underlying market claims.*