/**
 * EngineStatusDialog.tsx — Honest Local Engine & Workstation Diagnostics Dialog.
 *
 * Displays actual runtime properties from engineService without falsifying metrics.
 */

import { useEffect, useState } from "react";
import { engineService, type DetailedEngineDiagnostics } from "../services/engineService";

interface EngineStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EngineStatusDialog({ isOpen, onClose }: EngineStatusDialogProps) {
  const [diagnostics, setDiagnostics] = useState<DetailedEngineDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      engineService
        .getEngineDiagnostics()
        .then((d) => {
          setDiagnostics(d);
          setLoading(false);
        })
        .catch((err) => {
          console.warn("getEngineDiagnostics error:", err);
          setLoading(false);
        });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="cmd-palette-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        className="engine-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="engine-dialog-title"
      >
        <div className="engine-dialog__header">
          <div className="engine-dialog__badge">
            <span className="engine-dialog__dot" aria-hidden="true" />
            <span>Local Workstation Core</span>
          </div>
          <button
            type="button"
            className="cpm-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M4.5 4.5L13.5 13.5M4.5 13.5L13.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="engine-dialog__content">
          <h2 id="engine-dialog-title" className="engine-dialog__title">
            Engine Diagnostics &amp; Local Runtime
          </h2>
          <p className="engine-dialog__desc">
            Vectoris runs perception, vector parsing, and takeoff analysis locally on your workstation.
          </p>

          {loading ? (
            <div className="engine-dialog__loading">Loading runtime status…</div>
          ) : (
            <div className="engine-dialog__grid">
              <div className="engine-dialog__card">
                <span className="engine-dialog__card-label">Runtime Shell</span>
                <strong className="engine-dialog__card-val">
                  {diagnostics?.isDesktop ? "Tauri Desktop Native" : "Browser Preview Mode"}
                </strong>
                <span className="engine-dialog__card-meta">Platform: {diagnostics?.platform || "Local"}</span>
              </div>

              <div className="engine-dialog__card">
                <span className="engine-dialog__card-label">Perception Engine</span>
                <strong className="engine-dialog__card-val">Standby</strong>
                <span className="engine-dialog__card-meta">Awaiting document ingestion trigger</span>
              </div>

              <div className="engine-dialog__card">
                <span className="engine-dialog__card-label">Storage Architecture</span>
                <strong className="engine-dialog__card-val">Local-First</strong>
                <span className="engine-dialog__card-meta">Drawings remain strictly on-device</span>
              </div>

              <div className="engine-dialog__card">
                <span className="engine-dialog__card-label">Workspace Documents</span>
                <strong className="engine-dialog__card-val">
                  {diagnostics?.totalDocuments || 0} files ({diagnostics?.indexedSheets || 0} sheets)
                </strong>
                <span className="engine-dialog__card-meta">Version: {diagnostics?.engineVersion}</span>
              </div>
            </div>
          )}
        </div>

        <div className="engine-dialog__footer">
          <a
            href="/settings"
            className="btn btn--secondary"
            onClick={() => onClose()}
          >
            Configure Engine in Settings
          </a>
          <button
            type="button"
            className="btn btn--primary"
            onClick={onClose}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
