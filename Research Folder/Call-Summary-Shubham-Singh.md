# Discovery Call Summary — Shubham Singh (Schneider Electric)

*Companion to [README.md](./README.md), [DISCOVERY.md](./DISCOVERY.md), [THESIS.md](./THESIS.md), and [SCOPE.md](./SCOPE.md)*

---

## Call Details

| Field | Detail |
|---|---|
| Interviewee | Shubham Singh |
| Role | Business Development Manager — Data Centers, Schneider Electric |
| Interviewer | Mangeram Singh |
| Date | August 2026 |
| Format | Voice call, transcribed (VTT) |
| Source material | Full call transcript (auto-captioned; portions garbled/informal) |

> [!CAUTION]
> This is **one call with one person at one large OEM.** It is not proof that any hypothesis below is universally — or even commonly — painful. Treat every finding here as a lead to test with more people, specifically system integrators, not as validated fact. Per the signal-strength framework in DISCOVERY.md, Shubham's reactions grade as **Weak-to-Medium**, not Strong.

---

## What Shubham Described: The Workflow

A large-OEM techno-commercial workflow, as described:

```
Customer requirement
    ↓
Consultant / Project Management Consultancy (PMC) — for larger/building-scale projects
    ↓
Techno-commercial documents collected (customer requirement, scope, specs)
    ↓
Solution design — based on scope, spans multiple product lines
    (at Schneider: UPS, precision cooling, power distribution — transformers,
     medium/low voltage panels, busbar, cable, MCB/MCCB/isolators/ELCB — racks,
     smart building/IoT/PLC automation — all under one OEM, multiple business units)
    ↓
BD manager shares components with the pricing team
    ↓
Pricing team → Sales team → offer
    ↓
Negotiation (can take up to ~1 week)
```

**Key structural point (direct quote):** *"Solution means based on the scope... multiple teams involved [in large organizations]... [but at] small organizations, one or two teams manage the entire thing."*

At Schneider (and comparably sized OEMs like Vertiv), this workflow is split across specialized teams — Shubham's own role is BD manager for data centers specifically, one slice of a much larger organization. He was explicit that **smaller organizations do the same end-to-end job with far fewer people.**

---

## The Two Time Estimates, and Why They're Different Problems

Shubham gave two different numbers, for two different steps — this is the most important structural finding from the call, and it's easy to accidentally conflate:

| Step | Time | What's actually happening |
|---|---|---|
| **Solution assembly / pricing compilation** | **2-3 days**, "depending upon the load, team bandwidth" | Assembling the comprehensive multi-product-line solution and BOQ across teams. This is the "what should we sell them, and what does it cost" step. |
| **Negotiation** | **Up to ~1 week** | Not about generating a price — the price already exists. It's about internal approval to move from list price toward a customer's target price, based on gross margin / P&L flexibility. |

Direct quotes establishing this distinction:

> *"It will take around 2 to 3 days generally, depending upon the load, team bandwidth, but ideally... it is 2 to 3 days only."* (on solution/pricing compilation)

> *"[Regarding price] within a second... but based on the customer requirement, customer expectation... if the cost is coming at 1 lakh rupees... and customer is asking to go with 80,000... that process from 100,000 to 80,000 will take one week maximum. Not about getting the price, because price is already there on the website as well... based on our overall gross margin... profit and loss, we decide how much flexibility we can [give]."*

**Implication:** these are two different bottlenecks that likely need two different kinds of solutions. Solution assembly is an AI-configuration-shaped problem. Negotiation/margin approval is closer to an internal workflow/approval-routing problem — better AI configuration probably does not, by itself, shorten a P&L-driven discount approval. Do not design one feature assuming it solves both.

---

## The Reaction to the AI Concept

Mangeram described training a model on a company's own product/data to combine product lines into a solution based on a requirement. Shubham's response:

> *"That's really impressive because right now we are dependent on the people... we have multiple teams... but if we will have some AI model, anyhow, every companies are working on that. So to ease the work, right? So if we will have some AI model which will help us combining all the product lines from the Schneider if I take an example and they can give us the combination of all the products based on the requirement and they can give the comprehensive [proposal]... It will help, correct."*

**How to read this, honestly:**
- **What it is:** a specific, plausible description of where the pain is (multi-team dependency, product-line combination) and a genuine, on-the-record "yes, that would help."
- **What it is not:** a commitment, a stated willingness to pay, a request to pilot, or evidence beyond one person's opinion. Per DISCOVERY.md's own signal table, this sits at **Weak-to-Medium** — closer to "yeah, that would be cool" than to "we already pay for something because this takes too long."
- **Notable, and worth taking seriously:** Shubham volunteered, unprompted, that *"every companies are working on that"* — i.e., his own belief that this is already an active pursuit industry-wide, not virgin territory. This lines up with the CPQ competitive research below and should raise, not lower, the bar for what "differentiated" means for H2.

---

## The Targeting Redirect

Unprompted, Shubham steered the conversation away from large OEMs (like his own employer) and toward a different customer type:

> *"So, software enable in such companies, because we are a product-based companies... if we have to target something, the best thing is to go with some system integrators... the companies who are taking multiple components from different OEMs and they are merging in a single offer and sharing. So, and it will be a best use case for them."*

