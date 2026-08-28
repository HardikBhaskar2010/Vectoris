/**
 * ProjectDocumentsPage — Documents tab of a project.
 *
 * SOURCE OF TRUTH:
 *   - docs/06_PAGES/DOCUMENT_UPLOAD.md
 *   - docs/06_PAGES/PROCESSING.md
 *   - docs/06_PAGES/PROJECT_NAVIGATION.md §2 (Documents)
 *
 * Real document input:
 *   - Native OS / browser file picker via fileDialogService
 *   - Drag and drop validation with immediate UI feedback
 *   - Honest document state machine: newly uploaded files enter 'queued' state
 *   - Multi-format support: PDF, DWG, DXF, BIM, TIFF, Excel
 */

import { useState, type ReactNode } from "react";
import { useRouter } from "../router";
import { ProjectShell } from "../components/ProjectShell";
import type { ProjectMeta } from "../components/ProjectShell";
import { useDocuments, useProject, dataService } from "../services/dataService";
import { fileDialogService } from "../services/fileDialogService";
import type { ProjectDocument, ProcessingState, DocumentFormat } from "../data/types";

// ── Status Configuration ──────────────────────────────────────────────────────

interface StatusConfigItem {
  label: string;
  color: string;
  icon: (props: { className?: string }) => ReactNode;
}

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
  const { params } = useRouter();
  const projectId = params.id || "p1";
  const project = useProject(projectId);
  const documents = useDocuments(projectId);
  const [dragOver, setDragOver] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const errorDocs = documents.filter((d) => d.upload_status === "error");
  const processingDocs = documents.filter((d) =>
    ["queued", "ingesting", "classifying", "detecting"].includes(d.upload_status)
  );

  const projectMeta: ProjectMeta = {
    id: projectId,
    name: project?.name || "ABC Data Center",
    client: project?.client || "Equinix",
    sector: project?.sector,
    discipline: project?.discipline,
    displayType: project?.displayType || "Data Center · Electrical",
    typeProvenance: project?.typeProvenance || "ai_inferred",
  };

  const handleSelectFiles = async () => {
    setIsUploading(true);
    setUploadErrors([]);
    try {
      const result = await fileDialogService.selectFiles({ projectId, multiple: true });

      if (result.rejectedFiles.length > 0) {
        setUploadErrors(
          result.rejectedFiles.map((r) => `${r.filename}: ${r.reason}`)
        );
      }

      if (result.validFiles.length > 0) {
        dataService.addDocuments(projectId, result.validFiles);
      }
    } catch (err) {
      console.error("File selection error:", err);
      setUploadErrors(["Failed to open file picker. Please try again."]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    setUploadErrors([]);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const result = fileDialogService.processDroppedFiles(e.dataTransfer.files);

      if (result.rejectedFiles.length > 0) {
        setUploadErrors(
          result.rejectedFiles.map((r) => `${r.filename}: ${r.reason}`)
        );
      }

      if (result.validFiles.length > 0) {
        dataService.addDocuments(projectId, result.validFiles);
      }
    }
  };

  return (
    <ProjectShell project={projectMeta} activeTab="documents">
      <div className="pd-page">
        {/* ── Page Header ─────────────────────────────────────── */}
        <div className="pd-header">
          <div className="pd-header__meta">
            <span className="pd-header__count">{documents.length} files</span>
            <span className="pd-header__sep" aria-hidden="true">·</span>
            <span className="pd-header__size">{totalSize(documents)} total</span>
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
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={handleSelectFiles}
            disabled={isUploading}
            id="btn-upload-files"
          >
            <IconUpload />
            {isUploading ? "Selecting…" : "Upload Files"}
          </button>
        </div>

        {/* ── Error banner (existing error files or rejection notices) ─── */}
        {(errorDocs.length > 0 || uploadErrors.length > 0) && (
          <div className="pd-error-banner" role="alert">
            <IconWarning />
            <div>
              {uploadErrors.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {uploadErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              ) : (
                <span>
                  {errorDocs.length} file{errorDocs.length > 1 ? "s" : ""} failed to process.
                  Review the errors below and re-upload if needed.
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Drop zone ─────────────────────────────────────────── */}
        <div
          className={`pd-dropzone${dragOver ? " pd-dropzone--active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          role="region"
          aria-label="Drop files to upload"
        >
          <IconUploadLarge aria-hidden="true" />
          <p className="pd-dropzone__label">
            Drop files here or{" "}
            <button
              type="button"
              className="pd-dropzone__browse"
              onClick={handleSelectFiles}
            >
              browse
            </button>
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

          {documents.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-secondary)" }}>
              <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>No documents in this project yet.</p>
              <p style={{ fontSize: 13 }}>Click "Upload Files" or drop PDF/CAD drawings above to add documents.</p>
            </div>
          ) : (
            <ul className="pd-doc-list" aria-label="Project documents">
              {documents.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} projectId={projectId} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </ProjectShell>
  );
}

// ── DocumentRow ───────────────────────────────────────────────────────────────

function DocumentRow({ doc, projectId }: { doc: ProjectDocument; projectId: string }) {
  const status = STATUS_CONFIG[doc.upload_status] || STATUS_CONFIG.queued;
  const isReady = doc.upload_status === "complete" || doc.upload_status === "parsed";
  const isProcessing = ["queued", "ingesting", "classifying", "detecting"].includes(doc.upload_status);
  const isError = doc.upload_status === "error";

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Remove ${doc.filename} from project?`)) {
      dataService.removeDocument(doc.id);
    }
  };

  return (
    <li className={`pd-doc-row${isError ? " pd-doc-row--error" : ""}`}>
      {/* Identity: Format badge + Name */}
      <div className="pd-doc-identity">
        <span
          className={`pd-doc-format pd-doc-format--${doc.format.toLowerCase()}`}
          aria-hidden="true"
        >
          {doc.format}
        </span>
        <div className="pd-doc-name">
          {isReady ? (
            <a
              href={`/project/${projectId}/workspace?doc=${doc.id}`}
              className="pd-doc-filename pd-doc-filename--link"
              title={doc.file_path || doc.storage_reference || doc.filename}
            >
              {doc.filename}
            </a>
          ) : (
            <span
              className="pd-doc-filename"
              title={doc.file_path || doc.storage_reference || doc.filename}
            >
              {doc.filename}
            </span>
          )}
          {isError && doc.error_message && (
            <span className="pd-doc-error-msg">{doc.error_message}</span>
          )}
          {doc.upload_status === "queued" && (
            <span
              className="pd-doc-queued-hint"
              style={{ fontSize: 11, color: "var(--text-secondary)" }}
              title={doc.file_path ? `Local path: ${doc.file_path}` : undefined}
            >
              Queued · Awaiting engine processing
            </span>
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
        {isProcessing && doc.upload_status !== "queued" && (
          <div
            className="pd-progress-bar"
            role="progressbar"
            aria-label={`Processing ${doc.filename}`}
          >
            <div className="pd-progress-bar__fill" />
          </div>
        )}
      </div>

      {/* Sheet count */}
      <span className="pd-doc-sheets">
        {doc.sheet_count !== null ? (
          <span className="pd-mono">{doc.sheet_count} sheets</span>
        ) : (
          <span className="pd-doc-sheets--na">—</span>
        )}
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
          <button
            type="button"
            className="btn btn--ghost btn--xs pd-retry-btn"
            onClick={() => {
              doc.upload_status = "queued";
              doc.error_message = undefined;
              dataService.processDocumentAsync(projectId, doc.id).catch((err) =>
                console.warn("Retry document processing failed:", err)
              );
            }}
          >
            Retry
          </button>
        )}
        <button
          type="button"
          className="btn btn--icon btn--xs"
          aria-label={`Remove or options for ${doc.filename}`}
          title="Remove document"
          onClick={handleRemove}
        >
          <IconTrash />
        </button>
      </div>
    </li>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconUpload() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path
        d="M7.5 1v8M4 5l3.5-4 3.5 4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1.5 11v2a.5.5 0 00.5.5h11a.5.5 0 00.5-.5v-2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconUploadLarge() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="pd-dropzone__icon"
    >
      <path
        d="M16 4v16M8 12l8-8 8 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 24v4a1 1 0 001 1h22a1 1 0 001-1v-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 3.5h10M4.5 3.5V2a.5.5 0 01.5-.5h4a.5.5 0 01.5.5v1.5M11 3.5l-.8 8.2a1 1 0 01-1 .8H4.8a1 1 0 01-1-.8L3 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconWarning() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1L1 14h14L8 1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 6v4M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className} aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 4v3.5l2 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IconArrowDownTray({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className} aria-hidden="true">
      <path
        d="M7 2v7M4.5 6.5L7 9l2.5-2.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2 10.5v1.5h10v-1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IconSearchDoc({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className} aria-hidden="true">
      <path
        d="M8.5 1.5H3a1 1 0 00-1 1v9a1 1 0 001 1h8a1 1 0 001-1V5L8.5 1.5z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8.5 9.5L10 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconBolt({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className} aria-hidden="true">
      <path
        d="M7.5 1.5L2.5 8h4.5l-1 4.5 5.5-6.5H7l.5-4.5z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCheckCircle({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className} aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M4.5 7l2 2 3-3.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconDocCheck({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className} aria-hidden="true">
      <path
        d="M8.5 1.5H3a1 1 0 00-1 1v9a1 1 0 001 1h8a1 1 0 001-1V5L8.5 1.5z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 7.5l1.5 1.5 3-3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconAlertCircle({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className} aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 4.5v3M7 9.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
