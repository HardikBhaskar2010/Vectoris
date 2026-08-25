/**
 * ProjectReportsPage — Reports & Export tab of a project.
 *
 * SOURCE OF TRUTH:
 *   docs/06_PAGES/EXPORT.md
 *   docs/06_PAGES/PROJECT_NAVIGATION.md §2 (Reports)
 *   docs/01_PRODUCT/ACCEPTANCE_CRITERIA.md AC-10, AC-11
 *
 * MVP EXPORT FORMATS:
 *   - XLSX: Structured spreadsheet, one row per item, locked column hierarchy
 *   - CSV: Flat tabular export
 *   - JSON: Complete structured schema including evidence & model version
 *   - PDF: Human-readable formal BOQ report
 *
 * CRITICAL PRINCIPLE:
 *   Exports are point-in-time snapshots for external handoff.
 *   The internal verified takeoff data is the canonical source of truth.
 */

import { useState, type ReactNode } from "react";
import { Link, useRouter } from "../router";
import { ProjectShell } from "../components/ProjectShell";
import type { ProjectMeta } from "../components/ProjectShell";

// ── Types ─────────────────────────────────────────────────────────────────────

type ExportFormat = "XLSX" | "CSV" | "JSON" | "PDF";

interface ExportHistoryItem {
  id: string;
  format: ExportFormat;
  filename: string;
  item_count: number;
  generated_by: string;
  generated_at: string;
  size_kb: number;
}

import { useProject } from "../services/dataService";

const INITIAL_HISTORY: ExportHistoryItem[] = [
  {
    id: "exp-01",
    format: "XLSX",
    filename: "ABC_Data_Center_BOQ_2026-08-24.xlsx",
    item_count: 382,
    generated_by: "Hardik Bhaskar",
    generated_at: "2 hours ago",
    size_kb: 148,
  },
  {
    id: "exp-02",
    format: "PDF",
    filename: "ABC_Data_Center_Takeoff_Summary_Rev1.pdf",
    item_count: 382,
    generated_by: "Hardik Bhaskar",
    generated_at: "3 hours ago",
    size_kb: 840,
  },
  {
    id: "exp-03",
    format: "CSV",
    filename: "ABC_Data_Center_Raw_Export.csv",
    item_count: 380,
    generated_by: "Rina Mehta",
    generated_at: "Yesterday",
    size_kb: 42,
  },
];

interface FormatDetail {
  name: string;
  desc: string;
  ext: string;
  icon: (props: { className?: string }) => ReactNode;
  accentColor: string;
}

