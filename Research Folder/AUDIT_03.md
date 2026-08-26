Vectoris — Pre-Backend Full Repository Audit (Current State)

Read-only audit. Repository cloned directly from HardikBhaskar2010/Vectoris (single commit visible via shallow clone, e41c987, dated 2026-08-26). No files modified. I did not treat Research Folder/AUDIT_01.md or AUDIT_02.md as ground truth — every claim below is backed by code I read directly during this session.

1. Executive Verdict
Dimension	Score
Overall implementation maturity	4/10
Frontend maturity	7/10
Architecture alignment	6/10
Data/service architecture	6/10
Tauri/Desktop readiness	6/10
Security posture	6/10
Code quality	7/10
UX/design quality	7/10 (static review only — no rendered visual pass)
Backend readiness	3/10
Production readiness	2/10

Is Vectoris ready to begin real backend implementation?

YES, WITH BLOCKERS

The frontend has a real service seam (dataService.ts, engineService.ts, fileDialogService.ts), a single canonical type system (data/types.ts), and a disciplined "honest state" culture (no fake AI replies, no fake processing timers, Auth explicitly tells the user Supabase isn't wired). That is a legitimate foundation. But there are structural gaps that will cause real rework if backend work starts today.

Genuine blockers (detailed in §14):

No real file persistence path exists anywhere in the app — file_path is a field with no producer (see §4).
Two parallel, disconnected takeoff/line-item data sources exist (dataService's LineItem/Detection model vs. ProjectWorkspacePage.tsx's hand-coded TAKEOFF_ITEMS/SVG detections) — building a backend against dataService alone will not match what the Workspace page actually renders.
Entity IDs are client-generated via Date.now() string concatenation, not UUIDs — this needs to change before a real DB assigns identity, or every mock ID becomes a migration problem.
The updater's release endpoint (github.com/VectorisAI/Vectoris) does not match the actual repository (github.com/HardikBhaskar2010/Vectoris) — the updater cannot function until this is corrected or the org actually exists and mirrors releases.
2. Documentation vs. Current Reality
Area	Documentation says	Current reality	Status	Evidence
Desktop shell	Tauri (Rust), LOCKED	Tauri 2.11.3, frameless window, CSP configured	IMPLEMENTED	tauri.conf.json, Cargo.toml
Frontend framework	React+TS+Vite, LOCKED	React 19, TS 5.9, Vite 7	IMPLEMENTED	package.json
Drawing viewer (PDF.js + React-Konva)	RECOMMENDED	Neither dependency present; canvas is hand-authored static SVG with hardcoded detection geometry	MOCKED	no pdfjs-dist/konva in package.json; ProjectWorkspacePage.tsx L55-92 hardcodes TAKEOFF_ITEMS per sheet id, raw <svg> <g> elements with literal coordinates
assistant-ui (AI chat foundation)	LOCKED	Not present; Sessions UI is fully hand-built React	DRIFT	no assistant-ui/related packages in package.json; SessionsPage.tsx is custom
Bklit UI / ReactBits / Skiper UI / Driver.js / Thinking Orbs	LOCKED	None present anywhere in dependency tree	DRIFT	package.json has only motion, react, react-dom, Tauri packages
Motion library (Framer Motion)	RECOMMENDED	motion (Framer Motion successor) present, used for theme transitions and card animation	IMPLEMENTED	package.json; usage in DesktopTitleBar.tsx, ProjectCard.tsx
Supabase Auth (LOCKED)	LOCKED	No Supabase SDK; Auth page validates client-side then explicitly tells the user "Supabase Auth is not connected in this frontend build yet"	HONEST STUB	AuthPage.tsx L253-259
Redis + Celery, FastAPI, Supabase DB	LOCKED/RECOMMENDED	No backend code exists at all in this repo — no server/, no Python, no API client code	PLANNED	repo has zero backend directories
Local-first storage of raw drawings	LOCKED	No file is ever written to disk; file selection uses a bare HTML <input type=file>, not @tauri-apps/plugin-fs or @tauri-apps/plugin-dialog	MISSING	package.json has no fs/dialog plugin; fileDialogService.ts uses document.createElement("input")
Document.file_path field (implies local path tracking)	Implied by local-first storage arch	Field exists in types.ts and is passed through addDocuments, but nothing in the codebase ever sets it to a real value	STUB	fileDialogService.ts parseFileMetadata never populates file_path; grep confirms only 4 references, all pass-through
Correction Event / audit ledger (DATA_MODEL.md)	LOCKED (structure)	CorrectionRecord type exists and updateLineItemStatus appends a record with timestamp/user/action, but no model_version/delta/structured taxonomy field from the doc's CorrectionEvent spec	PARTIAL	types.ts L105-112 vs. DATA_MODEL.md §2 Correction Event schema
Confidence score hidden from UI (ADR-12, LOCKED)	LOCKED	No confidence field is rendered anywhere I found in page components	IMPLEMENTED (by omission — consistent)	grep for "confidence" in src/pages/src/components returns nothing user-facing
ReAct loop / tool execution trace (AGENT_RUNTIME.md)	LOCKED (architecture)	ChatMessage.thought_trace exists as a string[] field and is rendered in seeded mock sessions; there is no actual reasoning loop — sending a live message produces no assistant reply at all	MOCKED (seed data only) / MISSING (live)	mockSessions.ts has 4 assistant messages with trace data; SessionsPage.tsx handleSendMessage (L115-127) only appends the user message and never invokes anything that produces a response
Job queue / async processing (EVENT_SYSTEM.md)	LOCKED (Redis+Celery)	Documents are set to upload_status: "queued" and never transition further — no polling, no job, no worker	STUB (honest, not faked)	dataService.addDocuments comment: "Honest state: Queued awaiting engine processing"
Engine status / local core engine	RECOMMENDED	Real Tauri command (get_engine_status) exists and returns core_connected: false truthfully; browser fallback is explicitly labeled	IMPLEMENTED (as a stub, correctly)	lib.rs, engineService.ts
Software updater	Not documented at this granularity in doc set	Fully real Tauri v2 updater integration: real signature-verified check()/downloadAndInstall(), real byte-level progress events, semver comparison, no fake timers	IMPLEMENTED (mechanically) but MISCONFIGURED (see §7)	updateService.ts, tauri.conf.json
Multi-tenant roles/permissions (USER_ROLES.md)	LOCKED	No role-based gating found in UI (no PermissionGate component, no role-conditional rendering)	MISSING	no PermissionGate in src/components; ProjectMember.role exists as data only
Export (XLSX/CSV/JSON/PDF)	LOCKED columns	ProjectReportsPage.tsx exists (388 lines) with FORMAT_DETAILS per format, but no actual file-generation library (no xlsx/papaparse/jspdf in package.json)	MOCKED UI / MISSING generation	package.json dependency list

Documentation drift called out explicitly: the UI-library stack locked across DEPENDENCIES.md, TECH_STACK.md, and COMPONENTS.md (Bklit UI, assistant-ui, ReactBits, Skiper UI, Driver.js, Thinking Orbs) is entirely absent from the actual dependency tree. The frontend is 100% hand-rolled React/CSS. This isn't necessarily bad (it avoids the "Frankenstein UI" the docs warn about), but the docs should stop describing these as LOCKED decisions if they were never adopted, or the team should decide explicitly to drop them.

3. Data Architecture Audit

Is the current frontend domain model a reasonable seam for a real backend? Mostly yes, with one serious exception.

Strengths:

data/types.ts is a single canonical type module, explicitly annotated with its documentation source-of-truth, and closely mirrors DATA_MODEL.md's entities (Project, Document, LineItem, Detection, ChatSession).
dataService.ts is a genuine service boundary: a singleton class with a subscribe/notify pub-sub pattern, React hooks (useProjects, useDocuments, etc.) that wrap it, and a localStorage persistence layer isolated behind loadFromStorage/saveToStorage helper functions. UI components do not touch localStorage for domain data directly (confirmed by grep — the only localStorage calls outside dataService.ts are theme-preference reads/writes, which are legitimately UI-only state).
Project isolation is respected: getDocuments(projectId), getLineItems(projectId), getSheets(projectId) all filter by project_id.

Weaknesses:

Duplicated/parallel state (real problem): ProjectWorkspacePage.tsx defines its own module-level TAKEOFF_ITEMS: Record<string, TakeoffItem[]> with a different shape than dataService's LineItem, and renders detections as literal hand-coded SVG <g> elements (det-1 … det-5) rather than iterating useDetections(sheetId). DashboardPage.tsx similarly defines DEMO_AI_FEED/DEMO_TAKEOFF_ITEMS locally. The Dashboard case is explicitly commented as demo-shaped-like-the-real-API (acceptable, honest placeholder). The Workspace case is not: it's a second, incompatible line-item model sitting next to the "real" one in dataService/mockTakeoff.ts. A backend built against dataService.LineItem alone will not match what the Workspace canvas actually shows.
Client-generated, non-unique-safe IDs: createProject uses `p${Date.now()}`, documents use `d_${Date.now()}_${idx}`, line items use `li-${Date.now()}`, sessions/messages similarly. These are timestamp strings, not UUIDs. They're adequate for a single-user local mock but will need to become server-assigned identifiers (or at least UUIDv4) before real multi-user/sync semantics are meaningful — this is a seam that should be fixed now rather than later, since every mock ID reference embedded in components ("p1", "s1", "det-2", etc.) would otherwise need updating twice.
Correction Event schema is thinner than documented: CorrectionRecord (in types.ts) captures timestamp/user/action/previous_value/new_value/reason but not delta or model_version as separate structured fields the way DATA_MODEL.md specifies for CorrectionEvent. Not a blocker, but a real gap for TRAINING.md's pipeline.
No entity-relationship layer beyond flat filtering — acceptable for a mock, but there's no Sheet ↔ Document foreign-key enforcement (e.g., nothing prevents a Sheet referencing a document_name that doesn't exist in documents).
4. Document Pipeline Audit

