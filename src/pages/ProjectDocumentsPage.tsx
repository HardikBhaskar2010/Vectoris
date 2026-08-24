/**
 * ProjectDocumentsPage — Documents tab of a project.
 *
 * SOURCE OF TRUTH: docs/06_PAGES/DOCUMENT_UPLOAD.md, docs/06_PAGES/PROCESSING.md,
 *                  docs/06_PAGES/PROJECT_NAVIGATION.md §2 (Documents)
 *
 * This is the full document library for a project.
 * It shows ALL uploaded files, their processing state, and available actions.
 *
 * Processing states per document (doc/06_PAGES/PROCESSING.md):
 *   queued → ingesting → classifying → detecting → complete | error
 *
 * Traceability: Document → Sheet → Detection → Line Item
 */

import { useState, type ReactNode } from "react";
import { ProjectShell } from "../components/ProjectShell";
import type { ProjectMeta } from "../components/ProjectShell";

// ── Types ─────────────────────────────────────────────────────────────────────

type ProcessingState = "queued" | "ingesting" | "classifying" | "detecting" | "complete" | "parsed" | "error";

interface ProjectDocument {
  id: string;
  filename: string;
  format: "PDF" | "DWG" | "DXF" | "BIM" | "TIFF" | "Excel" | "Other";
  size_mb: number;
  upload_status: ProcessingState;
  sheet_count: number | null;
  uploaded_by: string;
  uploaded_at: string;
  error_message?: string;
}

// ── Status helpers ─────────────────────────────────────────────────────────────

interface StatusConfigItem {
  label: string;
  color: string;
  icon: (props: { className?: string }) => ReactNode;
}

// ── Demo data ─────────────────────────────────────────────────────────────────

const DEMO_PROJECT: ProjectMeta = {
  id: "p1",
  name: "ABC Data Center",
  client: "Equinix",
  sector: "Data Center",
  discipline: "Electrical HV",
  displayType: "Data Center · Electrical",
  typeProvenance: "ai_inferred",
};

const DEMO_DOCS: ProjectDocument[] = [
  {
    id: "d1", filename: "E-101_LightingPlan.pdf", format: "PDF",
    size_mb: 2.4, upload_status: "complete", sheet_count: 32,
    uploaded_by: "Hardik Bhaskar", uploaded_at: "3h ago",
  },
  {
    id: "d2", filename: "E-102_PowerDistribution.dwg", format: "DWG",
    size_mb: 3.1, upload_status: "complete", sheet_count: 48,
    uploaded_by: "Hardik Bhaskar", uploaded_at: "3h ago",
  },
  {
    id: "d3", filename: "E-103_SingleLine.pdf", format: "PDF",
    size_mb: 1.8, upload_status: "detecting", sheet_count: 24,
    uploaded_by: "Rina Mehta", uploaded_at: "1h ago",
  },
  {
    id: "d4", filename: "E-104_CableTrayLayout.dwg", format: "DWG",
    size_mb: 4.2, upload_status: "ingesting", sheet_count: null,
    uploaded_by: "Rina Mehta", uploaded_at: "1h ago",
  },
  {
    id: "d5", filename: "Spec_Division_26.pdf", format: "PDF",
    size_mb: 12.5, upload_status: "parsed", sheet_count: null,
    uploaded_by: "Zaid Siddiqui", uploaded_at: "2d ago",
  },
  {
    id: "d6", filename: "E-105_EmergencyLighting.pdf", format: "PDF",
    size_mb: 1.1, upload_status: "error", sheet_count: null,
    uploaded_by: "Hardik Bhaskar", uploaded_at: "4h ago",
    error_message: "Unable to parse PDF: file may be encrypted or corrupted.",
  },
];


const STATUS_CONFIG: Record<ProcessingState, StatusConfigItem> = {
  queued:      { label: "Queued",       color: "var(--text-secondary)", icon: IconClock },
  ingesting:   { label: "Ingesting",    color: "#2563eb", icon: IconArrowDownTray },
  classifying: { label: "Classifying",  color: "#7c3aed", icon: IconSearchDoc },
  detecting:   { label: "Detecting",    color: "#d97706", icon: IconBolt },
  complete:    { label: "Ready",        color: "#16a34a", icon: IconCheckCircle },
  parsed:      { label: "Parsed",       color: "#0891b2", icon: IconDocCheck },
  error:       { label: "Error",        color: "#dc2626", icon: IconAlertCircle },
};

