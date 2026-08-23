# Vectoris — Customer Discovery Script & Schneider Session Guide

*Companion to [README.md](./README.md), [THESIS.md](./THESIS.md), and [SCOPE.md](./SCOPE.md)*

> [!IMPORTANT]
> **Two hypotheses are now under test: H1 (electrical takeoff) and H2 (AI solution/quotation engineer).** This document contains both discovery scripts. The Schneider/Shubham Singh call (Aug 2026) surfaced H2 and is logged below — see [Call-Summary-Shubham-Singh.md](./Call-Summary-Shubham-Singh.md) for the full writeup. Per this document's own signal-strength framework (below), that call's evidence for H2 grades as **Weak-to-Medium**, not strong validation. The H2 script exists to get real evidence before committing to H2 as the primary wedge.

> [!NOTE]
> **This is not the full list of candidate wedges.** [SCOPE.md §5](./SCOPE.md#5-strategic-direction) lists additional candidates — post-takeoff assembly mapping, engineering constraint intelligence, standalone product selection, proposal QA, bid pricing optimization — that do not yet have discovery questions written. Revision & Addenda Intelligence (Section 5 below) is the one alternative wedge that *is* already scripted alongside H1 and H2. Do not treat the unscripted wedges in SCOPE.md as untested-but-fine to defer indefinitely — they are simply not yet ready to be evaluated at all, in either direction.

---

## Schneider Session Objectives *(Completed — H1 focus)*

> [!NOTE]
> **Segment Calibration:** Schneider is a large, process-mature global enterprise and is not representative of the primary target customer segment (10–200 employee electrical subcontractors). Use this session for domain vocabulary, bottleneck-mapping, and artifact examples (drawings, assemblies, spreadsheets) — not for validating whether the standalone takeoff wedge is right for smaller contractors.

> [!IMPORTANT]
> Today's session is an observation, not a pitch. The objective is to map the complete workflow and find the real bottleneck — not to validate the idea.

### What to Capture

**Workflow mapping** — document every step in order:

| Step | Tool used | Time estimate | Manual or automated | Decision point? | Pain / Friction |
|------|-----------|--------------|--------------------|----|-----------------|
| Drawing intake | ? | ? | ? | ? | ? |
| Sheet review & classification | ? | ? | ? | ? | ? |
| Takeoff method | ? | ? | ? | ? | ? |
| Symbol counting / measurement | ? | ? | ? | ? | ? |
| Quantity recording | ? | ? | ? | ? | ? |
| Revisions / Addenda reconciliation | ? | ? | ? | ? | ? |
| Pricing & assembly mapping | ? | ? | ? | ? | ? |
| Labor factor application | ? | ? | ? | ? | ? |
| Review and approval | ? | ? | ? | ? | ? |
| Bid submission & proposal | ? | ? | ? | ? | ? |

> [!NOTE]
> Time consumed ≠ pain. A 5-minute step that creates downstream risk may be more painful than a 30-minute step that is well-understood and under control. Capture both the time and the friction separately.

**Decision points to watch for:**
- Where does experienced judgment enter that software cannot handle?
- Where is the software ignored and the estimator goes manual?
- Where does the estimator slow down or show visible friction?
- Where are corrections, revisions, or rechecks happening?

**Key bottleneck question:** Where does the most time go between "drawings received" and "bid submitted"? Is it counting, pricing, revisions/addenda, review, or something else entirely?

**Artifacts to note (only when explicitly authorized):**
- Sample drawing packages and their formats (vector vs. scan, raster notes)
- Example completed takeoffs (format, structure, assembly codes)
- Pricing spreadsheets or estimating databases
- Revision/addenda comparison markups
- Any existing automation or takeoff software in use

> [!CAUTION]
> Do not take, copy, photograph, or record any customer-owned drawings, estimates, pricing, or documents without explicit authorization from the appropriate authority. Workplace observation does not equal data permission.

---

## Full Customer Interview Guide

### Before You Start

**Objective:** Understand the real workflow and identify unsolved friction. Not to pitch. Not to validate assumptions. To discover what is actually true.

**Rules:**
- Let the contractor talk. Ask "why" before moving on.
- Note every workaround, spreadsheet, and manual step.
- Do not mention AI or your product until they ask.
- Do not confuse enthusiasm with commitment.

| Signal | Strength |
|--------|----------|
| "Yeah, that would be cool" | Weak |
| "I spend hours doing this every week" | Medium |
| "We already pay for software because this takes too long" | Strong |
| "Can I try this on our next bid?" | Very strong |
| Any form of upfront commitment or payment | Strongest |

> [!NOTE]
> **Applying this table to ourselves:** the Schneider/Shubham Singh call (Aug 2026) that surfaced H2 produced reactions like *"that's really impressive"* and *"it will help, correct"* — no named budget, no pilot request, no stated tool switch. Per this table, that's **Weak-to-Medium**, not Strong. It's a real, specific pain description (multi-team solution assembly), which is worth more than pure enthusiasm — but it is not validation. Hold every future H2 conversation to this same bar, including ones that feel exciting in the moment.

---

### Opening

> Hi, thanks for taking some time. I'm doing research on how electrical contractors handle estimating and quantity takeoffs. I'm not selling anything — I'm trying to understand how the process actually works in practice. Would it be okay if I ask you a few questions about your workflow?

---

### 1 — Work Context

1. What kind of electrical projects do you usually bid on? (Commercial, industrial, multi-family, institutional?)
2. How many estimates or bids does your firm prepare per month?
3. Who actually does the estimating and takeoff? (Dedicated estimator, project manager, owner?)
4. How experienced is that person?

---

### 2 — Real Workflow Walkthrough

5. Walk me through a recent estimate from start to finish — from receiving drawings to submitting the bid.
6. What files do you usually get? (Vector PDF, scanned PDF, CAD, specs, BOQ?)
7. What do you actually measure or count during takeoff?
8. How do you do the takeoff today? (Paper & highlighter, Bluebeam, PlanSwift, specialized software?)
9. How long does a full estimate take from start to finish?
10. Which part of that entire process takes the most calendar time? Which takes the most mental focus?

---

### 3 — Current Tools & Competitive Discovery *(Moved Early)*

*Get this signal early so you can interpret everything that follows through the lens of what they have already tried.*

11. What software do you currently use for takeoff and estimating?
12. Have you tried dedicated takeoff or estimating tools like **Countfire**, **Quotr.ai**, **Togal.AI**, **STACK**, **Beam AI**, **BuildVision AI**, or **Bobyard**? What happened?
13. *(If using/tried one)* What made you choose it? What does it do well, and where does it fall short specifically?
14. *(If stopped using one)* Why did you stop or switch back?
15. What parts of the takeoff does your current tool automate well, and what still forces you into manual work?
16. How do you feel about outsourced takeoff or external review services (like Beam AI or freelance estimators)? Have you ever used one? Why or why not?
17. *(If relevant)* What do you prefer about keeping takeoff internal versus outsourcing it?

---

### 4 — Reaction to What Already Exists *(Testing Differentiation)*

*This directly tests whether your stated differentiation survives contact with someone who knows existing automated tools.*

18. "If I told you a tool already reads your drawings, counts symbols automatically, lets you review and correct detections side-by-side, and remembers your corrections for next time — would you already know what I'm describing?"
19. "Have you seen demos or products like that? If yes, what has stopped you from adopting them, or what was missing from the ones you saw?"
20. "When automated tools make mistakes on electrical drawings, what type of mistake bothers you the most — missing an item entirely, or hallucinating false items that you have to delete?"

---

### 5 — Revisions and Addenda *(Alternative Wedge Candidate)*

*Testing the hypothesis that drawing changes mid-bid are a sharper, less commoditizable pain point than initial symbol counting.*

> [!WARNING]
> **Updated Aug 22, 2026:** As of this update, Beam AI ships an automated "Addendum Variance Report" (structured revision-delta detection) and Countfire advertises automatic spec/version comparison — see [THESIS.md's Market Update](../THESIS.md#market-update--research-refresh-aug-22-2026). Question 25a below is new and is now the single most important question in this block: it directly tests whether this wedge is still open, or already served by tools the interviewee may already have access to.

21. Walk me through the last time drawings changed mid-bid or an addendum arrived. How did you figure out what changed?
22. How long did it take to reconcile the revision against your existing takeoff?
23. Did you trust that you caught everything? Have you ever missed a scope change in an addendum that cost you money?
24. How often do addenda or revised drawing sets arrive during an active bid? (Every project, 50% of projects?)
25. How does your current takeoff software handle comparing drawing revisions? Does it highlight delta quantities automatically, or do you have to do a visual overlay / re-count?
25a. *(New)* Have you seen or used Beam AI's Addendum Variance Report, or Countfire's spec/version comparison feature, specifically? If yes — did it work well, and would you switch away from it? If no — would you be open to trying an automated variance report, given that at least two other vendors already offer one?

---

### 6 — The Gap After Takeoff

*Exploring the bottleneck between raw counts and a submittable bid number.*

26. After your takeoff count is approved, what happens before the final bid number is submitted?
27. How do you currently map counts to materials, assemblies, and vendor catalogs?
28. How do you get current material prices? How often do supplier quotes differ from your internal price books?
29. How do you apply labor rates (NECA tables, internal crew factors, historical benchmarks)?
30. How long does the pricing, assembly mapping, and labor step typically take after you have the quantities?

---

### H1 Post-Takeoff / BOQ Mapping *(New — following the Historical BOQ Evidence review, Aug 22, 2026)*

*Section 6 asks about the pricing/labor/mapping gap in general terms. These questions go further: they ask to see the actual finished artifact and connect it back to its source, testing the Historical BOQ Evidence's open question of where the real bottleneck sits — see [THESIS.md's Historical BOQ Evidence — Initial Observation](../THESIS.md#historical-boq-evidence--initial-observation) and [Modified H1/H2 Relationship](../THESIS.md#modified-h1h2-relationship).*

> [!NOTE]
> The last question in this block — asking to see a BOQ alongside its source drawings for the same project — is the single most valuable artifact request in this entire script. It lets the team observe Drawing → Takeoff → Final BOQ as a connected chain instead of studying each artifact in isolation or relying solely on self-reported bottleneck claims.

6a. Show me the final BOQ from your last completed project (redacted if needed).
6b. Which parts of that BOQ came directly from the drawing takeoff?
6c. Which parts were added because of engineering knowledge or project requirements, not from a drawing count?
6d. How do you decide where each item is used (its application), and does that decision get written down anywhere, or does it live only in the estimator's head?
6e. How do you map a generic requirement or takeoff item to your actual product/model/SKU?
6f. Which items in the BOQ are manually selected rather than detected or counted from drawings?
6g. Where does the product/SKU information come from — a catalog, memory, a colleague, a vendor rep?
6h. Where does the current price come from, and how does it get attached to the line item?
6i. How do you handle different prices for different project types or customers?
6j. Which BOQ fields take the most manual effort to prepare?
6k. Which items commonly get missed or added late, between takeoff and the final BOQ?
6l. **Can you show us a BOQ and its source drawings for the same project, side by side?**

---

### 7 — Pain, Errors, and Cost of Failure

31. What part of the entire estimating process is the most frustrating or repetitive?
32. Where do mistakes usually slip through?
33. Have you ever missed something in a takeoff or bid that impacted project margin? What happened?
34. How often do you have to recheck or redo parts of an estimate?
35. What's the most expensive type of estimating mistake in your trade?

---

### 8 — Trust and Automation

36. Would you trust software to generate a first-pass takeoff if you could review and edit every single detection?
37. What specific evidence would you need to see on the screen to trust an automated count? (Bounding boxes, sheet links, confidence scores?)
38. What would make you immediately distrust automated estimating software?

---

### 9 — The Learning Question *(Critical for Learning Hypothesis)*

39. When you correct a takeoff — say you find the software missed 10 fixtures or misclassified an outlet — where does that correction live today?
40. Does your current tool learn from your correction, or is that knowledge lost once the estimate is finished?
41. If your tool remembered every correction and custom symbol mapping you've ever made and applied it to future jobs for your company, would that be a game-changer, or just a nice-to-have?

---

### 10 — Value and Economics

*Ask these only after understanding real workflow and real pain. Value before price.*

42. What do you currently pay per year or per month for estimating/takeoff software?
43. When estimating goes wrong — missed scope, wrong pricing, revision errors — what does that typically cost you in real dollars or lost bids?
44. Who approves software purchases at your firm? What does that evaluation process look like?
45. What would a tool like this have to save, improve, or eliminate before you would seriously consider paying for it?
46. *(Only after they've seen the concept or prototype)* What would you expect to pay per month for something like this if it reliably delivered on that promise?

---

### 11 — Most Important Summary Questions

47. If you could eliminate ONE part of your estimating process completely, what would it be?
48. What would a dream estimating tool do for you that nothing on the market does today?
49. If your current estimating software disappeared tomorrow, what would you miss most?
50. Who else in your network or trade association should I talk to who deals with this daily?

---

### Closing

> Thanks — this was really helpful. One last thing: would you be open to showing me a real example of how you do a takeoff? Even a redacted or past project — I'm trying to understand the actual step-by-step process in practice.

---

### What to Target in the First 10 Conversations *(Prioritized Checklist)*

1. **"What software do you currently use for takeoff? Have you tried Countfire, Quotr, Togal, STACK, or Beam AI? What specifically don't you like about them?"** *(Lead with competitive awareness — know what you are replacing and why existing tools failed).*
2. **"Walk me through your last takeoff start to finish."** *(Observe the full workflow without leading).*
3. **"Walk me through the last time drawings changed mid-bid. How did you figure out what changed?"** *(Validate or disqualify the Revision/Addenda wedge candidate early).*
4. **"What happens after takeoff before you submit the bid? How long does pricing/assembly mapping take?"** *(Explore the post-takeoff bottleneck).*
5. **"When you correct a takeoff error, where does that correction live? Does your software remember it?"** *(Tests the core Learning Hypothesis).*
6. **"If a tool already does automated counts with review, why haven't you adopted it?"** *(Tests if differentiation survives market reality).*
7. **"Have you ever used an outsourced takeoff service? Why or why not?"** *(Tests Beam AI / external service trade-offs).*
8. **"What specific evidence would you need to see on the screen to trust an automated takeoff?"** *(Shapes verification UX).*
9. **"What would the tool have to save or improve for you to consider paying for it?"** *(Uncovers true value metric before discussing price).*

---

## H2 Discovery Script — AI Solution / Quotation Engineer

*Companion script for testing H2 ("customer requirement → configured solution → BOQ → pricing → techno-commercial proposal"). Use this with system integrators and MEP contractors, not large OEMs — the Schneider call already covered the OEM-side perspective and pointed toward SIs as the more relevant customer.*

> [!IMPORTANT]
> Same rules as the H1 script apply: let the person talk, ask "why," don't pitch, don't confuse enthusiasm with commitment. Additionally for H2: **separate the "solution assembly" bottleneck from the "negotiation/approval" bottleneck explicitly** — the Schneider call suggests these are different problems (one is a computation/assembly problem, the other is an internal authority/discount-approval problem) and conflating them risks building a feature that solves neither well.

### Opening

> Hi, thanks for the time. I'm researching how companies that integrate multiple electrical/MEP vendors' products put together a customer proposal — from a requirement coming in, to a priced, submittable offer. I'm not selling anything yet — just trying to understand the real process. Would you be open to walking me through it?

---

### H2-1 — Work Context

1. What kind of projects do you typically quote? (Data center, industrial, commercial MEP, other?)
2. How many customer requirements/RFQs do you respond to per month?
3. Who handles solution design, BOQ assembly, and pricing at your company — one person, a small team, or split across specialized roles?
4. How many different OEMs' or vendors' product lines do you typically combine into one offer?

**Project taxonomy walkthrough** *(New — following the Historical BOQ Evidence review, Aug 22, 2026)*: rather than asking about project types abstractly, walk through their actual recent history to build a real taxonomy instead of guessing from two historical BOQs:

> Thinking back over your last 10 projects, for each one — what was the project type? What kind of customer? What were the main systems involved? Roughly how big was the resulting BOQ? Did you have drawings available, or just a written requirement? Which vendors were involved? Where did pricing come from? How did you actually put the estimate together?

---

### H2-2 — Real Workflow Walkthrough

5. Walk me through a recent requirement from when it landed to when you sent a priced offer.
6. What does the customer actually give you — a spec sheet, a verbal requirement, a consultant's document, something else?
7. How do you figure out which specific products/components to combine into a compliant solution?
8. Once you know what to include, how do you get pricing for each piece? How long does that take?
9. How long does the whole thing take, start to finish? Which part takes the most calendar time? Which part takes the most mental effort?

---

### H2-3 — Separating the Two Bottlenecks *(Critical — do not skip)*

*Directly tests whether "solution assembly" and "negotiation/approval" are actually distinct problems, as the Schneider call suggested.*

10. Once you've picked the products and have a price, is that price usually close to what you send the customer, or does it change a lot before the deal closes?
11. If it changes, what's changing it — new information about the requirement, or negotiation/margin decisions?
12. Who has to approve pricing flexibility or discounts? How long does that typically take?
13. If I could only fix ONE of these — (a) figuring out the right product combination and generating the BOQ faster, or (b) speeding up the internal pricing-approval/negotiation process — which would matter more to you, and why?

---

### H2-4 — Current Tools & Competitive Discovery *(Ask early, same principle as H1)*

14. Do you currently use any configure-price-quote (CPQ) software, or anything like Salesforce CPQ, SAP CPQ, or similar? What happened?
15. If not CPQ specifically — what do you use today to keep track of product combinations, compliance rules, and pricing? (Excel, a vendor portal, something else?)
16. What's missing, specifically, for electrical/MEP or data-center work? General CPQ tools aren't built for engineering compliance rules (redundancy, cooling capacity, panel ratings) — do you feel that gap, or does your current process handle it fine?
17. Have you seen or evaluated any AI tool that tries to do this? What stopped you from adopting it?

---

### H2-5 — Pain, Errors, and Cost of Failure

18. What's the most frustrating or repetitive part of assembling a proposal across multiple vendors' products?
19. Have you ever proposed a non-compliant or incorrect combination? What happened?
20. Have you ever lost a deal or margin because the proposal took too long to put together?
21. How often do you have to redo or significantly revise a proposal after first submission?

---

### H2-6 — Trust and Automation

22. Would you trust an AI tool to propose a first-pass product combination and BOQ if you could review and correct every part of it before it goes to a customer?
23. What would you need to see on screen to trust an AI-suggested configuration? (Compliance justification, source catalog links, confidence per component?)
24. What would make you immediately distrust an AI-generated solution proposal?

---

### H2-7 — Value and Economics

*Ask only after understanding real workflow and real pain.*

25. What do you currently spend — in tools, in people's time, or in outsourced help — putting proposals together?
26. What would faster, more reliable solution assembly be worth to you — more bids submitted, higher win rate, fewer errors, something else?
27. Who approves software purchases at your company, and what does that process typically look like for something like this?
28. Would this need to integrate with specific vendor catalogs, ERPs, or CRMs you already use? Which ones?

---

### H2-8 — Most Important Summary Questions

29. If you could eliminate ONE part of putting together a multi-vendor proposal, what would it be?
30. What would a dream tool do for you here that nothing on the market does today?
31. Who else — other system integrators, MEP contractors, or estimators — should I talk to who deals with this regularly?

---

### What to Target in the First 5 H2 Conversations *(Prioritized Checklist)*

1. **"Do you use Salesforce CPQ, SAP CPQ, or anything like it? What's missing for electrical/MEP work specifically?"** *(Tests whether H2 is whitespace or already served — ask this before anything else).*
2. **"Walk me through your last proposal from requirement to submission."** *(Observe the real workflow without leading).*
3. **"Is the slow part picking the right products and building the BOQ, or is it the pricing/negotiation approval after that?"** *(Directly tests whether the two bottlenecks the Schneider call surfaced are actually separate, and which one matters more).*
4. **"Have you ever proposed something non-compliant or had to redo a proposal?"** *(Tests real cost of the status quo, not just time spent).*
5. **"What would you need to see on screen to trust an AI-suggested configuration?"** *(Shapes the verification UX — trust is likely to be a bigger barrier here than in takeoff, since a wrong configuration is an engineering failure, not a miscount).*

---

*Part of the Vectoris source-of-truth documentation.*  
*Last updated: 2026-08-22 — added H2 discovery script following the Schneider/Shubham Singh call; flagged additional unscripted candidate wedges from SCOPE.md; added a direct Beam AI/Countfire addenda-feature awareness question to the Revisions & Addenda block following a competitive research refresh; added the H1 Post-Takeoff/BOQ Mapping question block and the H2 project-taxonomy walkthrough following the Historical BOQ Evidence review (GB 300, Emerson).*