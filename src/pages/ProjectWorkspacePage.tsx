/**
 * ProjectWorkspacePage — Takeoff Workspace tab.
 *
 * SOURCE OF TRUTH:
 *   docs/06_PAGES/DRAWING_VIEWER.md
 *   docs/06_PAGES/PROJECT_NAVIGATION.md §2 (Workspace)
 *   docs/03_ARCHITECTURE/DATA_MODEL.md
 *
 * STATES: loading | success | empty-sheet | selection | measure-mode
 *
 * KEYBOARD: F=fit, M=measure, Esc=deselect, Delete=reject, +/-=zoom
 *
 * TRACEABILITY: Detection → Sheet → Document → Project → Correction History
 *
 * DESIGN:
 *   Dark canvas (#0c0c0f), liquid glass toolbar, solid right panel,
 *   IBM Plex Mono telemetry, cubic-bezier(0.22, 1, 0.36, 1) transitions
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useRouter } from "../router";
import { ProjectShell } from "../components/ProjectShell";
import type { ProjectMeta } from "../components/ProjectShell";

// ── Types ─────────────────────────────────────────────────────────────────────

import type {
  Sheet,
  LayerDef,
  Detection,
  LineItemStatus as DetectionStatus,
} from "../data";
import {
  useProject,
  useSheets,
  useLayers,
  useDetections,
  useLineItems,
  dataService,
} from "../services/dataService";

type ToolMode = "select" | "pan" | "measure";

interface TakeoffItem {
  id: string;
  detection_id?: string;
  name: string;
  spec: string;
  quantity: number;
  unit: string;
  status: DetectionStatus;
  layer_id: string;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ProjectWorkspacePage() {
  const { params, navigate } = useRouter();
  const projectId = params.id || "p1";
  const project = useProject(projectId);
  const sheets = useSheets(projectId);
  const layers = useLayers();
  const lineItems = useLineItems(projectId);

  const projectMeta: ProjectMeta = {
    id: projectId,
    name: project?.name || "ABC Data Center",
    client: project?.client || "Equinix",
    sector: project?.sector,
    discipline: project?.discipline,
    displayType: project?.displayType || "Data Center · Electrical",
    typeProvenance: project?.typeProvenance || "ai_inferred",
  };

  const [isLoading,      setIsLoading]      = useState(true);
  const [activeSheetId,  setActiveSheetId]  = useState("s3");
  const [layerVis,       setLayerVis]       = useState<Record<string, boolean>>({ LT: true, CT: true, PF: true, AW: true });
  const activeDets                          = useDetections(activeSheetId);
  const [selectedDetId,  setSelectedDetId]  = useState<string | null>(null);
  const [hoveredDetId,   setHoveredDetId]   = useState<string | null>(null);
  const [toolMode,       setToolMode]       = useState<ToolMode>("select");
  const [zoom,           setZoom]           = useState(100);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [selectedRowId,  setSelectedRowId]  = useState<string | null>(null);
  const [tooltipPos,     setTooltipPos]     = useState<{ x: number; y: number } | null>(null);
  const [justApproved,   setJustApproved]   = useState<string | null>(null);
  const [measureLine,    setMeasureLine]    = useState<{ x1: number; y1: number; x2: number; y2: number; label: string } | null>(null);
  const [measureStart,   setMeasureStart]   = useState<{ x: number; y: number } | null>(null);

  useEffect(() => { const t = setTimeout(() => setIsLoading(false), 900); return () => clearTimeout(t); }, []);

  const activeSheet = sheets.find(s => s.id === activeSheetId) ?? sheets[0] ?? {
    id: "s3",
    project_id: projectId,
    sheet_id: "E-104",
    name: "Cable Tray Layout",
    type: "floor_plan" as const,
    detection_count: 47,
    document_name: "E-104_CableTrayLayout.dwg",
    is_empty: false,
  };

  // Derive Live Takeoff table items directly from canonical detections and line items
  const activeTakeoff: TakeoffItem[] = useMemo(() => {
    return activeDets.map((d) => {
      const linkedLineItem = d.line_item_id
        ? lineItems.find((li) => li.id === d.line_item_id)
        : lineItems.find((li) => li.item_code === d.label || li.name === d.label);

      return {
        id: d.line_item_id || `ti-${d.id}`,
        detection_id: d.id,
        name: linkedLineItem?.name || d.label,
        spec: linkedLineItem?.specification || `${d.category} · ${d.quantity} ${d.unit}`,
        quantity: d.quantity,
        unit: d.unit,
        status: d.status,
        layer_id: d.layer_id,
      };
    });
  }, [activeDets, lineItems]);

  const selectedDet   = activeDets.find(d => d.id === selectedDetId) ?? null;
  const approvedCount = activeDets.filter(d => d.status === "approved").length;
  const totalDets     = activeDets.length;
  const verifiedItems = activeTakeoff.filter(t => t.status === "approved").length;

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).closest("input,textarea,select")) return;
      if (e.key === "f" || e.key === "F") setZoom(100);
      if (e.key === "m" || e.key === "M") {
        setToolMode(m => m === "measure" ? "select" : "measure");
        setMeasureStart(null); setMeasureLine(null);
      }
      if (e.key === "Escape") {
        setSelectedDetId(null); setSelectedRowId(null);
        setToolMode("select"); setMeasureStart(null); setMeasureLine(null);
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedDetId) handleReject(selectedDetId);
      }
      if (e.key === "+" || e.key === "=") setZoom(z => Math.min(200, z + 20));
      if (e.key === "-") setZoom(z => Math.max(40, z - 20));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedDetId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Actions
  const handleApprove = useCallback((id: string) => {
    dataService.updateDetectionStatus(activeSheetId, id, "approved", "Hardik Bhaskar");
    setJustApproved(id);
    setTimeout(() => setJustApproved(null), 600);
  }, [activeSheetId]);

  const handleReject = useCallback((id: string, reason?: string) => {
    dataService.updateDetectionStatus(activeSheetId, id, "rejected", "Hardik Bhaskar", reason);
    setSelectedDetId(null);
  }, [activeSheetId]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (toolMode === "pan") return;
    if (toolMode === "measure") {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      if (!measureStart) {
        setMeasureStart({ x, y });
      } else {
        const dist = Math.sqrt((x - measureStart.x) ** 2 + (y - measureStart.y) ** 2) * 4.2;
        setMeasureLine({ x1: measureStart.x, y1: measureStart.y, x2: x, y2: y, label: `${dist.toFixed(1)}m` });
        setMeasureStart(null);
        setTimeout(() => setMeasureLine(null), 4000);
      }
      return;
    }
    setSelectedDetId(null); setSelectedRowId(null);
  }, [toolMode, measureStart]);

  const handleDetClick = useCallback((e: React.MouseEvent | React.KeyboardEvent, id: string) => {
    e.stopPropagation();
    if (toolMode !== "select") return;
    setSelectedDetId(p => p === id ? null : id);
    const ti = activeTakeoff.find(t => t.detection_id === id);
    if (ti) setSelectedRowId(ti.id);
  }, [toolMode, activeTakeoff]);

  const handleRowClick = useCallback((item: TakeoffItem) => {
    setSelectedRowId(p => p === item.id ? null : item.id);
    if (item.detection_id) setSelectedDetId(item.detection_id);
  }, []);

  const handleSheetSwitch = useCallback((id: string) => {
    setActiveSheetId(id);
    setSelectedDetId(null); setSelectedRowId(null);
    setMeasureLine(null); setMeasureStart(null); setToolMode("select");
  }, []);

  // Helper: derive detection CSS class
  function dCls(id: string): string {
    const d = activeDets.find(x => x.id === id);
    if (!d) return "wks-detection";
    return [
      "wks-detection",
      d.status === "rejected" ? " wks-detection--rejected" : "",
      selectedDetId === id ? " wks-detection--selected" : "",
      justApproved === id ? " wks-detection--just-approved" : "",
    ].join("");
  }

  const cursorClass = toolMode === "pan" ? "wks-canvas--pan" : toolMode === "measure" ? "wks-canvas--measure" : "wks-canvas--select";

  if (isLoading) return (
    <ProjectShell project={projectMeta} activeTab="workspace">
      <style>{`.project-shell__content{padding:0!important;overflow:hidden}`}</style>
      <WorkspaceSkeleton />
    </ProjectShell>
  );

  return (
    <ProjectShell
      project={projectMeta}
      activeTab="workspace"
      headerActions={
        <Link to={`/sessions?project=${projectId}`} className="btn btn--secondary btn--sm">
          <IconSession /> Investigation Workshop
        </Link>
      }
    >
      <style>{`.project-shell__content{padding:0!important;overflow:hidden}`}</style>

      <div
        className={`wks-layout${panelCollapsed ? " wks-layout--panel-collapsed" : ""}`}
        style={{ height: "calc(100dvh - var(--app-header-h) - 113px)" }}
      >

        {/* ── LEFT PANEL ──────────────────────────────────────────────────── */}
        <aside className="wks-left-panel" aria-label="Sheet navigator">

          {/* Sheet Navigator */}
          <div className="wks-panel-section">
            <div className="wks-panel-section__header">
              <span className="wks-panel-section__title">Sheets</span>
              <span className="wks-panel-section__count">{sheets.length}</span>
            </div>
            <ul className="wks-sheet-list" role="listbox" aria-label="Drawing sheets">
              {sheets.map(sheet => (
                <li
                  key={sheet.id}
                  role="option" aria-selected={sheet.id === activeSheetId}
                  className={`wks-sheet-item${sheet.id === activeSheetId ? " wks-sheet-item--active" : ""}`}
                  onClick={() => handleSheetSwitch(sheet.id)}
                  tabIndex={0} onKeyDown={e => e.key === "Enter" && handleSheetSwitch(sheet.id)}
                >
                  <div className="wks-sheet-item__icon" aria-hidden="true">
                    {sheet.type === "schedule" ? <IconSchedule /> : <IconFloorPlan />}
                  </div>
                  <div className="wks-sheet-item__info">
                    <span className="wks-sheet-item__id">{sheet.sheet_id}</span>
                    <span className="wks-sheet-item__name">{sheet.name}</span>
                    {sheet.detection_count > 0 && (
                      <span className="wks-sheet-item__count">{sheet.detection_count} detected</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Layer Toggles */}
          <div className="wks-panel-section">
            <div className="wks-panel-section__header">
              <span className="wks-panel-section__title">Layers</span>
              <span style={{ color: "var(--app-text-muted)" }}><IconLayers /></span>
            </div>
            <ul className="wks-layer-list" aria-label="Layer visibility toggles">
              {layers.map(layer => {
                const on = layerVis[layer.id] ?? true;
                return (
                  <li key={layer.id} className={`wks-layer-item${on ? "" : " wks-layer-item--off"}`}>
                    <div className="wks-layer-dot" style={{ background: on ? layer.color : "var(--app-border-strong)" }} aria-hidden="true" />
                    <span className="wks-layer-name">{layer.name}</span>
                    <button
                      type="button"
                      className={`wks-layer-toggle${on ? " wks-layer-toggle--on" : ""}`}
                      aria-label={`${on ? "Hide" : "Show"} ${layer.name}`}
                      aria-pressed={on}
                      onClick={() => setLayerVis(p => ({ ...p, [layer.id]: !p[layer.id] }))}
                    />
                  </li>
                );
              })}
            </ul>
          </div>

        </aside>

        {/* ── CANVAS AREA ─────────────────────────────────────────────────── */}
        <main className="wks-canvas-area" id="wks-main" tabIndex={-1} aria-label="Drawing canvas">

          {/* Sheet context bar — liquid glass pill */}
          <div className="wks-sheet-bar" aria-label="Active sheet">
            <span className="wks-sheet-bar__project">Project: {projectMeta.name}</span>
            <span className="wks-sheet-bar__sep">/</span>
            <span className="wks-sheet-bar__sheet">{activeSheet.sheet_id} · {activeSheet.name}</span>
          </div>

          {/* Floating Toolbar */}
          <div className="wks-toolbar" role="toolbar" aria-label="Drawing tools">
            {/* V mark */}
            <div style={{ width: 30, height: 30, borderRadius: 7, background: "var(--app-accent)", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 4, flexShrink: 0 }} aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l5 10 5-10" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <button type="button" className="wks-toolbar__btn" onClick={() => setZoom(z => Math.max(40, z - 20))} aria-label="Zoom out (-)"><IconZoomOut /></button>
            <span className="wks-toolbar__zoom-label">{zoom}%</span>
            <button type="button" className="wks-toolbar__btn" onClick={() => setZoom(z => Math.min(200, z + 20))} aria-label="Zoom in (+)"><IconZoomIn /></button>
            <button type="button" className="wks-toolbar__btn" onClick={() => setZoom(100)} aria-label="Fit to page (F)" title="Fit (F)"><IconFit /></button>
            <div className="wks-toolbar__sep" aria-hidden="true" />
            <button type="button" className={`wks-toolbar__btn${toolMode === "select" ? " wks-toolbar__btn--active" : ""}`} onClick={() => setToolMode("select")} aria-label="Select" aria-pressed={toolMode === "select"}><IconSelect /></button>
            <button type="button" className={`wks-toolbar__btn${toolMode === "pan" ? " wks-toolbar__btn--active" : ""}`} onClick={() => setToolMode(m => m === "pan" ? "select" : "pan")} aria-label="Pan" aria-pressed={toolMode === "pan"}><IconPan /></button>
            <div className="wks-toolbar__sep" aria-hidden="true" />
            <button type="button" className={`wks-toolbar__btn${toolMode === "measure" ? " wks-toolbar__btn--active" : ""}`} onClick={() => { setToolMode(m => m === "measure" ? "select" : "measure"); setMeasureStart(null); setMeasureLine(null); }} aria-label="Measure (M)" aria-pressed={toolMode === "measure"} title="Measure (M)"><IconMeasure /></button>
            <button type="button" className="wks-toolbar__btn" onClick={() => { navigate(`/project/${projectId}/reports`); }} aria-label="Export"><IconExport /></button>
          </div>

          {/* Measure mode banner */}
          {toolMode === "measure" && (
            <div className="wks-measure-banner" role="status">
              {measureStart ? "Click second point to complete measurement" : "M — Click start point to measure"}
            </div>
          )}

          {/* Canvas viewport */}
          <div className={`wks-canvas ${cursorClass}`} onClick={handleCanvasClick} aria-label="Drawing canvas viewport">
            <div className="wks-blueprint" style={{ transform: `scale(${zoom / 100})` }}>
              <BlueprintSVG
                activeSheetId={activeSheetId}
                activeSheet={activeSheet}
                activeDets={activeDets}
                layerVis={layerVis}
                selectedDetId={selectedDetId}
                justApproved={justApproved}
                measureLine={measureLine}
                measureStart={measureStart}
                dCls={dCls}
                handleDetClick={handleDetClick}
                setHoveredDetId={setHoveredDetId}
                setTooltipPos={setTooltipPos}
              />
            </div>

            {/* Empty sheet state */}
            {activeSheet.is_empty && (
              <div className="wks-empty-sheet" role="status">
                <svg className="wks-empty-sheet__icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                  <rect x="8" y="6" width="32" height="36" rx="3" stroke="currentColor" strokeWidth="2" />
                  <line x1="14" y1="16" x2="34" y2="16" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="14" y1="22" x2="34" y2="22" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="14" y1="28" x2="26" y2="28" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <p className="wks-empty-sheet__title">No detections on this sheet</p>
                <p className="wks-empty-sheet__sub">Schedule sheets are not processed for detections</p>
              </div>
            )}
          </div>

          {/* Canvas focus bar */}
          <div className="wks-canvas-focus-bar" aria-live="polite">
            <div className="wks-canvas-focus-bar__dot" aria-hidden="true" />
            {activeSheet.sheet_id}&nbsp;|&nbsp;
            Detections: <span className="wks-canvas-focus-bar__count">{approvedCount}/{totalDets} approved</span>
          </div>

          {/* Tooltip */}
          {hoveredDetId && tooltipPos && (() => {
            const d = activeDets.find(x => x.id === hoveredDetId);
            if (!d) return null;
            return (
              <div className="wks-tooltip" style={{ left: tooltipPos.x, top: tooltipPos.y }} aria-hidden="true">
                {d.label} — {d.quantity} {d.unit} · {d.status}
              </div>
            );
          })()}

          {/* Telemetry bar */}
          <div className="wks-telemetry" role="status" aria-label="Canvas telemetry">
            <div className="wks-telemetry__item"><span>XY</span><span className="wks-telemetry__value">1450.32, 2981.15</span></div>
            <div className="wks-telemetry__item"><span>SCALE</span><span className="wks-telemetry__value">1:100 M</span></div>
            <div className="wks-telemetry__item"><span>LAYER</span><span className="wks-telemetry__value">E-{activeSheet.sheet_id.slice(2)}-ELEC</span></div>
            <div className="wks-telemetry__item"><span>ZOOM</span><span className="wks-telemetry__value">{zoom}%</span></div>
            <div className="wks-telemetry__spacer" />
            <div className="wks-telemetry__item">
              <div className="wks-telemetry__dot" aria-hidden="true" />
              <span className="wks-telemetry__engine">ENGINE OK</span>
              <span style={{ color: "rgba(226,226,226,0.25)" }}> / </span>
              <span className="wks-telemetry__value">2ms local</span>
            </div>
            <div className="wks-telemetry__item"><span>EST.</span><span className="wks-telemetry__total">$184,200</span></div>
            <div className="wks-telemetry__item"><span className="wks-telemetry__verified">{verifiedItems} Verified</span></div>
          </div>

        </main>

        {/* ── RIGHT PANEL ─────────────────────────────────────────────────── */}
        <aside className="wks-right-panel" aria-label="AI findings and takeoff">

          {/* Collapse toggle */}
          <button
            type="button" className="wks-panel-toggle"
            onClick={() => setPanelCollapsed(c => !c)}
            aria-label={panelCollapsed ? "Expand panel" : "Collapse panel"}
            aria-expanded={!panelCollapsed}
          >
            {panelCollapsed ? <IconChevronLeft /> : <IconChevronRight />}
          </button>

          {!panelCollapsed && (
            <>
              {/* Detection detail panel */}
              {selectedDet && (
                <div className="wks-det-detail" key={selectedDet.id}>
                  <div className="wks-det-detail__header">
                    <p className="wks-det-detail__name">{selectedDet.label}</p>
                    <button type="button" className="wks-det-detail__close" onClick={() => { setSelectedDetId(null); setSelectedRowId(null); }} aria-label="Close">
                      <IconClose />
                    </button>
                  </div>
                  <div className="wks-det-meta">
                    <div className="wks-det-meta__row">
                      <span className="wks-det-meta__label">Status</span>
                      <span className={`wks-det-meta__badge wks-det-meta__badge--${selectedDet.status}`}>{selectedDet.status}</span>
                    </div>
                    <div className="wks-det-meta__row">
                      <span className="wks-det-meta__label">Quantity</span>
                      <span className="wks-det-meta__value">{selectedDet.quantity} {selectedDet.unit}</span>
                    </div>
                    <div className="wks-det-meta__row">
                      <span className="wks-det-meta__label">Category</span>
                      <span className="wks-det-meta__value">{selectedDet.category}</span>
                    </div>
                    <div className="wks-det-meta__row">
                      <span className="wks-det-meta__label">Engine</span>
                      <span className="wks-det-meta__value--mono">{selectedDet.model_version}</span>
                    </div>
                    {selectedDet.reviewed_by && (
                      <div className="wks-det-meta__row">
                        <span className="wks-det-meta__label">Reviewed by</span>
                        <span className="wks-det-meta__value">{selectedDet.reviewed_by}</span>
                      </div>
                    )}
                  </div>
                  <div className="wks-det-provenance">
                    <span className="wks-det-provenance__label">Evidence Trail</span>
                    <span className="wks-det-provenance__value">{selectedDet.document_name} → {selectedDet.sheet_id}</span>
                  </div>
                  <div className="wks-det-actions">
                    <button type="button" className="wks-det-approve-btn" onClick={() => handleApprove(selectedDet.id)} disabled={selectedDet.status === "approved"} aria-label="Approve detection">
                      <IconCheck /> {selectedDet.status === "approved" ? "Approved" : "Approve"}
                    </button>
                    <button type="button" className="wks-det-reject-btn" onClick={() => handleReject(selectedDet.id)} aria-label="Reject detection">
                      <IconX /> Reject
                    </button>
                    <button type="button" className="wks-det-delete-btn" onClick={() => handleReject(selectedDet.id)} aria-label="Delete (Del)" title="Delete (Del)">
                      <IconTrash />
                    </button>
                  </div>
                </div>
              )}

              {/* AI Agent card */}
              <div className="wks-agent-card">
                <div className="wks-agent-header">
                  <span className="wks-agent-title"><IconAgent /> AI Engineering Agent</span>
                  <Link to={`/sessions?project=${projectId}`} className="wks-agent-session-btn">Active Session</Link>
                </div>
                <div className="wks-agent-finding">
                  <div className="wks-agent-finding__dot" aria-hidden="true" />
                  <div><strong>Inspecting {activeSheet.sheet_id} — {activeSheet.name}</strong>Detection pass complete — {totalDets} items located</div>
                </div>
                <div className="wks-agent-finding">
                  <div className="wks-agent-finding__dot" aria-hidden="true" />
                  <div>
                    <strong>{activeDets.filter(d => d.layer_id === "LT").length} Troffers + {activeDets.filter(d => d.layer_id === "CT").length} Trays detected</strong>
                    Quantities match drawing schedule
                  </div>
                </div>
                <div className="wks-agent-finding">
                  <div className="wks-agent-finding__dot--warn wks-agent-finding__dot" aria-hidden="true" />
                  <div><strong>Voltage Drop: 1.42% — Optimal</strong>Within NFPA 70 limits — no action required</div>
                </div>
                {activeDets.some(d => d.status === "proposed") && (
                  <>
                    <div style={{ padding: "7px 9px", borderRadius: 7, background: "rgba(221,2,0,0.06)", border: "1px solid rgba(221,2,0,0.15)", fontSize: "0.75rem", color: "var(--app-text-secondary)" }}>
                      <strong style={{ display: "block", color: "var(--app-accent)", fontWeight: 700, fontSize: "0.6875rem", marginBottom: 4 }}>
                        {activeDets.filter(d => d.status === "proposed").length} PROPOSED LINE ITEMS
                      </strong>
                      Pending your review and approval
                    </div>
                    <button
                      type="button" className="wks-approve-all-btn"
                      onClick={() => activeDets.filter(d => d.status === "proposed").forEach(d => handleApprove(d.id))}
                    >
                      <IconCheck /> Approve All &amp; Sync to BOQ
                    </button>
                  </>
                )}
              </div>

              {/* Live Takeoff Table */}
              <div className="wks-takeoff-header">
                <span className="wks-takeoff-title"><IconTable /> Live Takeoff</span>
                <Link to={`/project/${projectId}/reports`} className="wks-takeoff-export-link">
                  Export .xlsx <IconArrowRight size={10} />
                </Link>
              </div>
              <div className="wks-takeoff-cols" aria-hidden="true">
                <span className="wks-takeoff-col-label">Description</span>
                <span className="wks-takeoff-col-label wks-takeoff-col-label--right">Qty</span>
                <span className="wks-takeoff-col-label wks-takeoff-col-label--right">Unit</span>
                <span className="wks-takeoff-col-label wks-takeoff-col-label--right">St.</span>
              </div>
              <div className="wks-takeoff-rows" role="list" aria-label="Live takeoff items">
                {activeTakeoff.length === 0
                  ? <div style={{ padding: "18px 13px", color: "var(--app-text-muted)", fontSize: "0.75rem", textAlign: "center" }}>No items for this sheet</div>
                  : activeTakeoff.map(item => {
                    const visible = layerVis[item.layer_id] ?? true;
                    return (
                      <div
                        key={item.id}
                        className={`wks-takeoff-row${item.id === selectedRowId ? " wks-takeoff-row--selected" : ""}`}
                        role="listitem"
                        onClick={() => handleRowClick(item)}
                        tabIndex={0} onKeyDown={e => e.key === "Enter" && handleRowClick(item)}
                        aria-label={`${item.name}, ${item.quantity} ${item.unit}, ${item.status}`}
                        style={{ opacity: visible ? 1 : 0.3, pointerEvents: visible ? "auto" : "none" }}
                      >
                        <div>
                          <div className="wks-takeoff-row__name">{item.name}</div>
                          <div className="wks-takeoff-row__sub">{item.spec}</div>
                        </div>
                        <span className="wks-takeoff-row__qty">{item.quantity}</span>
                        <span className="wks-takeoff-row__unit">{item.unit}</span>
                        <div className="wks-takeoff-row__status">
                          <span className={`wks-status-chip wks-status-chip--${item.status}`}>
                            {item.status === "approved" ? "Appr." : item.status === "proposed" ? "Prop." : "Rej."}
                          </span>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
              <div className="wks-takeoff-footer">
                <span className="wks-takeoff-sum-label">{activeTakeoff.length} items</span>
                <span className="wks-takeoff-sum-value">{activeTakeoff.filter(i => i.status === "approved").length} approved</span>
              </div>
              <Link to={`/project/${projectId}/takeoff`} className="wks-full-review-link">
                Full Takeoff Review <IconArrowRight size={12} />
              </Link>
            </>
          )}
        </aside>

      </div>
    </ProjectShell>
  );
}

// ── Blueprint SVG (extracted for clarity) ─────────────────────────────────────

interface BlueprintProps {
  activeSheetId: string;
  activeSheet: Sheet;
  activeDets: Detection[];
  layerVis: Record<string, boolean>;
  selectedDetId: string | null;
  justApproved: string | null;
  measureLine: { x1: number; y1: number; x2: number; y2: number; label: string } | null;
  measureStart: { x: number; y: number } | null;
  dCls: (id: string) => string;
  handleDetClick: (e: React.MouseEvent | React.KeyboardEvent, id: string) => void;
  setHoveredDetId: (id: string | null) => void;
  setTooltipPos: (p: { x: number; y: number } | null) => void;
}

function BlueprintSVG({ activeSheet, activeDets, layerVis, selectedDetId, measureLine, measureStart, dCls, handleDetClick, setHoveredDetId, setTooltipPos }: BlueprintProps) {
  function detStatus(id: string): DetectionStatus {
    return activeDets.find(d => d.id === id)?.status ?? "proposed";
  }
  function onHoverIn(e: React.MouseEvent, id: string) { setHoveredDetId(id); setTooltipPos({ x: e.clientX, y: e.clientY }); }
  function onHoverMove(e: React.MouseEvent) { setTooltipPos({ x: e.clientX, y: e.clientY }); }
  function onHoverOut() { setHoveredDetId(null); setTooltipPos(null); }

  return (
    <svg className="wks-blueprint-svg" viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" aria-label={`${activeSheet.sheet_id} ${activeSheet.name}`} role="img">
      <defs>
        <pattern id="bp-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0L0 0 0 40" fill="none" stroke="rgba(226,226,226,0.06)" strokeWidth="0.5" />
        </pattern>
        <filter id="glow-green"><feGaussianBlur stdDeviation="2.5" result="cb" /><feMerge><feMergeNode in="cb" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="glow-red"><feGaussianBlur stdDeviation="3" result="cb" /><feMerge><feMergeNode in="cb" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>

      <rect width="800" height="500" fill="#0d0d10" />
      <rect width="800" height="500" fill="url(#bp-grid)" />

      {/* Title block */}
      <rect x="10" y="10" width="780" height="480" fill="none" stroke="rgba(226,226,226,0.1)" strokeWidth="1" />
      <rect x="510" y="444" width="280" height="46" fill="none" stroke="rgba(226,226,226,0.1)" strokeWidth="0.5" />
      <text x="650" y="460" fill="rgba(226,226,226,0.28)" fontSize="7" fontFamily="IBM Plex Mono, monospace" textAnchor="middle">VECTORIS ENGINEERING INTELLIGENCE</text>
      <text x="650" y="472" fill="rgba(226,226,226,0.5)" fontSize="9" fontFamily="IBM Plex Mono, monospace" textAnchor="middle" fontWeight="700">
        ABC DATA CENTER — {activeSheet.sheet_id} {activeSheet.name.toUpperCase()}
      </text>
      <text x="650" y="484" fill="rgba(226,226,226,0.22)" fontSize="6.5" fontFamily="IBM Plex Mono, monospace" textAnchor="middle">REV B  |  SCALE 1:100 METRIC  |  CONFIDENTIAL</text>

      {/* Architectural walls */}
      {layerVis.AW && (
        <g>
          <rect x="120" y="100" width="560" height="300" fill="none" stroke="rgba(226,226,226,0.18)" strokeWidth="2" />
          {/* Columns */}
          {[[200, 140], [580, 140], [200, 340], [580, 340]].map(([cx, cy]) => (
            <rect key={`col-${cx}-${cy}`} x={cx} y={cy} width="20" height="20" fill="rgba(226,226,226,0.07)" stroke="rgba(226,226,226,0.18)" strokeWidth="1" />
          ))}
          {/* Door */}
          <line x1="300" y1="100" x2="340" y2="100" stroke="#0d0d10" strokeWidth="3" />
          <path d="M300 100 Q320 118 340 100" fill="none" stroke="rgba(226,226,226,0.18)" strokeWidth="1" />
          {/* Room label */}
          <text x="400" y="122" fill="rgba(226,226,226,0.2)" fontSize="10" fontFamily="IBM Plex Mono, monospace" textAnchor="middle" fontWeight="600">ROOM 204 — MAIN DATA HALL</text>
          {/* Server rows */}
          {[0, 1, 2, 3, 4, 5].map(i => (
            <g key={`row-${i}`}>
              <rect x="155" y={148 + i * 25} width="85" height="19" rx="2" fill="rgba(226,226,226,0.03)" stroke="rgba(226,226,226,0.09)" strokeWidth="0.8" />
              <text x="197" y={161 + i * 25} fill="rgba(226,226,226,0.14)" fontSize="7" fontFamily="IBM Plex Mono, monospace" textAnchor="middle">ROW {i + 1}</text>
            </g>
          ))}
          {/* CRAC unit */}
          <rect x="515" y="148" width="85" height="105" rx="3" fill="rgba(56,189,248,0.04)" stroke="rgba(56,189,248,0.1)" strokeWidth="1" strokeDasharray="4 2" />
          <text x="557" y="203" fill="rgba(56,189,248,0.28)" fontSize="8" fontFamily="IBM Plex Mono, monospace" textAnchor="middle">CRAC</text>
        </g>
      )}

      {/* Cable Trays */}
      {layerVis.CT && (
        <g>
          {/* CT-TRAY-A main E-W run */}
          <g className={dCls("det-2")} onClick={e => handleDetClick(e, "det-2")} onMouseEnter={e => onHoverIn(e, "det-2")} onMouseMove={onHoverMove} onMouseLeave={onHoverOut} tabIndex={0} onKeyDown={e => e.key === "Enter" && handleDetClick(e, "det-2")} aria-label="CT-TRAY-A 127.4m">
            <rect x="238" y="162" width="382" height="28" rx="2" fill="rgba(56,189,248,0.07)" stroke="#38bdf8" strokeWidth={selectedDetId === "det-2" ? "2" : "1.5"} strokeDasharray={detStatus("det-2") !== "approved" ? "6 3" : "none"} />
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => <line key={i} x1={248 + i * 36} y1="165" x2={248 + i * 36} y2="187" stroke="rgba(56,189,248,0.32)" strokeWidth="0.8" />)}
            <text x="429" y="153" fill="#38bdf8" fontSize="9" fontFamily="IBM Plex Mono, monospace" textAnchor="middle" fontWeight="700">CT-TRAY-A — 127.4m</text>
          </g>
          {/* CT-TRAY-B secondary run */}
          <g className={dCls("det-5")} onClick={e => handleDetClick(e, "det-5")} onMouseEnter={e => onHoverIn(e, "det-5")} onMouseMove={onHoverMove} onMouseLeave={onHoverOut} tabIndex={0} onKeyDown={e => e.key === "Enter" && handleDetClick(e, "det-5")} aria-label="CT-TRAY-B 84.2m">
            <rect x="278" y="222" width="224" height="22" rx="2" fill="rgba(56,189,248,0.04)" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="6 3" />
            {[0, 1, 2, 3, 4, 5].map(i => <line key={i} x1={290 + i * 34} y1="225" x2={290 + i * 34} y2="241" stroke="rgba(56,189,248,0.24)" strokeWidth="0.8" />)}
            <text x="390" y="214" fill="#38bdf8" fontSize="8.5" fontFamily="IBM Plex Mono, monospace" textAnchor="middle" fontWeight="600">CT-TRAY-B — 84.2m</text>
          </g>
          {/* N-S drop runs */}
          <line x1="430" y1="190" x2="430" y2="270" stroke="rgba(56,189,248,0.22)" strokeWidth="14" />
          <line x1="308" y1="190" x2="308" y2="222" stroke="rgba(56,189,248,0.18)" strokeWidth="10" />
        </g>
      )}

      {/* Lighting fixtures */}
      {layerVis.LT && (
        <g>
          {/* LT-01 Active cluster */}
          <g className={dCls("det-1")} onClick={e => handleDetClick(e, "det-1")} onMouseEnter={e => onHoverIn(e, "det-1")} onMouseMove={onHoverMove} onMouseLeave={onHoverOut} filter={selectedDetId === "det-1" ? "url(#glow-green)" : undefined} tabIndex={0} onKeyDown={e => e.key === "Enter" && handleDetClick(e, "det-1")} aria-label="LT-01 Active 47 EA">
            {[0, 1, 2].map(row => [0, 1, 2, 3].map(col => (
              <rect key={`lt1-${row}-${col}`} x={258 + col * 28} y={272 + row * 22} width="22" height="16" rx="1" fill="rgba(52,211,153,0.09)" stroke="#34d399" strokeWidth={selectedDetId === "det-1" ? "1.8" : "1.2"} />
            ))).flat()}
            <text x="314" y="264" fill="#34d399" fontSize="9" fontFamily="IBM Plex Mono, monospace" textAnchor="middle" fontWeight="700">LT-01 (ACTIVE) 47 EA</text>
          </g>
          {/* LT-01 [45] secondary */}
          <g className={dCls("det-4")} onClick={e => handleDetClick(e, "det-4")} onMouseEnter={e => onHoverIn(e, "det-4")} onMouseMove={onHoverMove} onMouseLeave={onHoverOut} tabIndex={0} onKeyDown={e => e.key === "Enter" && handleDetClick(e, "det-4")} aria-label="LT-01 45 EA proposed">
            {[0, 1].map(row => [0, 1, 2].map(col => (
              <rect key={`lt4-${row}-${col}`} x={420 + col * 26} y={208 + row * 20} width="20" height="14" rx="1" fill="rgba(52,211,153,0.05)" stroke="#34d399" strokeWidth="1.2" strokeDasharray="4 2" />
            ))).flat()}
            <text x="459" y="200" fill="#34d399" fontSize="8.5" fontFamily="IBM Plex Mono, monospace" textAnchor="middle" fontWeight="600">LT-01 [45] PROP.</text>
          </g>
        </g>
      )}

      {/* Power Feeder */}
      {layerVis.PF && (
        <g>
          <g className={dCls("det-3")} onClick={e => handleDetClick(e, "det-3")} onMouseEnter={e => onHoverIn(e, "det-3")} onMouseMove={onHoverMove} onMouseLeave={onHoverOut} filter={selectedDetId === "det-3" ? "url(#glow-red)" : undefined} tabIndex={0} onKeyDown={e => e.key === "Enter" && handleDetClick(e, "det-3")} aria-label="FEEDER-DP1">
            <rect x="486" y="298" width="54" height="70" rx="2" fill="rgba(221,2,0,0.08)" stroke="#dd0200" strokeWidth={selectedDetId === "det-3" ? "2" : "1.5"} strokeDasharray={detStatus("det-3") !== "approved" ? "5 2" : "none"} />
            {[0, 1, 2].map(i => <line key={i} x1="490" y1={318 + i * 10} x2="536" y2={318 + i * 10} stroke="#dd0200" strokeWidth="0.9" />)}
            <line x1="513" y1="298" x2="513" y2="268" stroke="#dd0200" strokeWidth="2" strokeDasharray={detStatus("det-3") !== "approved" ? "4 2" : "none"} />
            <circle cx="513" cy="264" r="5" fill="rgba(221,2,0,0.15)" stroke="#dd0200" strokeWidth="1.5" />
            <text x="513" y="294" fill="#dd0200" fontSize="7.5" fontFamily="IBM Plex Mono, monospace" textAnchor="middle" fontWeight="700">FEEDER-DP1</text>
          </g>
        </g>
      )}

      {/* North arrow */}
      <g transform="translate(700,438)">
        <circle cx="0" cy="0" r="14" fill="none" stroke="rgba(226,226,226,0.13)" strokeWidth="1" />
        <path d="M0-10 L3.5 5 L0 3 L-3.5 5Z" fill="rgba(226,226,226,0.38)" />
        <text x="0" y="15" fill="rgba(226,226,226,0.28)" fontSize="7" fontFamily="IBM Plex Mono, monospace" textAnchor="middle">N</text>
      </g>

      {/* Measurement overlay */}
      {measureLine && (
        <g>
          <line x1={measureLine.x1 * 8} y1={measureLine.y1 * 5} x2={measureLine.x2 * 8} y2={measureLine.y2 * 5} stroke="#dd0200" strokeWidth="1.5" strokeDasharray="4 2" />
          <circle cx={measureLine.x1 * 8} cy={measureLine.y1 * 5} r="3" fill="#dd0200" />
          <circle cx={measureLine.x2 * 8} cy={measureLine.y2 * 5} r="3" fill="#dd0200" />
          <text x={(measureLine.x1 + measureLine.x2) / 2 * 8} y={(measureLine.y1 + measureLine.y2) / 2 * 5 - 8} fill="#fff" fontSize="10" fontFamily="IBM Plex Mono, monospace" textAnchor="middle" fontWeight="700">{measureLine.label}</text>
        </g>
      )}
      {measureStart && (
        <circle cx={measureStart.x * 8} cy={measureStart.y * 5} r="4" fill="#dd0200" stroke="#fff" strokeWidth="1" />
      )}
    </svg>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function WorkspaceSkeleton() {
  return (
    <div className="wks-layout" style={{ height: "calc(100dvh - var(--app-header-h) - 113px)" }}>
      <div className="wks-left-panel" style={{ padding: "12px 10px", gap: 10, display: "flex", flexDirection: "column" }}>
        {[0, 1, 2, 3].map(i => <div key={i} className="wks-skeleton" style={{ height: 52, borderRadius: 7, animationDelay: `${i * 80}ms` }} />)}
      </div>
      <div className="wks-canvas-area" style={{ alignItems: "center", justifyContent: "center" }}>
        <div className="wks-skeleton" style={{ width: "70%", height: "60%", borderRadius: 8 }} />
        <div className="wks-telemetry"><div className="wks-telemetry__item"><span>Loading workspace…</span></div></div>
      </div>
      <div className="wks-right-panel" style={{ padding: "12px", gap: 10, display: "flex", flexDirection: "column" }}>
        {[0, 1, 2, 3, 4].map(i => <div key={i} className="wks-skeleton" style={{ height: i === 0 ? 80 : 38, borderRadius: 7, animationDelay: `${i * 60}ms` }} />)}
      </div>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconFloorPlan() { return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><rect x="1" y="1" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" /><line x1="1" y1="5" x2="11" y2="5" stroke="currentColor" strokeWidth="1" /><line x1="5" y1="5" x2="5" y2="11" stroke="currentColor" strokeWidth="1" /></svg>; }
function IconSchedule() { return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><rect x="1" y="1" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" /><line x1="3" y1="4" x2="9" y2="4" stroke="currentColor" strokeWidth="1" /><line x1="3" y1="6.5" x2="9" y2="6.5" stroke="currentColor" strokeWidth="1" /><line x1="3" y1="9" x2="7" y2="9" stroke="currentColor" strokeWidth="1" /></svg>; }
function IconLayers() { return <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M1 5l6-3 6 3-6 3-6-3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M1 9l6 3 6-3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>; }
function IconZoomIn() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" /><line x1="5" y1="7" x2="9" y2="7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><line x1="7" y1="5" x2="7" y2="9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>; }
function IconZoomOut() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" /><line x1="5" y1="7" x2="9" y2="7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>; }
function IconFit() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconPan() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 2v2M10 2v2M6 12v2M10 12v2M2 6h2M12 6h2M2 10h2M12 10h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><rect x="5" y="5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4" /></svg>; }
function IconSelect() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 3l4.5 11 2-4.5L14 7.5 3 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>; }
function IconMeasure() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><line x1="2" y1="14" x2="14" y2="2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><line x1="2" y1="14" x2="2" y2="11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><line x1="2" y1="14" x2="5" y2="14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>; }
function IconExport() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 10v3h10v-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><path d="M8 2v8M5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconSession() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" /><circle cx="7" cy="5.5" r="1" fill="currentColor" /><path d="M5 9.5c0-1.1.9-2 2-2s2 .9 2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function IconCheck() { return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconX() { return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>; }
function IconTrash() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 3.5h10M5 3.5V2.5h4v1M5.5 6v4M8.5 6v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><path d="M3 3.5l.7 7.5h6.6L11 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconClose() { return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>; }
function IconChevronLeft() { return <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M6.5 2L3.5 5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconChevronRight() { return <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M3.5 2L6.5 5l-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconAgent() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 1L1 4v3c0 3.3 2.5 6 6 7 3.5-1 6-3.7 6-7V4L7 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /><path d="M4.5 7l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconTable() { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><rect x="1" y="1" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" /><line x1="1" y1="4.5" x2="12" y2="4.5" stroke="currentColor" strokeWidth="1" /><line x1="5" y1="4.5" x2="5" y2="12" stroke="currentColor" strokeWidth="1" /></svg>; }
function IconArrowRight({ size = 14 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 7h10M8 4l4 3-4 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
