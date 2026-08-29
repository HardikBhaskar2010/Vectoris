/**
 * DashboardPage — Post-auth landing surface.
 *
 * State machine (per DASHBOARD.md §State Model):
 *   loading → Skeleton placeholders
 *   empty   → EmptyState (no projects yet — directs user to Create Project)
 *   error   → ErrorState with retry
 *   data    → Full populated dashboard
 *
 * Data is demo/placeholder until Supabase API is wired.
 * State can be forced via URL params for development and QA:
 *   ?state=loading | ?state=empty | ?state=error | ?state=data (default)
 *
 * Blueprint viewport: DEMO VISUAL ONLY — see BlueprintViewport.tsx contract.
 * AI feed: read-only activity stream — no interactive AI input here.
 * Confidence scores: NOT shown per UX_PRINCIPLES.md §2.
 */

import { useMemo, useState, useEffect } from "react";
import { Link, useRouter } from "../router";
import { AppShell } from "../components/AppShell";
import { KPICard } from "../components/KPICard";
import { BlueprintViewport } from "../components/BlueprintViewport";
import { CreateProjectModal } from "../components/CreateProjectModal";
import { useProjects, useAllDocuments, useLineItems, useAllLineItems, dataService } from "../services/dataService";
import { tourService } from "../services/tourService";
import { useAuth } from "../hooks/useAuth";
import { AnimatedZap } from "../components/icons/AnimatedIcons";

// ── Types ────────────────────────────────────────────────────────────────────
type PageState = "loading" | "empty" | "error" | "data";

// ── Demo data — structured to match the real API shape when it arrives ────────
const DEMO_AI_FEED = [
  {
    id: "feed-1",
    file: "E-104_CableTray.dwg",
    time: "2m ago",
    summary: (
      <>
        Detected <strong>43× LED Troffers</strong> and measured{" "}
        <strong className="feed-accent">127.4 m</strong> of overhead ladder cable tray across Server Room B.
      </>
    ),
    source: "Drawing Scale 1:100",
  },
  {
    id: "feed-2",
    file: "PAC-01 to PAC-06 Feeder Sizing",
    time: "12m ago",
    summary: (
      <>
        Measured <strong>184.6 m</strong> feeder routes. Proposed 350 kcmil conductor sizing — awaiting human review.
      </>
    ),
    source: "Layer: ELEC-FEEDER",
  },
] as const;

const DEMO_TAKEOFF_ITEMS = [
  { id: "ti-1", label: "Recessed 2×4 LED Troffer",  qty: "47 EA",      status: "verified", dot: "cyan" },
  { id: "ti-2", label: "Ladder Cable Tray 600 mm",  qty: "127.4 MTR",  status: "verified", dot: "red" },
  { id: "ti-3", label: "Duplex Receptacle 20A",      qty: "86 EA",      status: "review",   dot: "amber" },
  { id: "ti-4", label: '3" Rigid EMT Conduit',       qty: "184.6 MTR",  status: "verified", dot: "muted" },
] as const;

