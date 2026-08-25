Vectoris Audit
1. Executive Summary
Dimension	Score (0–10)	Note
Overall implementation maturity	2.5 / 10	A polished, well-structured frontend shell with zero backend, zero AI, zero persistence.
Frontend completeness	6 / 10	Every documented page/route exists and renders; almost nothing is wired to real data or actions.
Architecture alignment (nav/routing)	8 / 10	Navigation, tabs, breadcrumbs, and route table match docs/02_DESIGN/NAVIGATION.md almost exactly.
Design quality (visual/interaction)	7.5 / 10	Genuinely strong dark/light theming, reduced-motion discipline, and a distinctive title-bar/theme-transition system. Feels closer to a real desktop app than most Tauri+React prototypes.
Code quality	6 / 10	Clean individual components, but massive duplication of mock data, several 800–1000 line "god pages," and dead dependencies.
Desktop readiness	4 / 10	Real custom title bar and window controls; installer config exists; but CSP is disabled and no Tauri commands exist.
Production readiness	1 / 10	This cannot be shipped as a product today — it is a click-through prototype with no backend, no auth, no AI, no file handling.

One-sentence verdict: Vectoris today is a high-fidelity, self-aware design/UX prototype of the product described in docs/ — the shell, navigation, and data shapes are right, but almost none of the actual product (ingestion, detection, AI Brain, auth, persistence) exists yet, and the codebase itself says so in comments in several places.

