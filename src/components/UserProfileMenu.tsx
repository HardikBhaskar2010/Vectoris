/**
 * UserProfileMenu.tsx — Reactive Supabase User Profile & Session Popover Menu.
 *
 * Provides live authentication context, quick navigation, and Sign In / Sign Out actions.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useRouter } from "../router";
import { useAuth } from "../hooks/useAuth";
import { tourService } from "../services/tourService";
import { useActiveOrganization } from "../services/organizationService";

interface UserProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

export function UserProfileMenu({ isOpen, onClose, anchorRef }: UserProfileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const { user, isAuthenticated, signOut } = useAuth();
  const { role: activeRole } = useActiveOrganization();
  const { navigate } = useRouter();

  const roleLabel = activeRole
    ? activeRole.charAt(0).toUpperCase() + activeRole.slice(1)
    : (isAuthenticated ? "Owner" : "Estimator");

  const displayName =
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split("@")[0].replace(/[._-]/g, " ") : "Lead Estimator");

  const displayEmail = user?.email || "Local Development Mode";

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "LE";

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

  const handleSignOut = async () => {
    onClose();
    await signOut();
    navigate("/auth?mode=signin");
  };

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
          {initials}
        </div>
        <div className="user-menu-popover__details">
          <span className="user-menu-popover__name">{displayName}</span>
          <span className="user-menu-popover__email">{displayEmail}</span>
          <span className="user-menu-popover__role">
            {isAuthenticated ? `Supabase Authenticated · ${roleLabel}` : "Local Workstation · Standby"}
          </span>
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
          <span>AI Investigation Workshop</span>
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

        <button
          type="button"
          className="user-menu-popover__item"
          style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", color: "inherit" }}
          role="menuitem"
          onClick={() => {
            onClose();
            navigate("/dashboard");
            window.setTimeout(() => {
              tourService.resetTour();
              tourService.startTour(true);
            }, 300);
          }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 5v4M8 11.5v.5" strokeLinecap="round" />
          </svg>
          <span>Start Product Tour</span>
        </button>
      </div>

      <div className="user-menu-popover__divider" />

      <div className="user-menu-popover__actions">
        {isAuthenticated ? (
          <button
            type="button"
            className="user-menu-popover__item"
            style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", color: "var(--color-danger, #ef4444)" }}
            role="menuitem"
            onClick={handleSignOut}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 12l4-4-4-4M14 8H6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Sign Out</span>
          </button>
        ) : (
          <Link
            to="/auth?mode=signin"
            className="user-menu-popover__item"
            role="menuitem"
            onClick={() => onClose()}
            style={{ color: "var(--accent-primary, #3b82f6)" }}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M10 2h3a1 1 0 011 1v10a1 1 0 01-1 1h-3M6 12l-4-4 4-4M2 8h8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Sign In to Supabase</span>
          </Link>
        )}
      </div>

      <div className="user-menu-popover__divider" />

      <div className="user-menu-popover__footer">
        <span className="user-menu-popover__status-badge">
          <span
            className="user-menu-popover__status-dot"
            style={{ background: isAuthenticated ? "var(--color-success, #22c55e)" : "var(--color-neutral-400, #9ca3af)" }}
            aria-hidden="true"
          />
          {isAuthenticated ? "Supabase Cloud Connected" : "Local Standby Mode"}
        </span>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}