const FORMAT_DETAILS: Record<ExportFormat, FormatDetail> = {
  XLSX: {
    name: "Excel Workbook (XLSX)",
    desc: "Formatted multi-tab spreadsheet with categorized BOQ line items, specifications, and project metadata.",
    ext: ".xlsx",
    icon: IconFileXlsx,
    accentColor: "#16a34a",
  },
  CSV: {
    name: "Comma-Separated Values (CSV)",
    desc: "Flat tabular data format for direct import into estimation, ERP, or spreadsheet software.",
    ext: ".csv",
    icon: IconFileCsv,
    accentColor: "#2563eb",
  },
  JSON: {
    name: "Structured Engineering JSON",
    desc: "Complete machine-readable payload containing coordinates, model versions, and verification audit trail.",
    ext: ".json",
    icon: IconFileJson,
    accentColor: "#7c3aed",
  },
  PDF: {
    name: "Formal Engineering BOQ Report (PDF)",
    desc: "Professional print-ready document with company header, category rollups, and verification stamps.",
    ext: ".pdf",
    icon: IconFilePdf,
    accentColor: "#dc2626",
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProjectReportsPage() {
  const { params } = useRouter();
  const projectId = params.id || "p1";
  const project = useProject(projectId);
  const [history, setHistory] = useState<ExportHistoryItem[]>(INITIAL_HISTORY);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const projectName = project?.name || "ABC Data Center";

  const projectMeta: ProjectMeta = {
    id: projectId,
    name: projectName,
    client: project?.client || "Equinix",
    sector: project?.sector,
    discipline: project?.discipline,
    displayType: project?.displayType || "Data Center · Electrical",
    typeProvenance: project?.typeProvenance || "ai_inferred",
  };

  const handleGenerateExport = (format: ExportFormat) => {
    setExportingFormat(format);
    setTimeout(() => {
      const newItem: ExportHistoryItem = {
        id: `exp-${Date.now().toString().slice(-4)}`,
        format,
        filename: `${projectName.replace(/\s+/g, "_")}_${format}_${new Date().toISOString().split("T")[0]}${FORMAT_DETAILS[format].ext}`,
        item_count: 382,
        generated_by: "Hardik Bhaskar",
        generated_at: "Just now",
        size_kb: format === "PDF" ? 860 : format === "XLSX" ? 152 : format === "JSON" ? 64 : 44,
      };
      setHistory(prev => [newItem, ...prev]);
      setExportingFormat(null);
      setSuccessToast(`Generated ${newItem.filename}`);
      setTimeout(() => setSuccessToast(null), 4000);
    }, 1200);
  };

  return (
    <ProjectShell
      project={projectMeta}
      activeTab="reports"
    >
      <div className="pr-page">

        {/* ── Toast Notification ─────────────────────────────────── */}
        {successToast && (
          <div className="pr-toast" role="status" aria-live="polite">
            <IconCheckCircle className="pr-toast__icon" />
            <span>{successToast} ready for download</span>
          </div>
        )}

        {/* ── Disclaimer Banner ──────────────────────────────────── */}
        <div className="pr-disclaimer" role="note">
          <div className="pr-disclaimer__icon" aria-hidden="true">
            <IconInfoCircle />
          </div>
          <div className="pr-disclaimer__text">
            <strong>Snapshot Notice:</strong> Exported documents represent a point-in-time snapshot of the verified takeoff.
            The internal verified dataset in Vectoris remains the authoritative single source of truth.
          </div>
        </div>

        {/* ── Verified Takeoff Readiness Overview ─────────────────── */}
        <div className="pr-summary-card">
          <div className="pr-summary-header">
            <div>
              <span className="pr-summary-badge">Verified Takeoff Status</span>
              <h2 className="pr-summary-title">382 Line Items Ready for Export</h2>
              <p className="pr-summary-desc">
                Derived from 112 analyzed sheets across Server Rooms A, B, and C drawings. All items have been verified by engineering review.
              </p>
            </div>
            <Link to={`/project/${projectId}/takeoff`} className="btn btn--secondary btn--sm">
              Review Takeoff Data →
            </Link>
          </div>

          <div className="pr-metrics-row">
            <div className="pr-metric">
              <span className="pr-metric-label">Lighting &amp; Fixtures</span>
              <span className="pr-metric-val pr-mono">170 EA</span>
            </div>
            <div className="pr-metric">
              <span className="pr-metric-label">Cable Tray &amp; Basket</span>
              <span className="pr-metric-val pr-mono">580 m</span>
            </div>
            <div className="pr-metric">
              <span className="pr-metric-label">Power Distribution</span>
              <span className="pr-metric-val pr-mono">10 Units</span>
            </div>
            <div className="pr-metric">
              <span className="pr-metric-label">Conduit &amp; Fittings</span>
              <span className="pr-metric-val pr-mono">115 m</span>
            </div>
          </div>
        </div>

        {/* ── Export Format Selection Cards ──────────────────────── */}
        <section className="pr-section" aria-labelledby="export-formats-heading">
          <h3 id="export-formats-heading" className="pr-section-title">
            Generate Takeoff Export
          </h3>

          <div className="pr-format-grid">
            {(["XLSX", "CSV", "JSON", "PDF"] as const).map((fmt) => {
              const details = FORMAT_DETAILS[fmt];
              const isExporting = exportingFormat === fmt;
              const IconComp = details.icon;

              return (
                <div key={fmt} className="pr-format-card">
                  <div className="pr-format-card__header">
                    <div className="pr-format-icon-wrap" style={{ color: details.accentColor, background: `${details.accentColor}14` }}>
                      <IconComp />
                    </div>
                    <span className="pr-format-ext pr-mono">{details.ext}</span>
                  </div>

                  <h4 className="pr-format-name">{details.name}</h4>
                  <p className="pr-format-desc">{details.desc}</p>

                  <button
                    type="button"
                    className="btn btn--primary btn--sm pr-format-btn"
                    disabled={exportingFormat !== null}
                    onClick={() => handleGenerateExport(fmt)}
                    aria-label={`Generate ${fmt} export`}
                  >
                    {isExporting ? (
                      <>
                        <span className="pr-spinner" aria-hidden="true" />
                        Generating {fmt}...
                      </>
                    ) : (
                      <>
                        <IconDownload aria-hidden="true" /> Generate &amp; Download
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Export History Ledger ──────────────────────────────── */}
        <section className="pr-section" aria-labelledby="export-history-heading">
          <h3 id="export-history-heading" className="pr-section-title">
            Export History &amp; Audit
          </h3>

          <div className="pr-history-table-wrap">
            <table className="pr-history-table" aria-label="Export history">
              <thead>
                <tr>
                  <th scope="col">Format</th>
                  <th scope="col">File Name</th>
                  <th scope="col">Line Items</th>
                  <th scope="col">Size</th>
                  <th scope="col">Generated By</th>
                  <th scope="col">Timestamp</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map((hist) => (
                  <tr key={hist.id}>
                    <td>
                      <span className={`pr-badge pr-badge--${hist.format.toLowerCase()} pr-mono`}>
                        {hist.format}
                      </span>
                    </td>
                    <td>
                      <span className="pr-filename pr-mono">{hist.filename}</span>
                    </td>
                    <td>
                      <span className="pr-mono">{hist.item_count} items</span>
                    </td>
                    <td>
                      <span className="pr-mono">{hist.size_kb} KB</span>
                    </td>
                    <td>{hist.generated_by}</td>
                    <td>
                      <span className="pr-timestamp">{hist.generated_at}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--ghost btn--xs"
                        onClick={() => alert(`Downloading cached snapshot: ${hist.filename}`)}
                        title="Download cached copy"
                      >
                        <IconDownload aria-hidden="true" /> Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </ProjectShell>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1.5v7M3.5 5.5l3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1.5 9.5v2a1 1 0 001 1h9a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function IconFileXlsx({ className }: { className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 2v6h6M8 13h8M8 17h8M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconFileCsv({ className }: { className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 2v6h6M8 12h2M8 16h2M14 12h2M14 16h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconFileJson({ className }: { className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9 13c-.5 0-1 .5-1 1v.5c0 .5-.5 1-1 1 .5 0 1 .5 1 1V17c0 .5.5 1 1 1M15 13c.5 0 1 .5 1 1v.5c0 .5.5 1 1 1-.5 0-1 .5-1 1V17c0 .5-.5 1-1 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function IconFilePdf({ className }: { className?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9 15v-4h2a1.5 1.5 0 010 3H9M15 11h-2v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconInfoCircle({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 7v4M8 5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconCheckCircle({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M5.5 8l2 2 3.5-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

