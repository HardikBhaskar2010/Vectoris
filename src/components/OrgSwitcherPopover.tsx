/**
 * OrgSwitcherPopover.tsx — Honest Workspace / Organization Popover.
 *
 * Communicates current workstation scope honestly without faking organization switches.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "../router";

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
    width: 260,
  });

  // Dynamically calculate and track anchor position
  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    const updatePosition = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 6,
        left: rect.left,
        width: Math.max(rect.width, 260),
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

  if (!isOpen) return null;

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
        <h3 className="org-popover__title">Apex Engineering</h3>
        <p className="org-popover__subtitle">Local Workstation Environment</p>
      </div>

      <div className="org-popover__body">
        <div className="org-popover__row">
          <span className="org-popover__label">Active Seat</span>
          <span className="org-popover__value">Lead Estimator / Owner</span>
        </div>
        <div className="org-popover__row">
          <span className="org-popover__label">Storage Scope</span>
          <span className="org-popover__value">Local-First (Isolated)</span>
        </div>
        <div className="org-popover__row">
          <span className="org-popover__label">Team Members</span>
          <span className="org-popover__value">12 Local Profiles</span>
        </div>

        <div className="org-popover__notice" role="note">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="8" cy="8" r="7" />
            <path d="M8 5v3.5M8 11.5v.5" strokeLinecap="round" />
          </svg>
          <span>
            Single-organization workstation mode. Multi-tenant switching will be available when cloud organization sync is connected.
          </span>
        </div>
      </div>

      <div className="org-popover__footer">
        <Link to="/settings" className="org-popover__link" onClick={() => onClose()}>
          <span>Manage Workspace Settings</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M2.5 6h7M6.5 3l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}