**This is a genuinely useful redirect** — it's a specific, falsifiable customer hypothesis (system integrators, not OEMs) that came from the interviewee rather than being led into. But it's still **one OEM employee's opinion about a customer segment he does not belong to.** It needs to be tested directly with system integrators, not treated as confirmed targeting.

---

## What This Call Establishes vs. What It Doesn't

| Established (real, specific signal) | NOT established — do not assume |
|---|---|
| At a large OEM, solution assembly across product lines takes 2-3 days and involves multiple specialized teams | That this pain exists, or exists at this severity, at the actual target customer (small/mid system integrators) |
| Unit/list pricing itself is fast — near-instant via an internal portal | That pricing lookup is equally fast/solved for system integrators, who may not have Schneider's mature internal tooling |
| Negotiation to a customer's target price can take up to a week, and is a margin/approval process, not a computation problem | That this is solvable by better AI configuration — it may need different tooling entirely (approval workflow, not smarter product-matching) |
| One BD manager reacted positively and specifically to the AI-configuration concept | That this constitutes market validation, willingness to pay, or a committed pilot |
| Smaller organizations do with 1-2 people what large OEMs split across many teams | That smaller organizations experience this as *painful* rather than just "normal" — under-resourced doesn't always mean actively suffering |
| System integrators were suggested as the better target customer | That system integrators actually feel this pain, want this solution, or would pay for it — this must be tested directly |

---

## How This Changes the Thesis

This call is the origin of **H2 — AI Solution / Quotation Engineer** ("AI-native techno-commercial engineering"), now tracked alongside the original H1 (electrical takeoff) hypothesis. See:

- [README.md — H1 and H2, Merged Pipeline, Two Entry Points](./README.md#h1-and-h2--merged-pipeline-two-entry-points) for the H1/H2 framing and the H2 competitive landscape (Configure-Price-Quote / CPQ — this is **not** an empty category; see below).
- [THESIS.md — H2 Competitive Reality](./THESIS.md#h2--ai-native-techno-commercial-engineering-competitive-reality-cpq) for the full brutal assessment, including why "AI configures a solution and drafts a quote" is already a served enterprise category (Salesforce CPQ, SAP CPQ, Oracle CPQ, Tacton, Infor/Epicor, and AI-native entrants like servicepath), and why the real, narrower, still-untested hypothesis is *vertical AI-configuration for electrical/MEP system integrators specifically handling cross-OEM compliance* — not "AI CPQ" broadly.
- [DISCOVERY.md — H2 Discovery Script](./DISCOVERY.md#h2-discovery-script--ai-solution--quotation-engineer) for the next round of interview questions, targeted at system integrators, designed to separate the two bottlenecks this call surfaced and to directly test whether existing CPQ tooling already covers this ground.

---

## Note — Historical BOQ Evidence (Added Aug 22, 2026)

Two historical BOQs (GB 300 — data-center electrical/infrastructure; Emerson Climate Technologies, Noida — PAC/HVAC) have since been reviewed as workflow evidence — see [README.md's Historical BOQ Evidence section](./README.md#historical-boq-evidence--aug-2026) and [THESIS.md's Historical BOQ Evidence — Initial Observation](./THESIS.md#historical-boq-evidence--initial-observation). These give the team a concrete finished artifact to test the solution-assembly hypothesis this call surfaced, rather than relying solely on Shubham's self-reported "2-3 days" estimate. **The next round of system-integrator interviews should request actual anonymized BOQs and, where authorized, the source requirements/drawings behind them** — this tests whether the 2-3 day solution-assembly bottleneck actually shows up in the structure of completed BOQs (e.g., how much of the line-item detail was fast to determine vs. slow), rather than testing only what one person recalled about the process afterward. This does not change the Weak-to-Medium signal grading above — it's a method for getting stronger evidence next time, not new evidence itself.

---

## Immediate Next Steps

1. **Do not write an H2 product spec yet.** One call is a lead, not a thesis.
2. **Run the H2 Discovery Script with 5+ system integrators** — the segment Shubham himself pointed toward, not more OEM-side contacts.
3. **Lead with the CPQ question directly**: "Do you already use Salesforce CPQ, SAP CPQ, or similar? What's missing for electrical/MEP work?" This is the fastest way to find out whether H2 is real whitespace or an already-served problem, the same way asking about Countfire/Quotr early would have sharpened H1 discovery from the start.
4. **Keep asking the bottleneck-separation question** (assembly vs. negotiation/approval) in every conversation — confirm or disconfirm that these are genuinely distinct problems before committing engineering time to either.
5. **Continue running H1 discovery in parallel**, not instead — H2's evidence base is currently much thinner than H1's, despite being more exciting right now. Don't let excitement outrun discipline.

---

*Part of the Vectoris source-of-truth documentation.*
*Created: 2026-08-22, following the Schneider/Shubham Singh discovery call.*
*Updated: 2026-08-22 (same day) — added a note connecting the Historical BOQ Evidence review to this call's solution-assembly hypothesis, and recommending future interviews request real BOQ artifacts.*