// ── Page ─────────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { user } = useAuth();
  const projects = useProjects();
  const documents = useAllDocuments();
  const allLineItems = useAllLineItems();
  const [pageState, setPageState] = useState<PageState>("data");

  const primaryProjectId = projects[0]?.id || "33333333-3333-3333-3333-333333333333";
  const primaryProjectName = projects[0]?.name || "ABC Data Center";
  const primaryLineItems = useLineItems(primaryProjectId);

  const operatorName =
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split("@")[0].replace(/[._-]/g, " ") : "Lead Estimator");

  // Read URL query state override if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forcedState = params.get("state") as PageState | null;
    if (forcedState && ["loading", "empty", "error", "data"].includes(forcedState)) {
      setPageState(forcedState);
    } else {
      setPageState(projects.length === 0 ? "empty" : "data");
    }
  }, [projects.length]);

  // Auto-launch guided product tour on first run after workspace data load
  useEffect(() => {
    if (pageState === "data" && !tourService.isTourCompleted()) {
      const timer = window.setTimeout(() => {
        tourService.startTour();
      }, 600);
      return () => window.clearTimeout(timer);
    }
  }, [pageState]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const totalSheets = useMemo(() => {
    return documents.reduce((sum, d) => sum + (d.sheet_count || 0), 0);
  }, [documents]);

  const totalProposed = useMemo(() => {
    return allLineItems.filter((i) => i.status === "proposed").length;
  }, [allLineItems]);

  const totalVerified = useMemo(() => {
    return allLineItems.filter((i) => i.status === "approved").length;
  }, [allLineItems]);

  const kpis = useMemo(() => [
    {
      label: "Active Projects",
      value: projects.length,
      trend: projects.length > 0 ? `${projects.length} workspace projects active` : "Ready to create project",
      trendType: "positive" as const,
      accent: false,
      icon: <IconDomain />,
    },
    {
      label: "Sheets Processed",
      value: totalSheets,
      trend: totalSheets > 0 ? "CAD & PDF drawings indexed" : "Awaiting document ingestion",
      trendType: totalSheets > 0 ? ("positive" as const) : ("neutral" as const),
      accent: false,
      icon: <IconBlueprint />,
    },
    {
      label: "Takeoff Items",
      value: allLineItems.length > 0 ? allLineItems.length : (projects.length > 0 ? projects.reduce((acc, p) => acc + p.sheets, 0) : 0),
      trend: totalProposed > 0 ? `${totalProposed} proposed items need review` : "All quantities reconciled",
      trendType: totalProposed > 0 ? ("warning" as const) : ("positive" as const),
      accent: true,
      icon: <IconCable />,
    },
    {
      label: "Verified Line Items",
      value: totalVerified,
      trend: totalVerified > 0 ? "Ready for BOQ schedule export" : "Awaiting takeoff verification",
      trendType: totalVerified > 0 ? ("positive" as const) : ("neutral" as const),
      accent: false,
      icon: <IconReceipt />,
    },
  ], [projects, totalSheets, allLineItems, totalProposed, totalVerified]);

  const activeProjects = useMemo(() => {
    return projects.slice(0, 3).map((p) => ({
      id: p.id,
      name: p.name,
      discipline: p.discipline,
      sheets: `${p.sheets} ${p.sheetType}`,
      status: p.status === "completed" || p.status === "verified" ? "Verified" : p.status === "review" ? "In Review" : "In Progress",
      progress: p.progress,
      action: p.status === "completed" || p.status === "verified" ? ("boq" as const) : ("inspect" as const),
    }));
  }, [projects]);

  return (
    <AppShell activePath="/dashboard">
      <div className="dashboard" role="main" aria-label="Workstation Dashboard">
        {pageState === "loading" && <DashboardSkeleton />}
        {pageState === "empty" && <DashboardEmpty onOpenCreate={() => setIsCreateModalOpen(true)} />}
        {pageState === "error" && <DashboardError onRetry={() => setPageState("data")} />}
        {pageState === "data" && (
          <>
            {/* Welcome row */}
            <div className="dashboard__welcome">
              <div>
                <h1 className="dashboard__greeting">
                  {greeting}, {operatorName}
                </h1>
                <p className="dashboard__subline">
                  Engineering intelligence across your active projects.
                </p>
              </div>
              <div className="dashboard__ctas">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  <IconPlus aria-hidden="true" />
                  New Project
                </button>
                <Link to="/project/p1/documents" className="btn btn--primary">
                  <IconUpload aria-hidden="true" />
                  Upload Drawings
                </Link>
              </div>
            </div>

            {/* KPI Grid */}
            <div className="dashboard__kpi-grid" role="region" aria-label="Project summary metrics">
              {kpis.map((kpi, i) => (
                <KPICard
                  key={kpi.label}
                  label={kpi.label}
                  value={kpi.value}
                  trend={kpi.trend}
                  trendType={kpi.trendType}
                  icon={kpi.icon}
                  accent={kpi.accent}
                  entryDelay={i * 60}
                />
              ))}
            </div>

            {/* Hero: Blueprint Viewport (7) + Right Column (5) */}
            <div className="dashboard__hero">

              {/* Left — Blueprint viewport + project table */}
              <section className="dashboard__left-panel" aria-label="Active project drawing preview">
                <BlueprintViewport />

                {/* Recent Projects Table */}
                <div className="projects-table">
                  <div className="projects-table__header">
                    <span className="projects-table__title">Recent Projects &amp; Drawing Status</span>
                    <Link to="/projects" className="projects-table__view-all">View all {projects.length} projects →</Link>
                  </div>
                  <table className="projects-table__table">
                    <thead>
                      <tr>
                        <th>Project</th>
                        <th>Discipline</th>
                        <th>Sheets</th>
                        <th>Takeoff Status</th>
                        <th className="projects-table__th--right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeProjects.map((p) => (
                        <tr key={p.id}>
                          <td className="projects-table__name">{p.name}</td>
                          <td className="projects-table__discipline">{p.discipline}</td>
                          <td className="projects-table__sheets">{p.sheets}</td>
                          <td>
                            <ProjectStatusBadge status={p.status} progress={p.progress} />
                          </td>
                          <td className="projects-table__action">
                            <Link
                              to={p.action === "boq" ? `/project/${p.id}/reports` : `/project/${p.id}/workspace`}
                              className="projects-table__link"
                            >
                              {p.action === "boq" ? "BOQ" : "Inspect"}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Right — AI Feed + Takeoff Stream */}
              <div className="dashboard__right-col">

                {/* AI Engineering Copilot Feed — read-only activity stream */}
                <section className="ai-feed" aria-label="AI Engineering Copilot activity feed — read only">
                  <div className="ai-feed__header">
                    <div className="ai-feed__title-row">
                      <IconBrain aria-hidden="true" />
                      <span className="ai-feed__title">AI Engineering Copilot</span>
                    </div>
                    <span className="ai-feed__status">Live Inference</span>
                  </div>
                  <ol className="ai-feed__list" aria-label="Recent AI activity">
                    {DEMO_AI_FEED.map((item) => (
                      <li key={item.id} className="ai-feed__item">
                        <div className="ai-feed__item-meta">
                          <span className="ai-feed__item-file">{item.file}</span>
                          <time className="ai-feed__item-time">{item.time}</time>
                        </div>
                        <p className="ai-feed__item-summary">{item.summary}</p>
                        <span className="ai-feed__item-source">Source: {item.source}</span>
                      </li>
                    ))}
                  </ol>
                </section>

                {/* Takeoff Items Stream */}
                <section className="takeoff-stream" data-tour="dashboard-takeoff" aria-label={`Takeoff items for ${primaryProjectName}`}>
                  <div className="takeoff-stream__header">
                    <div className="takeoff-stream__title-row">
                      <IconStraighten aria-hidden="true" />
                      <span className="takeoff-stream__title">Takeoff Items — {primaryProjectName}</span>
                    </div>
                    <Link to={`/project/${primaryProjectId}/takeoff`} className="takeoff-stream__link">Full Takeoff →</Link>
                  </div>
                  <ol className="takeoff-stream__list" aria-label="Recent takeoff items">
                    {(primaryLineItems.length > 0 ? primaryLineItems.slice(0, 4) : DEMO_TAKEOFF_ITEMS).map((item, idx) => {
                      const isReal = "item_code" in item;
                      const label = isReal ? `${item.item_code} ${item.name}` : item.label;
                      const qty = isReal ? `${item.quantity} ${item.unit}` : item.qty;
                      const status = isReal ? (item.status === "approved" ? "verified" : item.status === "proposed" ? "review" : "rejected") : item.status;
                      const dot = isReal ? (item.status === "approved" ? "cyan" : item.status === "proposed" ? "amber" : "red") : item.dot;

                      return (
                        <li key={item.id || idx} className="takeoff-stream__item">
                          <span className={`takeoff-stream__dot takeoff-stream__dot--${dot}`} aria-hidden="true" />
                          <span className="takeoff-stream__label" title={label}>{label}</span>
                          <span className="takeoff-stream__qty font-mono">{qty}</span>
                          <TakeoffStatusBadge status={status as "verified" | "review" | "flagged"} />
                        </li>
                      );
                    })}
                  </ol>
                  <div className="takeoff-stream__footer">
                    <span className="takeoff-stream__total font-mono">Total Takeoff: {primaryLineItems.length || 21} Items</span>
                    <Link to={`/project/${primaryProjectId}/workspace`} className="btn btn--primary btn--sm">
                      Launch Drawing Takeoff
                      <IconArrow aria-hidden="true" />
                    </Link>
                  </div>
                </section>

              </div>
            </div>
          </>
        )}
      </div>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </AppShell>
  );
}

