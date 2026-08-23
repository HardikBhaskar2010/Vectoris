# AI Session

## Status
RECOMMENDED

## Purpose
A project-scoped conversational workspace where a user interacts with the Vectoris Agent to reason over project documents, request analysis, review evidence, and approve proposed actions.

## Design Reference

Primary:
`../../designs/stitch/06_AI_Session_Agent_Chat.png`

Implementation reference:
`../../designs/stitch/06_AI_Session_Agent_Chat.html`

Reference purpose:
Visual and UX reference for the AI Session layout — session sidebar, chat canvas, tool-execution reasoning trace, evidence cards, action proposal cards, and the command bar. The dark theme design is the primary reference.

**Design vs. documented behavior:**
- The design shows a "Local LLM & CAD Engine v2.4" label with GPU memory and latency metrics in the sidebar footer — these are **visual demo values**, not product requirements. The concept of displaying local engine status is valid; exact metrics TBD.
- Session names in the design ("Power Distribution & PAC Feeders", "Lighting Takeoff & Fixture Audit") are sample data.
- The "Execute Analysis" button in the top nav is a design prototype shortcut; the documented interaction model is via the command bar.
- The sample engineering values (142 ft cable runs, voltage drop percentages, conductor sizing) in the evidence card are **visual placeholder content**, not product requirements.

---

## User Goal
Ask the Vectoris Agent questions about the current project, request analysis of specific drawings or documents, review AI-proposed actions with evidence, and approve or reject them.

## Entry Conditions
From Project Overview — "Open Session" (existing) or "New Session". A session is always scoped to a specific project.

## Exit Conditions
Returns to Project Overview. The session persists — closing it does not delete it. Users can return to any session from Project Overview's session list.

## Information Architecture

**Two-panel layout:**

**Left: Session Sidebar (persistent)**
- "New Session" button
- Session search
- Session list — each session shows: title, timestamp, and a topic icon
- Active session highlighted with left-border accent
- Local engine status indicator (bottom of sidebar) — TBD exact format; design shows engine name, resource metrics; at minimum a live/idle status indicator is needed

**Right: Chat Canvas (main area)**
- Session title + collaborator avatars (if shared session)
- Message stream (scrollable)
- Command bar (pinned to bottom)

**Message types in the stream:**
1. **User messages** — avatar, name, timestamp, text
2. **Agent responses** — Vectoris Agent avatar, reasoning trace (tool steps), natural language response, embedded evidence cards, action proposal cards

---

## UI Foundation (assistant-ui)

**assistant-ui** provides the underlying conversation framework for the AI Session. However, Vectoris heavily customizes the experience so it does not look like a generic ChatGPT clone. Customizations include:

- **Message Layout:** Engineered for maximum readability of technical data.
- **Tool Execution Cards:** Transparent reasoning trace.
- **Evidence Presentation:** Drawing region thumbnails and source links.
- **Project Context:** Explicit bounding of context to the active project.
- **Document References:** Inline `@` mentions.
- **Approval States:** Action proposal cards requiring explicit user commit.
- **AI Activity Visualization:** The **Thinking Orb** explicitly visualizing states (Processing, Inspecting, Reasoning) with real-time feedback.
- **Citations/Source Links:** Hard-linked to the Drawing Viewer.
- **Engineering-Specific Actions:** Custom UI for takeoff modifications.

---

## Layout
Two-column split: fixed-width session sidebar (~300px) + flexible chat canvas. Top navigation bar (shared with rest of app). Command bar pinned to canvas bottom. See design reference.

## Components
`SessionSidebar`, `ChatMessage` (user variant), `AgentMessage` (agent variant), `ToolExecutionTrace`, `EvidenceCard`, `ActionProposalCard`, `CommandBar`, `SessionListItem`.

---

## User Interactions

### Primary
- Type a message → send to agent
- Review agent reasoning trace (tool execution steps — expandable or always visible per design)
- Inspect evidence card (linked drawing region / telemetry)
- Jump to source evidence in Drawing Viewer from within an evidence card
- Approve an agent-proposed action ("Approve & Commit to takeoff")
- Reject a proposed action
- Create a new session
- Switch between sessions

### Secondary
- Attach a drawing or document reference inline (@ mention syntax — `[@E-104]` per design)
- Search sessions (sidebar)
- Export/share session (header action — TBD, per design reference)
- Use quick-chip suggestions in the command bar
- Open session settings (overflow menu)

---

## AI Behavior

### The Vectoris Agent in a session must:
- Understand which project it is operating in (project context always scoped — the agent does not reason across projects)
- Identify and inspect relevant documents/sheets using the `inspect_drawing` and `read_project_files` tools
- Show its reasoning steps transparently (tool calls are visible to the user, not hidden)
- Produce evidence-linked responses — every factual claim about a drawing links to its source (document, sheet, coordinates)
- Propose actions as proposals, not automatic writes — the user must explicitly approve before any takeoff data is modified
- Ask clarifying questions when information is insufficient
- Refuse or halt when a request is outside its capabilities or requires data it has not inspected
- Distinguish between: what it knows from the drawings, what it has inferred, what it is uncertain about

### The Vectoris Agent must NOT:
- Silently modify approved takeoff data
- Fabricate engineering values not derived from an inspected source
- Claim to have inspected a document it has not inspected
- Present a confidence score as a primary response element (per `../02_DESIGN/UX_PRINCIPLES.md` §2)
- Invent pricing, catalog, or specification information

