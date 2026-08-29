/**
 * ProjectTakeoffPage — Takeoff & Quantity Management tab of a project.
 *
 * SOURCE OF TRUTH:
 *   docs/06_PAGES/TAKEOFF_REVIEW.md
 *   docs/06_PAGES/PROJECT_NAVIGATION.md §2 (Takeoff)
 *   docs/06_PAGES/LINE_ITEM_DETAILS.md
 *   docs/03_ARCHITECTURE/DATA_MODEL.md
 *
 * THREE-STATE MODEL (TAKEOFF_REVIEW.md §2):
 *   - Proposed (AI-detected candidate, pending human review)
 *   - Approved / Verified (Confirmed by engineer, ready for BOQ/export)
 *   - Rejected (Explicitly dismissed, retained for audit — never deleted)
 *
 * LOCKED TABLE COLUMNS:
 *   Item | Description | Quantity | Unit | Source | Status | Actions
 *
 * TRACEABILITY REQUIREMENT:
 *   Selecting any row exposes its complete provenance:
 *   Project → Document → Sheet → Coordinates → Model Version → Correction History
 */

import { useState, useMemo, useEffect } from "react";
import { Link, useRouter } from "../router";
import { ProjectShell } from "../components/ProjectShell";
import type { ProjectMeta } from "../components/ProjectShell";
import type { LineItem, LineItemStatus } from "../data";
import {
  useProject,
  useLineItems,
  dataService,
} from "../services/dataService";
import { AnimatedPencil, AnimatedCheckCircle, AnimatedArrowRight, AnimatedSparkles } from "../components/icons/AnimatedIcons";

