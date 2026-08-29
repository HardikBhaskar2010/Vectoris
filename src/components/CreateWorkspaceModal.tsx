/**
 * CreateWorkspaceModal.tsx — Production-Grade Workspace & Organization Creator Dialog.
 *
 * Implements Emil Kowalski & Impeccable craft standards:
 * - Spring entrance and tactile feedback (:active transform)
 * - Clear organizational boundary configuration
 * - Instant multi-tenant switching and persistence
 */

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { organizationService } from "../services/organizationService";
import { dataService } from "../services/dataService";
import { AnimatedFolderPlus, AnimatedCheckCircle } from "./icons/AnimatedIcons";

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkspaceCreated?: (newOrgId: string) => void;
}

const SECTORS = [
  { id: "data-center", label: "Data Center (Hyperscale & Co-location)" },
  { id: "industrial", label: "Industrial & Manufacturing Facilities" },
  { id: "healthcare", label: "Healthcare & Critical Infrastructure" },
  { id: "commercial", label: "Commercial High-Rise & Mixed Use" },
  { id: "infrastructure", label: "Substations & Utility Infrastructure" },
] as const;

const DISCIPLINES = ["Electrical", "Mechanical / HVAC", "Plumbing & Piping", "Multi-Disciplinary"] as const;

export function CreateWorkspaceModal({
  isOpen,
  onClose,
  onWorkspaceCreated,
}: CreateWorkspaceModalProps) {
  const [workspaceName, setWorkspaceName] = useState("");
  const [selectedSector, setSelectedSector] = useState<string>("data-center");
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("Electrical");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setWorkspaceName("");
      setSelectedSector("data-center");
      setSelectedDiscipline("Electrical");
      setErrorMsg(null);
      setSuccessMsg(null);
      window.setTimeout(() => inputRef.current?.focus(), 50);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = workspaceName.trim();
    if (!cleanName) {
      setErrorMsg("Please enter a valid workspace name.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const newOrgId = await organizationService.createOrganization(cleanName, {
        sector: selectedSector,
        discipline: selectedDiscipline,
        plan: "Enterprise Workstation",
      });

      if (newOrgId) {
        setSuccessMsg(`Workspace "${cleanName}" initialized successfully.`);
        await dataService.refreshFromSupabase();
        if (onWorkspaceCreated) {
          onWorkspaceCreated(newOrgId);
        }
        window.setTimeout(() => {
          onClose();
        }, 600);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to initialize workspace.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-workspace-title"
    >
      <div
        className="modal-container"
        style={{
          width: "100%",
          maxWidth: "480px",
          backgroundColor: "var(--app-surface-1, #131722)",
          border: "1px solid var(--app-border, rgba(255, 255, 255, 0.1))",
          borderRadius: "12px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--app-border, rgba(255, 255, 255, 0.08))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: "rgba(59, 130, 246, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#3b82f6",
              }}
            >
              <AnimatedFolderPlus size={18} />
            </div>
            <div>
              <h2
                id="create-workspace-title"
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  margin: 0,
                  color: "var(--app-text-primary, #f8fafc)",
                }}
              >
                Create New Workspace
              </h2>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--app-text-muted, #94a3b8)",
                  margin: 0,
                }}
              >
                Set up an isolated multi-tenant organization container
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--app-text-muted, #94a3b8)",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {errorMsg && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "6px",
                backgroundColor: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#ef4444",
                fontSize: "13px",
              }}
            >
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "6px",
                backgroundColor: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#10b981",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AnimatedCheckCircle size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="workspace-name-input"
              style={{
                display: "block",
                fontSize: "12.5px",
                fontWeight: 600,
                color: "var(--app-text-secondary, #cbd5e1)",
                marginBottom: "6px",
              }}
            >
              Workspace Organization Name *
            </label>
            <input
              id="workspace-name-input"
              ref={inputRef}
              type="text"
              required
              placeholder="e.g. Apex Electrical Engineering, Tesla Giga NV"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                backgroundColor: "var(--app-surface-2, rgba(255, 255, 255, 0.04))",
                border: "1px solid var(--app-border, rgba(255, 255, 255, 0.12))",
                borderRadius: "6px",
                color: "inherit",
                fontSize: "13.5px",
                outline: "none",
                transition: "border-color 150ms ease",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="workspace-sector-select"
              style={{
                display: "block",
                fontSize: "12.5px",
                fontWeight: 600,
                color: "var(--app-text-secondary, #cbd5e1)",
                marginBottom: "6px",
              }}
            >
              Primary Industry Sector
            </label>
            <select
              id="workspace-sector-select"
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                backgroundColor: "var(--app-surface-2, rgba(255, 255, 255, 0.04))",
                border: "1px solid var(--app-border, rgba(255, 255, 255, 0.12))",
                borderRadius: "6px",
                color: "inherit",
                fontSize: "13px",
                outline: "none",
              }}
            >
              {SECTORS.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="workspace-discipline-select"
              style={{
                display: "block",
                fontSize: "12.5px",
                fontWeight: 600,
                color: "var(--app-text-secondary, #cbd5e1)",
                marginBottom: "6px",
              }}
            >
              Default Discipline Specialization
            </label>
            <select
              id="workspace-discipline-select"
              value={selectedDiscipline}
              onChange={(e) => setSelectedDiscipline(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                backgroundColor: "var(--app-surface-2, rgba(255, 255, 255, 0.04))",
                border: "1px solid var(--app-border, rgba(255, 255, 255, 0.12))",
                borderRadius: "6px",
                color: "inherit",
                fontSize: "13px",
                outline: "none",
              }}
            >
              {DISCIPLINES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              padding: "10px 12px",
              borderRadius: "6px",
              backgroundColor: "rgba(59, 130, 246, 0.08)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              fontSize: "12px",
              color: "var(--app-text-secondary, #cbd5e1)",
              lineHeight: "1.45",
            }}
          >
            <strong>RLS Multi-Tenant Isolation:</strong> You will be registered as the <strong>Owner (Primary)</strong> of this workspace with full administrative privileges.
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "8px",
            }}
          >
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={isSubmitting || !workspaceName.trim()}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              {isSubmitting ? "Creating..." : "Initialize Workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
