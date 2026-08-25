/**
 * SessionsPage.tsx — Vectoris Brain Engineering Intelligence Workspace.
 *
 * ARCHITECTURAL PRINCIPLES:
 *   - 3-Panel Responsive Layout: Investigation Index | Brain Workspace | Context & Evidence Inspector
 *   - Structured Engineering Inquiry & Synthesis Records (No consumer chat bubbles)
 *   - Multi-Stage Reasoning Pipeline (Layer Isolation → Vector Measurement → Clearance Check → Code Validation)
 *   - Anchored CAD Drawing Evidence Surface with direct spatial router links
 *   - Takeoff Action Proposals with live ledger review
 *   - Pinned Power Command Composer with contextual slash commands
 *   - 100% Honest Data: zero fabricated latency, VRAM, or simulated streaming timers
 *   - Pure SVG Linear/Iconsax geometry — Zero emojis
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, Link } from "../router";
import { AppShell } from "../components/AppShell";
import type { ChatMessage, ChatSession, Project } from "../data";
import {
  useSessions,
  useProjects,
  dataService,
} from "../services/dataService";

type FilterTab = "all" | "project" | "general";

export default function SessionsPage() {
  const { searchParams } = useRouter();
  const sessions = useSessions();
  const projects = useProjects();

  // State
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<string>("s1");
  const [selectedContextProject, setSelectedContextProject] = useState<string>("general");
  const [inputMessage, setInputMessage] = useState("");
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>("m2");
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Available project choices
  const availableProjects = useMemo(
    () => projects.map((p) => ({ id: p.id, name: p.name, sector: p.sector, discipline: p.discipline, sheets: p.sheets })),
    [projects]
  );

  // Read URL params on initial load
  useEffect(() => {
    const projParam = searchParams.get("project");
    if (projParam) {
      setFilterTab("project");
      const match = availableProjects.find((p) => p.id === projParam);
      if (match) setSelectedContextProject(match.id);
    }
    const sessionParam = searchParams.get("session");
    if (sessionParam) {
      setActiveSessionId(sessionParam);
    }
  }, [searchParams, availableProjects]);

  // Filtered session list
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (filterTab === "project" && s.project_id === null) return false;
      if (filterTab === "general" && s.project_id !== null) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          s.title.toLowerCase().includes(q) ||
          (s.project_name && s.project_name.toLowerCase().includes(q)) ||
          s.last_message_preview.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [sessions, filterTab, searchQuery]);

  // Active session object
  const activeSession: ChatSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || sessions[0] || {
      id: "s_default",
      project_id: null,
      project_name: null,
      title: "No Investigation Active",
      last_message_preview: "",
      message_count: 0,
      created_by: "Hardik Bhaskar",
      created_at: "Just now",
      updated_at: "Just now",
      messages: [],
    };
  }, [sessions, activeSessionId]);

  // Active project context (if attached)
  const activeProject: Project | undefined = useMemo(() => {
    if (!activeSession.project_id) return undefined;
    return projects.find((p) => p.id === activeSession.project_id);
  }, [projects, activeSession.project_id]);

  // Active evidence in the current session (last message with evidence)
  const latestEvidence = useMemo(() => {
    for (let i = activeSession.messages.length - 1; i >= 0; i--) {
      if (activeSession.messages[i].evidence) {
        return activeSession.messages[i].evidence;
      }
    }
    return undefined;
  }, [activeSession.messages]);

  // Engine status
  const engineStatus = useMemo(() => dataService.getEngineStatus(), []);

  // Send message
  const handleSendMessage = () => {
    if (!inputMessage.trim() || !activeSession.id) return;

    dataService.addSessionMessage(activeSession.id, {
      role: "user",
      content: inputMessage.trim(),
    });

    setInputMessage("");
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  // Start new session
  const handleStartNewSession = () => {
    const isGeneral = selectedContextProject === "general";
    const proj = availableProjects.find((p) => p.id === selectedContextProject);

    const newSession = dataService.createSession({
      project_id: isGeneral ? null : (proj?.id ?? null),
      project_name: isGeneral ? null : (proj?.name ?? null),
      title: isGeneral ? "General Engineering Investigation" : `Investigation — ${proj?.name || "Project"}`,
      initialMessage: "",
    });

    setActiveSessionId(newSession.id);
  };

  // Approve takeoff proposal
  const handleApproveProposal = (msgId: string, actionId?: string) => {
    // If proposal has an item code, verify it in dataService
    if (activeSession.project_id && actionId) {
      dataService.updateLineItemStatus(actionId, "approved", "Hardik Bhaskar", "Approved via Vectoris Brain investigation");
    }
  };

  // Quick slash chips
  const handleInsertPromptChip = (text: string) => {
    setInputMessage((prev) => (prev ? `${prev} ${text}` : text));
    textareaRef.current?.focus();
  };

  return (
    <AppShell activePath="/sessions">
      <div className="ses-page">

        {/* ── PANEL 1: Investigation Index (Left Rail) ─────────── */}
        <aside className="ses-sidebar" aria-label="Investigation sessions sidebar">

          {/* Context Scope & New Session Button */}
          <div className="ses-sidebar-header">
            <div className="ses-context-row">
              <label htmlFor="context-select" className="ses-context-label">
                <IconLayerSmall aria-hidden="true" />
                <span>Scope:</span>
              </label>
              <select
                id="context-select"
                className="ses-context-select"
                value={selectedContextProject}
                onChange={(e) => setSelectedContextProject(e.target.value)}
              >
                <option value="general">General Engineering Scope</option>
                {availableProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    Project: {p.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn btn--primary btn--sm ses-new-btn"
              onClick={handleStartNewSession}
            >
              <IconPlus aria-hidden="true" /> New AI Investigation
            </button>
          </div>

          {/* Search bar */}
          <div className="ses-search">
            <IconSearch className="ses-search-icon" aria-hidden="true" />
            <input
              type="search"
              className="ses-search-input"
              placeholder="Search investigations & evidence…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search investigations"
            />
          </div>

          {/* Filter Segmented Tabs */}
          <div className="ses-filter-tabs" role="tablist" aria-label="Session filter">
            <button
              type="button"
              role="tab"
              aria-selected={filterTab === "all"}
              className={`ses-filter-tab${filterTab === "all" ? " ses-filter-tab--active" : ""}`}
              onClick={() => setFilterTab("all")}
            >
              All ({sessions.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filterTab === "project"}
              className={`ses-filter-tab${filterTab === "project" ? " ses-filter-tab--active" : ""}`}
              onClick={() => setFilterTab("project")}
            >
              Projects
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filterTab === "general"}
              className={`ses-filter-tab${filterTab === "general" ? " ses-filter-tab--active" : ""}`}
              onClick={() => setFilterTab("general")}
            >
              General
            </button>
          </div>

          {/* Session Cards List */}
          <ul className="ses-list" aria-label="Session history">
            {filteredSessions.map((session) => {
              const isActive = session.id === activeSession.id;
              const isProject = session.project_id !== null;
              const hasTakeoffProposal = session.messages.some((m) => !!m.action_proposal);

              return (
                <li key={session.id}>
                  <button
                    type="button"
                    className={`ses-item${isActive ? " ses-item--active" : ""}`}
                    onClick={() => setActiveSessionId(session.id)}
                  >
                    <div className="ses-item__top">
                      {isProject ? (
                        <span className="ses-status-pill ses-status-pill--active">
                          <IconFolderSmall aria-hidden="true" />
                          <span>{session.project_name}</span>
                        </span>
                      ) : (
                        <span className="ses-status-pill ses-status-pill--general">
                          <IconCpuSmall aria-hidden="true" />
                          <span>General</span>
                        </span>
                      )}

                      <span className="ses-item__time">{session.updated_at}</span>
                    </div>

                    <h4 className="ses-item__title">{session.title}</h4>
                    <p className="ses-item__preview">{session.last_message_preview}</p>

                    <div className="ses-item__footer-meta">
                      {hasTakeoffProposal && (
                        <span className="ses-status-pill ses-status-pill--takeoff">
                          <IconCheckmarkSmall aria-hidden="true" /> Takeoff Action
                        </span>
                      )}
                      <span>{session.messages.length} records</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Honest Telemetry Footer */}
          <div className="ses-engine-footer">
            <div className="ses-engine-status">
              <span className="ses-engine-dot" aria-hidden="true" />
              <span>Local Desktop Core</span>
            </div>
            <div className="ses-engine-metrics pt-mono">
              <span>{engineStatus.version}</span>
            </div>
          </div>
        </aside>

        {/* ── PANEL 2: Vectoris Brain Canvas (Center) ──────────── */}
        <main className="ses-canvas">

          {/* Session Header */}
          <header className="ses-canvas-header">
            <div className="ses-header-info">
              <div className="ses-header-breadcrumbs">
                <span className="ses-header-brain-mark">
                  <IconBrainMark aria-hidden="true" />
                  <span>Vectoris Brain</span>
                </span>
                <span className="ses-header-sep" aria-hidden="true">/</span>
                <span className="ses-header-scope">
                  {activeSession.project_name ? activeSession.project_name : "General Engineering Context"}
                </span>
              </div>
              <h2 className="ses-header-title">{activeSession.title}</h2>
            </div>

            <div className="ses-header-actions">
              <div className="ses-model-badge">
                <span className="ses-model-dot" aria-hidden="true" />
                <span>Vectoris Brain v1.2</span>
              </div>

              <button
                type="button"
                className={`ses-inspector-toggle-btn${isInspectorOpen ? " ses-inspector-toggle-btn--active" : ""}`}
                onClick={() => setIsInspectorOpen((prev) => !prev)}
                title="Toggle Context & Evidence Inspector"
                aria-pressed={isInspectorOpen}
              >
                <IconInspectorPanel aria-hidden="true" />
                <span>Inspector</span>
              </button>
            </div>
          </header>

          {/* Records / Messages Stream */}
          <div className="ses-messages-stream" aria-label="Investigation stream">
            {activeSession.messages.length === 0 ? (
              /* Empty State Hero */
              <div className="ses-empty-stream">
                <div className="ses-empty-icon-wrap" aria-hidden="true">
                  <IconBrainMarkLarge />
                </div>
                <h3 className="ses-empty-title">Vectoris Brain Engineering Workspace</h3>
                <p className="ses-empty-desc">
                  {activeSession.project_id
                    ? `Ask technical questions, verify CAD drawing layers, measure electrical quantities, or audit takeoffs for ${activeSession.project_name}.`
                    : "Ask electrical engineering, NEC 2026 code lookup, voltage drop calculations, or cable tray sizing questions."}
                </p>

                <div className="ses-prompt-cards-grid">
                  {activeSession.project_id ? (
                    <>
                      <button
                        type="button"
                        className="ses-prompt-card"
                        onClick={() => handleInsertPromptChip("Count all 2x4 troffer lighting fixtures across Server Room B")}
                      >
                        <span className="ses-prompt-card-label">CAD Quantity Takeoff</span>
                        <span className="ses-prompt-card-text">Count all 2x4 troffer lighting fixtures across Server Room B</span>
                      </button>
                      <button
                        type="button"
                        className="ses-prompt-card"
                        onClick={() => handleInsertPromptChip("Calculate voltage drop for 400A RPP subpanel feeder run")}
                      >
                        <span className="ses-prompt-card-label">Feeder Sizing & Drop</span>
                        <span className="ses-prompt-card-text">Calculate voltage drop for 400A RPP subpanel feeder run</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="ses-prompt-card"
                        onClick={() => handleInsertPromptChip("What are the NEC 2026 conduit fill limits for 4 conductors?")}
                      >
                        <span className="ses-prompt-card-label">NEC Code Compliance</span>
                        <span className="ses-prompt-card-text">What are the NEC 2026 conduit fill limits for 4 conductors?</span>
                      </button>
                      <button
                        type="button"
                        className="ses-prompt-card"
                        onClick={() => handleInsertPromptChip("Explain NEMA Class 12B cable tray loading specifications")}
                      >
                        <span className="ses-prompt-card-label">Structural Tray Load</span>
                        <span className="ses-prompt-card-text">Explain NEMA Class 12B cable tray loading specifications</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              activeSession.messages.map((msg) => {
                const isUser = msg.role === "user";
                const isTraceExpanded = expandedTraceId === msg.id;

                if (isUser) {
                  /* ── User Engineering Inquiry Record ── */
                  return (
                    <div key={msg.id} className="ses-record">
                      <div className="ses-inquiry-record">
                        <div className="ses-inquiry-header">
                          <div className="ses-inquiry-user-chip">
                            <div className="ses-inquiry-avatar" aria-hidden="true">HB</div>
                            <span className="ses-inquiry-author">Hardik Bhaskar</span>
                            <span className="ses-inquiry-tag">Inquiry</span>
                          </div>
                          <span className="ses-inquiry-time">{msg.timestamp}</span>
                        </div>
                        <p className="ses-inquiry-text">{msg.content}</p>
                      </div>
                    </div>
                  );
                }

                /* ── Vectoris Brain Synthesis Record ── */
                return (
                  <div key={msg.id} className="ses-record">
                    <div className="ses-synthesis-record">

                      {/* Header */}
                      <div className="ses-synthesis-header">
                        <div className="ses-brain-identity">
                          <div className="ses-brain-avatar" aria-hidden="true">
                            <IconBrainMark />
                          </div>
                          <span className="ses-brain-name">Vectoris Brain</span>
                          {msg.evidence && (
                            <span className="ses-provenance-tag">
                              <IconCheckmarkSmall aria-hidden="true" />
                              <span>Verified Against Evidence</span>
                            </span>
                          )}
                        </div>
                        <span className="ses-synthesis-time">{msg.timestamp}</span>
                      </div>

                      {/* Multi-Stage Reasoning Pipeline */}
                      {msg.thought_trace && msg.thought_trace.length > 0 && (
                        <div className="ses-pipeline-box">
                          <button
                            type="button"
                            className="ses-pipeline-toggle"
                            onClick={() => setExpandedTraceId(isTraceExpanded ? null : msg.id)}
                            aria-expanded={isTraceExpanded}
                          >
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                              <IconPipeline aria-hidden="true" />
                              <span>Reasoning Pipeline ({msg.thought_trace.length} stages)</span>
                            </span>
                            <IconChevronSmall isDown={isTraceExpanded} />
                          </button>

                          {isTraceExpanded && (
                            <ul className="ses-pipeline-steps" aria-label="Reasoning steps">
                              {msg.thought_trace.map((step, idx) => (
                                <li key={idx} className="ses-pipeline-step">
                                  <span className="ses-pipeline-step-badge">{idx + 1}</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {/* Synthesized Engineering Answer */}
                      <div className="ses-synthesis-body">
                        {msg.content.split("\n\n").map((para, pIdx) => {
                          if (para.startsWith("- ") || para.startsWith("* ")) {
                            const items = para.split("\n");
                            return (
                              <ul key={pIdx}>
                                {items.map((it, iIdx) => (
                                  <li key={iIdx}>{it.replace(/^[-*]\s+/, "")}</li>
                                ))}
                              </ul>
                            );
                          }
                          return <p key={pIdx}>{para}</p>;
                        })}
                      </div>

                      {/* Anchored CAD Drawing Evidence Card */}
                      {msg.evidence && (
                        <div className="ses-cad-evidence-card">
                          <div className="ses-cad-evidence-main">
                            <div className="ses-cad-icon" aria-hidden="true">
                              <IconBlueprint aria-hidden="true" />
                            </div>
                            <div className="ses-cad-details">
                              <div className="ses-cad-title-row">
                                <span className="ses-cad-doc-name">{msg.evidence.doc_name}</span>
                                <span className="ses-cad-sheet-tag">{msg.evidence.sheet}</span>
                              </div>
                              <div className="ses-cad-meta-row">
                                {msg.evidence.region && <span>{msg.evidence.region}</span>}
                                {msg.evidence.coordinates && (
                                  <span className="ses-cad-coords pt-mono">{msg.evidence.coordinates}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {activeSession.project_id && (
                            <Link
                              to={`/project/${activeSession.project_id}/workspace?doc=${msg.evidence.doc_id}&sheet=${encodeURIComponent(msg.evidence.sheet)}`}
                              className="ses-cad-jump-btn"
                            >
                              <IconJumpCAD aria-hidden="true" /> Jump to CAD Region
                            </Link>
                          )}
                        </div>
                      )}

                      {/* Takeoff Action Proposal Card */}
                      {msg.action_proposal && (
                        <div className="ses-takeoff-proposal-card">
                          <div className="ses-takeoff-proposal-header">
                            <div className="ses-takeoff-proposal-badge">
                              <IconCheckmarkSmall aria-hidden="true" />
                              <span>Takeoff Action Proposal</span>
                            </div>
                            <span className="ses-takeoff-proposal-status">
                              {msg.action_proposal.status === "approved" ? "Approved into Takeoff Ledger" : "Pending Engineer Review"}
                            </span>
                          </div>

                          <h4 className="ses-takeoff-proposal-title">{msg.action_proposal.title}</h4>
                          <p className="ses-takeoff-proposal-desc">{msg.action_proposal.description}</p>

                          <div className="ses-takeoff-proposal-footer">
                            <div className="ses-takeoff-proposal-codes">
                              <span className="ses-takeoff-code">{msg.action_proposal.item_code}</span>
                              <span className="ses-takeoff-qty">{msg.action_proposal.quantity}</span>
                            </div>

                            {msg.action_proposal.status === "pending" && (
                              <button
                                type="button"
                                className="ses-takeoff-approve-btn"
                                onClick={() => handleApproveProposal(msg.id, msg.action_proposal?.id)}
                              >
                                <IconCheckmarkSmall aria-hidden="true" /> Approve into Takeoff
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Pinned Power Command Composer ──────────────────── */}
          <div className="ses-composer-wrap">
            <div className="ses-composer">

              {/* Context Tag & Slash Command Chips */}
              <div className="ses-composer-context-bar">
                <span className="ses-composer-context-tag">
                  <IconLayerSmall aria-hidden="true" />
                  <span>
                    Scope: {activeSession.project_name ? activeSession.project_name : "General Engineering"}
                  </span>
                </span>

                <div className="ses-composer-quick-chips">
                  <button
                    type="button"
                    className="ses-quick-chip"
                    onClick={() => handleInsertPromptChip("/takeoff")}
                    title="Insert /takeoff command"
                  >
                    /takeoff
                  </button>
                  <button
                    type="button"
                    className="ses-quick-chip"
                    onClick={() => handleInsertPromptChip("/voltage-drop")}
                    title="Insert /voltage-drop command"
                  >
                    /voltage-drop
                  </button>
                  <button
                    type="button"
                    className="ses-quick-chip"
                    onClick={() => handleInsertPromptChip("/tray-capacity")}
                    title="Insert /tray-capacity command"
                  >
                    /tray-capacity
                  </button>
                  <button
                    type="button"
                    className="ses-quick-chip"
                    onClick={() => handleInsertPromptChip("/clearance")}
                    title="Insert /clearance command"
                  >
                    /clearance
                  </button>
                  <button
                    type="button"
                    className="ses-quick-chip"
                    onClick={() => handleInsertPromptChip("/nec-table")}
                    title="Insert /nec-table command"
                  >
                    /nec-table
                  </button>
                </div>
              </div>

              {/* Multiline Textarea */}
              <textarea
                ref={textareaRef}
                className="ses-textarea"
                rows={2}
                placeholder={
                  activeSession.project_id
                    ? `Ask Vectoris Brain about ${activeSession.project_name} drawings, takeoff line items, or feeder specs…`
                    : "Ask electrical engineering, NEC compliance, or cable tray loading questions…"
                }
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />

              {/* Toolbar */}
              <div className="ses-composer-toolbar">
                <div className="ses-composer-hints">
                  <span>
                    Press <kbd className="pt-mono">Enter ↵</kbd> to execute · <kbd className="pt-mono">Shift+Enter</kbd> for line break
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn--primary btn--sm ses-send-btn"
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                >
                  <IconSend aria-hidden="true" /> Send Inquiry
                </button>
              </div>

            </div>
          </div>

        </main>

        {/* ── PANEL 3: Context & Evidence Inspector (Right Rail) ─ */}
        {isInspectorOpen && (
          <aside className="ses-inspector-rail" aria-label="Active Context and Evidence Inspector">

            {/* Section 1: Active Project Scope */}
            <div className="ses-inspector-section">
              <span className="ses-inspector-label">Active Scope</span>
              <div className="ses-inspector-card">
                <span className="ses-inspector-card-title">
                  {activeProject ? activeProject.name : "General Engineering"}
                </span>
                <span className="ses-inspector-card-meta">
                  {activeProject
                    ? `${activeProject.sector} · ${activeProject.discipline || "Electrical"}`
                    : "Universal Electrical / NEC 2026 Standards"}
                </span>
              </div>
            </div>

            {/* Section 2: Active Drawing Sheet Anchor */}
            {latestEvidence && (
              <div className="ses-inspector-section">
                <span className="ses-inspector-label">Active CAD Sheet Anchor</span>
                <div className="ses-inspector-card">
                  <span className="ses-inspector-card-title">{latestEvidence.sheet}</span>
                  <span className="ses-inspector-card-meta">{latestEvidence.doc_name}</span>
                  {latestEvidence.region && (
                    <div className="ses-inspector-metric-row">
                      <span>Region:</span>
                      <span className="ses-inspector-metric-val">{latestEvidence.region}</span>
                    </div>
                  )}
                  {latestEvidence.coordinates && (
                    <div className="ses-inspector-metric-row">
                      <span>Coordinates:</span>
                      <span className="ses-inspector-metric-val pt-mono">{latestEvidence.coordinates}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section 3: Takeoff Impact Summary */}
            {activeProject && (
              <div className="ses-inspector-section">
                <span className="ses-inspector-label">Project Takeoff Summary</span>
                <div className="ses-inspector-card">
                  <div className="ses-inspector-metric-row">
                    <span>Indexed Sheets:</span>
                    <span className="ses-inspector-metric-val">{activeProject.sheets}</span>
                  </div>
                  <div className="ses-inspector-metric-row">
                    <span>Project Status:</span>
                    <span className="ses-inspector-metric-val">{activeProject.status}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Section 4: Workstation Engine Provenance */}
            <div className="ses-inspector-section">
              <span className="ses-inspector-label">Engine & Model Provenance</span>
              <div className="ses-inspector-card">
                <div className="ses-inspector-metric-row">
                  <span>Inference Core:</span>
                  <span className="ses-inspector-metric-val">Vectoris Brain v1.2</span>
                </div>
                <div className="ses-inspector-metric-row">
                  <span>Engine Mode:</span>
                  <span className="ses-inspector-metric-val">Local Desktop Core</span>
                </div>
                <div className="ses-inspector-metric-row">
                  <span>Version:</span>
                  <span className="ses-inspector-metric-val pt-mono">{engineStatus.version}</span>
                </div>
              </div>
            </div>

          </aside>
        )}

      </div>
    </AppShell>
  );
}

// ── 100% Vector Geometric Icons (Iconsax / Linear Style) ──────────────────────

function IconBrainMark({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M8 2l1.8 4.2H14l-3.4 2.6 1.3 4.2L8 10.6l-3.9 2.4 1.3-4.2L2 6.2h4.2L8 2z" fill="currentColor" />
    </svg>
  );
}

function IconBrainMarkLarge({ className }: { className?: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="1.5" opacity="0.3" strokeDasharray="3 3" />
      <path d="M16 8v16M8 16h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16" cy="16" r="4" fill="currentColor" />
    </svg>
  );
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className} aria-hidden="true">
      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconSearch({ className }: { className?: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className={className} aria-hidden="true">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IconSend({ className }: { className?: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className={className} aria-hidden="true">
      <path d="M12.5 1.5L6 8M12.5 1.5L8.5 12.5 6 8 1.5 5.5l11-4z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconLayerSmall({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <path d="M6 1.5L1.5 4 6 6.5 10.5 4 6 1.5zM1.5 6.5L6 9l4.5-2.5M1.5 9L6 11.5 10.5 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconFolderSmall({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <path d="M1.5 3.5A1 1 0 012.5 2.5h2l1 1h4A1 1 0 0110.5 4.5v5a1 1 0 01-1 1h-7a1 1 0 01-1-1v-6z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCpuSmall({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <rect x="2.5" y="2.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
      <path d="M4.5 4.5h3v3h-3zM4.5 1v1.5M7.5 1v1.5M4.5 9.5V11M7.5 9.5V11M1 4.5h1.5M1 7.5h1.5M9.5 4.5H11M9.5 7.5H11" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function IconCheckmarkSmall({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPipeline({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <circle cx="3" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="9" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.1" />
      <path d="M4.5 6h3" stroke="currentColor" strokeWidth="1.1" strokeDasharray="1 1" />
    </svg>
  );
}

function IconBlueprint({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 2v12M2 7h12M8 7v7" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

function IconJumpCAD({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <path d="M7 2h3v3M10 2L5 7M2 4v6h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconInspectorPanel({ className }: { className?: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className={className} aria-hidden="true">
      <rect x="1.5" y="1.5" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
      <path d="M8.5 1.5v10" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

function IconChevronSmall({ isDown }: { isDown: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      style={{ transform: isDown ? "rotate(180deg)" : "none", transition: "transform 150ms ease" }}
      aria-hidden="true"
    >
      <path d="M2.5 3.5L5 6l2.5-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
