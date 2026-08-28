# Vectoris — Implementation Reality Audit

**Status:** FINAL
**Scope:** Forensic verification of HEAD (`c9afdc0`) against documentation claims and the latest implementation walkthrough. Docs are treated as intent, not evidence.
**Method:** Full clone, targeted read of `docs/`, then trace of every claimed workflow end-to-end through actual TypeScript/Rust/SQL — not file existence, not doc text.

---

## 1. Executive Summary

Vectoris today is a **real, well-structured project/org/RBAC/document-metadata CRUD app with a genuinely solid Postgres/RLS backend**, wrapped around an **AI "agent" that is almost entirely deterministic keyword matching**, sitting on top of a **takeoff and detection pipeline that does not exist** — every detection, sheet, and line item you can review, approve, or reject in a fresh project is hand-authored mock data, not output of any drawing analysis.

The honest one-line version: **the CRUD skeleton and the database are real; the "AI-native engineering intelligence" the product is named for is not there yet.**

Also: there is still real, named client data (Emerson Climate Technologies invoice/BOQ, a "GB 300" BOQ) sitting in this **public** GitHub repo and its commit history, first flagged in `docs/AUDIT_04.md` and **not yet remediated** as of this HEAD. That's a P0 independent of anything else in this report.

## 2. Repository Snapshot

- HEAD: `c9afdc0` (single commit visible via shallow clone), version `0.2.4`.
- Frontend: React 19 + TypeScript + Vite, no router library (hand-rolled `src/router/`), no state library (custom pub/sub `dataService` singleton + hooks), no test framework in `package.json` (no vitest/jest — the four `*.test.ts` files are hand-rolled scripts wired only through `src/testRunner.ts`, which is not attached to any npm script).
- Desktop: Tauri v2. Rust surface is **4 commands total**: `get_engine_status` (hardcoded standby), `get_platform_info`, `inspect_document_file`, `stage_project_document` (real file copy to app data dir).
- Backend: Supabase/Postgres. 24 tables, all 24 with RLS enabled, 47 policies, several `SECURITY DEFINER` RPCs. This is the most mature part of the codebase.
- No Python/FastAPI backend exists despite `ADR-04` (marked RECOMMENDED, not LOCKED, so this is not a broken promise — just unbuilt).
- No Redis/Celery job queue exists despite `ADR-20` (**LOCKED**) — there is nothing to queue, since there's no processing pipeline.
- `docs/AUDIT_04.md` (a prior self-audit, not trusted as-is but independently re-verified below) already documents real client BOQ files committed to this public repo. Confirmed still present at this HEAD.

## 3. Documentation vs Reality

The `docs/` tree is unusually disciplined for a project this size — ADRs, an MVP boundary doc, a documentation manifest with ownership rules. That discipline is real and worth crediting. But `docs/04_AI/*` describes a five-stage pipeline (Perception → Brain → Memory → Tools → Control) with fine-tuned models, a Hybrid Execution Router, and confidence scoring. The actual `src/ai/` is ~2,600 lines implementing: a regex/keyword-based router, a regex/keyword-based planner, a tool registry that's real but is fed almost entirely mock data, and an optional Groq API call for the final prose (only if `VITE_GROQ_API_KEY` is set — it is not present in `.env.example`, so out of the box this ships with **zero LLM calls anywhere in the product**).

Nothing in the docs is fabricated as a claim of current state where it's explicitly marked FUTURE/CANDIDATE/TBD — the problem is specifically the **latest implementation walkthrough**, which represents this scaffolding as a working agentic system.

## 4. Capability Status Matrix