Traced end-to-end: selection → validation → dataService → UI. Everything downstream of "validated file object" is either mocked or absent.

Step	Real or mocked	Evidence
File selection	Real (browser <input type=file>), not native Tauri dialog	fileDialogService.ts — no @tauri-apps/plugin-dialog used or installed
Drag/drop	Real, uses native DataTransfer.files	ProjectDocumentsPage.tsx L106, processDroppedFiles
Format validation	Real, extension-based allowlist (pdf/dwg/dxf/bim/rvt/ifc/tiff/tif/xlsx/xls/csv)	fileDialogService.ts SUPPORTED_EXTENSIONS
Size validation	Real, 500MB cap, matches DOCUMENT_UPLOAD.md intent	parseFileMetadata
Metadata extraction	Filename/size/format only — no actual document parsing, no page/sheet count extraction	sheet_count: null is set unconditionally on ingest
Persistence	localStorage only, via dataService.addDocuments	confirmed
Binary storage	None exists. The File/raw_file object is held only transiently in the browser file-input result and discarded — it is never written to disk, never read into a buffer for the app, and file_path (the field that would represent a local path) is never populated	grep confirms file_path has no writer
Project isolation	Respected (project_id filter)	getDocuments(projectId)
Queued/processing state	Honestly frozen at "queued" forever — no timer fakes progression	dataService.addDocuments comment explicitly calls this out
Deletion	Real, removes from store + persists	removeDocument