function formatSize(mb: number): string {
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(mb * 1024).toFixed(0)} KB`;
}

function totalSize(docs: ProjectDocument[]): string {
  const total = docs.reduce((sum, d) => sum + d.size_mb, 0);
  return formatSize(total);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProjectDocumentsPage() {
  const projectId = getProjectId();
  const [dragOver, setDragOver] = useState(false);

  const errorDocs = DEMO_DOCS.filter(d => d.upload_status === "error");
  const processingDocs = DEMO_DOCS.filter(d =>
    ["queued", "ingesting", "classifying", "detecting"].includes(d.upload_status)
  );

  return (
    <ProjectShell
      project={{ ...DEMO_PROJECT, id: projectId }}
      activeTab="documents"
    >
      <div className="pd-page">

        {/* ── Page Header ─────────────────────────────────────── */}
        <div className="pd-header">
          <div className="pd-header__meta">
            <span className="pd-header__count">
              {DEMO_DOCS.length} files
            </span>
            <span className="pd-header__sep" aria-hidden="true">·</span>
            <span className="pd-header__size">{totalSize(DEMO_DOCS)} total</span>
            {processingDocs.length > 0 && (
              <>
                <span className="pd-header__sep" aria-hidden="true">·</span>
                <span className="pd-header__processing">
                  <span className="pd-processing-dot" aria-hidden="true" />
                  {processingDocs.length} processing
                </span>
              </>
            )}
          </div>
          <button type="button" className="btn btn--primary btn--sm">
            <IconUpload /> Upload Files
          </button>
        </div>

        {/* ── Error banner ─────────────────────────────────────── */}
        {errorDocs.length > 0 && (
          <div className="pd-error-banner" role="alert">
            <IconWarning />
            <span>
              {errorDocs.length} file{errorDocs.length > 1 ? "s" : ""} failed to process.
              Review the errors below and re-upload if needed.
            </span>
          </div>
        )}

        {/* ── Drop zone ─────────────────────────────────────────── */}
        <div
          className={`pd-dropzone${dragOver ? " pd-dropzone--active" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
          role="region"
          aria-label="Drop files to upload"
        >
          <IconUploadLarge aria-hidden="true" />
          <p className="pd-dropzone__label">
            Drop files here or <button type="button" className="pd-dropzone__browse">browse</button>
          </p>
          <p className="pd-dropzone__hint">
            Supported: PDF, DWG, DXF, BIM, TIFF, Excel · Max 500MB per file
          </p>
        </div>

        {/* ── Document list ─────────────────────────────────────── */}
        <div className="pd-list">
          <div className="pd-list__header">
            <span className="pd-list__col pd-list__col--name">Document</span>
            <span className="pd-list__col pd-list__col--status">Status</span>
            <span className="pd-list__col pd-list__col--sheets">Sheets</span>
            <span className="pd-list__col pd-list__col--size">Size</span>
            <span className="pd-list__col pd-list__col--by">Uploaded by</span>
            <span className="pd-list__col pd-list__col--when">When</span>
            <span className="pd-list__col pd-list__col--actions" aria-label="Actions" />
          </div>

          <ul className="pd-doc-list" aria-label="Project documents">
            {DEMO_DOCS.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} projectId={projectId} />
            ))}
          </ul>
        </div>

      </div>
    </ProjectShell>
  );
}

// ── DocumentRow ───────────────────────────────────────────────────────────────