| Capability | Doc Claim | Status | Evidence |
|---|---|---|---|
| Authentication (Supabase) | Full email/password + deep-link desktop flow | **PARTIALLY_IMPLEMENTED** | `authService.ts` (726 lines) has real Supabase auth calls, real Tauri deep-link listener (`onOpenUrl`) for `vectoris://` callback. Forgot-password / verification flows present. Unverified end-to-end against a live Supabase project (no way to run one here). |
| Organization onboarding / RBAC | Owner/Admin/Manager/Editor/Viewer, org+project scopes | **IMPLEMENTED** | `organizationService.ts`, SQL role helpers (`role_rank`, `my_org_role`, `effective_project_role`), RLS policies gated on role. Real, structurally sound. |
| Project management | Create/list/update projects, multi-tenant | **IMPLEMENTED** | `projectService.ts` + `projects` table/RLS. `createProjectAsync` writes through to Supabase with local optimistic fallback. |
| Local-first document staging | Real file copy to device, metadata to Supabase | **PARTIALLY_IMPLEMENTED** | Rust `stage_project_document` genuinely copies the file to the Tauri app-data dir. `documentService.createDocuments` genuinely inserts a `documents` row. But nothing ever moves the row past `upload_status: "queued"` — there is no downstream consumer of the staged file at all. |
| Drawing workspace | PDF.js + React-Konva viewer (ADR-19) | **DOCUMENTED_ONLY** | Neither `pdf.js` nor `react-konva` (nor any PDF/canvas rendering lib) appears in `package.json`. `BlueprintViewport.tsx` exists but renders against mock detection coordinates, not a real rendered drawing. |
| Live takeoff (detection → count/measure) | Symbol detection, geometry measurement | **DOCUMENTED_ONLY / MOCKED** | No detection engine exists anywhere (Rust or TS). `src/data/mockTakeoff.ts` supplies `INITIAL_DETECTIONS`/`INITIAL_LINE_ITEMS` that `dataService` boots from and that any fresh install displays as if they were real takeoff output. |
| Correction / audit system | Structured `CorrectionEvent`, append-only | **PARTIALLY_IMPLEMENTED** | The data model and UI flow (`updateLineItemStatus`, `correction_history` entries) are real and well-designed, and `correction_events` + RPCs (`approve_line_item`, `reject_line_item`) exist in SQL. But it's correcting mock data, not AI output — the "correction" loop has nothing to correct against in a real pipeline yet. |
| Project Plan | Draft → evidence → claims → diff → Decision conflicts → accept/reject → immutable version | **IMPLEMENTED (structurally) / UNVERIFIED (functionally)** | This is the most complete subsystem: 8 tables, RLS, RPCs (`create_project_plan_draft`, `accept_project_plan_draft`, etc.), a genuine SQL integration test (`supabase/tests/project_plan_test.sql`) exercising the invariants. Frontend (`projectPlanService.ts`) calls the real RPCs. Draft content generation itself is still deterministic template text, not model output. |
| Investigation Workshop / AI chat | Agentic, tool-using, evidence-grounded | **MOCKED / PARTIALLY_IMPLEMENTED** | Real chat session persistence (Supabase). The "agent" answering you is `VectorisDeterministicEngineAdapter` — keyword-matched tool selection, hardcoded electrical formulas (legitimately correct NEC-style math, to be fair), and templated markdown synthesis. Groq is wired but dormant without an API key. |
| Vectoris Router | Intent/complexity/model classification | **MOCKED** | `vectorisRouter.ts` is keyword/regex matching against the inquiry string, not any learned classifier. Functions as designed on paper, but "Router" implies more sophistication than an if/else chain. |
| AI Agent Runtime | ReAct loop, planner decomposition | **PARTIALLY_IMPLEMENTED** | `agentRuntime.ts` genuinely executes a loop: route → build context → plan → execute tools → synthesize. Structurally a real ReAct shape. What's fed into each stage (planner, tool args) is deterministic, not model-driven — so it's a real control loop around a fake brain. |
| Skills | Registered, tool-scoped, permission-enforced | **BROKEN** | `skillRegistry.ts`'s `allowedTools` arrays reference tool names (`inspect_drawing`, `search_project`, `read_project_files`, `update_line_item`) that **do not exist** in `toolRegistry.ts` (real names: `inspect_drawing_region`, `search_projects`, no `read_project_files` tool at all, no `update_line_item` tool at all). Skill-based tool restriction cannot function correctly as written. |
| Tool Registry | Registered, real, authorized, audited | **PARTIALLY_IMPLEMENTED** | See §13 table below. Registry mechanics (registration, role checks, WRITE/READ classification, `requires_human_approval` flag) are real. Most read tools work against real (if largely mock-seeded) data. The one mutation-capable tool (`create_line_item`) is correctly proposal-gated but is **never actually selected** by the deterministic planner in normal chat flow — reachable only if something explicitly calls it. |
| Model Adapter | Configurable model provider | **PARTIALLY_IMPLEMENTED** | Real Groq HTTP call exists and is correctly used only for the *final synthesis* text, with fallback on any failure. Planning/tool-selection is **never** delegated to the model, Groq or otherwise — this is true even in the Groq adapter class. |
| Human confirmation gates | State-mutating calls require approval | **PARTIALLY_IMPLEMENTED** | Correctly designed at the tool level (`requires_human_approval`, `classification: "WRITE"`) and at the Project Plan level (draft/accept/reject). Weak in practice because the chat agent almost never reaches a WRITE tool to begin with. |
| Offline resilience | Full usability offline, no silent data loss | **MOCKED claim / STUB implementation** | `useOnlineStatus` is a plain `navigator.onLine` listener, display-only. `dataService` uses `localStorage` as a cache with **fire-and-forget** async Supabase sync (`.catch(err => console.warn(...))` everywhere) — no mutation queue, no retry, no conflict resolution, no reconciliation on reconnect. If a Supabase write fails while "offline," it is silently dropped, not queued. The claim as stated ("no silent data loss") is **false** against this implementation. |
| Supabase persistence | Durable backing store | **IMPLEMENTED** | Real, and the best-built part of the system: 24 tables, RLS everywhere, RPCs for every guarded mutation, foreign-key consistency triggers (`check_*_project_consistency`). |