Verdict: the pipeline is honest about what it doesn't do (no fake processing timers, as the audit brief demanded), but it currently cannot support real ingestion later without adding: (1) a native file-picker plugin (@tauri-apps/plugin-dialog) that returns real OS paths, and (2) either a Rust-side copy-into-app-storage command or a @tauri-apps/plugin-fs read, because the current in-browser File object has no persistent handle once the picker's promise resolves. This is architecturally fine to add later — nothing here needs to be undone — but it is 100% unbuilt today, contrary to what "local-first storage" in STORAGE.md implies is already in place.

5. Tauri / Rust Audit

Is the current Tauri layer safe to become the foundation for the local Vectoris engine? Yes, cautiously — it's minimal and clean, which is exactly the right starting posture.

Cargo.toml: only tauri, tauri-plugin-log, tauri-plugin-updater, tauri-plugin-process, serde/serde_json, log. No fs, shell, http, or sql plugins yet — appropriately minimal attack surface for where the app is.
lib.rs: two #[tauri::command]s, both pure/read-only (get_engine_status, get_platform_info), no file I/O, no process spawning, no external calls. Fully synchronous, no unsafe code, no unwraps that could panic on user input (both commands take no arguments).
capabilities/default.json: permission set is tight — window lifecycle (close/minimize/maximize/toggle-maximize/is-maximized), updater:default, process:allow-restart, process:allow-exit. No filesystem, shell, or dialog permissions granted at all. This is good hygiene but also confirms §4's finding — there is currently no capability wired for real file access.
build.rs is the standard one-line tauri_build::build() — nothing custom, nothing to flag.
Window config: decorations: false (frameless, consistent with DesktopTitleBar.tsx custom chrome), minWidth/minHeight set (1024×700) — reasonable for a desktop-class app.