function DocumentRow({ doc, projectId }: { doc: ProjectDocument; projectId: string }) {
  const status = STATUS_CONFIG[doc.upload_status];
  const isReady = doc.upload_status === "complete" || doc.upload_status === "parsed";
  const isProcessing = ["queued", "ingesting", "classifying", "detecting"].includes(doc.upload_status);
  const isError = doc.upload_status === "error";

  return (
    <li className={`pd-doc-row${isError ? " pd-doc-row--error" : ""}`}>
      {/* Identity: Format badge + Name */}
      <div className="pd-doc-identity">
        <span className={`pd-doc-format pd-doc-format--${doc.format.toLowerCase()}`} aria-hidden="true">
          {doc.format}
        </span>
        <div className="pd-doc-name">
          {isReady ? (
            <a
              href={`/project/${projectId}/workspace?doc=${doc.id}`}
              className="pd-doc-filename pd-doc-filename--link"
            >
              {doc.filename}
            </a>
          ) : (
            <span className="pd-doc-filename">{doc.filename}</span>
          )}
          {isError && doc.error_message && (
            <span className="pd-doc-error-msg">{doc.error_message}</span>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="pd-doc-status">
        <span
          className={`pd-status-badge pd-status-badge--${doc.upload_status}`}
          style={{ color: status.color }}
        >
          {(() => {
            const StatusIconComp = status.icon;
            return <StatusIconComp className="pd-status-icon" />;
          })()}
          <span>{status.label}</span>
        </span>
        {isProcessing && (
          <div className="pd-progress-bar" role="progressbar" aria-label={`Processing ${doc.filename}`}>
            <div className="pd-progress-bar__fill" />
          </div>
        )}
      </div>

      {/* Sheet count */}
      <span className="pd-doc-sheets">
        {doc.sheet_count !== null
          ? <span className="pd-mono">{doc.sheet_count} sheets</span>
          : <span className="pd-doc-sheets--na">—</span>
        }
      </span>

      {/* Size */}
      <span className="pd-doc-size pd-mono">{formatSize(doc.size_mb)}</span>

      {/* Uploaded by */}
      <span className="pd-doc-by">{doc.uploaded_by}</span>

      {/* When */}
      <span className="pd-doc-when">{doc.uploaded_at}</span>

      {/* Actions */}
      <div className="pd-doc-actions">
        {isReady && (
          <a
            href={`/project/${projectId}/workspace?doc=${doc.id}`}
            className="btn btn--ghost btn--xs"
            title="Open in Workspace"
          >
            Open
          </a>
        )}
        {isError && (
          <button type="button" className="btn btn--ghost btn--xs pd-retry-btn">
            Retry
          </button>
        )}
        <button type="button" className="btn btn--icon btn--xs" aria-label="More options for this document">
          <IconEllipsis />
        </button>
      </div>
    </li>
  );
}

// ── URL helpers ───────────────────────────────────────────────────────────────

function getProjectId(): string {
  const path = window.location.pathname;
  const match = path.match(/^\/project\/([^/]+)/);
  if (match) return match[1];
  return new URLSearchParams(window.location.search).get("project") ?? "p1";
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconUpload() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M7.5 1v8M4 5l3.5-4 3.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1.5 11v2a.5.5 0 00.5.5h11a.5.5 0 00.5-.5v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
function IconUploadLarge() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true" className="pd-dropzone__icon">
      <path d="M16 4v16M8 12l8-8 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 24v4a1 1 0 001 1h22a1 1 0 001-1v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function IconEllipsis() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <circle cx="3.5" cy="7.5" r="1" fill="currentColor"/>
      <circle cx="7.5" cy="7.5" r="1" fill="currentColor"/>
      <circle cx="11.5" cy="7.5" r="1" fill="currentColor"/>
    </svg>
  );
}
function IconWarning() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1L1 14h14L8 1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M8 6v4M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className} aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M7 4v3.5l2 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function IconArrowDownTray({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className} aria-hidden="true">
      <path d="M7 2v7M4.5 6.5L7 9l2.5-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 10.5v1.5h10v-1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function IconSearchDoc({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className} aria-hidden="true">
      <path d="M8.5 1.5H3a1 1 0 00-1 1v9a1 1 0 001 1h8a1 1 0 001-1V5L8.5 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="7" cy="8" r="2" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M8.5 9.5L10 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function IconBolt({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className} aria-hidden="true">
      <path d="M7.5 1.5L2.5 8h4.5l-1 4.5 5.5-6.5H7l.5-4.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconCheckCircle({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className} aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M4.5 7l2 2 3-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconDocCheck({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className} aria-hidden="true">
      <path d="M8.5 1.5H3a1 1 0 00-1 1v9a1 1 0 001 1h8a1 1 0 001-1V5L8.5 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 7.5l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconAlertCircle({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className} aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M7 4.5v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

