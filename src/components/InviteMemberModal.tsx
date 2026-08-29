/**
 * InviteMemberModal.tsx — Production-Grade Team Invitation Modal.
 *
 * Implements Emil Kowalski & Impeccable craft standards:
 * - Spring entrance and tactile feedback (:active transform)
 * - Clear role permission explanations
 * - Instant transactional persistence via Supabase & local-first fallback
 */

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { organizationService, type WorkspaceMember } from "../services/organizationService";
import type { OrgRole } from "../data/database.types";
import { AnimatedCheckCircle, AnimatedShield } from "./icons/AnimatedIcons";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  orgName: string;
  onMemberInvited: (newMember: WorkspaceMember) => void;
}

const ROLES: Array<{
  role: OrgRole;
  label: string;
  badgeColor: string;
  description: string;
  permissions: string[];
}> = [
  {
    role: "editor",
    label: "Lead Estimator / Editor",
    badgeColor: "#3b82f6",
    description: "Generates takeoffs, inspects blueprint geometry, audits quantities, and proposes line items.",
    permissions: ["Upload drawings & specifications", "Run AI takeoff detection", "Correct / verify quantities", "Export BOQ spreadsheets"],
  },
  {
    role: "manager",
    label: "Project Manager",
    badgeColor: "#f59e0b",
    description: "Oversees project milestones, sheet assignments, and coordinate exports across teams.",
    permissions: ["Manage project assignments", "Review audit trails", "Initialize new projects", "Export audit ledgers"],
  },
  {
    role: "admin",
    label: "Organization Admin",
    badgeColor: "#8b5cf6",
    description: "Manages organizational workspace settings, member seats, and compute policies.",
    permissions: ["Invite / remove members", "Configure compute engine", "Manage billing", "Access all workspace projects"],
  },
  {
    role: "viewer",
    label: "Viewer / Stakeholder",
    badgeColor: "#64748b",
    description: "Read-only access to drawings, verified takeoffs, and investigation summaries.",
    permissions: ["View drawings & sheets", "Inspect verified takeoff", "Read-only access"],
  },
];

export function InviteMemberModal({
  isOpen,
  onClose,
  orgId,
  orgName,
  onMemberInvited,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState<OrgRole>("editor");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setFullName("");
      setSelectedRole("editor");
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
    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg("Please enter a valid work email address.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const invitedMember = await organizationService.inviteMember(orgId, {
        email: cleanEmail,
        name: fullName.trim() || undefined,
        role: selectedRole,
      });

      setSuccessMsg(`Invitation dispatched to ${cleanEmail} as ${selectedRole.toUpperCase()}`);
      onMemberInvited(invitedMember);
      window.setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to invite team member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeRoleConfig = ROLES.find((r) => r.role === selectedRole) || ROLES[0];

  const modalContent = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(6px)",
        padding: "20px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "var(--app-surface-1, #18191c)",
          border: "1px solid var(--app-border, rgba(255, 255, 255, 0.12))",
          borderRadius: "12px",
          boxShadow: "0 20px 48px rgba(0, 0, 0, 0.5)",
          overflow: "hidden",
          animation: "modalSpringIn 220ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--app-border, rgba(255, 255, 255, 0.08))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--app-text-muted, #94a3b8)", marginBottom: "2px" }}>
              {orgName}
            </div>
            <h2 id="invite-modal-title" style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--app-text-primary, #f8fafc)" }}>
              Invite Team Member
            </h2>
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
            }}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
          {errorMsg && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "6px",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#f87171",
                fontSize: "12px",
                marginBottom: "16px",
              }}
              role="alert"
            >
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "6px",
                background: "rgba(34, 197, 94, 0.15)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                color: "#4ade80",
                fontSize: "12px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
              role="status"
            >
              <AnimatedCheckCircle size={15} />
              <span>{successMsg}</span>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <div>
              <label
                htmlFor="invite-email-input"
                style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--app-text-secondary, #cbd5e1)", marginBottom: "6px" }}
              >
                Work Email *
              </label>
              <input
                id="invite-email-input"
                ref={inputRef}
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: "13px",
                  borderRadius: "6px",
                  border: "1px solid var(--app-border, rgba(255,255,255,0.15))",
                  background: "var(--app-surface-2, rgba(0,0,0,0.25))",
                  color: "var(--app-text-primary, #f8fafc)",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="invite-name-input"
                style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--app-text-secondary, #cbd5e1)", marginBottom: "6px" }}
              >
                Full Name (Optional)
              </label>
              <input
                id="invite-name-input"
                type="text"
                placeholder="e.g. Alex Morgan"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: "13px",
                  borderRadius: "6px",
                  border: "1px solid var(--app-border, rgba(255,255,255,0.15))",
                  background: "var(--app-surface-2, rgba(0,0,0,0.25))",
                  color: "var(--app-text-primary, #f8fafc)",
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--app-text-secondary, #cbd5e1)", marginBottom: "8px" }}
            >
              Assigned Workspace Role
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
              {ROLES.map((r) => {
                const isSelected = selectedRole === r.role;
                return (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => setSelectedRole(r.role)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      padding: "10px 12px",
                      borderRadius: "6px",
                      border: isSelected ? "1.5px solid var(--accent-primary, #3b82f6)" : "1px solid var(--app-border, rgba(255,255,255,0.1))",
                      background: isSelected ? "rgba(59, 130, 246, 0.12)" : "var(--app-surface-2, rgba(255,255,255,0.03))",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 150ms ease-out",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: r.badgeColor,
                        }}
                      />
                      <strong style={{ fontSize: "12px", color: isSelected ? "var(--accent-primary, #3b82f6)" : "inherit" }}>
                        {r.label.split("/")[0].trim()}
                      </strong>
                    </div>
                    <span style={{ fontSize: "10px", color: "var(--app-text-muted, #94a3b8)", lineHeight: "1.3" }}>
                      {r.description.substring(0, 50)}…
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Role Permissions Callout */}
            <div
              style={{
                padding: "12px",
                borderRadius: "6px",
                background: "var(--app-surface-2, rgba(255,255,255,0.04))",
                border: "1px solid var(--app-border, rgba(255,255,255,0.08))",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", fontWeight: 600, color: activeRoleConfig.badgeColor, marginBottom: "6px" }}>
                <AnimatedShield size={13} />
                <span>{activeRoleConfig.label} Access Scope:</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "11px", color: "var(--app-text-secondary, #cbd5e1)", lineHeight: "1.5" }}>
                {activeRoleConfig.permissions.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onClose}
              style={{ padding: "8px 16px", fontSize: "13px" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={isSubmitting || !email.trim()}
              style={{ padding: "8px 18px", fontSize: "13px" }}
            >
              {isSubmitting ? "Inviting…" : "Send Workstation Invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
}
