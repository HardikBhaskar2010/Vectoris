/**
 * UpdatePanel.tsx — Vectoris Software Update Management Component.
 *
 * Grounded in the official Vectoris design system and motion vocabulary.
 * Encapsulates the 6 key lifecycle update states:
 * 1. Current / Up to Date
 * 2. Checking
 * 3. Update Available (with expandable release notes)
 * 4. Downloading (with real byte/MB progress bar)
 * 5. Stay Put Experience (calm handoff view before passive installer execution)
 * 6. Honest Failure States (check-failed, download-failed, install-failed)
 */

import { useState, useEffect } from "react";
import {
  updateService,
  type UpdateState,
  UPDATE_ENDPOINT_DOCS,
} from "../services/updateService";

export function UpdatePanel() {
  const [updateState, setUpdateState] = useState<UpdateState>(() => updateService.getState());
  const [showNotes, setShowNotes] = useState(false);
  const [showErrorDetail, setShowErrorDetail] = useState(false);

  useEffect(() => {
    const unsubscribe = updateService.subscribe((next) => {
      setUpdateState(next);
    });
    return unsubscribe;
  }, []);

  const handleCheck = async () => {
    await updateService.checkForUpdate({ isBackground: false });
  };

  const handleDownloadAndInstall = async () => {
    await updateService.downloadAndInstallUpdate();
  };

  const handleDismiss = () => {
    updateService.dismiss();
  };

  const formatRelativeTime = (isoString: string | null) => {
    if (!isoString) return "Never";
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 45) return "Just now";
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr ago`;
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "Recently";
    }
  };

  const {
    status,
    currentVersion,
    availableRelease,
    progress,
    lastCheckedAt,
    errorMessage,
    errorDetail,
    isDesktop,
    channel,
  } = updateState;

  return (
    <div className="update-panel-container">
      {/* ── 1. STAY PUT STATE (High Priority Full-Surface View) ──────── */}
      {status === "stay-put" && (
        <div className="update-stay-put" role="status" aria-live="polite">
          <div className="update-stay-put__header">
            <span className="update-stay-put__badge">STAY PUT</span>
            <span className="update-stay-put__kicker">VECTORIS UPDATE READY</span>
          </div>

          <h3 className="update-stay-put__title">
            Vectoris v{availableRelease?.version || currentVersion}
          </h3>

          <p className="update-stay-put__desc">
            Your update has been downloaded and cryptographically verified.
            Vectoris will briefly close while the update is installed on your workstation.
          </p>

          <div className="update-stay-put__handoff">
            <div className="update-stay-put__pulse" aria-hidden="true" />
            <span>Preparing secure handoff…</span>
          </div>

          <div className="update-stay-put__note">
            Please do not interrupt or power down during update handoff.
          </div>
        </div>
      )}

      {/* ── 2. DOWNLOADING STATE (Real Progress Tracking) ───────────── */}
      {status === "downloading" && progress && (
        <div className="update-downloading-card" role="status" aria-live="polite">
          <div className="update-card__top">
            <div>
              <span className="settings-chip settings-chip--standby">DOWNLOADING UPDATE</span>
              <h3 className="update-card__title">
                Downloading Vectoris v{availableRelease?.version}
              </h3>
            </div>
            <div className="update-progress__percent">
              {progress.percentage !== null ? `${progress.percentage}%` : "Streaming…"}
            </div>
          </div>

          <div
            className="update-progress__bar"
            role="progressbar"
            aria-valuenow={progress.percentage ?? undefined}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Downloading update: ${progress.percentage ?? 0}% completed`}
          >
            <div
              className={`update-progress__fill${progress.percentage === null ? " update-progress__fill--indeterminate" : ""}`}
              style={{ width: progress.percentage !== null ? `${progress.percentage}%` : "100%" }}
            />
          </div>

          <div className="update-progress__meta">
            <span>
              {progress.downloadedMb} MB {progress.totalMb ? `/ ${progress.totalMb} MB` : "received"}
            </span>
            <span>Cryptographic verification active</span>
          </div>
        </div>
      )}

      {/* ── 3. UPDATE AVAILABLE STATE ────────────────────────────────── */}
      {status === "update-available" && availableRelease && (
        <div className="update-available-card" role="region" aria-label="Software update available">
          <div className="update-card__top">
            <div>
              <span className="settings-chip settings-chip--ready">UPDATE AVAILABLE</span>
              <h3 className="update-card__title">
                Vectoris v{availableRelease.version}
              </h3>
              <p className="update-card__desc">
                A newer verified release of Vectoris is ready for installation.
                {availableRelease.releaseDate && (
                  <span className="update-card__date">
                    {" "}· Released {new Date(availableRelease.releaseDate).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>
            <div className="update-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleDismiss}
              >
                Later
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleDownloadAndInstall}
              >
                <IconDownload aria-hidden="true" />
                Update Now
              </button>
            </div>
          </div>

          {availableRelease.releaseNotes && (
            <div className="update-notes-container">
              <button
                type="button"
                className="update-notes-toggle"
                onClick={() => setShowNotes((p) => !p)}
                aria-expanded={showNotes}
              >
                <span>{showNotes ? "Hide Release Notes" : "View Release Notes"}</span>
                <IconChevronDown style={{ transform: showNotes ? "rotate(180deg)" : "none" }} aria-hidden="true" />
              </button>

              {showNotes && (
                <div className="update-notes-content">
                  <pre>{availableRelease.releaseNotes}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 4. ERROR STATES (Check / Download / Install Failed) ──────── */}
      {(status === "check-failed" || status === "download-failed" || status === "install-failed") && (
        <div className="update-error-card" role="alert">
          <div className="update-card__top">
            <div>
              <span className="settings-chip" style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.3)", background: "rgba(239, 68, 68, 0.08)" }}>
                {status === "check-failed" ? "CHECK FAILED" : status === "download-failed" ? "DOWNLOAD FAILED" : "INSTALL FAILED"}
              </span>
              <h3 className="update-card__title">
                {errorMessage || "Update operation encountered an error."}
              </h3>
              <p className="update-card__desc">
                Your current Vectoris workstation installation (v{currentVersion}) has not been changed and remains safe.
              </p>
            </div>
            <div className="update-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleDismiss}
              >
                Dismiss
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={status === "download-failed" ? handleDownloadAndInstall : handleCheck}
              >
                <IconRefresh aria-hidden="true" />
                Try Again
              </button>
            </div>
          </div>

          {errorDetail && (
            <div className="update-error-detail">
              <button
                type="button"
                className="update-notes-toggle"
                onClick={() => setShowErrorDetail((p) => !p)}
                aria-expanded={showErrorDetail}
              >
                <span>Diagnostics & Trace</span>
                <IconChevronDown style={{ transform: showErrorDetail ? "rotate(180deg)" : "none" }} aria-hidden="true" />
              </button>
              {showErrorDetail && (
                <code className="update-error-code">
                  {errorDetail}
                </code>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 5. DEFAULT / UP TO DATE STATE ───────────────────────────── */}
      {(status === "idle" || status === "checking" || status === "up-to-date") && (
        <div className="update-status-row">
          <div className="update-status-info">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <strong className="update-status-title">
                {status === "checking" ? "Checking for updates…" : "You're up to date"}
              </strong>
              {status === "checking" ? (
                <span className="update-pulse-dot" aria-hidden="true" />
              ) : (
                <span className="settings-chip settings-chip--available">v{currentVersion}</span>
              )}
            </div>
            <span className="update-status-meta">
              Last checked: {formatRelativeTime(lastCheckedAt)} · Channel: {channel}
              {!isDesktop && " (Browser Preview)"}
            </span>
          </div>

          <div className="update-status-control">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={handleCheck}
              disabled={status === "checking"}
              aria-label="Check for Vectoris updates"
            >
              <IconRefresh className={status === "checking" ? "spin-animation" : ""} aria-hidden="true" />
              {status === "checking" ? "Checking…" : "Check for Updates"}
            </button>
          </div>
        </div>
      )}

      {/* ── Architecture & Seam Documentation Callout ───────────────── */}
      <div className="update-architecture-callout">
        <div className="update-architecture-callout__icon">
          <IconShield aria-hidden="true" />
        </div>
        <div>
          <strong className="update-architecture-callout__title">Cryptographic Update Trust Chain</strong>
          <p className="update-architecture-callout__text">
            All release packages are signed with Vectoris AI cryptographic keys and verified on-device prior to installation.
            Update metadata endpoint: <code style={{ fontFamily: "var(--font-technical)" }}>{UPDATE_ENDPOINT_DOCS}</code>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Inline SVGs ─────────────────────────────────────────────────────────────

function IconDownload(props: { "aria-hidden"?: boolean | "true" | "false"; className?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" {...props}>
      <path d="M8 2v8.5M8 10.5l-3-3M8 10.5l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 13.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconRefresh(props: { "aria-hidden"?: boolean | "true" | "false"; className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" {...props}>
      <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9L14 6.5M14 2v4.5H9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevronDown(props: { "aria-hidden"?: boolean | "true" | "false"; style?: React.CSSProperties }) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconShield(props: { "aria-hidden"?: boolean | "true" | "false" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" {...props}>
      <path d="M9 2.5L3.5 5v5c0 4.14 2.86 6.86 5.5 7.5 2.64-.64 5.5-3.36 5.5-7.5V5L9 2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 9l2 2 3.5-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
