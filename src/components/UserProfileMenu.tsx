/**
 * UserProfileMenu.tsx — User Profile & Session Popover Menu.
 *
 * Provides quick navigation to settings and honest workstation user context.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "../router";

interface UserProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

export function UserProfileMenu({ isOpen, onClose, anchorRef }: UserProfileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    const updatePosition = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
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
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
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
      ref={menuRef}
      className="user-menu-popover"
      style={{
        position: "fixed",
        top: `${coords.top}px`,
        right: `${coords.right}px`,
        zIndex: 900,
      }}
      role="menu"
      aria-label="User Profile & Quick Actions"
    >
      <div className="user-menu-popover__header">
        <div className="user-menu-popover__avatar" aria-hidden="true">
          HB
        </div>
        <div className="user-menu-popover__details">
          <span className="user-menu-popover__name">Hardik Bhaskar</span>
          <span className="user-menu-popover__email">hardik@apexeng.internal</span>
          <span className="user-menu-popover__role">Lead Estimator · Owner</span>
        </div>
      </div>

      <div className="user-menu-popover__divider" />

      <div className="user-menu-popover__actions">
        <Link to="/settings" className="user-menu-popover__item" role="menuitem" onClick={() => onClose()}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="8" cy="8" r="2.5" />
            <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" strokeLinecap="round" />
          </svg>
          <span>Settings &amp; Workstation Config</span>
        </Link>

        <Link to="/sessions" className="user-menu-popover__item" role="menuitem" onClick={() => onClose()}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13z" />
            <path d="M6 10c0-1.1.9-2 2-2s2 .9 2 2" strokeLinecap="round" />
            <circle cx="8" cy="5.5" r="1" fill="currentColor" />
          </svg>
          <span>AI Estimation Sessions</span>
        </Link>

        <Link to="/dashboard" className="user-menu-popover__item" role="menuitem" onClick={() => onClose()}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <rect x="2" y="2" width="5" height="5" rx="1" />
            <rect x="9" y="2" width="5" height="5" rx="1" />
            <rect x="2" y="9" width="5" height="5" rx="1" />
            <rect x="9" y="9" width="5" height="5" rx="1" />
          </svg>
          <span>Workstation Dashboard</span>
        </Link>
      </div>

      <div className="user-menu-popover__divider" />

      <div className="user-menu-popover__footer">
        <span className="user-menu-popover__status-badge">
          <span className="user-menu-popover__status-dot" aria-hidden="true" />
          Local Workstation Profile
        </span>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}