What must change before introducing filesystem access, local process spawning, Python engine spawning, ingestion, or local AI inference:

Add @tauri-apps/plugin-fs and/or @tauri-apps/plugin-dialog with scoped capabilities (not fs:default, which is broad) — scope to an app-owned document storage directory only.
If a local Python engine is ever spawned, do it via tauri-plugin-shell's sidecar mechanism with an explicit allowlisted binary, not arbitrary Command::new. This is not present yet — good, because it means there's no premature/loose shell permission to fix.
Any local inference/ingestion IPC should get its own dedicated Tauri commands (not reuse get_engine_status), with typed request/response structs and explicit error variants — mirroring the typed error contract already specified in AGENT_RUNTIME.md §3, which the Rust layer does not implement at all today (both commands are infallible by construction).
Long-running work (parsing, detection) will need an async command pattern (tauri::async_runtime or a background task + event emission) rather than the current synchronous command style — not a rewrite, just an addition.
6. Security Audit
Finding	Severity	Detail
CSP allows connect-src http://localhost:5173 ws://localhost:5173 unconditionally	LOW	These are dev-server origins baked into the single tauri.conf.json used for all builds; Tauri normally only serves devUrl in dev config context, but a single shared CSP string that doesn't visibly distinguish dev/prod is worth tightening at release time so a production build can't be coerced into talking to a stray local dev server. Not exploitable today (no code initiates such a request), but worth a documented follow-up.
No dangerouslySetInnerHTML anywhere in src/	INFO (clean)	Confirmed via full-tree grep — zero hits.
No hardcoded secrets, API keys, or private key material in the app source	INFO (clean)	Only the updater's public key (base64 minisign pubkey) is present in tauri.conf.json, which is correct — public keys belong there.
Updater signing key isolation	INFO (clean by omission)	No private key or TAURI_SIGNING_PRIVATE_KEY value present anywhere in the repo, .gitignore explicitly excludes *.key/*.pem/*.pfx/*.p12/*.sig/.tauri/ and .env*. Correct posture — nothing to fix here, just confirm CI injects the private key as a secret at build time (can't verify CI from this repo alone; no CI config present).
Updater release-endpoint org mismatch	HIGH (functional, not exploit)	plugins.updater.endpoints points at https://github.com/VectorisAI/Vectoris/... while the actual repository is HardikBhaskar2010/Vectoris. If VectorisAI doesn't own that repo, the updater will always fail to find releases; if it happens to exist and is not fully controlled by the same team, it's a supply-chain risk (someone else's releases could theoretically satisfy the updater's endpoint if the pubkey ever changed — though as configured today, the fixed pubkey pinning means a mismatched signer would simply fail verification, not silently succeed). Treat as a functional blocker either way (see §14).
No filesystem/shell/http Tauri capabilities granted	INFO (clean)	Confirmed in capabilities/default.json — nothing to exploit yet because nothing is exposed yet.
No dependency audit performed	INFO / not scored	Cargo.lock and package-lock.json were not run through cargo audit/npm audit in this session (no network access to registries beyond what's allowlisted, and doing so would not be "read-only inspection" of app logic) — recommend running both before shipping, not before backend work starts.
Frontend has zero network calls (fetch/axios)	INFO (expected)	Confirms there is genuinely no backend traffic yet — nothing to intercept, nothing to authenticate, because nothing is called.
Auth form does not silently pretend to authenticate	INFO (positive finding)	AuthPage.tsx explicitly surfaces "Supabase Auth is not connected in this frontend build yet" rather than faking a successful login — this is the correct security posture for a stub (no false sense of an authenticated session).

No CRITICAL findings. The one HIGH item is a configuration mismatch, not a vulnerability in the traditional sense — but it will make §7's real-world updater test fail outright, so it's flagged with that severity for planning purposes.

7. Software Updater Audit

Is it actually ready for the first real signed GitHub Release test? No — not because the code is wrong, but because of one configuration mismatch and one unverifiable dependency on CI secrets.

What's genuinely well-built:

Real Tauri v2 @tauri-apps/plugin-updater integration (check() / update.downloadAndInstall()), not a mock.
Real byte-level progress via the plugin's Started/Progress/Finished events — updateService.ts accumulates downloadedBytes/totalBytes from actual event payloads, no interval-based fake progress.
A genuine state machine (idle → checking → up-to-date | update-available → downloading → stay-put | download-failed | check-failed) with a real "Stay Put" pre-installer-handoff state, matching what the audit brief asked to verify exists.
SemVer comparison is hand-rolled but correct for standard major.minor.patch[-prerelease] strings (handles pre-release precedence rules properly).
Failure states are distinguished (check-failed vs download-failed vs install-failed is defined in the type, though I did not find install-failed actually being set anywhere — only declared in the union type; worth confirming intent).
Browser (non-Tauri) fallback returns an honest "unsupported" result rather than pretending to check.
bundle.createUpdaterArtifacts: true and targets: ["nsis", "msi"] are set correctly for Windows updater artifact generation.

What blocks a real first test:

Endpoint/org mismatch (§6) — the endpoint must point at the actual repository that will host the signed release, or the check will 404/fail every time.
Private signing key is (correctly) not in the repo, which means I cannot verify from static inspection alone that CI/release tooling actually has TAURI_SIGNING_PRIVATE_KEY configured and matches the public key embedded in tauri.conf.json. This needs to be confirmed operationally (not a code fix) before a real signed release is cut.
No CI/release workflow files exist in the repo (no .github/workflows/) — so there is currently no automated path that produces a latest.json + signed .exe/.sig artifacts at all. The updater code is ready to consume that artifact; nothing in the repo yet produces it.
install-failed status exists in the type union but I found no code path that sets it — minor, but means a failure during the actual installer handoff (post-"stay-put") would not be distinguished from success in the UI today, since nothing observes the installer process after handoff.

Bottom line: the client-side updater implementation is close to production-grade. The blockers are entirely on the release/CI side (endpoint config + missing release pipeline), not the Tauri/React code.

8. Application Shell / UX Audit (static review)

I reviewed this via source/CSS inspection only — no headless rendering was performed, so layout/clipping claims below are inferred from code, not visually confirmed; treat accordingly.

AppShell.tsx (410 lines) and DesktopTitleBar.tsx (385 lines) implement custom frameless-window chrome (consistent with decorations: false), a theme-transition mechanism, and window-state controls via Tauri's window API.
prefers-reduced-motion is respected in at least three components (DesktopTitleBar, KPICard, ProjectCard, BlueprintViewport) via window.matchMedia, plus three CSS @media (prefers-reduced-motion: reduce) blocks in global.css — this is genuine, not just declared in a doc.
GlobalCommandSearch.tsx (⌘K palette) exists as a real component wired to dataService.searchAll.
Z-index usage across global.css is bounded (max value found: 9999, most values are small integers under 50) — not the chaotic escalating-z-index pattern that usually causes layering bugs, though I can't confirm actual stacking-context correctness without rendering the app.
Event listener hygiene is reasonable: 31 addEventListener calls vs. 30 removeEventListener calls tree-wide — close to 1:1, suggesting cleanup discipline in useEffect returns rather than systemic leaks (I did not verify every single pair individually).
global.css is a single 10,701-line, ~250KB monolith. This is a real maintainability concern (see §10) but not by itself a functional bug.

I did not find obvious dead-file debris (the stray .log files a prior internal audit flagged are no longer present; .gitignore correctly excludes build artifacts, installer binaries, and signing material).

9. AI Sessions Audit

The architecture correctly separates UI → session domain (dataService) → (future backend) at the data layer: SessionsPage.tsx reads through useSessions()/dataService, never touches localStorage directly, and appends messages via dataService.addSessionMessage.

Where it currently creates technical debt for a real AI backend:

No response generation exists at all. Sending a message calls dataService.addSessionMessage with role: "user" and nothing else — there is no simulated assistant turn, no fake streaming, no fake "thinking" delay. This is consistent with the project's "100% honest data" comment header in the file, but it means the Sessions page today is a one-way message log, not a working chat. That's a legitimate, disciplined choice (better than faking a response), but it means the seam for a real streaming AI backend hasn't been exercised at all yet — no SSE/WebSocket handling code exists anywhere in the frontend.
ChatMessage.thought_trace, .evidence, .action_proposal are defined and rendered for seeded mock messages only (mockSessions.ts has 4 assistant messages carrying this data). There is no code path that would populate these fields from a live backend response — the rendering exists, the producer doesn't.
handleApproveProposal calls dataService.updateLineItemStatus directly from the Sessions UI when an action proposal is approved — this correctly reuses the same line-item mutation path Takeoff Review would use, which is a good sign for future consistency (one place owns line-item mutation, not two).

What should remain frontend-only vs. become backend responsibility:

Frontend-only, keep as-is: message list rendering, session search/filter, the 3-panel layout, slash-command insertion, scroll management.
Must become backend responsibility: actual reply generation (currently 100% absent — not even mocked), tool-call execution and its typed error contract (AGENT_RUNTIME.md §3 is fully unimplemented anywhere in this repo, frontend or Rust), evidence retrieval from real documents (currently only literal strings in ChatMessage.evidence), and session/message persistence beyond localStorage (currently no expiry, no multi-device sync, no server authority over message history).
10. Code Quality
Largest files: SettingsPage.tsx (1,259 lines), ProjectOverviewPage.tsx (902), SessionsPage.tsx (876), ProjectWorkspacePage.tsx (764), AuthPage.tsx (598), and global.css (10,701 lines / ~250KB, single file). These are large but not automatically a problem — SettingsPage.tsx covers 11 documented settings categories in one page per SETTINGS.md, so some size is inherent to scope, not sloppiness. I would flag global.css specifically: a single 10.7k-line stylesheet will actively slow down backend-adjacent frontend work (finding/touching styles safely gets harder linearly with file size) and is worth splitting by page/component before it grows further — not urgent, but real.
any usage: only 5 occurrences total, all in one file (ProjectWorkspacePage.tsx), all identical (e as any in an SVG onKeyDown handler) — a narrow, fixable typing gap, not systemic type-safety erosion.
No TODO/FIXME/HACK markers anywhere in src/ — either genuinely clean or markers were deliberately avoided; either way, nothing to triage there.
Duplicated business logic (the one real problem, already flagged in §3): TAKEOFF_ITEMS in ProjectWorkspacePage.tsx is page-owned data that duplicates and diverges from dataService's line-item model. This is the single piece of code quality debt most likely to actively hurt backend integration, because a backend team wiring dataService to real APIs would reasonably assume the Workspace canvas already consumes it — it doesn't.
No evidence of timer leaks, unbounded subscriptions, or obvious race conditions in the files reviewed — dataService's subscribe/notify pattern is straightforward and each hook cleans up its subscription in useEffect's return.
Error handling is present but shallow: dataService's loadFromStorage/saveToStorage both catch and console.warn on failure, silently falling back to defaults — acceptable for a mock store, but this pattern (swallow-and-warn) should not carry forward into real backend error handling, where failures need to surface to the UI per AGENT_RUNTIME.md's typed error contract.
11. Backend Readiness
Capability	Current frontend owner	Future backend owner	Current interface	Missing interface
Auth	AuthPage.tsx (validation only)	Supabase Auth	None (stubbed message)	Real auth call + session token handling
Projects CRUD	dataService (localStorage)	FastAPI + Supabase	dataService.createProject/getProjects	REST client swap-in behind same method signatures
Documents	dataService + fileDialogService	Ingestion Service	dataService.addDocuments	Real upload endpoint, real file transfer, real file_path/storage reference
Processing jobs	None — "queued" is terminal	Job Queue/Workers (Celery)	None	Job status polling/SSE, TakeoffRunSummary status transitions
Takeoff / Line Items	dataService and a second, disconnected copy in ProjectWorkspacePage.tsx	Tool Executor + Control/Verification	dataService.getLineItems/addLineItem/updateLineItemStatus	Must first reconcile the two frontend models before backend wiring, or the backend will only ever reflect half the UI
Sessions / AI chat	dataService (message log only, no generation)	Brain (Agent Core)	dataService.addSessionMessage	Actual reply generation, streaming transport, tool-call/evidence population
Users/roles	Data-only (ProjectMember.role), no enforcement	API Gateway + Control/Verification	None	PermissionGate-style UI enforcement, plus real role checks server-side
Audit events	CorrectionRecord (partial schema)	Correction/Audit Ledger	updateLineItemStatus appends a record	Full CorrectionEvent schema (delta, model_version), server persistence
File ingestion (local engine)	fileDialogService (browser input only)	Local Ingestion Service	None real	Native file picker + fs plugin + Rust-side file handling
PDF/CAD parsing, OCR, perception, measurement	None	Perception Service	None	Entirely unbuilt — no stub even exists
Local model execution / engine lifecycle	engineService (status-only stub, honestly reports core_connected: false)	Local Engine	get_engine_status/get_platform_info Tauri commands	Real lifecycle commands (start/stop/health), job dispatch from Rust

Smallest backend slice to implement first: a real Projects + Documents CRUD API (Auth optional/stubbed initially, or a single dev user) backed by Supabase/Postgres, with the frontend's dataService swapped from localStorage to fetch calls behind the exact same public method signatures it already exposes (getProjects, createProject, getDocuments, addDocuments). This is the smallest slice that (a) proves the API/DB/auth skeleton end-to-end, (b) requires no AI/perception/job-queue infrastructure yet, and (c) doesn't require resolving the Workspace-page data duplication first, since Projects/Documents aren't affected by that split.

12. Real Backend Recommendation
First backend component: Projects + Documents CRUD service (FastAPI or even a thin Node/Express service — see §13 on whether FastAPI is actually needed yet) backed by Supabase Postgres, plus Supabase Auth wired for real (replacing the stub message in AuthPage.tsx).
Why it comes first: it's the only slice with zero dependency on AI/perception/job-queue work, it's the one place the frontend seam (dataService) is already clean and un-duplicated, and it unblocks real multi-device testing of the app shell before anything AI-related needs to exist.
Existing frontend boundary it plugs into: dataService.ts's getProjects/createProject/getDocuments/addDocuments/removeDocument — these method signatures don't need to change, only their internals (swap loadFromStorage/saveToStorage for fetch calls, and the subscribe/notify pattern can stay for local optimistic UI updates layered over server state).
Data contract required: a REST (or RPC) contract for Project and ProjectDocument matching data/types.ts closely enough that the frontend types don't need to change on day one — real UUIDs for id instead of Date.now()-based strings, and a real file_path/storage_reference once native file access is added (§4/§5 prerequisite).
What remains mocked: everything AI (Sessions replies, detections, takeoff proposals), all processing/job status, exports, and roles/permissions enforcement.
Verification strategy: point dataService at the real API behind a feature flag or environment variable, confirm the existing Dashboard/Projects/Project Overview pages render identically from real data as they did from INITIAL_PROJECTS/INITIAL_DOCUMENTS mocks — this is a strong regression check precisely because the mock shapes were designed to match the intended real shapes.
What NOT to build yet: Redis/Celery, any Perception/Brain/Tool Executor code, real-time job status delivery mechanism (SSE/WebSocket — EVENT_SYSTEM.md itself still marks this TBD), and definitely not local AI inference — none of that has anywhere to plug into yet on the frontend besides honest stubs.
13. Backend Architecture Risk — Challenging the Documented Stack

Does Vectoris actually need Supabase + FastAPI + Redis + Celery + AI services + a local engine at the next milestone? No.

Redis + Celery is premature today. There is no job to queue yet — no ingestion, no detection, nothing async exists in the frontend to dispatch to a worker. Standing up a queue now means operating infrastructure with nothing genuine flowing through it. This can wait until Perception work actually starts (Phase 4-adjacent), not Phase 1.
FastAPI vs. something thinner: for a Projects+Documents CRUD slice, Supabase's own auto-generated REST/PostgREST API (with RLS) plus Supabase Auth might cover the entire first milestone with zero custom backend code. FastAPI only earns its place once there's real business logic (tool orchestration, job dispatch, permission logic beyond RLS) that doesn't belong in the database layer. Evaluate whether Supabase's built-in API is sufficient before writing a FastAPI service that, today, would just proxy CRUD.
AI services (Perception/Brain) should stay entirely out of scope until the Phase 0.5 technical spike the docs themselves require has actually run — this repo contains no evidence a spike has been executed (no perception code, no model evaluation artifacts). Building any AI backend infrastructure before that spike directly contradicts the docs' own sequencing rule (IMPLEMENTATION_FLOW.md §2: spike before UI/infra investment).
The local engine (Rust-spawned processes / local inference) should also wait — it depends on decisions (which perception model, local vs. cloud routing) that are explicitly still TBD/PROVISIONAL in PERCEPTION.md and TECH_STACK.md. Building Tauri-side infrastructure for it now would be building around an unmade decision.
What genuinely needs cloud infrastructure now: just the metadata database (Supabase Postgres) and Auth — both are needed for even the smallest real multi-project, multi-device experience, and both are already LOCKED decisions with no open dependency.
What should be proven independently first: native file access (Tauri fs/dialog plugins) can and should be built and tested entirely locally, with no cloud component, before any of this — it's a pure desktop-capability problem, not a backend problem, and §4/§5 show it's currently the single biggest gap between "local-first" as documented and as implemented.

Practical read: the honest next milestone is Supabase (DB + Auth) + native file access in Tauri, not the full five-component stack. Everything else in the documented stack is correctly deferred, not because the docs are wrong about the destination, but because building it now would be building infrastructure with nothing real to run through it.

14. Final Blocker List
MUST FIX BEFORE BACKEND
Reconcile the two divergent takeoff/line-item data models (dataService's LineItem/Detection vs. ProjectWorkspacePage.tsx's hardcoded TAKEOFF_ITEMS/SVG detections) — a backend built against one will not reflect the other.
Replace Date.now()-based client-generated IDs with UUIDs (or plan for server-assigned IDs) across dataService.createProject/addDocuments/addLineItem/createSession/addSessionMessage before real persistence exists, to avoid an ID-migration problem later.
Add a real native file-access path (Tauri fs/dialog plugin with scoped capability) — without it, file_path remains a field with no producer and "local-first storage" cannot function even in principle.
SHOULD FIX BEFORE BACKEND
Correct or confirm the updater's release endpoint (VectorisAI/Vectoris vs. the actual HardikBhaskar2010/Vectoris repo) before attempting the first signed release test.
Split global.css (10.7k lines) into page/component-scoped files — not urgent, but it will slow every future frontend change including backend-adjacent wiring.
Expand CorrectionRecord to match DATA_MODEL.md's full CorrectionEvent shape (add delta, model_version) before any correction data needs to feed a real audit ledger.
Add a CI/release workflow that actually produces signed updater artifacts — currently nothing in the repo generates what the updater consumes.
CAN WAIT
UI-library alignment with DEPENDENCIES.md/TECH_STACK.md (Bklit UI, assistant-ui, ReactBits, Skiper UI, Driver.js) — either formally revise those docs or adopt the libraries, but this has no bearing on backend readiness.
Role/permission UI enforcement (PermissionGate) — data model exists, enforcement can be added alongside real Auth.
Export file generation (XLSX/CSV/JSON/PDF libraries) — UI shell exists, generation logic is a self-contained addition later.
AI Sessions reply generation, tool-call execution, streaming transport — correctly sequenced after Perception/Brain work, not before.
Redis/Celery, Perception, Brain, local model inference — all correctly deferred per §13.
15. Final Recommendation
VERDICT

READY WITH CONDITIONS

If I were leading Vectoris engineering, my next 3 moves would be:
Fix the frontend seam before touching the backend at all: unify the Workspace page's takeoff/detection rendering onto dataService's real LineItem/Detection/Sheet model, and switch entity ID generation to UUIDs. This is a few days of frontend work that prevents the very first backend integration from immediately hitting a fork in the data model.
Stand up Supabase (Postgres + Auth) only, and wire Projects + Documents CRUD behind the existing dataService method signatures — no FastAPI, no Redis, no Celery yet. Prove the seam works end to end with the smallest possible surface area.
In parallel, add native file access in Tauri (fs/dialog plugins, scoped capability, an app-owned storage directory) so that "local-first" becomes true for at least one document type before ingestion/perception work starts — this is pure desktop-capability work, fully decoupled from anything AI or cloud, and it's the most honest way to close the gap between what STORAGE.md claims and what the app actually does today.