### Tool Execution Trace
Per the design reference, the agent shows step-by-step reasoning:
```
✓ Understanding Request: Context established for [document]
✓ Inspecting Drawings: Loaded sheet [X]
✓ Identifying Equipment: Found [results]
⟳ Measuring / Calculating... [in progress]
```
This trace is not optional decoration — it is the mechanism by which every AI action is traceable (per `../04_AI/MODEL_GOVERNANCE.md` §3 and `../02_DESIGN/UX_PRINCIPLES.md` §4).

### Evidence Card
When the agent produces analysis from a drawing, it surfaces an embedded evidence card containing:
- A drawing region thumbnail (the relevant sheet area)
- Sheet identifier (e.g., "Sheet: E-104")
- Key extracted values (measurements, counts, classifications) in structured form
- Source reference (document, sheet, coordinates — not just a caption)

These values are AI-proposed. They are NOT finalized until the user approves the associated action.

### Action Proposal Card
When the agent proposes a change to project data (e.g., "Add 3 PAC Feeder assemblies to takeoff"), it surfaces:
- What is being proposed (human-readable)
- The specific items (with quantities and specifications)
- An "Approve & Commit" button
- Implicit option to reject (dismiss, or explicitly reject)

**Approving does not silently apply the change.** It triggers the `update_line_item` or `create_line_item` tool call, which is recorded as a Correction Event with the user's identity and timestamp — see `../03_ARCHITECTURE/DATA_MODEL.md` and `../04_AI/TOOL_SYSTEM.md`.

---

## Data Requirements
Current project context (documents, takeoff state, prior sessions), session message history, agent tool call log, evidence references (document/sheet coordinates).

## API Requirements
- Create session
- Post message (user → agent)
- Get session history (messages + tool calls)
- List sessions for project
- Agent tool calls: `inspect_drawing`, `read_project_files`, `search_project`, `perform_takeoff`, `measure_geometry`, `create_line_item`, `update_line_item`, `get_project_context`
- Approve proposed action (triggers tool mutation with user attribution)

---

## State Model

### Loading
Session history loading — skeleton message stream.
### Empty — New Session
No messages yet. Empty state with suggested prompts or a brief orientation message from the agent explaining what it can do in this project context.
### Active — Conversation in progress
Messages visible, command bar active.
### Agent Thinking
Agent is processing — tool execution trace visible and updating. Command bar disabled or shows "Agent is thinking…" state. User can interrupt (cancel) if supported.
### Evidence Available
Agent has returned results; evidence card(s) embedded in the response stream.
### Action Pending Approval
Action proposal card visible. User must explicitly approve or dismiss before the agent proceeds further.
### Error
Agent failed to complete a step — specific error shown inline (e.g., "Could not parse sheet E-104 — the file may be corrupted"). Retry or escalation path offered. Never a generic "something went wrong."
### Permission denied
Viewer role cannot create or modify takeoff data — approve/commit actions are read-only; the agent still responds but action cards are disabled with a clear role-based explanation.
### Offline
- Session history readable from local cache
- Agent interactions require connectivity (or local model if available)
- Offline state indicated clearly; command bar shows a "Reconnect to continue" state rather than silently failing

---

## Session Sharing & Collaboration
Per `../01_PRODUCT/USER_ROLES.md` §5 — sessions have their own sharing permissions distinct from project access. A session can be shared with specific users. Shared sessions show collaborator avatars (per design reference). The exact sharing mechanics (link-based, invite-based) are TBD.

---

## Accessibility
- Message stream is keyboard-navigable
- Tool execution steps are announced to assistive tech as they complete (ARIA live region)
- Evidence cards have descriptive alt text / labels for screen readers
- Action proposal card buttons have unambiguous labels (not just "OK" / "Cancel")

## Keyboard Interaction
- `Enter` → send message (with Shift+Enter for newline)
- `Escape` → cancel agent action (if agent is thinking and cancellation is supported)
- Standard focus management between sidebar and chat canvas

## Motion
- Message stream: new messages slide in from bottom — per `../02_DESIGN/MOTION.md`
- Tool execution trace: each completed step fades from "in progress" to "done" state
- Evidence card: reveal with fade/slide — not a full-screen modal interrupt
- Action proposal card: subtle entrance to draw attention without being disruptive

## Responsive / Window Behavior
Desktop app window model. Sidebar may collapse to icon-only at narrow widths. Chat canvas is the primary surface and must always be usable.

## Security / Privacy
- Session message content may reference drawing data — session data is treated as confidential project data per `../03_ARCHITECTURE/SECURITY.md`
- Session sharing is explicit and auditable — no accidental public exposure
- Agent tool calls that access drawing content do not log the raw drawing data to external analytics (per `../07_OPERATIONS/OBSERVABILITY.md` §3.2)

## Acceptance Criteria
- AC: The agent always shows its reasoning trace (tool steps) before presenting results — no black-box responses
- AC: Every factual claim in an agent response is linked to a source document/sheet
- AC: An action proposal is never applied without explicit user approval
- AC: A rejection or dismissal of an action is recorded
- AC: A Viewer-role user cannot approve mutations even if the approve button is somehow reached

## Dependencies
`PROJECT_OVERVIEW.md`, `DRAWING_VIEWER.md`, `TAKEOFF_REVIEW.md`

## Open Questions
- Voice input in command bar — seen in design; TBD if MVP or future scope
- File/drawing attachment via command bar (`[@E-104]` mention syntax) — TBD exact mechanics
- Whether session sharing uses link-based or invite-based access — TBD
- Whether a session can be "pinned" or marked important — not in design; TBD
- Exact "cancel agent action" UX when the agent is mid-reasoning — TBD
- Session export format (PDF transcript, JSON log) — TBD
