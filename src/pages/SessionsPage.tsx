/**
 * SessionsPage.tsx — Vectoris Engineering Investigation Workspace.
 *
 * PHILOSOPHY & NARRATIVE HIERARCHY:
 *   Question → Investigation → Evidence → Engineering Conclusion → Decision/Action
 *   - The user is conducting an engineering investigation, not a generic AI chat.
 *   - Hierarchy leads with the Key Engineering Quantities & Findings, grounded by Evidence.
 *   - The internal tool trace is collapsible and secondary (not raw debugger noise).
 *   - The left rail is an Investigation History (surfacing metrics & sources).
 *   - The right rail is a Live Investigation Inspector (what Vectoris is currently inspecting).
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, Link } from "../router";
import { AppShell } from "../components/AppShell";
import type {
  ChatMessage,
  ChatSession,
  Project,
  EvidenceData,
  ActionProposal,
  ToolTraceStep,
} from "../data";
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
  const [expandedTraceIds, setExpandedTraceIds] = useState<Record<string, boolean>>({});
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

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

  // Permission role check
  const roleParam = searchParams.get("role");
  const stateParam = searchParams.get("state");
  const member = activeProject?.members.find((m) => m.name === "Hardik Bhaskar");
  const effectiveRole = roleParam || (stateParam === "permission" ? "Viewer" : (member?.role || "Editor"));
  const isViewer = effectiveRole.toLowerCase() === "viewer";

  // Active evidence in the current session (last message with evidence)
  const latestEvidence: EvidenceData | undefined = useMemo(() => {
    for (let i = activeSession.messages.length - 1; i >= 0; i--) {
      if (activeSession.messages[i].evidence) {
        return activeSession.messages[i].evidence;
      }
    }
    return undefined;
  }, [activeSession.messages]);

  // Active action proposal in current session
  const latestProposal: ActionProposal | undefined = useMemo(() => {
    for (let i = activeSession.messages.length - 1; i >= 0; i--) {
      if (activeSession.messages[i].action_proposal) {
        return activeSession.messages[i].action_proposal;
      }
    }
    return undefined;
  }, [activeSession.messages]);

  // Active referenced sources
  const latestSources = useMemo(() => {
    for (let i = activeSession.messages.length - 1; i >= 0; i--) {
      if (activeSession.messages[i].referenced_sources && activeSession.messages[i].referenced_sources!.length > 0) {
        return activeSession.messages[i].referenced_sources;
      }
    }
    return undefined;
  }, [activeSession.messages]);

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

  // Start new investigation
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
  const handleApproveProposal = (msgId: string) => {
    if (isViewer) return;
    dataService.updateProposalStatus(activeSession.id, msgId, "approved", "Project Reviewer");
  };

  // Toggle trace expansion
  const toggleTrace = (msgId: string) => {
    setExpandedTraceIds((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  // Quick prompt chips
  const handleInsertPromptChip = (text: string) => {
    setInputMessage((prev) => (prev ? `${prev} ${text}` : text));
    textareaRef.current?.focus();
  };

  return (
    <AppShell activePath="/sessions">
      <div className="ses-page">

        {/* ── PANEL 1: Investigation History (Left Rail) ──────── */}
        <aside className="ses-sidebar" aria-label="Investigation history sidebar">

          {/* Scope Select & New Investigation Button */}
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
                <option value="general">General — No Project</option>
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
              <IconPlus aria-hidden="true" /> New Investigation
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

          {/* Filter Tabs */}
          <div className="ses-filter-tabs" role="tablist" aria-label="Investigation filter">
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
              Project Scoped
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

          {/* Investigation History Cards List */}
          <ul className="ses-list" aria-label="Investigation history">
            {filteredSessions.map((session) => {
              const isActive = session.id === activeSession.id;
              const isProject = session.project_id !== null;

              return (
                <li key={session.id}>
                  <button
                    type="button"
                    className={`ses-item${isActive ? " ses-item--active" : ""}`}
                    onClick={() => setActiveSessionId(session.id)}
                  >
                    <div className="ses-item__top">
                      {isProject ? (
                        <span className="ses-item__proj-tag">
                          {session.project_name}
                        </span>
                      ) : (
                        <span className="ses-item__proj-tag ses-item__proj-tag--general">
                          GENERAL ENGINEERING
                        </span>
                      )}
                      <span className="ses-item__time font-mono">{session.updated_at}</span>
                    </div>

                    <h4 className="ses-item__title">{session.title}</h4>

                    {/* Investigation Outcome Pill */}
                    <div className="ses-item__outcome-row">
                      {session.investigation_status === "verified" && (
                        <span className="ses-outcome-pill ses-outcome-pill--verified">
                          ✓ {session.key_metric || "Verified"}
                        </span>
                      )}
                      {session.investigation_status === "calculated" && (
                        <span className="ses-outcome-pill ses-outcome-pill--calculated">
                          ✓ {session.key_metric || "Calculated"}
                        </span>
                      )}
                      {session.investigation_status === "review_required" && (
                        <span className="ses-outcome-pill ses-outcome-pill--warn">
                          ⚠ {session.key_metric || "Review Required"}
                        </span>
                      )}
                      {!session.investigation_status && (
                        <span className="ses-outcome-pill ses-outcome-pill--neutral">
                          {session.messages.length} records
                        </span>
                      )}

                      <span className="ses-item__sources-tag font-mono">
                        {session.primary_sheet || "CAD"} · {session.source_count || session.messages.length} sources
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Local Engine Status */}
          <div className="ses-engine-footer">
            <div className="ses-engine-status">
              <span className="ses-engine-dot" aria-hidden="true" />
              <span>Local CAD Core</span>
            </div>
            <div className="ses-engine-metrics font-mono">
              <span>Ready · v0.2.4</span>
            </div>
          </div>
        </aside>

        {/* ── PANEL 2: Investigation Canvas (Center) ──────────── */}
        <main className="ses-canvas">

          {/* Investigation Header */}
          <header className="ses-canvas-header">
            <div className="ses-header-info">
              <div className="ses-header-breadcrumbs">
                <span className="ses-header-brain-mark">
                  <IconBrainMark aria-hidden="true" />
                  <span>VECTORIS INVESTIGATION</span>
                </span>
                <span className="ses-header-sep" aria-hidden="true">/</span>
                <span className="ses-header-scope">
                  {activeSession.project_id ? (
                    <Link to={`/project/${activeSession.project_id}`} className="ses-header-proj-link">
                      {activeSession.project_name}
                    </Link>
                  ) : (
                    "General Electrical Scope"
                  )}
                </span>
                {isViewer && (
                  <span className="ses-viewer-badge" title="Viewer role: Read-only access">
                    <IconShieldSmall aria-hidden="true" /> Viewer Mode
                  </span>
                )}
              </div>
              <h2 className="ses-header-title">{activeSession.title}</h2>
            </div>

            <div className="ses-header-actions">
              {activeSession.project_id && (
                <Link
                  to={`/project/${activeSession.project_id}/workspace`}
                  className="btn btn--secondary btn--xs"
                  title="Open Project Workspace"
                >
                  <IconBlueprint aria-hidden="true" /> Open Workspace
                </Link>
              )}

              <button
                type="button"
                className={`ses-inspector-toggle-btn${isInspectorOpen ? " ses-inspector-toggle-btn--active" : ""}`}
                onClick={() => setIsInspectorOpen((prev) => !prev)}
                title="Toggle Context & Evidence Inspector"
                aria-pressed={isInspectorOpen}
              >
                <IconInspectorPanel aria-hidden="true" />
                <span>Live Inspector</span>
              </button>
            </div>
          </header>

          {/* Investigation Flow / Record Stream */}
          <div className="ses-messages-stream" aria-label="Investigation stream">
            {activeSession.messages.length === 0 ? (
              <div className="ses-empty-stream">
                <div className="ses-empty-icon-wrap" aria-hidden="true">
                  <IconBrainMarkLarge />
                </div>
                <h3 className="ses-empty-title">Engineering Investigation Workspace</h3>
                <p className="ses-empty-desc">
                  {activeSession.project_id
                    ? `Ask technical questions, verify CAD drawing layers, measure electrical quantities, or audit takeoffs for ${activeSession.project_name}.`
                    : "Ask electrical engineering, NEC 2026 code compliance, feeder sizing, or cable tray load questions."}
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
                        <span className="ses-prompt-card-label">Feeder Sizing &amp; Drop</span>
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
                const isTraceExpanded = expandedTraceIds[msg.id] ?? false;

                if (isUser) {
                  /* ── 1. USER INQUIRY ── */
                  return (
                    <div key={msg.id} className="ses-inquiry-box">
                      <div className="ses-inquiry-box__header">
                        <span className="ses-inquiry-box__tag">YOU</span>
                        <span className="ses-inquiry-box__time font-mono">{msg.timestamp}</span>
                      </div>
                      <p className="ses-inquiry-box__text">{msg.content}</p>
                    </div>
                  );
                }

                /* ── 2. VECTORIS INVESTIGATION RESPONSE ── */
                return (
                  <div key={msg.id} className="ses-response-box">

                    {/* Vectoris Header */}
                    <div className="ses-response-header">
                      <div className="ses-response-identity">
                        <span className="ses-response-name">VECTORIS</span>
                        <span className="ses-response-grounding">
                          <IconCheckmarkSmall aria-hidden="true" />
                          <span>Grounded in project evidence</span>
                        </span>
                      </div>
                      <span className="ses-response-time font-mono">{msg.timestamp}</span>
                    </div>

                    {/* Key Metric Highlights (Prominent Engineering Takeaways) */}
                    {msg.metric_highlights && msg.metric_highlights.length > 0 && (
                      <div className="ses-metrics-hero">
                        {msg.metric_highlights.map((mh, mi) => (
                          <div key={mi} className={`ses-metric-card ses-metric-card--${mh.status || "pass"}`}>
                            <span className="ses-metric-card__val font-mono">{mh.value}</span>
                            <span className="ses-metric-card__lbl">{mh.label}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Synthesis & Technical Findings */}
                    <div className="ses-response-body">
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

                    {/* ── 3. GROUNDED EVIDENCE SURFACE ── */}
                    {(msg.evidence || (msg.referenced_sources && msg.referenced_sources.length > 0)) && (
                      <div className="ses-evidence-strip">
                        <div className="ses-evidence-strip__header">
                          <span className="ses-evidence-strip__title">Evidence &amp; Grounding</span>
                        </div>

                        <div className="ses-evidence-sources-list">
                          {msg.evidence && (
                            <div className="ses-evidence-item">
                              <div className="ses-evidence-item__icon" aria-hidden="true">
                                <IconBlueprint />
                              </div>
                              <div className="ses-evidence-item__main">
                                <span className="ses-evidence-item__sheet font-mono">
                                  {msg.evidence.sheet} · {msg.evidence.region || msg.evidence.doc_name}
                                </span>
                                {msg.evidence.coordinates && (
                                  <span className="ses-evidence-item__sub font-mono">
                                    Coordinates: {msg.evidence.coordinates}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {msg.referenced_sources?.map((src, si) => (
                            <div key={si} className="ses-evidence-item">
                              <div className="ses-evidence-item__icon" aria-hidden="true">
                                <IconLayerSmall />
                              </div>
                              <div className="ses-evidence-item__main">
                                <span className="ses-evidence-item__sheet font-mono">{src.sheet}</span>
                                <span className="ses-evidence-item__sub">{src.desc}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Direct Actions: Open Drawing & Add/Approve Takeoff */}
                        <div className="ses-evidence-actions">
                          {msg.evidence && activeSession.project_id && (
                            <Link
                              to={`/project/${activeSession.project_id}/workspace?doc=${msg.evidence.doc_id}&sheet=${encodeURIComponent(
                                msg.evidence.sheet
                              )}`}
                              className="btn btn--secondary btn--sm"
                              title="Open sheet in Drawing Viewer"
                            >
                              <IconJumpCAD aria-hidden="true" /> Open Drawing
                            </Link>
                          )}

                          {msg.action_proposal && (
                            msg.action_proposal.status === "pending" ? (
                              isViewer ? (
                                <span className="ses-viewer-lock-tag font-mono">
                                  Viewer: Read-only
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn--primary btn--sm"
                                  onClick={() => handleApproveProposal(msg.id)}
                                >
                                  <IconCheckmarkSmall aria-hidden="true" /> Add to Takeoff (+{msg.action_proposal.quantity} {msg.action_proposal.unit || ""})
                                </button>
                              )
                            ) : (
                              <span className="ses-committed-badge font-mono">
                                ✓ Added to Takeoff ({msg.action_proposal.item_code})
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── 4. COLLAPSIBLE INVESTIGATION DETAILS (Secondary) ── */}
                    {((msg.tool_steps && msg.tool_steps.length > 0) || (msg.thought_trace && msg.thought_trace.length > 0)) && (
                      <div className="ses-details-expander">
                        <button
                          type="button"
                          className="ses-details-btn"
                          onClick={() => toggleTrace(msg.id)}
                          aria-expanded={isTraceExpanded}
                        >
                          <IconChevronSmall isDown={isTraceExpanded} />
                          <span>
                            Investigation details ({msg.tool_steps ? msg.tool_steps.length : msg.thought_trace?.length} verified steps)
                          </span>
                        </button>

                        {isTraceExpanded && (
                          <div className="ses-details-content">
                            {msg.tool_steps ? (
                              msg.tool_steps.map((step, idx) => (
                                <div key={step.id || idx} className="ses-detail-step">
                                  <div className="ses-detail-step__head font-mono">
                                    <span className="ses-detail-step__num">{idx + 1}.</span>
                                    <span className="ses-detail-step__name">{step.name}()</span>
                                    <span className="ses-detail-step__status">✓ pass</span>
                                  </div>
                                  <div className="ses-detail-step__label">{step.label}</div>
                                  {step.output && (
                                    <div className="ses-detail-step__out font-mono">{step.output}</div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <ul>
                                {msg.thought_trace?.map((step, idx) => (
                                  <li key={idx}>{step}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Pinned Investigation Composer ───────────────────── */}
          <div className="ses-composer-wrap">
            <div className="ses-composer">

              {/* Context Tag & Quick Directive Chips */}
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
                    onClick={() => handleInsertPromptChip("@E-104 check cable tray routing")}
                  >
                    @E-104 Tray Routing
                  </button>
                  <button
                    type="button"
                    className="ses-quick-chip"
                    onClick={() => handleInsertPromptChip("Calculate voltage drop for 480V 3ph feeder")}
                  >
                    /voltage-drop
                  </button>
                  <button
                    type="button"
                    className="ses-quick-chip"
                    onClick={() => handleInsertPromptChip("Verify tray loading against NEMA 12B standard")}
                  >
                    /tray-capacity
                  </button>
                  <button
                    type="button"
                    className="ses-quick-chip"
                    onClick={() => handleInsertPromptChip("What are the NEC 2026 GFPE thresholds?")}
                  >
                    /nec-2026
                  </button>
                </div>
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                className="ses-textarea"
                rows={2}
                placeholder={
                  activeSession.project_id
                    ? `Ask Vectoris about ${activeSession.project_name}... (use @ to reference sheets)`
                    : "Ask Vectoris about electrical sizing, NEC 2026 standards, or tray capacities..."
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
                    Press <kbd className="font-mono">Enter ↵</kbd> to execute · <kbd className="font-mono">Shift+Enter</kbd> for line break
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn--primary btn--sm ses-send-btn"
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                >
                  <IconSend aria-hidden="true" /> Run Investigation
                </button>
              </div>

            </div>
          </div>

        </main>

        {/* ── PANEL 3: Live Investigation Inspector (Right Rail) ── */}
        {isInspectorOpen && (
          <aside className="ses-inspector-rail" aria-label="Live Investigation Inspector">

            {/* Section 1: Session Context */}
            <div className="ses-inspector-section">
              <span className="ses-inspector-label">Session Context</span>
              <div className="ses-inspector-card">
                <span className="ses-inspector-card-title">
                  {activeProject ? activeProject.name : "General Engineering Context"}
                </span>
                <span className="ses-inspector-card-meta">
                  {activeProject
                    ? `${activeProject.discipline || "Electrical"} · ${activeProject.sector.replace("-", " ")}`
                    : "Universal NEC 2026 Standards"}
                </span>
              </div>
            </div>

            {/* Section 2: Active Evidence */}
            {latestEvidence && (
              <div className="ses-inspector-section">
                <span className="ses-inspector-label">Active Evidence</span>
                <div className="ses-inspector-card">
                  <span className="ses-inspector-card-title font-mono">{latestEvidence.sheet}</span>
                  <span className="ses-inspector-card-meta">{latestEvidence.doc_name}</span>
                  {latestEvidence.region && (
                    <div className="ses-inspector-metric-row">
                      <span>Region:</span>
                      <span className="ses-inspector-metric-val">{latestEvidence.region}</span>
                    </div>
                  )}
                  {latestEvidence.coordinates && (
                    <div className="ses-inspector-metric-row">
                      <span>Coords:</span>
                      <span className="ses-inspector-metric-val font-mono">{latestEvidence.coordinates}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section 3: Referenced Sources */}
            {latestSources && latestSources.length > 0 && (
              <div className="ses-inspector-section">
                <span className="ses-inspector-label">Referenced Coordination</span>
                <div className="ses-inspector-card">
                  {latestSources.map((src, si) => (
                    <div key={si} className="ses-inspector-ref-row">
                      <span className="ses-inspector-ref-sheet font-mono">{src.sheet}</span>
                      <span className="ses-inspector-ref-desc">{src.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 4: Takeoff Impact */}
            {latestProposal && (
              <div className="ses-inspector-section">
                <span className="ses-inspector-label">Takeoff Impact</span>
                <div className="ses-inspector-card">
                  <div className="ses-inspector-metric-row">
                    <span>Item Code:</span>
                    <span className="ses-inspector-metric-val font-mono">{latestProposal.item_code}</span>
                  </div>
                  <div className="ses-inspector-metric-row">
                    <span>Quantity:</span>
                    <span className="ses-inspector-metric-val font-mono">
                      +{latestProposal.quantity} {latestProposal.unit || ""}
                    </span>
                  </div>
                  <div className="ses-inspector-metric-row">
                    <span>Status:</span>
                    <span className="ses-inspector-metric-val">
                      {latestProposal.status === "approved" ? "✓ Committed" : "Pending Approval"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Section 5: Open in Workspace CTA */}
            {activeProject && latestEvidence && (
              <div className="ses-inspector-action">
                <Link
                  to={`/project/${activeProject.id}/workspace?doc=${latestEvidence.doc_id}&sheet=${encodeURIComponent(
                    latestEvidence.sheet
                  )}`}
                  className="btn btn--secondary btn--sm ses-inspector-full-btn"
                >
                  <IconJumpCAD aria-hidden="true" /> Open in Workspace →
                </Link>
              </div>
            )}

          </aside>
        )}

      </div>
    </AppShell>
  );
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function IconPlus() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconSearch(props: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...props}>
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function IconLayerSmall() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 1.5l4.5 2.25L6 6 1.5 3.75 6 1.5z" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1.5 6l4.5 2.25L10.5 6" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1.5 8.25l4.5 2.25 4.5-2.25" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  );
}

function IconCheckmarkSmall() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconShieldSmall() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ marginRight: 4 }}>
      <path d="M6 1.5l4 1.5v3c0 2.2-1.8 3.5-4 4.5-2.2-1-4-2.3-4-4.5v-3l4-1.5z" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  );
}

function IconBrainMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M5 3a2 2 0 00-2 2v.5a2 2 0 000 4V10a2 2 0 002 2h1V3H5zM11 3a2 2 0 012 2v.5a2 2 0 010 4V10a2 2 0 01-2 2h-1V3h1z" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}

function IconBrainMarkLarge() {
  return (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M16 10a7 7 0 00-7 7v1.5a7 7 0 000 13V33a7 7 0 007 7h3V10h-3zM32 10a7 7 0 017 7v1.5a7 7 0 010 13V33a7 7 0 01-7 7h-3V10h3z" stroke="var(--color-racing-red)" strokeWidth="2.5"/>
    </svg>
  );
}

function IconChevronSmall({ isDown }: { isDown: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      style={{ transform: isDown ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 120ms ease" }}
    >
      <path d="M4.5 2.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconBlueprint() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M2 6h16M6 6v12M10 10h4M10 14h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function IconJumpCAD() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 11L11 3M11 3H5M11 3v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconInspectorPanel() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M9 1.5v11" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M12.5 1.5L6 8M12.5 1.5l-3.5 11-3-4.5-4.5-3 11-3.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  );
}