// ── Loading State — Skeleton ─────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <>
      <div className="dashboard__welcome">
        <div>
          <div className="skeleton skeleton--h2" />
          <div className="skeleton skeleton--p" />
        </div>
        <div className="dashboard__ctas">
          <div className="skeleton skeleton--btn" />
          <div className="skeleton skeleton--btn" />
        </div>
      </div>

      <div className="dashboard__kpi-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="kpi-card kpi-card--loading" aria-hidden="true">
            <div className="kpi-card__body">
              <div className="skeleton skeleton--label" />
              <div className="skeleton skeleton--value" />
              <div className="skeleton skeleton--trend" />
            </div>
            <div className="kpi-card__icon-wrap">
              <div className="skeleton skeleton--icon" />
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard__hero">
        <div className="dashboard__left-panel">
          <div className="skeleton skeleton--viewport" />
          <div className="skeleton skeleton--table" />
        </div>
        <div className="dashboard__right-col">
          <div className="skeleton skeleton--feed" />
          <div className="skeleton skeleton--stream" />
        </div>
      </div>
    </>
  );
}

// ── Empty State — intelligent workstation first-run hub ──────────────────────
function DashboardEmpty({ onOpenCreate }: { onOpenCreate: () => void }) {
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedSample = () => {
    setIsSeeding(true);
    try {
      dataService.seedSampleProject();
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="dashboard-empty-hub" role="main" aria-label="Vectoris Workstation Initializer" style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 16px" }}>
      {/* Top Identity Hero */}
      <div style={{ textAlign: "center", marginBottom: "36px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "4px 12px", borderRadius: "20px", background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.25)", marginBottom: "16px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6" }} aria-hidden="true" />
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Local-First CAD Perception Engine · Ready
          </span>
        </div>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--app-text-primary, #f8fafc)", letterSpacing: "-0.02em", margin: "0 0 10px 0" }}>
          Engineering Intelligence Workstation
        </h1>
        <p style={{ fontSize: "1rem", color: "var(--app-text-secondary, #94a3b8)", maxWidth: "620px", margin: "0 auto", lineHeight: "1.5" }}>
          Vectoris extracts vector geometries, electrical components, and single-line feeder runs directly from drawing sets with zero data fabrication.
        </p>

        {/* Dual Primary Actions */}
        <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "24px", flexWrap: "wrap" }} data-tour="dashboard-empty-cta">
          <button
            type="button"
            className="btn btn--primary"
            onClick={onOpenCreate}
            data-tour="dashboard-primary-action"
            style={{ padding: "12px 24px", fontSize: "14px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <IconPlus aria-hidden="true" />
            <span>Create First Project</span>
          </button>

          <button
            type="button"
            className="btn btn--sample-cta"
            onClick={handleSeedSample}
            disabled={isSeeding}
            style={{ padding: "12px 22px", fontSize: "14px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <AnimatedZap size={16} color="var(--app-amber, #f59e0b)" />
            <span>{isSeeding ? "Loading Sample…" : "Load Sample Hyperscale Project"}</span>
          </button>
        </div>
      </div>

      {/* 4-Step Interactive Workflow */}
      <div style={{ marginBottom: "36px" }} data-tour="dashboard-workflow">
        <h2 style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--app-text-primary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "16px" }}>
          The 4-Stage Vectoris Workflow
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
          {/* Step 1 */}
          <div
            onClick={onOpenCreate}
            style={{
              background: "var(--app-surface-1)",
              border: "1.5px solid var(--accent-primary, #3b82f6)",
              borderRadius: "10px",
              padding: "20px",
              cursor: "pointer",
              transition: "transform 180ms ease, box-shadow 180ms ease",
              boxShadow: "0 4px 16px rgba(59, 130, 246, 0.12)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#2563eb", background: "rgba(59, 130, 246, 0.15)", border: "1px solid rgba(59, 130, 246, 0.3)", padding: "2px 8px", borderRadius: "4px" }}>
                Stage 1 · Active
              </span>
              <span style={{ fontSize: "12px", color: "var(--app-accent, #3b82f6)", fontWeight: 700 }}>Start →</span>
            </div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--app-text-primary)", marginBottom: "6px" }}>
              1. Define Project
            </div>
            <p style={{ fontSize: "12.5px", color: "var(--app-text-secondary)", lineHeight: "1.5", margin: 0 }}>
              Set up project metadata, client identity, engineering discipline, and facility scope.
            </p>
          </div>

          {/* Step 2 */}
          <div
            style={{
              background: "var(--app-surface-1)",
              border: "1px solid var(--app-border-strong)",
              borderRadius: "10px",
              padding: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--app-text-primary)", background: "var(--app-surface-2)", border: "1px solid var(--app-border)", padding: "2px 8px", borderRadius: "4px" }}>
                Stage 2
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--app-text-primary)",
                  background: "var(--app-surface-2)",
                  border: "1px solid var(--app-border-strong)",
                  padding: "3px 9px",
                  borderRadius: "12px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--app-text-secondary)", display: "inline-block" }} aria-hidden="true" />
                <span>Awaiting Step 1</span>
              </span>
            </div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--app-text-primary)", marginBottom: "6px" }}>
              2. Ingest Drawings
            </div>
            <p style={{ fontSize: "12.5px", color: "var(--app-text-secondary)", lineHeight: "1.5", margin: 0 }}>
              Upload multi-page PDFs or CAD files. Vectoris extracts vector streams and sheet classifications locally.
            </p>
          </div>

          {/* Step 3 */}
          <div
            style={{
              background: "var(--app-surface-1)",
              border: "1px solid var(--app-border-strong)",
              borderRadius: "10px",
              padding: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--app-text-primary)", background: "var(--app-surface-2)", border: "1px solid var(--app-border)", padding: "2px 8px", borderRadius: "4px" }}>
                Stage 3
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--app-text-primary)",
                  background: "var(--app-surface-2)",
                  border: "1px solid var(--app-border-strong)",
                  padding: "3px 9px",
                  borderRadius: "12px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--app-text-secondary)", display: "inline-block" }} aria-hidden="true" />
                <span>Awaiting Step 2</span>
              </span>
            </div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--app-text-primary)", marginBottom: "6px" }}>
              3. Review Takeoff
            </div>
            <p style={{ fontSize: "12.5px", color: "var(--app-text-secondary)", lineHeight: "1.5", margin: 0 }}>
              Inspect bounding boxes on blueprints, verify quantities, and approve proposed items into the BOQ ledger.
            </p>
          </div>

          {/* Step 4 */}
          <div
            style={{
              background: "var(--app-surface-1)",
              border: "1px solid var(--app-border-strong)",
              borderRadius: "10px",
              padding: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--app-text-primary)", background: "var(--app-surface-2)", border: "1px solid var(--app-border)", padding: "2px 8px", borderRadius: "4px" }}>
                Stage 4
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--app-text-primary)",
                  background: "var(--app-surface-2)",
                  border: "1px solid var(--app-border-strong)",
                  padding: "3px 9px",
                  borderRadius: "12px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--app-text-secondary)", display: "inline-block" }} aria-hidden="true" />
                <span>Awaiting Step 3</span>
              </span>
            </div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--app-text-primary)", marginBottom: "6px" }}>
              4. Investigate & Plan
            </div>
            <p style={{ fontSize: "12.5px", color: "var(--app-text-secondary)", lineHeight: "1.5", margin: 0 }}>
              Ask CAD queries in the Investigation Workshop and compile version-controlled Project Plans.
            </p>
          </div>
        </div>
      </div>

      {/* Specifications / Formats Footer */}
      <div
        style={{
          background: "var(--app-surface-2, rgba(255, 255, 255, 0.03))",
          border: "1px solid var(--app-border, rgba(255, 255, 255, 0.08))",
          borderRadius: "8px",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--app-text-muted, #94a3b8)" }}>
            Supported Ingestion:
          </span>
          <span style={{ fontSize: "12px", fontFamily: "var(--font-technical, monospace)", color: "var(--app-text-primary, #f8fafc)" }}>
            PDF (FlateDecode) · AutoCAD DWG / DXF · Single-Line Diagrams (SLD)
          </span>
        </div>
        <div style={{ fontSize: "12px", color: "var(--app-text-muted, #94a3b8)" }}>
          100% On-Device Engine · Zero Fabricated Data
        </div>
      </div>
    </div>
  );
}