## 5. End-to-End Workflow Audit (selected)

**Sign up → org → project → dashboard:** Real path exists through `authService` → `organizationService.createOrganization` (auto-creates "Personal Workspace" if none) → `projectService.getProjects`. Structurally sound. Unverified live (no reachable Supabase project to exercise from this sandbox).

**Upload document → "processing" → takeoff appears:** Breaks at step 3. File is genuinely copied to disk (Tauri) and a genuine `documents` row is inserted (`upload_status: "queued"`). Nothing ever reads that file again. The takeoff/detections you'd see are the same static mock arrays regardless of what you uploaded. This is the single most important gap in the product: **the thing the MVP boundary doc calls the entire reason for the product to exist — "turn electrical drawings into a trustworthy, editable, evidence-backed first-pass takeoff" — has no pipeline behind it at all.**

**Chat with the agent → tool call → evidence → approve proposal:** Real control loop, fake brain, dead-end mutation path (see Skills/Tool Registry above). You can chat and get plausible-sounding, keyword-triggered responses citing mock sheet "E-104" data; you cannot get the agent to actually propose and land a new line item through the exposed chat flow, because the deterministic planner never emits `create_line_item`.

## 6. Supabase Audit

Genuinely strong. 24/24 tables have RLS enabled. Role-check helper functions correctly use `SECURITY DEFINER` to avoid RLS self-recursion (previously flagged and fixed per `AUDIT_04.md`, independently re-verified in the SQL at this HEAD). Mutations mostly route through RPCs rather than raw table access where audit trails matter (`approve_line_item`, `reject_line_item`, `soft_delete_document`, `create_project_plan_draft`, etc.). One residual gap noted by the prior audit and still present: `org_members`/`project_members` UPDATE policies validate the `role` column via `WITH CHECK` but don't restrict which columns an UPDATE can touch, so a privilege-bearing member could in principle also rewrite `user_id` on someone else's membership row in the same statement. Not re-derived independently here beyond confirming the policy text still lacks a column-level `GRANT UPDATE (role)` restriction — treat as credible given the SQL matches the quoted policy.

