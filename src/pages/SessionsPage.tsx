/**
 * SessionsPage — Global Engineering AI Sessions Surface.
 *
 * SOURCE OF TRUTH:
 *   docs/06_PAGES/AI_SESSION.md
 *   docs/02_DESIGN/NAVIGATION.md §4
 *   docs/03_ARCHITECTURE/DATA_MODEL.md
 *   docs/04_AI/AGENT_RUNTIME.md
 *
 * CRAFT & ENGINEERING HIGHLIGHTS:
 *   - Zero emojis — 100% Iconsax/Linear-style geometric vector icons
 *   - Rich CAD Drawing Evidence cards with coordinate provenance
 *   - Collapsible AI Reasoning & Thought Trace blocks
 *   - Interactive Takeoff Action Proposals with live approval feedback
 *   - Seamless Project Context Switcher (General vs. specific project scope)
 */

import { useState, useMemo, useEffect } from "react";
import { AppShell } from "../components/AppShell";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  thought_trace?: string[];
  evidence?: {
    doc_id: string;
    doc_name: string;
    sheet: string;
    region?: string;
    coordinates?: string;
  };
  action_proposal?: {
    id: string;
    title: string;
    description: string;
    item_code: string;
    quantity: string;
    status: "pending" | "approved" | "rejected";
  };
}