const CATEGORIES = ["All", "Lighting", "Cable Tray", "Power Distribution", "Conduit", "Equipment"] as const;
const STATUS_TABS = [
  { id: "all", label: "All Items" },
  { id: "proposed", label: "Proposed" },
  { id: "approved", label: "Verified" },
  { id: "rejected", label: "Rejected" },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProjectTakeoffPage() {
  const { params } = useRouter();
  const projectId = params.id || "p1";
  const project = useProject(projectId);
  const items = useLineItems(projectId);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditingQty, setIsEditingQty] = useState(false);
  const [editQty, setEditQty] = useState<number>(0);
  const [editUnit, setEditUnit] = useState<string>("");
  const [editReason, setEditReason] = useState<string>("");

  const selectedItem = items.find((i) => i.id === selectedItemId) || null;

  useEffect(() => {
    if (selectedItem) {
      setEditQty(selectedItem.quantity);
      setEditUnit(selectedItem.unit);
      setEditReason("");
      setIsEditingQty(false);
    }
  }, [selectedItemId]);

  const projectMeta: ProjectMeta = {
    id: projectId,
    name: project?.name || "ABC Data Center",
    client: project?.client || "Equinix",
    sector: project?.sector,
    discipline: project?.discipline,
    displayType: project?.displayType || "Data Center · Electrical",
    typeProvenance: project?.typeProvenance || "ai_inferred",
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category filter
      if (selectedCategory !== "All") {
        const itemCat = (item.category || "").toLowerCase();
        const selCat = selectedCategory.toLowerCase();
        if (!itemCat.includes(selCat) && !selCat.includes(itemCat)) return false;
      }
      // Status tab filter
      if (selectedStatusTab !== "all" && item.status !== selectedStatusTab) return false;
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          item.name.toLowerCase().includes(q) ||
          item.item_code.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.source_sheet && item.source_sheet.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [items, selectedCategory, selectedStatusTab, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = items.length;
    const proposed = items.filter((i) => i.status === "proposed").length;
    const approved = items.filter((i) => i.status === "approved").length;
    const rejected = items.filter((i) => i.status === "rejected").length;
    return { total, proposed, approved, rejected };
  }, [items]);

  // Actions
  const handleApprove = (id: string) => {
    dataService.updateLineItemStatus(id, "approved", "Project Reviewer");
  };

  const handleReject = (id: string, reason?: string) => {
    dataService.updateLineItemStatus(id, "rejected", "Project Reviewer", reason || "Rejected by reviewer");
  };

  const handleBulkApproveProposed = () => {
    items
      .filter((i) => i.status === "proposed")
      .forEach((i) => {
        dataService.updateLineItemStatus(i.id, "approved", "Project Reviewer");
      });
  };

  const handleAddItem = (newItem: Omit<LineItem, "id" | "project_id">) => {
    dataService.addLineItem(projectId, newItem);
    setShowAddModal(false);
  };

  const headerActions = (
    <>
      <Link to={`/project/${projectId}/reports`} className="btn btn--secondary btn--sm">
        <IconExport /> Export BOQ
      </Link>
      <button
        type="button"
        className="btn btn--primary btn--sm"
        onClick={() => setShowAddModal(true)}
      >
        <IconPlus /> Add Manual Item
      </button>
    </>
  );

  return (
    <ProjectShell
      project={projectMeta}
      activeTab="takeoff"
      headerActions={headerActions}
    >
      <div className="pt-page">

        {/* ── KPI Summary Cards ─────────────────────────────────── */}
        <div className="pt-kpi-grid">
          <div className="pt-kpi-card">
            <span className="pt-kpi-card__label">Total Detected</span>
            <span className="pt-kpi-card__value pt-mono">{stats.total}</span>
            <span className="pt-kpi-card__sub">Across {projectMeta.sector || "Project"} package</span>
          </div>

          <div className="pt-kpi-card pt-kpi-card--proposed">
            <span className="pt-kpi-card__label">Pending Review</span>
            <span className="pt-kpi-card__value pt-mono">{stats.proposed}</span>
            <span className="pt-kpi-card__sub">AI candidate detections</span>
          </div>

          <div className="pt-kpi-card pt-kpi-card--approved">
            <span className="pt-kpi-card__label">Verified Takeoff</span>
            <span className="pt-kpi-card__value pt-mono">{stats.approved}</span>
            <span className="pt-kpi-card__sub">Confirmed for BOQ &amp; Export</span>
          </div>

          <div className="pt-kpi-card pt-kpi-card--rejected">
            <span className="pt-kpi-card__label">Rejected</span>
            <span className="pt-kpi-card__value pt-mono">{stats.rejected}</span>
            <span className="pt-kpi-card__sub">Retained in audit ledger</span>
          </div>
        </div>

        {/* ── Toolbar: Status tabs, Search, Category pill filter ── */}
        <div className="pt-toolbar">
          {/* Status Tabs */}
          <div className="pt-status-tabs" role="tablist" aria-label="Filter by verification state">
            {STATUS_TABS.map((tab) => {
              const count =
                tab.id === "all" ? stats.total :
                tab.id === "proposed" ? stats.proposed :
                tab.id === "approved" ? stats.approved : stats.rejected;
              const isActive = selectedStatusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`pt-status-tab${isActive ? " pt-status-tab--active" : ""}`}
                  onClick={() => setSelectedStatusTab(tab.id)}
                >
                  <span>{tab.label}</span>
                  <span className="pt-status-tab__badge pt-mono">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="pt-toolbar__actions">
            {stats.proposed > 0 && selectedStatusTab !== "approved" && (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={handleBulkApproveProposed}
                title="Verify all candidate detections currently in proposed status"
              >
                <IconCheckAll /> Verify All Proposed ({stats.proposed})
              </button>
            )}
          </div>
        </div>

        {/* ── Sub-bar: Category filters + Search ─────────────────── */}
        <div className="pt-filter-bar">
          <div className="pt-categories" role="group" aria-label="Filter by discipline category">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`pt-cat-pill${selectedCategory === cat ? " pt-cat-pill--active" : ""}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="pt-search-box">
            <IconSearch aria-hidden="true" />
            <input
              type="search"
              className="pt-search-input"
              placeholder="Filter items by code, description, sheet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search takeoff items"
            />
            {searchQuery && (
              <button
                type="button"
                className="pt-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* ── Takeoff Completion Milestone Banner ─────────────── */}
        {stats.total > 0 && stats.proposed === 0 && stats.approved > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              padding: "14px 20px",
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "8px",
              marginBottom: "16px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <AnimatedCheckCircle size={18} />
              <div>
                <strong style={{ fontSize: "13.5px", color: "#10b981" }}>Takeoff Review Reconciled</strong>
                <span style={{ fontSize: "13px", color: "var(--app-text-secondary, #cbd5e1)", marginLeft: "8px" }}>
                  All candidate items have been verified. You can now compile the Project Plan or export BOQ schedules.
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Link to={`/project/${projectId}/plan`} className="btn btn--primary btn--sm" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span>Continue to Project Plan</span>
                <AnimatedArrowRight size={13} />
              </Link>
              <Link to={`/project/${projectId}/reports`} className="btn btn--secondary btn--sm">
                Export BOQ
              </Link>
            </div>
          </div>
        )}

        {/* ── Main Table View & Traceability Drawer ─────────────── */}
        <div className={`pt-layout${selectedItem ? " pt-layout--split" : ""}`}>

          {/* Table Container */}
          <div className="pt-table-wrap">
            <table className="pt-table" aria-label="Takeoff line items">
              <thead>
                <tr>
                  <th scope="col" className="pt-col-item">Item &amp; Code</th>
                  <th scope="col" className="pt-col-desc">Description &amp; Specification</th>
                  <th scope="col" className="pt-col-qty">Quantity</th>
                  <th scope="col" className="pt-col-unit">Unit</th>
                  <th scope="col" className="pt-col-source">Source Sheet</th>
                  <th scope="col" className="pt-col-status">Status</th>
                  <th scope="col" className="pt-col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="pt-empty-cell">
                      <div className="pt-empty-state" style={{ padding: "48px 24px" }}>
                        <IconEmptyTable aria-hidden="true" />
                        <p className="pt-empty-title" style={{ fontSize: "16px", fontWeight: 700, margin: "12px 0 6px 0" }}>
                          {searchQuery ? "No line items match criteria" : "No takeoff items in this project yet"}
                        </p>
                        <p className="pt-empty-desc" style={{ maxWidth: "460px", margin: "0 auto 20px auto" }}>
                          {searchQuery
                            ? `No items found for "${searchQuery}". Try clearing your search query.`
                            : "Upload drawing packages in the Documents tab to trigger automated perception, or manually add items to the ledger."}
                        </p>
                        {!searchQuery && (
                          <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                            <Link to={`/project/${projectId}/documents`} className="btn btn--primary btn--sm">
                              <IconUpload /> Upload Drawings
                            </Link>
                            <button type="button" className="btn btn--secondary btn--sm" onClick={() => setShowAddModal(true)}>
                              <IconPlus /> Add Manual Item
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isSelected = selectedItem?.id === item.id;
                    const isApproved = item.status === "approved";
                    const isRejected = item.status === "rejected";
                    const isProposed = item.status === "proposed";

                    return (
                      <tr
                        key={item.id}
                        className={`pt-row${isSelected ? " pt-row--selected" : ""}${isRejected ? " pt-row--rejected" : ""}`}
                        onClick={() => setSelectedItemId(item.id)}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedItemId(item.id); }}
                      >
                        {/* Item & Code */}
                        <td className="pt-col-item">
                          <div className="pt-item-cell">
                            <span className="pt-item-name">{item.name}</span>
                            <span className="pt-item-code pt-mono">{item.item_code}</span>
                          </div>
                        </td>

                        {/* Description & Spec */}
                        <td className="pt-col-desc">
                          <div className="pt-desc-cell">
                            <span className="pt-desc-text">{item.description}</span>
                            <span className="pt-spec-text">{item.specification}</span>
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="pt-col-qty">
                          <span className="pt-qty-value pt-mono">{item.quantity}</span>
                        </td>

                        {/* Unit */}
                        <td className="pt-col-unit">
                          <span className="pt-unit-badge">{item.unit}</span>
                        </td>

                        {/* Source */}
                        <td className="pt-col-source">
                          <div className="pt-source-cell">
                            <a
                              href={`/project/${projectId}/workspace?doc=${item.source_document_id || ""}&sheet=${encodeURIComponent(item.source_sheet || "")}`}
                              className="pt-source-link"
                              onClick={(e) => e.stopPropagation()}
                              title={`Jump to Drawing Evidence on ${item.source_sheet || "Sheet"}`}
                            >
                              <IconDrawingPin aria-hidden="true" />
                              <span>{item.source_sheet || "Direct"}</span>
                            </a>
                            <span className="pt-source-doc">{item.source_document_name || "Investigation"}</span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="pt-col-status">
                          <span className={`pt-badge pt-badge--${item.status}`}>
                            {isApproved && <span className="pt-badge-dot" aria-hidden="true" />}
                            {isApproved ? "Verified" : isProposed ? "Proposed" : "Rejected"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="pt-col-actions" onClick={(e) => e.stopPropagation()}>
                          <div className="pt-row-actions">
                            {isProposed && (
                              <>
                                <button
                                  type="button"
                                  className="pt-btn-action pt-btn-action--approve"
                                  onClick={() => handleApprove(item.id)}
                                  title="Approve item and add to Verified Takeoff"
                                >
                                  <IconCheck aria-hidden="true" /> Verify
                                </button>
                                <button
                                  type="button"
                                  className="pt-btn-action pt-btn-action--reject"
                                  onClick={() => handleReject(item.id)}
                                  title="Reject candidate item (retained in audit ledger)"
                                >
                                  <IconDismiss aria-hidden="true" />
                                </button>
                              </>
                            )}

                            {isApproved && (
                              <button
                                type="button"
                                className="pt-btn-action pt-btn-action--muted"
                                onClick={() => handleReject(item.id, "Reverted approval")}
                                title="Revert verification"
                              >
                                Revoke
                              </button>
                            )}

                            {isRejected && (
                              <button
                                type="button"
                                className="pt-btn-action pt-btn-action--approve"
                                onClick={() => handleApprove(item.id)}
                                title="Restore item to Verified Takeoff"
                              >
                                Re-verify
                              </button>
                            )}

                            <button
                              type="button"
                              className="pt-btn-action pt-btn-action--inspect"
                              onClick={() => setSelectedItemId(item.id)}
                              title="Inspect Traceability &amp; Drawing Evidence"
                            >
                              <IconEvidence aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Traceability & Evidence Detail Drawer ─────────────── */}
          {selectedItem && (
            <aside className="pt-drawer" aria-label="Line item traceability details">
              <div className="pt-drawer__header">
                <div className="pt-drawer__title-wrap">
                  <span className="pt-drawer__tag">{selectedItem.category}</span>
                  <h3 className="pt-drawer__title">{selectedItem.name}</h3>
                  <span className="pt-drawer__code pt-mono">{selectedItem.item_code}</span>
                </div>
                <button
                  type="button"
                  className="pt-drawer__close"
                  onClick={() => setSelectedItemId(null)}
                  aria-label="Close evidence inspection drawer"
                >
                  <IconClose />
                </button>
              </div>

              <div className="pt-drawer__body">

                {/* Status & Quick Action Card */}
                <div className={`pt-drawer-status-card pt-drawer-status-card--${selectedItem.status}`}>
                  <div className="pt-drawer-status-info">
                    <div className="pt-drawer-status-header">
                      <span className="pt-drawer-status-label">Review State</span>
                      <span className={`pt-badge pt-badge--${selectedItem.status}`}>
                        {selectedItem.status === "approved" ? "Verified" :
                         selectedItem.status === "proposed" ? "Proposed" : "Rejected"}
                      </span>
                    </div>

                    <h4 className="pt-drawer-status-name">
                      {selectedItem.status === "approved" ? "Verified Takeoff Line Item" :
                       selectedItem.status === "proposed" ? "Proposed AI Candidate Detection" : "Rejected from Project Takeoff"}
                    </h4>

                    {selectedItem.reviewed_by && (
                      <p className="pt-drawer-status-meta">
                        <span className="pt-drawer-meta-user">{selectedItem.reviewed_by}</span>
                        <span className="pt-drawer-meta-sep">·</span>
                        <span className="pt-drawer-meta-time">{selectedItem.reviewed_at}</span>
                      </p>
                    )}

                    {selectedItem.rejection_reason && (
                      <div className="pt-drawer-rejection-reason">
                        <strong>Reason:</strong> {selectedItem.rejection_reason}
                      </div>
                    )}
                  </div>

                  <div className="pt-drawer-status-actions" style={{ flexWrap: "wrap", gap: "8px" }}>
                    {selectedItem.status !== "approved" && (
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={() => handleApprove(selectedItem.id)}
                      >
                        <IconCheck /> Verify Item
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => setIsEditingQty((prev) => !prev)}
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      {isEditingQty ? (
                        "Cancel Edit"
                      ) : (
                        <>
                          <AnimatedPencil size={13} />
                          <span>Correct Quantity</span>
                        </>
                      )}
                    </button>
                    {selectedItem.status !== "rejected" && (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => handleReject(selectedItem.id)}
                      >
                        Reject
                      </button>
                    )}
                  </div>

                  {isEditingQty && (
                    <div style={{ marginTop: "14px", padding: "14px", borderRadius: "8px", background: "var(--app-surface-2, rgba(255,255,255,0.04))", border: "1px solid var(--app-border, rgba(255,255,255,0.1))" }}>
                      <div style={{ fontSize: "12px", fontWeight: 700, marginBottom: "8px", color: "var(--app-text-primary, #f8fafc)" }}>
                        Manual Engineering Correction
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                        <div>
                          <label style={{ fontSize: "11px", color: "var(--app-text-muted)" }}>Quantity</label>
                          <input
                            type="number"
                            value={editQty}
                            onChange={(e) => setEditQty(Number(e.target.value))}
                            className="pt-search-input"
                            style={{ width: "100%", marginTop: "2px" }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "11px", color: "var(--app-text-muted)" }}>Unit</label>
                          <input
                            type="text"
                            value={editUnit}
                            onChange={(e) => setEditUnit(e.target.value)}
                            className="pt-search-input"
                            style={{ width: "100%", marginTop: "2px" }}
                          />
                        </div>
                      </div>
                      <div style={{ marginBottom: "10px" }}>
                        <label style={{ fontSize: "11px", color: "var(--app-text-muted)" }}>Correction Reason</label>
                        <input
                          type="text"
                          placeholder="e.g. Adjusted based on single-line diagram note 4"
                          value={editReason}
                          onChange={(e) => setEditReason(e.target.value)}
                          className="pt-search-input"
                          style={{ width: "100%", marginTop: "2px" }}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        style={{ width: "100%" }}
                        onClick={() => {
                          dataService.correctLineItem(selectedItem.id, editQty, editUnit, editReason || "Manual engineering correction");
                          setIsEditingQty(false);
                        }}
                      >
                        Save Correction &amp; Verify
                      </button>
                    </div>
                  )}
                </div>

                {/* Provenance & Traceability */}
                <section className="pt-drawer-section">
                  <h4 className="pt-drawer-section-title">
                    <IconDrawingPin aria-hidden="true" /> Drawing Evidence &amp; Traceability
                  </h4>

                  <div className="pt-evidence-box">
                    <div className="pt-evidence-row">
                      <span className="pt-evidence-key">Document</span>
                      <span className="pt-evidence-val">{selectedItem.source_document_name}</span>
                    </div>
                    <div className="pt-evidence-row">
                      <span className="pt-evidence-key">Sheet</span>
                      <span className="pt-evidence-val">{selectedItem.source_sheet}</span>
                    </div>
                    <div className="pt-evidence-row">
                      <span className="pt-evidence-key">Source Engine</span>
                      <span className="pt-evidence-val pt-mono">
                        {selectedItem.detection_source === "ai_detection"
                          ? `Local Perception ${selectedItem.model_version ?? "v2.4"}`
                          : "Manual Engineer Annotation"}
                      </span>
                    </div>
                    {selectedItem.source_coordinates && (
                      <div className="pt-evidence-row">
                        <span className="pt-evidence-key">Coordinates</span>
                        <span className="pt-evidence-val pt-mono">
                          X:{selectedItem.source_coordinates.x} Y:{selectedItem.source_coordinates.y} [
                          {selectedItem.source_coordinates.width}×{selectedItem.source_coordinates.height}]
                        </span>
                      </div>
                    )}
                  </div>

                  <Link
                    to={`/project/${projectId}/workspace?doc=${selectedItem.source_document_id || ""}&sheet=${encodeURIComponent(selectedItem.source_sheet || "")}`}
                    className="btn btn--secondary btn--sm pt-open-workspace-btn"
                  >
                    <IconWorkspace /> Open Bounding Region in Workspace
                  </Link>
                </section>

                {/* Audit & Correction History */}
                <section className="pt-drawer-section">
                  <h4 className="pt-drawer-section-title">
                    <IconHistory aria-hidden="true" /> Correction &amp; Verification Audit
                  </h4>

                  {selectedItem.correction_history && selectedItem.correction_history.length > 0 ? (
                    <ul className="pt-history-list" aria-label="Correction history">
                      {selectedItem.correction_history.map((hist, i) => (
                        <li key={i} className="pt-history-item">
                          <div className="pt-history-dot" aria-hidden="true" />
                          <div className="pt-history-content">
                            <span className="pt-history-action">{hist.action}</span>
                            <span className="pt-history-meta">
                              {hist.user} · {hist.timestamp}
                            </span>
                            <span className="pt-history-delta pt-mono">
                              {hist.previous_value} → {hist.new_value}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="pt-drawer-empty-history">
                      Initial AI detection. No manual edits or adjustments recorded.
                    </p>
                  )}
                </section>

                {/* Technical Specifications */}
                <section className="pt-drawer-section">
                  <h4 className="pt-drawer-section-title">Technical Specification</h4>
                  <p className="pt-spec-full">{selectedItem.specification}</p>
                </section>

              </div>
            </aside>
          )}

        </div>

      </div>
    </ProjectShell>
  );
}

// ── Inline Icons ──────────────────────────────────────────────────────────────

function IconExport() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M7.5 10V2M4 5.5L7.5 2 11 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1.5 10v3a.5.5 0 00.5.5h11a.5.5 0 00.5-.5v-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M2.5 6.5l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconCheckAll() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M1.5 7.5l3 3 5-6M6.5 7.5l3 3 5-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconDismiss() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M3 3l7 7M10 3l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
function IconEvidence() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M7 4.5v3l2 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}
function IconDrawingPin() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M6.5 1.5C4.5 1.5 3 3 3 5c0 2.5 3.5 6.5 3.5 6.5s3.5-4 3.5-6.5c0-2-1.5-3.5-3.5-3.5z" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="6.5" cy="5" r="1.2" fill="currentColor"/>
    </svg>
  );
}
function IconWorkspace() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M4 5l3.5 3.5L11 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7.5 8.5v3.5M5 12h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}
function IconHistory() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M7.5 4.5v3l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}
function IconClose() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function IconEmptyTable() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="6" y="8" width="28" height="24" rx="3" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3"/>
      <path d="M6 16h28M16 16v16" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

function IconUpload(props: { className?: string; "aria-hidden"?: boolean | "true" | "false" }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true" {...props}>
      <path d="M7.5 1.5v8M4.5 4.5l3-3 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2.5 10.5v2h10v-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}