## 7. Tauri / Storage Audit

Real and honest where it exists, just narrow. `inspect_document_file` and `stage_project_document` do real filesystem work (existence checks, size limits, real `std::fs::copy`). `get_engine_status` is **hardcoded** to always return `"standby"` / `core_connected: false` — there is no "core" to connect to. This is labeled honestly in code comments ("Honest: Local inference engine in standby") — credit for not faking a false-positive status, but it means the "engine" concept in the UI (`EngineStatusDialog.tsx`) has nothing behind it and never will without new Rust/native work.

## 8. Takeoff Audit

**DEMO DATA DISPLAYED IN AN ENGINEERING-LOOKING UI.** Full stop. `src/data/mockTakeoff.ts` is the sole origin of `Detection`, `LineItem`, `Sheet`, `LayerDef` records for any project until a human manually adds one via the UI or chat evidence flow. There is no code path — Rust, TS, or SQL — that derives a detection from pixel/vector data in an uploaded document. The correction/approval workflow that sits on top of this data (`updateLineItemStatus`, `updateDetectionStatus`, bidirectional detection↔line-item sync) is genuinely well-built and does persist to Supabase — it's a real review/audit UX for takeoff data that happens to not yet have a real source.

## 9. Project Plan Audit

Best-implemented AI-adjacent subsystem in the repo. Real schema (8 tables), real RLS, real RPCs implementing the documented draft→evidence→claims→diff→decision→accept/reject→immutable-version flow, and a real SQL integration test file exercising claim identity stability and tenant isolation invariants (`supabase/tests/project_plan_test.sql`). The AI "synthesis" step that generates draft claims is still templated/deterministic content, not model reasoning — so classify the data/workflow layer as IMPLEMENTED and the "AI proposal mechanism" specifically as MOCKED.

## 10. Investigation Workshop / AI Audit