// ── Error State ──────────────────────────────────────────────────────────────
function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="dashboard-error" role="alert" aria-label="Failed to load dashboard">
      <div className="dashboard-error__icon" aria-hidden="true">
        <IconError />
      </div>
      <h1 className="dashboard-error__title">Could not load dashboard</h1>
      <p className="dashboard-error__body">
        There was a problem fetching your project data. Your local drawings are still available.
      </p>
      <button type="button" className="btn btn--primary" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ProjectStatusBadge({ status, progress }: { status: string; progress: number }) {
  const variant =
    progress === 100 ? "verified" :
    progress >= 50   ? "progress" :
                       "review";
  return (
    <span className={`status-badge status-badge--${variant}`} aria-label={`${status} — ${progress}%`}>
      {status} ({progress}%)
    </span>
  );
}

function TakeoffStatusBadge({ status }: { status: string }) {
  return (
    <span className={`takeoff-badge takeoff-badge--${status}`} aria-label={status}>
      {status === "verified" ? "Verified" : "Review"}
    </span>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function IconDomain() {
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <rect x="2" y="6" width="16" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M6 6V4a2 2 0 014 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M6 10h8M6 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>;
}
function IconBlueprint() {
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M6 2v16M2 6h4M2 10h4M2 14h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
    <path d="M9 7h7M9 10h5M9 13h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>;
}
function IconCable() {
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <circle cx="4" cy="10" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="16" cy="10" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M6 10h8" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M10 4v3M10 13v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>;
}
function IconReceipt() {
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M5 2h10v16l-2-1.5L11 18l-1-1.5L9 18l-1.5-1.5L5.5 18z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M8 7h4M8 10h6M8 13h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>;
}
function IconPlus() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>;
}
function IconUpload() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M7 9V2M4 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 10v1a1 1 0 001 1h8a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>;
}
function IconBrain() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M8 2C5.8 2 4 3.6 4 5.5c0 .8.3 1.5.7 2C3.7 8 3 9.2 3 10.5 3 12.4 4.6 14 6.5 14H9.5C11.4 14 13 12.4 13 10.5c0-1.3-.7-2.5-1.7-3 .5-.5.7-1.2.7-2C12 3.6 10.2 2 8 2z" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M8 2v12M5 7.5h6M4.5 11h7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.6"/>
  </svg>;
}
function IconStraighten() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="1" y="5" width="14" height="6" rx="1" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M4 5V9M7 5v3M10 5V9M13 5v3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
  </svg>;
}
function IconArrow() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <path d="M2 6.5h9M8 3.5l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}
function IconEmptyBlueprint() {
  return <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <rect x="8" y="8" width="48" height="48" rx="6" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
    <path d="M16 8v48M8 16h8M8 24h8M8 32h8M8 40h8M8 48h8" stroke="currentColor" strokeWidth="1.5" opacity="0.25" strokeLinecap="round"/>
    <path d="M24 28h24M24 34h16M24 40h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
    <circle cx="40" cy="42" r="10" fill="var(--app-accent, #dd0200)" opacity="0.1" stroke="var(--app-accent, #dd0200)" strokeWidth="1.5" strokeDasharray="3 2"/>
    <path d="M37 42l2 2 4-4" stroke="var(--app-accent, #dd0200)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
  </svg>;
}
function IconError() {
  return <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <circle cx="24" cy="24" r="20" stroke="var(--status-warning, #f59e0b)" strokeWidth="2" opacity="0.4"/>
    <path d="M24 14v14" stroke="var(--status-warning, #f59e0b)" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="24" cy="34" r="2" fill="var(--status-warning, #f59e0b)" opacity="0.8"/>
  </svg>;
}