export interface ChatSession {
  id: string;
  project_id: string | null;
  project_name: string | null;
  title: string;
  last_message_preview: string;
  message_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

interface ProjectOption {
  id: string;
  name: string;
  sector: string;
}

// ── Demo Data ─────────────────────────────────────────────────────────────────

const AVAILABLE_PROJECTS: ProjectOption[] = [
  { id: "p1", name: "ABC Data Center", sector: "Data Center" },
  { id: "p2", name: "Omega Plant Expansion", sector: "Industrial" },
  { id: "p3", name: "Apex Commercial Complex", sector: "Commercial" },
];

const INITIAL_SESSIONS: ChatSession[] = [
  {
    id: "s1",
    project_id: "p1",
    project_name: "ABC Data Center",
    title: "Cable tray routing & clearance — Server Room B",
    last_message_preview: "Confirmed: 384 meters of 24-inch overhead ladder tray across 6 runs.",
    message_count: 4,
    created_by: "Hardik Bhaskar",
    created_at: "2 hours ago",
    updated_at: "2 hours ago",
    messages: [
      {
        id: "m1",
        role: "user",
        content: "What is the total length of 24-inch overhead cable tray detected on Sheet E-104, and does the routing clear mechanical ductwork?",
        timestamp: "2h ago",
      },
      {
        id: "m2",
        role: "assistant",
        content: "I evaluated **Sheet E-104 (Server Room B Cable Routing)** against the spatial coordination model:\n\n1. **Quantity Measured:** Total 24-inch overhead ladder tray across the primary rack rows is **384 meters** (6 parallel runs of 64m each).\n2. **Elevation Clearance:** Electrical invert elevation is **+11'-6\" AFF**. Mechanical coordination sheet M-201 indicates bottom of supply duct at **+12'-8\" AFF**.\n3. **Result:** Clear vertical separation is **14 inches**, satisfying the minimum 12-inch NEC/BICSI standard.",
        timestamp: "2h ago",
        thought_trace: [
          "Loaded Sheet E-104 vector CAD drawing layer 'E-TRAY-OVHD'",
          "Segmented 6 continuous polyline runs across Column Lines B1–B8",
          "Cross-referenced mechanical duct bottom elevation on M-201 (+12'-8\" AFF)",
          "Calculated vertical clearance: 14.0 in (Pass)"
        ],
        evidence: {
          doc_id: "d4",
          doc_name: "E-104_CableTrayLayout.dwg",
          sheet: "E-104 (Server Room B)",
          region: "Row A1–A12 Overhead Corridor",
          coordinates: "X:120 Y:310 [620×28]",
        },
        action_proposal: {
          id: "act-101",
          title: "Verify Cable Tray Takeoff Line Item",
          description: "Update verified quantity for 24-inch ladder tray in project Takeoff ledger",
          item_code: "CT-LAD-24",
          quantity: "384 m",
          status: "approved",
        }
      },
      {
        id: "m3",
        role: "user",
        content: "Can you confirm the maximum allowable cable weight capacity for this NEMA 12B tray profile?",
        timestamp: "1h ago",
      },
      {
        id: "m4",
        role: "assistant",
        content: "Under NEMA VE 1 / CSA C22.2 No. 126.1 standards for **NEMA Class 12B** aluminum ladder tray on an **8-foot support span**:\n\n- **Working Load Capacity:** 75 lbs/linear foot (111.6 kg/m)\n- **Recommended Fill Ratio:** 40% maximum per NEC 392.22 for control/power cables\n- **Current Design Load:** Estimated cable bundle weight is **38.4 lbs/ft** (51.2% of rated capacity — compliant with safety margin).",
        timestamp: "1h ago",
        thought_trace: [
          "Queried NEMA VE 1 Table 1 for Class 12B load curves",
          "Span parameter: 8.0 ft trapeze hanger spacing",
          "Calculated safety factor: 1.95x against allowable structural deflection"
        ]
      }
    ]
  },
  {
    id: "s2",
    project_id: "p1",
    project_name: "ABC Data Center",
    title: "Feeder conductor sizing — PAC-01 to PAC-06",
    last_message_preview: "Calculated 4/0 AWG Cu minimum; 1.14% voltage drop over 145ft.",
    message_count: 2,
    created_by: "Rina Mehta",
    created_at: "12 hours ago",
    updated_at: "12 hours ago",
    messages: [
      {
        id: "m2-1",
        role: "user",
        content: "Calculate the required feeder size for PAC units 1 through 6 given a 180A FLA at 480V/3ph with 145ft one-way run length.",
        timestamp: "12h ago",
      },
      {
        id: "m2-2",
        role: "assistant",
        content: "Feeder calculation summary per **NEC Article 430 / Table 310.16**:\n\n- **Minimum Circuit Ampacity (MCA):** `180A × 1.25 = 225A`\n- **Conductor Selection:** **4/0 AWG THHN Copper** (rated 230A @ 75°C terminal rating)\n- **Conduit Sizing:** 2.0-inch EMT minimum per NEC Chapter 9 Table 1 (40% fill)\n- **Voltage Drop:** At 180A load, 480V 3-phase, 145 ft one-way: **1.14% drop** (5.47V), well below the 3.0% NEC recommendation.",
        timestamp: "12h ago",
        thought_trace: [
          "Applied 125% continuous duty multiplier to 180A FLA",
          "Selected 75°C column of NEC Table 310.16",
          "Calculated AC impedance using standard steel conduit reactance values"
        ]
      }
    ]
  },
  {
    id: "s3",
    project_id: null,
    project_name: null,
    title: "NEC 2026 ground-fault protection thresholds",
    last_message_preview: "Summary of NEC Article 230.95 requirements for 1000A+ services at 480V.",
    message_count: 2,
    created_by: "Hardik Bhaskar",
    created_at: "Yesterday",
    updated_at: "Yesterday",
    messages: [
      {
        id: "m3-1",
        role: "user",
        content: "What are the exact triggers for mandatory Ground-Fault Protection of Equipment (GFPE) under NEC Article 230.95?",
        timestamp: "Yesterday",
      },
      {
        id: "m3-2",
        role: "assistant",
        content: "Under **NEC Article 230.95**, Ground-Fault Protection of Equipment (GFPE) is mandatory when **all three** conditions are met:\n\n1. **Service Type:** Solidly grounded wye electrical system\n2. **Voltage Level:** More than 150 volts to ground, but not exceeding 1000 volts phase-to-phase (e.g., 480Y/277V systems)\n3. **Disconnect Rating:** Service disconnect rated **1000 amperes or higher**\n\n*Maximum Settings:* The ground-fault protection must be set to operate at no more than 1200 amperes, with a maximum time delay of 1.0 second for faults of 3000 amperes or greater.",
        timestamp: "Yesterday",
      }
    ]
  },
  {
    id: "s4",
    project_id: "p2",
    project_name: "Omega Plant Expansion",
    title: "13.8kV Medium-voltage single line review",
    last_message_preview: "Identified 2 potential relay coordination overlaps on Main Substation Bus B.",
    message_count: 1,
    created_by: "Zaid Siddiqui",
    created_at: "2 days ago",
    updated_at: "2 days ago",
    messages: []
  },
];

type FilterTab = "all" | "project" | "general";

// ── Component ─────────────────────────────────────────────────────────────────

export default function SessionsPage() {
  const [sessions, setSessions] = useState<ChatSession[]>(INITIAL_SESSIONS);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSessionId, setActiveSessionId] = useState<string>("s1");
  const [selectedContextProject, setSelectedContextProject] = useState<string>("general");
  const [inputMessage, setInputMessage] = useState("");
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>("m2");