| Stage | Status |
|---|---|
| Router (intent/complexity/model select) | MOCK (regex) |
| Context builder | PARTIAL (pulls real project/session data where present) |
| Skill selection | BROKEN (tool-name mismatch, see §4) |
| Tool selection | MOCK (regex/keyword planner) |
| Authorization | REAL (role checks in `toolRegistry.executeTool`) |
| Model adapter | PARTIAL (Groq wired but only for prose synthesis, and only if a key is configured — none is by default) |
| Runtime / control loop | REAL (structurally: route → context → plan → execute → synthesize) |
| Tool execution | REAL mechanics, reading mostly-mock data |
| Evidence | MOCK (hardcoded fallback sheet "E-104" / "Grid Area D-4" strings appear when a tool doesn't supply real coordinates) |
| Session persistence | REAL (Supabase `chat_sessions`/`messages`) |
| Human confirmation gate | STRUCTURALLY REAL, PRACTICALLY UNREACHABLE (the one gated tool is never auto-selected) |

## 11. Model Audit

No model is called by default. `resolveDefaultModelAdapter()` only returns `GroqCloudModelAdapter` if `VITE_GROQ_API_KEY` starts with `gsk_`; `.env.example` ships this blank. Default runtime behavior for every install is `VectorisDeterministicEngineAdapter` — not a model, a deterministic simulation, and it is used for **both** planning and (absent a key) synthesis. Even with a key configured, planning/tool-selection still never touches the model — only the free-text closing summary does.

## 12. Skills Audit

4 built-in skills registered (`electrical-distribution-analysis`, `drawing-symbol-interpretation`, `takeoff-variance-audit`, `mep-spec-compliance`), each with an `allowedTools` list. `contextBuilder.ts` calls `skillRegistry.resolveSkillsForInquiry` and does surface `activeSkills` into the routing context — so skills are at least *selected*. But every skill's `allowedTools` references tool IDs that don't match the actual registry (see §4), so the permission-scoping half of the skill system cannot be enforcing anything correctly today. REGISTERED ≠ ACTUALLY ENFORCED here.

## 13. Tool Audit

| Tool | Registered | Callable | Real Impl | Reads Real Data | Writes Real Data | Auth | Audit | Status |
|---|---|---|---|---|---|---|---|---|
| get_project / search_projects / get_project_context | ✅ | ✅ | ✅ | ✅ (Supabase-backed via dataService) | – | ✅ | – | IMPLEMENTED |
| get_project_members | ✅ | ✅ | ✅ | ✅ | – | ✅ | – | IMPLEMENTED |
| search_documents / get_document_metadata | ✅ | ✅ | ✅ | ✅ (metadata only, no content) | – | ✅ | – | PARTIAL |
| list_sheets / inspect_drawing_region | ✅ | ✅ | ✅ | reads mock `Sheet`/`Detection` data | – | ✅ | – | MOCKED (real code, fake source data) |
| search_line_items / get_line_item / get_takeoff_run | ✅ | ✅ | ✅ | reads mock/human-added `LineItem` data | – | ✅ | – | MOCKED (real code, fake source data) |
| create_line_item | ✅ | ✅ (in principle) | ✅ | – | proposal only, gated | ✅ role check | ✅ correction_history on approval | IMPLEMENTED but effectively DEAD CODE via chat (planner never selects it) |
| search_previous_investigations | ✅ | ✅ | ✅ | ✅ (real session data) | – | ✅ | – | IMPLEMENTED |
| calculate_electrical_load / verify_feeder_sizing | ✅ | ✅ | ✅ (real NEC-style formulas) | n/a (pure calc) | – | ✅ | – | IMPLEMENTED |
| propose_project_plan_revision / get_project_plan | ✅ | ✅ | ✅ | ✅ Supabase-backed | proposal via RPC | ✅ | ✅ | IMPLEMENTED |

## 14. Offline Audit

Claim: "Disconnecting network preserves full usability without silent data loss." **Not substantiated.** No offline mutation queue, no retry mechanism, no deterministic replay, no conflict resolution, no sync reconciliation exists anywhere in `src/`. `localStorage` is used purely as an optimistic read cache. Every Supabase write path in `dataService` follows the same pattern: fire the async call, on failure `console.warn` and move on — the in-memory/local state is **not** rolled back and **not** re-queued, so a failed remote write becomes silent, permanent local/remote divergence. This is the most clearly overstated claim in the walkthrough.

## 15. Authentication Audit

`authService.ts` is substantial (726 lines) and covers sign-up, sign-in, sign-out, password reset, session refresh, and a real Tauri `onOpenUrl` deep-link listener for desktop OAuth-style callback handling, with what appears to be a localhost-fallback path for browser dev. This looks like genuine, careful work. It's marked UNVERIFIED rather than IMPLEMENTED here only because there's no live Supabase project reachable from this sandbox to actually drive the flow end-to-end (real signup → real email → real callback → real session). Code-level review gives no reason to doubt it; "audit couldn't run it" is a different classification than "audit found problems."

## 16. UI/UX Stub Audit

Pages all exist and route (`AuthPage`, `DashboardPage`, `OnboardingPage`, `ProjectDocumentsPage`, `ProjectOverviewPage`, `ProjectPlanPage`, `ProjectReportsPage`, `ProjectTakeoffPage`, `ProjectWorkspacePage`, `ProjectsPage`, `SessionsPage`, `SettingsPage`) — 11,376 lines across `src/pages`, non-trivial. Not independently rendered/screenshotted in this audit (no browser/build step run). Given the data layer feeding these pages is a mix of real Supabase reads and mock fallbacks, expect most pages to render honestly-empty states for a brand-new org and mock-populated states for anything touching takeoff/detections — consistent with `dataService`'s design, not a red flag on its own.

## 17. Test Coverage Reality

- **No test framework.** `vitest`/`jest`/anything is absent from `package.json`. The four `*.test.ts` files (`auth.test.ts`, `projectPlan.test.ts`, `toolRegistry.test.ts`, `agentRuntime.test.ts`) are hand-rolled scripts with custom assertion helpers, aggregated by `src/testRunner.ts`, which has **no corresponding npm script** — nothing runs these automatically, in CI or otherwise, as far as this repo shows.
- One genuine SQL integration test: `supabase/tests/project_plan_test.sql`, using real `INSERT`s and `raise exception`-style assertions against actual Postgres invariants (claim identity stability, tenant isolation). This is UNIT/INTEGRATION-level against a real (if ephemeral) database — the strongest test artifact in the repo — but it's the only one, and it only covers Project Plan.
- **UNIT TESTED:** Project Plan claim/diff logic, auth service shape, tool registry RBAC, agent runtime routing — at the level of hand-written scripts, not a real framework, not CI-gated.
- **INTEGRATION VERIFIED:** Project Plan SQL invariants only.
- **END-TO-END VERIFIED:** Nothing. No Tauri workflow tests, no browser E2E, no test that exercises upload→process→review→export.

## 18. Critical Gaps (Ranked)

**P0 — Critical**
1. **Real named client data in a public repo.** `Research Folder/1862-V9-Final CS-Emerson Noida-24.08.2026.xlsx`, `Research Folder/Sample BOQ/BOQ for GB 300 -R1.xlsx`, `Research Folder/Sample BOQ/BOQ. Emerson Climate Technologies.pdf` are all present at this HEAD in a public repository, and line items from them were transcribed into `supabase/migrations/20260827100000_seed_historical_boq_dev_data.sql`. `.gitignore` was updated afterward to exclude these extensions going forward, but the files remain tracked in history and at HEAD — adding a gitignore rule doesn't remove already-committed blobs. Confirmed still present, not remediated. *Affected workflow:* none technically — this is a legal/authorization exposure, not a product bug. *Fix:* stop treating this as a doc-audit item and get it in front of whoever owns the Emerson/GB 300 authorization relationship immediately; history rewrite + force-push + GitHub cache purge request if removal is authorized.
2. **No detection/takeoff pipeline exists.** The product's stated reason to exist has zero implementation. Everything downstream (correction workflow, Project Plan evidence, chat "evidence") is decorating mock data. *Fix:* this is a multi-week-minimum build (ingestion → sheet classification → symbol detection → quantity derivation), not a patch.

**P1 — High**
3. **Skill tool-name mismatch breaks skill-scoped permissions.** `allowedTools` in `skillRegistry.ts` references tool IDs that don't exist in `toolRegistry.ts`. *Fix:* reconcile the two lists; this one is genuinely a small fix once someone decides which names are canonical.
4. **Offline claim is false as implemented.** No mutation queue/retry/reconciliation; failed writes vanish silently. *Fix:* either build a real offline queue or correct the documentation/marketing claim — the gap between claim and code is currently large enough to cause real data-loss surprises for a user who trusts the "no silent data loss" language.
5. **The chat agent can never actually reach its one mutation tool.** `create_line_item` is correctly designed and gated but the deterministic planner never emits it, making the "human confirmation gate" untestable in the one place a user would naturally hit it. *Fix:* either wire a real intent-to-tool path that can select `create_line_item`, or wire real model-driven planning.

**P2 — Medium**
6. **No automated test runner wired into the build/CI.** Four test files exist but nothing runs them without a developer manually importing `testRunner.ts`.
7. **`org_members`/`project_members` UPDATE policies lack column-level grants**, per `AUDIT_04.md` §3, independently re-confirmed present in the current SQL text (not independently re-derived against a live DB in this audit).
8. **Drawing viewer libraries (PDF.js, react-konva) specified in ADR-19 are absent from `package.json`** — `BlueprintViewport.tsx` cannot be rendering real drawing content today.

**P3 — Low**
9. Backend `ADR-04` (Python/FastAPI) and `ADR-20` (Redis/Celery) are unbuilt, but both are RECOMMENDED/LOCKED-for-later rather than claimed-done — not a broken promise, just a reminder the "job queue" architecture has nothing to run on yet.
10. `EngineStatusDialog.tsx` / engine status UI has a permanently hardcoded "standby" backing value — harmless today, but will need real wiring the moment any local inference actually exists.

## 19. Evidence / File References

- `src/services/dataService.ts` — central state/sync boundary, mock-data bootstrap, fire-and-forget Supabase sync
- `src/data/mock*.ts` — sole source of takeoff/detection/session seed data
- `src/services/engineService.ts`, `src-tauri/src/lib.rs` — hardcoded engine standby, real file staging only
- `src/services/documentService.ts` — real Supabase insert, no processing trigger
- `src/ai/router/vectorisRouter.ts`, `src/ai/adapters/modelAdapter.ts`, `src/ai/runtime/agentRuntime.ts`, `src/ai/tools/toolRegistry.ts`, `src/ai/skills/skillRegistry.ts` — full AI pipeline trace
- `supabase/migrations/*.sql`, `supabase/tests/project_plan_test.sql` — schema, RLS, RPCs, only real integration test
- `docs/MVP_BOUNDARY.md`, `docs/ARCHITECTURE_DECISIONS_SUMMARY.md`, `docs/AUDIT_04.md` — documentation baseline and prior audit cross-check
- `Research Folder/`, `.gitignore` — real client data exposure

## 20. Final Verdict

1. **Is Vectoris genuinely functional today?** As a multi-tenant project/document/RBAC CRUD app with a real Postgres backend: yes. As an "AI-native takeoff engineering workstation": no — the core takeoff capability doesn't exist yet.
2. **Truly end-to-end workflows:** org creation, project creation, document metadata persistence, chat session persistence, Project Plan draft/accept/reject data flow, RBAC enforcement.
3. **Partially implemented:** authentication (real, unverified live), document staging (real copy, dead-ends at "queued"), correction/audit workflow (real mechanics, fake source data), AI control loop (real loop, fake brain).
4. **UI shells / stubs:** engine status ("standby" is a constant, not a status), drawing viewer (no rendering library present).
5. **Mocked:** all detections, all line items in a fresh project, chat "evidence" fallback coordinates, the Router's "intent classification," the deterministic model adapter itself.
6. **Implemented but unverified:** live auth flow, live desktop deep-link callback — code looks right, wasn't run against a live backend here.
7. **Overstated claims in the latest walkthrough:** "live takeoff," "Vectoris Router" (implies ML classification, is regex), "AI Agent Runtime" (implies model-driven, is deterministic-with-optional-LLM-prose), "offline resilience" (implies safety guarantees the code doesn't provide), "Skills" (implies enforced tool scoping, is broken).
8. **Five most important things to fix next:** (1) resolve the public client-data exposure, (2) decide whether to build the actual detection pipeline or descope the MVP boundary doc to match reality, (3) fix the skill/tool name mismatch, (4) either build a real offline queue or stop claiming "no silent data loss," (5) give the chat agent an actual path to reach `create_line_item` so the human-approval gate can be exercised by a real user.
9. **Is Vectoris ready for a real pilot?** Not for the pilot use case the product is named for (drawing → trustworthy takeoff). It could plausibly pilot as a project/document/RBAC workspace with manual takeoff entry, if that were an acceptable scope for a pilot customer.
10. **What exactly blocks the pilot:** no detection pipeline means every "AI-detected" quantity a pilot user would see is fabricated demo data, not a first-pass takeoff of their actual drawings. That's disqualifying for the stated MVP boundary until built.