# Marketing Landing (Product Entry)

## Status
RECOMMENDED

## Purpose
The public-facing marketing website — the first point of contact for prospective users before they install or sign up. This is the separate **Next.js deployable** (distinct from the desktop app). It is not the same surface as the in-app `LANDING.md` screen.

> See `../03_ARCHITECTURE/TECH_STACK.md` §5 for the architectural separation: the desktop Tauri app and the Next.js marketing site are separate deployables, developed and hosted independently.

## Design Reference

Primary:
`../../designs/stitch/09_Landing_Product_Entry.png`

Implementation reference:
`../../designs/stitch/09_Landing_Product_Entry.html`

Reference purpose:
Visual reference for the public marketing landing page — hero section, product workflow stepper, feature cards, top nav, and footer. The design uses the dark theme with Vectoris brand colors. This is the primary visual reference for the marketing site's home page.

**Design vs. documented behavior:**
- The design headline "Precision Drawing Intelligence for Modern Electrical Engineering" is a marketing copy placeholder — final copy is a founder decision
- "Vectoris Core v2.4 Native Release" is a visual demo label — version numbers are not product requirements
- "18,240 Items Detected" badge and similar numeric claims in the product showcase are **demo/placeholder content**, not commitments
- "Local CAD Parsing (42ms)" latency claim is illustrative — actual performance is determined by the technical spike
- "Automated BOQ Sync" annotation in the showcase does not represent an MVP feature
- The 8-step workflow stepper (Project Creation → Upload Drawings → Doc Understanding → AI Detection → Count & Measure → Human Review → Verification → BOQ Export) aligns with the core MVP workflow and is documentable as intended content — but the labels are draft
- The "Explore Interactive Data Center Demo" CTA is a design prototype interaction — whether a live demo is part of the MVP website is TBD

---

## User Goal
Understand what Vectoris is and does, gain enough confidence in the product, and take action (sign up or download the desktop app).

## Entry Conditions
Any unauthenticated web request to the Vectoris marketing domain. Crawled by search engines. Linked from email campaigns, directories, partner sites.

## Exit Conditions
- CTA → Download / install the desktop app
- CTA → Sign up (creates account, then prompts download)
- Sign In → redirects to auth flow

---

## Information Architecture (from design reference)

**Navigation bar (fixed):**
- Vectoris wordmark + logo
- Nav links: Platform / Intelligence / Workflow / Company
- Sign In (secondary) + Get Started (primary CTA)

**Hero section:**
- Eyebrow badge (product version / positioning statement)
- Display headline (primary value proposition)
- Subtitle (1–2 sentences)
- Primary CTA: "Launch Vectoris Desktop" (or download/get started equivalent)
- Secondary CTA: Demo or walkthrough

**Product showcase canvas:**
- 3D/perspective-rotated app mock frame showing the drawing viewer
- Detection bounding box overlays
- Floating annotation pills (key value props: local processing, HITL, traceability)

**Workflow stepper:**
- 8-step visual pipeline from Project Creation to BOQ Export
- Matches the core MVP workflow

**Feature cards (3):**
- Engineering-Grade CAD Precision
- Local-First Privacy & Security
- Traceable Human-in-the-Loop AI

**Footer:**
- Wordmark, copyright
- Links: Documentation / Privacy Policy / Terms of Service / Security / Contact Support

---

## Design System
The marketing site uses the same Vectoris design tokens (dark background, Racing Red accent, Bricolage Grotesque + Hanken Grotesk + JetBrains Mono) but is a web experience, not the desktop app shell. Typography scale may differ from the app's Tauri window context.

## SEO
The marketing site is a Next.js deployable (Vercel) and must follow standard web SEO practices: meta title, meta description, Open Graph tags, structured data (SoftwareApplication schema), sitemap, robots.txt.

## Pages within the Marketing Site
The design reference shows the home page only. Additional marketing pages (Pricing, Documentation, Blog, Company, Privacy Policy, Terms of Service) are out of scope for this document — TBD when the marketing site is built.

## Implementation Notes
- Built as a standalone Next.js project, deployed to Vercel
- Does not share code with the Tauri desktop app
- The product showcase canvas likely uses pre-rendered screenshots or an embedded demo environment — not a live Vectoris instance

## Acceptance Criteria
- AC: A prospective user can understand what Vectoris does from the home page without prior context
- AC: The primary CTA leads to download or account creation
- AC: The marketing site is independently deployable without requiring the desktop app to be running
- AC: The page passes Core Web Vitals benchmarks on Vercel

## Dependencies
`../03_ARCHITECTURE/TECH_STACK.md` (Next.js + Vercel), `../06_PAGES/LANDING.md` (in-app unauthenticated screen — separate surface), `../06_PAGES/AUTH.md`

## Open Questions
- Whether the marketing site includes a live interactive demo or only static content — TBD
- Copy for all headlines, subtitles, and CTAs — founder-owned
- Pricing page — TBD (no pricing model documented)
- Blog / content marketing — TBD
- Separate Figma or Next.js project for the marketing site — TBD