  // Read URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projParam = params.get("project");
    if (projParam) {
      setFilterTab("project");
      const match = AVAILABLE_PROJECTS.find(p => p.id === projParam);
      if (match) setSelectedContextProject(match.id);
    }
  }, []);

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

  const activeSession = useMemo(() => {
    return sessions.find(s => s.id === activeSessionId) || sessions[0];
  }, [sessions, activeSessionId]);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMsgId = `m-u-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: inputMessage.trim(),
      timestamp: "Just now",
    };

    setSessions(prev => prev.map(s => {
      if (s.id === activeSession.id) {
        return {
          ...s,
          last_message_preview: newMsg.content,
          message_count: s.message_count + 1,
          messages: [...(s.messages || []), newMsg],
        };
      }
      return s;
    }));

    setInputMessage("");

    // Simulate AI response
    setTimeout(() => {
      const isProject = activeSession.project_id !== null;
      const aiReply: ChatMessage = {
        id: `m-ai-${Date.now()}`,
        role: "assistant",
        content: isProject
          ? `I've analyzed the drawings and takeoff specifications for **${activeSession.project_name}**.\n\nAll parameters have been verified against the active sheet indices and IEEE 141 engineering standards. Traceability links and source coordinates are logged below.`
          : "Analyzing your engineering query using Vectoris Brain core calculation models. Standards referenced: NEC 2026, IEEE 141, and NEMA VE 1.",
        timestamp: "Just now",
        thought_trace: [
          `Parsed query intent and entity parameters`,
          `Validated against ${isProject ? activeSession.project_name : 'General NEC'} knowledge index`,
          `Formulated deterministic engineering response`
        ]
      };

      setSessions(prev => prev.map(s => {
        if (s.id === activeSession.id) {
          return {
            ...s,
            last_message_preview: aiReply.content,
            message_count: s.message_count + 1,
            messages: [...(s.messages || []), aiReply],
          };
        }
        return s;
      }));
    }, 800);
  };

  const handleStartNewSession = () => {
    const isGeneral = selectedContextProject === "general";
    const proj = AVAILABLE_PROJECTS.find(p => p.id === selectedContextProject);

    const newSession: ChatSession = {
      id: `s-${Date.now()}`,
      project_id: isGeneral ? null : (proj?.id ?? null),
      project_name: isGeneral ? null : (proj?.name ?? null),
      title: isGeneral ? "New General Discussion" : `New session — ${proj?.name}`,
      last_message_preview: "Session initialized.",
      message_count: 0,
      created_by: "Hardik Bhaskar",
      created_at: "Just now",
      updated_at: "Just now",
      messages: [],
    };

    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const handleApproveProposal = (msgId: string) => {
    setSessions(prev => prev.map(s => ({
      ...s,
      messages: s.messages.map(m => {
        if (m.id === msgId && m.action_proposal) {
          return {
            ...m,
            action_proposal: { ...m.action_proposal, status: "approved" }
          };
        }
        return m;
      })
    })));
  };

  const handleInsertPromptChip = (text: string) => {
    setInputMessage(prev => prev ? `${prev} ${text}` : text);
  };

  return (
    <AppShell activePath="/sessions">
      <div className="ses-page">

        {/* ── Left: Sessions Sidebar ───────────────────────────── */}
        <aside className="ses-sidebar" aria-label="Chat sessions sidebar">

          {/* Context Selector & New Session */}
          <div className="ses-new-box">
            <div className="ses-context-row">
              <label htmlFor="context-select" className="ses-context-label">
                <IconLayerSmall className="ses-context-icon" />
                <span>Context:</span>
              </label>
              <select
                id="context-select"
                className="ses-context-select"
                value={selectedContextProject}
                onChange={(e) => setSelectedContextProject(e.target.value)}
              >
                <option value="general">General (No Project)</option>
                {AVAILABLE_PROJECTS.map((p) => (
                  <option key={p.id} value={p.id}>Project: {p.name}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn btn--primary btn--sm ses-new-btn"
              onClick={handleStartNewSession}
            >
              <IconPlus /> New AI Session
            </button>
          </div>

          {/* Search bar */}
          <div className="ses-search">
            <IconSearch className="ses-search-icon" aria-hidden="true" />
            <input
              type="search"
              className="ses-search-input"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search conversations"
            />
          </div>

          {/* Filter Segmented Control */}
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

          {/* Session List */}
          <ul className="ses-list" aria-label="Session history">
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
                        <span className="ses-project-tag">
                          <IconFolderSmall aria-hidden="true" />
                          <span>{session.project_name}</span>
                        </span>
                      ) : (
                        <span className="ses-general-tag">
                          <IconCpuSmall aria-hidden="true" />
                          <span>General</span>
                        </span>
                      )}
                      <span className="ses-item__time">{session.updated_at}</span>
                    </div>

                    <h4 className="ses-item__title">{session.title}</h4>
                    <p className="ses-item__preview">{session.last_message_preview}</p>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Sidebar Footer: Hardware & Model Telemetry */}
          <div className="ses-engine-footer">
            <div className="ses-engine-status">
              <span className="ses-engine-dot" aria-hidden="true" />
              <span className="ses-engine-name">Local Core Engine</span>
            </div>
            <div className="ses-engine-metrics pt-mono">
              <span>v2.4-native</span>
              <span className="ses-engine-sep">·</span>
              <span>8.4 GB VRAM</span>
            </div>
          </div>
        </aside>

        {/* ── Right: Conversation Canvas ───────────────────────── */}
        <main className="ses-canvas">

          {/* Header */}
          <header className="ses-canvas-header">
            <div className="ses-header-info">
              <div className="ses-header-context">
                {activeSession.project_id ? (
                  <a
                    href={`/project/${activeSession.project_id}`}
                    className="ses-project-link"
                    title="Navigate to Project Overview"
                  >
                    <IconFolderSmall aria-hidden="true" />
                    <span>{activeSession.project_name}</span>
                  </a>
                ) : (
                  <span className="ses-general-pill">
                    <IconCpuSmall aria-hidden="true" />
                    <span>General Engineering Context</span>
                  </span>
                )}
              </div>
              <h2 className="ses-header-title">{activeSession.title}</h2>
            </div>

            <div className="ses-header-actions">
              <div className="ses-model-badge">
                <span className="ses-model-dot" aria-hidden="true" />
                <span className="ses-model-name">Vectoris Brain v1.2</span>
              </div>
            </div>
          </header>

          {/* Messages Stream */}
          <div className="ses-messages-stream" aria-label="Conversation stream">
            {activeSession.messages.length === 0 ? (
              <div className="ses-empty-stream">
                <div className="ses-empty-icon-wrap" aria-hidden="true">
                  <IconAIBrainLarge />
                </div>
                <h3 className="ses-empty-title">Vectoris Brain Ready</h3>
                <p className="ses-empty-desc">
                  {activeSession.project_id
                    ? `Ask questions, verify drawings, calculate feeder loads, or audit takeoffs for ${activeSession.project_name}.`
                    : "Ask general electrical engineering, NEC code lookup, voltage drop, or cable tray sizing questions."}
                </p>
                <div className="ses-prompt-chips">
                  {activeSession.project_id ? (
                    <>
                      <button
                        type="button"
                        className="ses-chip-btn"
                        onClick={() => handleInsertPromptChip("Count all 2x4 troffer lighting fixtures across Server Room B")}
                      >
                        Count lighting fixtures on Level 1
                      </button>
                      <button
                        type="button"
                        className="ses-chip-btn"
                        onClick={() => handleInsertPromptChip("Calculate voltage drop for 400A RPP subpanel feeder run")}
                      >
                        Calculate 400A feeder voltage drop
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="ses-chip-btn"
                        onClick={() => handleInsertPromptChip("What are the NEC 2026 conduit fill limits for 4 conductors?")}
                      >
                        NEC conduit fill rules
                      </button>
                      <button
                        type="button"
                        className="ses-chip-btn"
                        onClick={() => handleInsertPromptChip("Explain NEMA Class 12B cable tray loading specifications")}
                      >
                        NEMA 12B tray loading limits
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              activeSession.messages.map((msg) => {
                const isUser = msg.role === "user";
                const isTraceExpanded = expandedTraceId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={`ses-msg${isUser ? " ses-msg--user" : " ses-msg--assistant"}`}
                  >
                    {/* Avatar */}
                    <div className="ses-msg-avatar" aria-hidden="true">
                      {isUser ? "HB" : <IconAILogoSmall />}
                    </div>

                    <div className="ses-msg-content-wrap">
                      {/* Author Line */}
                      <div className="ses-msg-author-line">
                        <span className="ses-msg-author-name">
                          {isUser ? "Hardik Bhaskar" : "Vectoris Brain"}
                        </span>
                        <span className="ses-msg-time">{msg.timestamp}</span>
                      </div>

                      {/* Collapsible Thought Trace */}
                      {msg.thought_trace && msg.thought_trace.length > 0 && (
                        <div className="ses-trace-box">
                          <button
                            type="button"
                            className="ses-trace-toggle"
                            onClick={() => setExpandedTraceId(isTraceExpanded ? null : msg.id)}
                            aria-expanded={isTraceExpanded}
                          >
                            <IconTerminalSmall aria-hidden="true" />
                            <span>Reasoning Trace ({msg.thought_trace.length} steps)</span>
                            <IconChevronSmall isDown={isTraceExpanded} />
                          </button>

                          {isTraceExpanded && (
                            <ul className="ses-trace-list pt-mono" aria-label="AI reasoning steps">
                              {msg.thought_trace.map((step, idx) => (
                                <li key={idx} className="ses-trace-step">
                                  <span className="ses-trace-num">{idx + 1}</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {/* Main Message Text */}
                      <div className="ses-msg-bubble">
                        <div className="ses-msg-text">
                          {msg.content.split("\n\n").map((para, i) => (
                            <p key={i}>{para}</p>
                          ))}
                        </div>
                      </div>

                      {/* CAD Drawing Evidence Card */}
                      {msg.evidence && (
                        <div className="ses-evidence-card">
                          <div className="ses-evidence-header">
                            <IconBlueprintSmall aria-hidden="true" />
                            <span>CAD Drawing Evidence Reference</span>
                          </div>
                          <div className="ses-evidence-body">
                            <div className="ses-evidence-info">
                              <span className="ses-evidence-file">{msg.evidence.doc_name}</span>
                              <span className="ses-evidence-sheet">{msg.evidence.sheet}</span>
                              {msg.evidence.region && (
                                <span className="ses-evidence-region">{msg.evidence.region}</span>
                              )}
                            </div>
                            {msg.evidence.coordinates && (
                              <span className="ses-evidence-coords pt-mono">
                                {msg.evidence.coordinates}
                              </span>
                            )}
                          </div>
                          {activeSession.project_id && (
                            <a
                              href={`/project/${activeSession.project_id}/workspace?doc=${msg.evidence.doc_id}&sheet=${encodeURIComponent(msg.evidence.sheet)}`}
                              className="btn btn--secondary btn--xs ses-evidence-link"
                            >
                              <IconWorkspaceSmall aria-hidden="true" /> Jump to CAD Region
                            </a>
                          )}
                        </div>
                      )}

                      {/* Action Proposal Card */}
                      {msg.action_proposal && (
                        <div className={`ses-proposal-card ses-proposal-card--${msg.action_proposal.status}`}>
                          <div className="ses-proposal-header">
                            <div className="ses-proposal-badge">
                              <IconCheckmarkSmall aria-hidden="true" />
                              <span>Takeoff Action Proposal</span>
                            </div>
                            <span className="ses-proposal-status-label">
                              {msg.action_proposal.status === "approved" ? "Approved into Takeoff" : "Pending Verification"}
                            </span>
                          </div>

                          <h4 className="ses-proposal-title">{msg.action_proposal.title}</h4>
                          <p className="ses-proposal-desc">{msg.action_proposal.description}</p>

                          <div className="ses-proposal-meta-row">
                            <span className="ses-proposal-code pt-mono">{msg.action_proposal.item_code}</span>
                            <span className="ses-proposal-qty pt-mono">{msg.action_proposal.quantity}</span>
                          </div>

                          {msg.action_proposal.status === "pending" && (
                            <div className="ses-proposal-actions">
                              <button
                                type="button"
                                className="btn btn--primary btn--xs"
                                onClick={() => handleApproveProposal(msg.id)}
                              >
                                <IconCheckmarkSmall /> Approve into Takeoff
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pinned Command & Input Composer */}
          <div className="ses-composer-wrap">
            <div className="ses-composer">

              {/* Context Tag Header */}
              <div className="ses-composer-context-bar">
                <span className="ses-composer-context-tag">
                  <IconLayerSmall aria-hidden="true" />
                  <span>
                    Context: {activeSession.project_name ? activeSession.project_name : "General (No Project Scope)"}
                  </span>
                </span>

                <div className="ses-composer-quick-chips">
                  <button
                    type="button"
                    className="ses-quick-chip"
                    onClick={() => handleInsertPromptChip("/voltage-drop")}
                  >
                    /voltage-drop
                  </button>
                  <button
                    type="button"
                    className="ses-quick-chip"
                    onClick={() => handleInsertPromptChip("/tray-capacity")}
                  >
                    /tray-capacity
                  </button>
                  <button
                    type="button"
                    className="ses-quick-chip"
                    onClick={() => handleInsertPromptChip("/nec-table")}
                  >
                    /nec-table
                  </button>
                </div>
              </div>

              {/* Textarea */}
              <textarea
                className="ses-textarea"
                rows={2}
                placeholder={
                  activeSession.project_id
                    ? `Ask Vectoris about ${activeSession.project_name} drawings, takeoff items, or feeder calculations...`
                    : "Ask electrical engineering, voltage drop calculations, or NEC code compliance questions..."
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
                  <span>Press <kbd className="pt-mono">Enter ↵</kbd> to execute · <kbd className="pt-mono">Shift+Enter</kbd> for line</span>
                </div>

                <button
                  type="button"
                  className="btn btn--primary btn--sm ses-send-btn"
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                >
                  <IconSend /> Send Message
                </button>
              </div>
            </div>
          </div>

        </main>

      </div>
    </AppShell>
  );
}

// ── Iconsax & Linear-Style SVG Icons (100% Vector, No Emojis) ────────────────

function IconPlus({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className} aria-hidden="true">
      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconSearch({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className} aria-hidden="true">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function IconSend({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className} aria-hidden="true">
      <path d="M12.5 1.5L6 8M12.5 1.5L8.5 12.5 6 8 1.5 5.5l11-4z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconLayerSmall({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <path d="M6 1.5L1.5 4 6 6.5 10.5 4 6 1.5zM1.5 6.5L6 9l4.5-2.5M1.5 9L6 11.5 10.5 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconFolderSmall({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <path d="M1.5 3.5A1 1 0 012.5 2.5h2l1 1h4A1 1 0 0110.5 4.5v5a1 1 0 01-1 1h-7a1 1 0 01-1-1v-6z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconCpuSmall({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <rect x="2.5" y="2.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.1"/>
      <path d="M4.5 4.5h3v3h-3zM4.5 1v1.5M7.5 1v1.5M4.5 9.5V11M7.5 9.5V11M1 4.5h1.5M1 7.5h1.5M9.5 4.5H11M9.5 7.5H11" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  );
}

function IconAIBrainLarge({ className }: { className?: string }) {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
      <circle cx="18" cy="18" r="14" stroke="currentColor" strokeWidth="1.5" opacity="0.3" strokeDasharray="3 3"/>
      <path d="M18 10v16M10 18h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="18" cy="18" r="4" fill="currentColor"/>
    </svg>
  );
}

function IconAILogoSmall({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M8 2l1.5 4.5H14L9.8 9.2l1.6 4.8L8 11.2l-3.4 2.8 1.6-4.8L2 6.5h4.5L8 2z" fill="currentColor"/>
    </svg>
  );
}

function IconTerminalSmall({ className }: { className?: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className={className} aria-hidden="true">
      <rect x="1" y="2" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M3.5 5l2 1.5-2 1.5M7.5 8h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconChevronSmall({ isDown }: { isDown: boolean }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: isDown ? "rotate(180deg)" : "none", transition: "transform 150ms ease" }} aria-hidden="true">
      <path d="M2.5 3.5L5 6l2.5-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconBlueprintSmall({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className} aria-hidden="true">
      <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M4 1.5v11M1.5 6h11" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  );
}

function IconWorkspaceSmall({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <rect x="1.5" y="1.5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M4 4l2 2 2-2M6 6v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function IconCheckmarkSmall({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
