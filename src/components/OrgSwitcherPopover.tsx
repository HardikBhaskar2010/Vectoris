/**
 * OrgSwitcherPopover.tsx — Reactive Multi-Tenant Workspace & Organization Switcher.
 *
 * Connects with Supabase organization records, allowing users to switch between
 * workspaces or create new organizational boundaries seamlessly.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "../router";
import { organizationService, type OrganizationWithRole } from "../services/organizationService";
import { dataService } from "../services/dataService";

interface OrgSwitcherPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

export function OrgSwitcherPopover({ isOpen, onClose, anchorRef }: OrgSwitcherPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 280,
  });

  const [orgs, setOrgs] = useState<OrganizationWithRole[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(() => organizationService.getActiveOrganizationId());
  const [isCreating, setIsCreating] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load organizations
  useEffect(() => {
    if (!isOpen) return;

    organizationService
      .getUserOrganizations()
      .then((list) => {
        setOrgs(list);
        const current = organizationService.getActiveOrganizationId();
        if (!current && list.length > 0) {
          organizationService.setActiveOrganizationId(list[0].id);
          setActiveOrgId(list[0].id);
        } else {
          setActiveOrgId(current);
        }
      })
      .catch((err) => {
        console.warn("OrgSwitcherPopover getUserOrganizations error:", err);
      });
  }, [isOpen]);

  // Dynamically calculate and track anchor position
  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    const updatePosition = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 6,
        left: rect.left,
        width: Math.max(rect.width, 280),
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, anchorRef]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, anchorRef]);

  const handleSelectOrg = async (orgId: string) => {
    if (orgId === activeOrgId) {
      onClose();
      return;
    }
    organizationService.setActiveOrganizationId(orgId);
    setActiveOrgId(orgId);
    await dataService.refreshFromSupabase();
    onClose();
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const createdId = await organizationService.createOrganization(newOrgName.trim());
      if (createdId) {
        await dataService.refreshFromSupabase();
        const updated = await organizationService.getUserOrganizations();
        setOrgs(updated);
        setActiveOrgId(createdId);
        setIsCreating(false);
        setNewOrgName("");
        onClose();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create organization.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const activeOrg = orgs.find((o) => o.id === activeOrgId);

  const content = (
    <div
      ref={popoverRef}
      className="org-popover"
      style={{
        position: "fixed",
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        width: `${coords.width}px`,
        zIndex: 900,
      }}
      role="dialog"
      aria-label="Workspace & Organization Details"
      aria-modal="false"
    >
      <div className="org-popover__header">
        <span className="org-popover__tag">Active Workspace</span>
        <h3 className="org-popover__title">
          {activeOrg?.name || "Vectoris Engineering Labs"}
        </h3>
        <p className="org-popover__subtitle">
          Role: <strong style={{ textTransform: "capitalize" }}>{activeOrg?.role || "Owner"}</strong> · Multi-Tenant Isolation
        </p>
      </div>

      <div className="org-popover__body" style={{ padding: "8px 12px" }}>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-neutral-400, #94a3b8)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Available Workspaces ({orgs.length || 1})
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "180px", overflowY: "auto" }}>
          {orgs.length > 0 ? (
            orgs.map((org) => {
              const isSelected = org.id === activeOrgId;
              return (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => handleSelectOrg(org.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: isSelected ? "1px solid var(--accent-primary, #3b82f6)" : "1px solid transparent",
                    background: isSelected ? "var(--bg-active, rgba(59, 130, 246, 0.12))" : "transparent",
                    color: "inherit",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 150ms ease-out",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "4px",
                        background: isSelected ? "var(--accent-primary, #3b82f6)" : "var(--color-neutral-700, #334155)",
                        color: "#fff",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                    >
                      {org.name[0]?.toUpperCase() || "W"}
                    </span>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 500 }}>{org.name}</div>
                      <div style={{ fontSize: "10px", color: "var(--color-neutral-400, #94a3b8)", textTransform: "capitalize" }}>
                        {org.role}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--accent-primary, #3b82f6)" strokeWidth="2">
                      <path d="M3 8.5l3.5 3.5 6.5-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              );
            })
          ) : (
            <div style={{ padding: "8px", fontSize: "12px", color: "var(--color-neutral-400, #94a3b8)" }}>
              Vectoris Engineering Labs (Dev)
            </div>
          )}
        </div>

        {isCreating ? (
          <form onSubmit={handleCreateOrg} style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid var(--border-subtle, rgba(255,255,255,0.08))" }}>
            <input
              type="text"
              placeholder="Organization Name..."
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              autoFocus
              style={{
                width: "100%",
                padding: "6px 8px",
                fontSize: "12px",
                borderRadius: "4px",
                border: "1px solid var(--border-default, #475569)",
                background: "var(--bg-input, rgba(0,0,0,0.2))",
                color: "inherit",
                marginBottom: "6px",
              }}
            />
            {errorMsg && <div style={{ fontSize: "10px", color: "var(--color-danger, #ef4444)", marginBottom: "4px" }}>{errorMsg}</div>}
            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn--ghost"
                style={{ padding: "4px 8px", fontSize: "11px" }}
                onClick={() => { setIsCreating(false); setErrorMsg(null); }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn--primary"
                style={{ padding: "4px 10px", fontSize: "11px" }}
                disabled={isSubmitting || !newOrgName.trim()}
              >
                {isSubmitting ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              width: "100%",
              marginTop: "8px",
              padding: "6px 8px",
              borderRadius: "4px",
              border: "1px dashed var(--border-default, #475569)",
              background: "transparent",
              color: "var(--accent-primary, #3b82f6)",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              justifyContent: "center",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2.5v7M2.5 6h7" strokeLinecap="round" />
            </svg>
            <span>Create New Workspace</span>
          </button>
        )}
      </div>

      <div className="org-popover__footer">
        <Link to="/settings" className="org-popover__link" onClick={() => onClose()}>
          <span>Manage Team &amp; Workspace Settings</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M2.5 6h7M6.5 3l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}