2. What's Done
Area	Status	Evidence	Quality
Global routing (/dashboard, /projects, /sessions, /settings)	✅ Complete	src/app/App.tsx:1-132	Clean, hand-rolled path matcher; no router library needed at this scale
Global AppShell (sidebar, header, search bar)	🟡 Partial	src/components/AppShell.tsx	Structure/ARIA solid; search input is readOnly (AppShell.tsx:126), org switcher has no handler
Project sub-navigation (Overview/Documents/Workspace/Takeoff/Reports + future Estimate/Bid)	✅ Complete	src/components/ProjectShell.tsx:69-77,163-174	Matches docs/02_DESIGN/NAVIGATION.md §2 exactly; future tabs correctly disabled with "Soon" tooltip
Breadcrumbs	✅ Complete	ProjectShell.tsx:99-105	Projects → Project name
AI Sessions: global + project-scoped, filterable	✅ Complete (UI only)	SessionsPage.tsx:48-49,206,233-234	`FilterTab = "all"
Project Overview → recent sessions + "View all"	✅ Complete (UI only)	ProjectOverviewPage.tsx:361-383	Uses its own separate DEMO_SESSIONS array, not shared with SessionsPage.tsx
Takeoff data model (proposed/approved/rejected, source coords, audit history)	🟡 Partial	ProjectTakeoffPage.tsx:29-44,91	Type-level design is genuinely good and matches the intended traceability model; entirely static demo array
Document pipeline states (queued/ingesting/classifying/detecting/complete/error)	🟡 Partial	ProjectDocumentsPage.tsx	State machine modeled correctly; no real upload path drives it
Document upload UI	🟠 Prototype	ProjectDocumentsPage.tsx:146-172	"Upload Files" button and "browse" button have no onClick handler; drop zone's onDrop only calls preventDefault() — files are discarded
Drawing viewport / evidence overlay	🟠 Prototype (self-documented)	BlueprintViewport.tsx:1-21	Explicitly commented as a "STATIC VISUAL DEMO," not connected to real drawing data
Auth flow	🟠 Prototype (honest stub)	AuthPage.tsx:252-258	Validates fields client-side, then explicitly tells the user: "Supabase Auth is not connected in this frontend build yet." Good practice — does not fake success
Desktop title bar / window controls	✅ Complete	DesktopTitleBar.tsx:120-245	Real @tauri-apps/api/window calls (minimize/maximize/close), with browser fallback via console.log
Animated dark/light theme transition	✅ Complete, sophisticated	DesktopTitleBar.tsx:145-218, global.css:306-330	View Transition API + 36-keyframe liquid clip-path animation, prefers-reduced-motion fallback, startViewTransition feature-detection fallback
Theme tokenization	🟡 Partial	global.css	1,127 var(--…) usages vs. 197 raw hex literals remaining (mostly inline SVG demo colors)
Rust/Tauri backend	🔴 Missing	src-tauri/src/lib.rs, main.rs	Stock Tauri template (tauri::Builder::default() + dev-only logging plugin). Zero #[tauri::command]s, zero custom logic
Any AI integration (Brain/Perception/Tools/Memory)	🔴 Missing	repo-wide grep for invoke( returns nothing outside window controls	docs/04_AI/* (8 documents) describe an entire agentic system with none of it implemented
Persistence / database	🔴 Missing	No Supabase client, no local storage schema beyond theme preference and one vectoris.themePreference key	—
File-system access via Tauri	🔴 Missing	No @tauri-apps/plugin-fs or plugin-dialog in package.json/Cargo.toml	Cannot actually open a file dialog despite "browse" button in UI
Windows installer config	✅ Complete	tauri.conf.json — bundle.targets: ["nsis","msi"], real icons, publisher/copyright metadata	Not yet verified to build (not run here — no code changes made)
Content Security Policy	⚠️ Incorrect / conflicts with best practice	tauri.conf.json: "security": { "csp": null }	CSP explicitly disabled; contradicts docs/03_ARCHITECTURE/SECURITY.md intent (not fully verified)
3. What's Remaining
P0 — Must fix now
Wire the document upload flow to an actual Tauri file dialog / drop handler (ProjectDocumentsPage.tsx:146-172) — currently a complete no-op.
Decide and document the near-term backend reality: docs mandate Supabase + FastAPI + Redis/Celery + a fine-tuned Perception/Brain model stack (docs/03_ARCHITECTURE/TECH_STACK.md:1-24); none of this exists. Either scope it down for a real MVP milestone or stop describing it as "LOCKED."
Set an actual CSP in tauri.conf.json instead of null before any real network/file capability is added.
Consolidate the five duplicated DEMO_PROJECT objects (ProjectDocumentsPage.tsx:46, ProjectOverviewPage.tsx:121, ProjectReportsPage.tsx:40, ProjectTakeoffPage.tsx:61, ProjectWorkspacePage.tsx:72) and the two separate DEMO_SESSIONS arrays into one shared mock/data layer before any real API integration — otherwise the migration to real data will require touching 5+ files per entity.
P1 — MVP
Real PDF rendering (PDF.js, per docs/03_ARCHITECTURE/TECH_STACK.md:24) to replace the static SVG BlueprintViewport/workspace canvas.
Auth: connect the already-honest AuthPage.tsx stub to a real provider.
A real, minimal Tauri command surface (#[tauri::command]) for file selection/reading — currently src-tauri/src/lib.rs has none.
Global search input is currently readOnly (AppShell.tsx:126) — either implement it or remove the affordance; a fake, unusable search box actively damages trust in a "desktop engineering tool."
P2 — Polish
Split the four 800–1000 line page components (ProjectOverviewPage.tsx 999 lines, SessionsPage.tsx 889, ProjectTakeoffPage.tsx 887, ProjectWorkspacePage.tsx 816, SettingsPage.tsx 859) into smaller units.
Remove the unused motion dependency (package.json) — never imported anywhere in src/.
Replace remaining 197 hardcoded hex colors in global.css with tokens.
Add cleanup for the several bare setTimeout calls fired from event handlers (see §4).
P3 — Future
Everything in docs/04_AI/* (Brain, Perception, Tool System, Memory, Training, Evaluation) — none of it should be started until Documents/Takeoff prove out with a real backend.
Estimate/Bid tabs (already correctly stubbed and disabled in UI).
4. Code Quality Findings

Severity: Medium
File: src/pages/ProjectReportsPage.tsx:127-142, SettingsPage.tsx:134-146, SessionsPage.tsx:276-289
Component: ProjectReportsPage / SettingsPage / SessionsPage
Problem: setTimeout calls started inside click handlers (export generation, save, chat "AI reply") are never cleared if the component unmounts before they fire.
Why it matters: If a user navigates away mid-action, the timer still fires and calls setState on a stale closure — harmless today with static mock data, but this pattern will produce real bugs once these timers are replaced by actual async API calls.
Recommended direction: Store timer IDs in a ref and clear them in a useEffect cleanup, or migrate to a cancellable async pattern (AbortController) when real requests replace the simulation.

Severity: Medium
File: src/pages/ProjectDocumentsPage.tsx:159-172
Component: ProjectDocumentsPage (dropzone/upload button)
Problem: "Upload Files" button and the "browse" text button have no onClick; onDrop calls e.preventDefault() and resets dragOver but never reads e.dataTransfer.files.
Why it matters: This is the single most load-bearing interaction in the entire product ("Documents → Document Understanding") and it currently does nothing at all — not even a toast or console log.
Recommended direction: At minimum wire to @tauri-apps/plugin-dialog's file picker and log the selection into the existing DEMO_DOCS state shape, which is otherwise ready for it.

Severity: Low–Medium
File: All 5 Project*Page.tsx files
Component: DEMO_PROJECT constants
Problem: Identical {id:"p1", name:"ABC Data Center", client:"Equinix", ...} object is copy-pasted five times.
Why it matters: Currently in sync by luck/discipline, not by design. Any change (e.g., renaming the demo project) requires five coordinated edits, and it signals there is no shared state/service layer at all — not even a simple context or mock API module.
Recommended direction: Introduce a single src/data/mockProjects.ts (or a lightweight React Context) now, before any real API layer is introduced — this is the natural seam where a real client will slot in later.

Severity: Low
File: package.json
Problem: motion (Framer Motion successor) is a listed dependency but is never imported anywhere in src/. All animation is done by hand (CSS + Web Animations API + View Transitions).
Why it matters: Dead weight in bundle/install size; also slightly misleading for a new contributor who assumes it's the animation system in use.
Recommended direction: Remove it, or start using it consistently — right now the project has effectively opted for hand-rolled animation, which is fine, but the dependency should reflect that decision.

Severity: Low
File: src/components/AppShell.tsx:58-65,118-129,138-152
Problem: Org switcher button, search input (readOnly), and user chip are all visually interactive but functionally inert.
Why it matters: These are exactly the affordances a "real desktop app" needs to feel real; leaving them as dead chrome is the biggest gap between "looks like Notion/Linear" and "is a working app."
Recommended direction: Either wire minimal handlers (even a "Coming soon" popover, consistent with how Estimate/Bid tabs are already handled) or visually de-emphasize them until functional.

Severity: Info (positive)
File: src/components/BlueprintViewport.tsx:1-21, AuthPage.tsx:252-258
Observation: Both of these are commendably self-honest about being non-functional — the component doc-comment explicitly forbids treating the SVG as real data, and the auth form explicitly tells the user Supabase isn't connected rather than faking a successful login. This is a good pattern; it should be the house style for every other stub (upload button, org switcher) rather than the exception.

5. Architecture Findings
No shared data/service layer. Every page owns its own DEMO_* mock arrays (§2, §4). This is the single biggest architectural risk for the next phase: when a real backend arrives, the natural refactor boundary (a data-fetching/service layer) doesn't exist yet, so the backend integration will likely be done page-by-page and inconsistently unless this is fixed first.
Zero Tauri command surface. src-tauri/src/lib.rs is the unmodified Tauri scaffold. All of "local-first," "local engine status," "436 sheets indexed" (AppShell.tsx:92-111) is currently pure UI decoration with no underlying local process to report on. This is fine for a prototype but means the "local-first desktop engineering workstation" positioning (tauri.conf.json longDescription) is aspirational, not real.
Documentation describes an architecture roughly two orders of magnitude larger than what exists. docs/04_AI/* (Brain, Perception, Tool System, Memory, Training, Evaluation, Agent Runtime — 7 documents) and docs/03_ARCHITECTURE/TECH_STACK.md's Supabase/FastAPI/Redis/Celery/Cloudflare stack have no corresponding code anywhere in the repo. This isn't wrong for a "north star" doc set, but the docs mark several of these as LOCKED, which reads as decided/in-progress rather than aspirational — worth a status pass (see §7).
CSP disabled ("csp": null). For a desktop app that will eventually handle untrusted drawing files and (per docs) call out to AI services, starting from "no CSP" rather than tightening a default policy is a decision that should be deliberate and documented, not a leftover default.
Duplicate/parallel mock "sessions" state (ProjectOverviewPage.tsx vs SessionsPage.tsx) is a smaller instance of finding #1 but specifically undermines the "one shared AI Session architecture" requirement from the audit brief — architecturally there are two disconnected in-memory session lists today, even though the UI links between them correctly via URL params.
6. UX / Design Findings

Strengths, genuinely:

The dark/light theme transition (View Transition API + generated liquid clip-path, DesktopTitleBar.tsx:166-218) with full prefers-reduced-motion and unsupported-browser fallbacks is well above the bar for a prototype at this stage — most Tauri/React scaffolds don't attempt this at all.
prefers-reduced-motion handling is applied consistently and repeatedly (14+ occurrences across components and 12+ @media blocks in global.css), not just bolted on in one place.
The type-provenance badge on project headers (ai_inferred / user_provided / verified — ProjectShell.tsx:219-243) is a small but meaningful UX detail that correctly encodes the product's core trust/auditability principle at the component level.
Future tabs (Estimate/Bid) are visible-but-disabled with a "Soon" tag rather than hidden — matches the explicit navigation spec and is good product communication.

Where it currently feels like "a website wrapped in Tauri" rather than a real desktop app:

The global search bar is fully styled (icon, ⌘K hint, kbd tag) but is readOnly — a user pressing ⌘K gets focus on a box that accepts no input. This is the fastest way to break the "native tool" illusion for a power-user audience.
Org switcher, notification bell ("1 unread," hardcoded), and user chip ("Hardik Bhaskar," hardcoded) are static — there's no sense that this is your data, which matters a lot for a tool whose entire value proposition is trust and evidence traceability.
The Dashboard's "live" blueprint viewport is explicitly a canned SVG, and while it's honestly labeled ("VISUAL PREVIEW"), the label is small and the surrounding chrome (pulsing "live" dot, "Active Sheet" badge, "142 Components Detected") is designed to look live — the honesty label is fighting the rest of the component's visual language.
The 1500ms theme-transition duration is on the long side for something a user may toggle repeatedly; worth user-testing against a shorter (600–900ms) variant.
7. Documentation Drift
Doc claim	Reality	Location
Metadata DB, Auth = Supabase, LOCKED	No Supabase client anywhere in the repo; package.json has zero backend dependencies	docs/03_ARCHITECTURE/TECH_STACK.md:20-21
Background jobs = Redis + Celery, LOCKED	Not present at all	docs/03_ARCHITECTURE/TECH_STACK.md:22
Drawing viewer = PDF.js + React-Konva, RECOMMENDED	No PDF rendering library installed; viewer is a static hand-drawn SVG	docs/03_ARCHITECTURE/TECH_STACK.md:23-24, BlueprintViewport.tsx
Full agentic "Brain + Perception + Tools + Memory + Control," listed as MVP in-scope	Zero AI integration; SessionsPage responses are hardcoded template strings on a setTimeout	docs/MVP_BOUNDARY.md ("In Scope" table), SessionsPage.tsx:276-289
"Local Core Engine" / "Local Ready" / sheet-indexing progress bar implies a running local process	No Tauri command exists to back this; it's a static 60% / "436 sheets indexed" string	AppShell.tsx:91-111
Frontend motion = "Motion / Framer Motion," RECOMMENDED	Installed but never imported; all real animation is hand-written CSS/WAAPI	package.json, repo-wide grep
ReactBits / Bklit UI listed as LOCKED component ecosystem	No such packages in package.json; components are hand-built	docs/03_ARCHITECTURE/TECH_STACK.md:29-35

The pattern across all of these is consistent: the docs/ tree reads as a finished, decided architecture ("LOCKED" status markers throughout), while the actual repository is a frontend-only visual prototype. This isn't necessarily a problem — decision docs are often written ahead of implementation — but the "LOCKED" language will mislead a new contributor or reviewer into thinking these integrations exist or are imminent.

8. Recommended Build Order
Consolidate mock data into one shared module (kills the 5x DEMO_PROJECT duplication and the split session lists) — this is cheap now and expensive later.
Wire real file selection via a Tauri dialog/fs plugin into the existing, well-modeled Documents pipeline state machine (queued → ingesting → classifying → detecting → complete/error).
Add a minimal real Tauri command layer in src-tauri/src/lib.rs (even just "list files in a folder," "read a PDF's page count") so "local-first" claims start to be true in small, verifiable increments.
Real PDF rendering to replace BlueprintViewport's static SVG — this unblocks Documents, Workspace, and Takeoff simultaneously since they all reference the same underlying "drawing" concept.
Decide and narrow the backend stack for real (Supabase vs. something simpler) and connect Auth — AuthPage.tsx is already fully built and waiting for exactly one integration point.
Only after 1–5: begin any AI/Brain/Perception work. Building that before there's a real document pipeline to feed it repeats the same "architecture before validated need" trap the DrawSpec README (Research Folder/README.md) explicitly warned against for the prior iteration of this same company's product.
9. FINAL VERDICT
What percentage of Vectoris is actually implemented? Roughly 15–20% of what docs/ describes. Nearly 100% of the navigation/IA and visual design system exists; effectively 0% of the backend, AI, auth, and real file/document pipeline exists.
What is the biggest technical debt? The complete absence of a shared data/service layer — five copies of the same demo project object, two disconnected session lists. It's cheap to fix now and will get expensive fast once real data starts flowing through these pages.
What is the biggest UX/design problem? Interactive-looking chrome that does nothing — the read-only search bar, the inert org switcher/upload button/browse link. These specifically undercut the "real desktop tool you can trust" impression that the rest of the design (theme system, provenance badges, evidence model) works hard to build.
What should be fixed before another page is built? Nothing new should be built until (a) mock data is consolidated into one module and (b) the Documents upload flow actually accepts a file — every other page is downstream of "a document exists."
What should be built next? A minimal, real Tauri command for file selection/reading, wired into the already well-designed Documents pipeline states.
Is the current architecture safe to continue building on? The navigation/routing/component architecture, yes — it's clean and matches its own spec closely. The product architecture (data flow, backend, AI) does not exist yet, so "continuing to build on it" mostly means continuing to add more mock-data pages, which will compound the duplication problem in Finding #4/§5.
What would you refactor now before the codebase grows? Extract a src/data/ mock-service module today, before adding any more pages — every page added under the current pattern is another copy of DEMO_PROJECT waiting to drift out of sync.