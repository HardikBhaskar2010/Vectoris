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
import { useAuth } from "../hooks/useAuth";
import { AnimatedCheck, AnimatedCheckCircle, AnimatedAlertTriangle, AnimatedArrowRight } from "../components/icons/AnimatedIcons";

type FilterTab = "all" | "project" | "general";

export default function SessionsPage() {
  const { searchParams } = useRouter();
  const { user } = useAuth();
  const sessions = useSessions();
  const projects = useProjects();

  // State
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const sessionParam = searchParams.get("session");
    if (sessionParam) return sessionParam;
    return sessions[0]?.id || "s1";
  });
  const [selectedContextProject, setSelectedContextProject] = useState<string>("general");
  const [inputMessage, setInputMessage] = useState("");
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [expandedTraceIds, setExpandedTraceIds] = useState<Record<string, boolean>>({});
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [rejectingProposalId, setRejectingProposalId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [actionFeedback, setActionFeedback] = useState<{ msgId: string; type: "success" | "error"; text: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Available project choices
  const availableProjects = useMemo(
    () => projects.map((p) => ({ id: p.id, name: p.name, sector: p.sector, discipline: p.discipline, sheets: p.sheets })),
    [projects]
  );

  // Read URL params and keep active session in sync
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
    } else if (sessions.length > 0 && !sessions.some((s) => s.id === activeSessionId)) {
      setActiveSessionId(sessions[0].id);
    }
  }, [searchParams, availableProjects, sessions, activeSessionId]);

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
        return activeSession.messages[i].evidence || undefined;
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

  // Turn off isInvestigating when assistant response arrives
  useEffect(() => {
    if (isInvestigating && activeSession.messages.length > 0) {
      const lastMsg = activeSession.messages[activeSession.messages.length - 1];
      if (lastMsg.role === "assistant") {
        setIsInvestigating(false);
      }
    }
  }, [activeSession.messages, isInvestigating]);

  // Smooth scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession.messages.length, isInvestigating]);

  // Send message
  const handleSendMessage = () => {
    const trimmed = inputMessage.trim();
    if (!trimmed || !activeSession.id || isInvestigating) return;

    setIsInvestigating(true);
    dataService.addSessionMessage(activeSession.id, {
      role: "user",
      content: trimmed,
    });

    setInputMessage("");
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

    setIsInvestigating(false);
    setActiveSessionId(newSession.id);
  };

  // Approve takeoff proposal
  const handleApproveProposal = async (msgId: string) => {
    if (isViewer) {
      setActionFeedback({
        msgId,
        type: "error",
        text: "Permission denied: Viewer role is not authorized to commit takeoff mutations.",
      });
      return;
    }

    const committer = user?.email || user?.id || member?.name || "Lead Estimator";
    const result = await dataService.approveProposal({
      sessionId: activeSession.id,
      messageId: msgId,
      userId: committer,
      userRole: effectiveRole,
      reason: `Human-approved via Engineering Investigation: ${activeSession.title}`,
    });

    if (result.success) {
      setActionFeedback({
        msgId,
        type: "success",
        text: `Successfully committed "${result.lineItem?.name || "Item"}" to Takeoff Ledger.`,
      });
    } else {
      setActionFeedback({
        msgId,
        type: "error",
        text: result.error || "Failed to commit proposal.",
      });
    }
  };

  // Reject takeoff proposal
  const handleRejectProposal = async (msgId: string, customReason?: string) => {
    if (isViewer) {
      setActionFeedback({
        msgId,
        type: "error",
        text: "Permission denied: Viewer role is not authorized to reject takeoff proposals.",
      });
      return;
    }

    const reasonText = customReason || rejectionReason.trim() || "Dismissed by engineer during investigation";
    const committer = user?.email || user?.id || member?.name || "Lead Estimator";

    const result = await dataService.rejectProposal({
      sessionId: activeSession.id,
      messageId: msgId,
      userId: committer,
      userRole: effectiveRole,
      reason: reasonText,
    });

    if (result.success) {
      setRejectingProposalId(null);
      setRejectionReason("");
      setActionFeedback({
        msgId,
        type: "success",
        text: `Proposal rejected: "${reasonText}".`,
      });
    } else {
      setActionFeedback({
        msgId,
        type: "error",
        text: result.error || "Failed to reject proposal.",
      });
    }
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
                        <span className="ses-outcome-pill ses-outcome-pill--verified" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <AnimatedCheck size={11} />
                          <span>{session.key_metric || "Verified"}</span>
                        </span>
                      )}
                      {session.investigation_status === "calculated" && (
                        <span className="ses-outcome-pill ses-outcome-pill--calculated" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <AnimatedCheck size={11} />
                          <span>{session.key_metric || "Calculated"}</span>
                        </span>
                      )}
                      {session.investigation_status === "review_required" && (
                        <span className="ses-outcome-pill ses-outcome-pill--warn" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <AnimatedAlertTriangle size={11} />
                          <span>{session.key_metric || "Review Required"}</span>
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
                    {((msg.evidence && (msg.evidence.sheet || msg.evidence.doc_name)) || (msg.referenced_sources && msg.referenced_sources.length > 0)) ? (
                      <div className="ses-evidence-strip">
                        <div className="ses-evidence-strip__header">
                          <span className="ses-evidence-strip__title">Evidence &amp; Grounding</span>
                        </div>

                        <div className="ses-evidence-sources-list">
                          {msg.evidence && (msg.evidence.sheet || msg.evidence.doc_name) && (
                            <div className="ses-evidence-item">
                              <div className="ses-evidence-item__icon" aria-hidden="true">
                                <IconBlueprint />
                              </div>
                              <div className="ses-evidence-item__main">
                                <span className="ses-evidence-item__sheet font-mono">
                                  {msg.evidence.sheet || "Drawing Sheet"} · {msg.evidence.region || msg.evidence.doc_name || "Document"}
                                </span>
                                {msg.evidence.coordinates ? (
                                  <span className="ses-evidence-item__sub font-mono">
                                    Coordinates: {msg.evidence.coordinates}
                                  </span>
                                ) : (
                                  <span className="ses-evidence-item__sub font-mono" style={{ color: "var(--app-text-muted)" }}>
                                    Coordinates: Unavailable (Text-only)
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

                        {/* Direct Actions: Open Drawing */}
                        <div className="ses-evidence-actions">
                          {msg.evidence && msg.evidence.sheet && activeSession.project_id && (
                            <Link
                              to={`/project/${activeSession.project_id}/workspace?doc=${msg.evidence.doc_id || ""}&sheet=${encodeURIComponent(
                                msg.evidence.sheet
                              )}`}
                              className="btn btn--secondary btn--sm"
                              title="Open sheet in Drawing Viewer"
                            >
                              <IconJumpCAD aria-hidden="true" /> Open Drawing
                            </Link>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="ses-evidence-strip ses-evidence-strip--unavailable" role="status" aria-label="Evidence status">
                        <span className="ses-evidence-unavailable-text" style={{ color: "var(--app-text-muted)", fontSize: "12px", fontStyle: "italic" }}>
                          Evidence unavailable for this result.
                        </span>
                      </div>
                    )}

                    {/* ── 3.5 AI ACTION PROPOSAL CARD (Human-in-the-Loop Mutation Gate) ── */}
                    {msg.action_proposal && (
                      <div className={`ses-proposal-card ses-proposal-card--${msg.action_proposal.status}`}>
                        {/* Proposal Header */}
                        <div className="ses-proposal-header">
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span
                              className={`ses-proposal-badge ses-proposal-badge--${msg.action_proposal.status}`}
                            >
                              {msg.action_proposal.status === "pending" && (
                                <>
                                  <AnimatedAlertTriangle size={11} />
                                  <span>AI ACTION PROPOSAL · PENDING APPROVAL</span>
                                </>
                              )}
                              {msg.action_proposal.status === "approved" && (
                                <>
                                  <AnimatedCheckCircle size={12} />
                                  <span>COMMITTED TO TAKEOFF</span>
                                </>
                              )}
                              {msg.action_proposal.status === "rejected" && (
                                <>
                                  <IconDismissSmall />
                                  <span>PROPOSAL REJECTED</span>
                                </>
                              )}
                            </span>
                            <span className="ses-item__proj-tag font-mono">
                              {msg.action_proposal.item_code}
                            </span>
                          </div>

                          <span className="ses-proposal-label font-mono">
                            Action: Insert Line Item
                          </span>
                        </div>

                        {/* Proposal Title */}
                        <h4 className="ses-proposal-title">
                          {msg.action_proposal.item_name || msg.action_proposal.title}
                        </h4>

                        {/* Structured Technical Parameters Grid */}
                        <div className="ses-proposal-grid">
                          <div className="ses-proposal-field">
                            <span className="ses-proposal-label">Category / Discipline</span>
                            <span className="ses-proposal-val">{msg.action_proposal.category || "Power Distribution"}</span>
                          </div>
                          <div className="ses-proposal-field">
                            <span className="ses-proposal-label">Proposed Quantity</span>
                            <span className="ses-proposal-val font-mono" style={{ color: "var(--color-racing-red)" }}>
                              +{msg.action_proposal.quantity} {msg.action_proposal.unit || "NOS"}
                            </span>
                          </div>
                          <div className="ses-proposal-field">
                            <span className="ses-proposal-label">Sheet Reference</span>
                            <span className="ses-proposal-val font-mono">
                              {msg.action_proposal.source_sheet || msg.evidence?.sheet || "E-104"}
                            </span>
                          </div>
                          <div className="ses-proposal-field">
                            <span className="ses-proposal-label">Proposed Mutation</span>
                            <span className="ses-proposal-val">Takeoff BOQ Ledger</span>
                          </div>
                        </div>

                        {/* Evidence Provenance Note */}
                        <div className="ses-proposal-provenance">
                          <strong>Provenance:</strong>{" "}
                          {msg.action_proposal.evidence_provenance ||
                            `Grounded in inspection of Sheet ${msg.action_proposal.source_sheet || msg.evidence?.sheet || "E-104"}`}
                        </div>

                        {/* Description / Specification */}
                        {msg.action_proposal.description && (
                          <p className="ses-evidence-item__sub" style={{ margin: 0 }}>
                            {msg.action_proposal.description}
                          </p>
                        )}

                        {/* Feedback message banner if present */}
                        {actionFeedback?.msgId === msg.id && (
                          <div
                            className={`ses-outcome-pill ses-outcome-pill--${actionFeedback.type === "success" ? "verified" : "warn"}`}
                            style={{ padding: "6px 10px", fontSize: "0.75rem", width: "fit-content" }}
                          >
                            {actionFeedback.type === "success" ? <AnimatedCheck size={12} /> : <AnimatedAlertTriangle size={12} />}
                            <span>{actionFeedback.text}</span>
                          </div>
                        )}

                        {/* Human Confirmation Workflow Actions */}
                        <div className="ses-proposal-actions">
                          {msg.action_proposal.status === "pending" ? (
                            isViewer ? (
                              <span className="ses-viewer-lock-tag font-mono" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                <IconShieldSmall /> Viewer Role: Read-only access. Approval requires Editor/Admin permissions.
                              </span>
                            ) : rejectingProposalId === msg.id ? (
                              <div className="ses-proposal-reject-box">
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                  <span className="ses-proposal-label" style={{ color: "#ef4444", fontWeight: 700 }}>
                                    Reject Proposal — Select reason or enter custom justification:
                                  </span>
                                  <button
                                    type="button"
                                    className="btn btn--secondary btn--xs"
                                    onClick={() => {
                                      setRejectingProposalId(null);
                                      setRejectionReason("");
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>

                                <div className="ses-proposal-reject-presets">
                                  {[
                                    "False positive detection",
                                    "Duplicate line item",
                                    "Out of project scope",
                                    "Specification mismatch",
                                  ].map((preset) => (
                                    <button
                                      key={preset}
                                      type="button"
                                      className="ses-reject-preset-chip"
                                      onClick={() => handleRejectProposal(msg.id, preset)}
                                    >
                                      {preset}
                                    </button>
                                  ))}
                                </div>

                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                  <input
                                    type="text"
                                    className="ses-proposal-reject-input"
                                    placeholder="Optional custom rejection reason for audit trail..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleRejectProposal(msg.id);
                                      }
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn--secondary btn--sm"
                                    style={{ color: "#ef4444", borderColor: "#ef4444", flexShrink: 0 }}
                                    onClick={() => handleRejectProposal(msg.id)}
                                  >
                                    Confirm Reject
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="btn btn--primary btn--sm"
                                  onClick={() => handleApproveProposal(msg.id)}
                                  title="Approve and write line item to Takeoff Ledger"
                                >
                                  <IconCheckmarkSmall aria-hidden="true" />
                                  <span>Approve &amp; Commit (+{msg.action_proposal.quantity} {msg.action_proposal.unit || "NOS"})</span>
                                </button>

                                <button
                                  type="button"
                                  className="btn btn--secondary btn--sm"
                                  style={{ color: "#ef4444" }}
                                  onClick={() => {
                                    setRejectingProposalId(msg.id);
                                    setRejectionReason("");
                                  }}
                                  title="Reject this proposal and log reason in audit ledger"
                                >
                                  <IconDismissSmall />
                                  <span>Reject Proposal</span>
                                </button>
                              </>
                            )
                          ) : msg.action_proposal.status === "approved" ? (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", flexWrap: "wrap", gap: "8px" }}>
                              <span className="ses-committed-badge font-mono" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                <AnimatedCheckCircle size={14} />
                                <span>
                                  Committed by {msg.action_proposal.committed_by || "Lead Estimator"} ({msg.action_proposal.committed_at || "Just now"})
                                </span>
                              </span>

                              {activeSession.project_id && (
                                <Link
                                  to={`/project/${activeSession.project_id}/takeoff`}
                                  className="btn btn--secondary btn--xs"
                                  style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                                >
                                  <span>View in Takeoff Ledger</span>
                                  <AnimatedArrowRight size={11} />
                                </Link>
                              )}
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                              <span className="ses-outcome-pill ses-outcome-pill--warn font-mono" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                <AnimatedAlertTriangle size={12} />
                                <span>
                                  Rejected: {msg.action_proposal.rejection_reason || "Dismissed by engineer"} ({msg.action_proposal.committed_by || "Reviewer"})
                                </span>
                              </span>
                            </div>
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
                                    <span className="ses-detail-step__status" style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                      <AnimatedCheck size={10} />
                                      <span>pass</span>
                                    </span>
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

            {/* Active Investigation In-Progress State */}
            {isInvestigating && (
              <div className="ses-response-box ses-response-box--loading" aria-live="polite" aria-busy="true">
                <div className="ses-response-header">
                  <div className="ses-response-identity">
                    <span className="ses-response-name">VECTORIS</span>
                    <span className="ses-response-grounding">
                      <span className="ses-engine-dot" aria-hidden="true" style={{ animation: "pulse 1.2s infinite" }} />
                      <span>Investigating CAD drawing layers &amp; running engineering tools…</span>
                    </span>
                  </div>
                  <span className="ses-response-time font-mono">Running…</span>
                </div>
                <div className="ses-loading-skeleton" aria-hidden="true">
                  <div className="ses-skeleton-line ses-skeleton-line--hero" />
                  <div className="ses-skeleton-line" />
                  <div className="ses-skeleton-line ses-skeleton-line--medium" />
                </div>
              </div>
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
                  disabled={!inputMessage.trim() || isInvestigating}
                >
                  <IconSend aria-hidden="true" />
                  <span>{isInvestigating ? "Investigating…" : "Run Investigation"}</span>
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
                    <span>Item:</span>
                    <span className="ses-inspector-metric-val font-mono">{latestProposal.item_name || latestProposal.title}</span>
                  </div>
                  <div className="ses-inspector-metric-row">
                    <span>Item Code:</span>
                    <span className="ses-inspector-metric-val font-mono">{latestProposal.item_code}</span>
                  </div>
                  <div className="ses-inspector-metric-row">
                    <span>Quantity:</span>
                    <span className="ses-inspector-metric-val font-mono" style={{ color: "var(--color-racing-red)", fontWeight: 700 }}>
                      +{latestProposal.quantity} {latestProposal.unit || "NOS"}
                    </span>
                  </div>
                  <div className="ses-inspector-metric-row">
                    <span>Sheet:</span>
                    <span className="ses-inspector-metric-val font-mono">
                      {latestProposal.source_sheet || "E-104"}
                    </span>
                  </div>
                  <div className="ses-inspector-metric-row">
                    <span>Status:</span>
                    <span className="ses-inspector-metric-val" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      {latestProposal.status === "approved" ? (
                        <>
                          <AnimatedCheck size={11} />
                          <span style={{ color: "#16a34a", fontWeight: 600 }}>Committed</span>
                        </>
                      ) : latestProposal.status === "rejected" ? (
                        <span style={{ color: "#ef4444", fontWeight: 600 }}>Rejected</span>
                      ) : (
                        <span style={{ color: "#f59e0b", fontWeight: 600 }}>Pending Approval</span>
                      )}
                    </span>
                  </div>

                  {/* Inspector Fast-Action Buttons */}
                  {latestProposal.status === "pending" && !isViewer && (
                    <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
                      <button
                        type="button"
                        className="btn btn--primary btn--xs"
                        style={{ flex: 1 }}
                        onClick={() => handleApproveProposal(latestProposal.id)}
                      >
                        <AnimatedCheck size={11} /> Approve
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary btn--xs"
                        style={{ color: "#ef4444" }}
                        onClick={() => handleRejectProposal(latestProposal.id, "Rejected via Live Inspector")}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section 5: Open in Workspace CTA */}
            {activeProject && latestEvidence && (
              <div className="ses-inspector-action">
                <Link
                  to={`/project/${activeProject.id}/workspace?doc=${latestEvidence.doc_id}&sheet=${encodeURIComponent(
                    latestEvidence.sheet || ""
                  )}`}
                  className="btn btn--secondary btn--sm ses-inspector-full-btn"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                  <IconJumpCAD aria-hidden="true" />
                  <span>Open in Workspace</span>
                  <AnimatedArrowRight size={13} />
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

function IconDismissSmall() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
