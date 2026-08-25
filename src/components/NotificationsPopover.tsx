/**
 * NotificationsPopover.tsx — Honest Workstation Activity & Notifications Popover.
 *
 * Derives notifications strictly from real local events (queued documents, workstation status).
 */

import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useAllDocuments, useEngineStatus } from "../services/dataService";
import { updateService, type UpdateState } from "../services/updateService";

interface NotificationsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

export function NotificationsPopover({ isOpen, onClose, anchorRef }: NotificationsPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const allDocs = useAllDocuments();
  const engine = useEngineStatus();
  const [cleared, setCleared] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const [updateState, setUpdateState] = useState<UpdateState>(() => updateService.getState());

  useEffect(() => {
    return updateService.subscribe((state) => {
      setUpdateState(state);
    });
  }, []);

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

  // Derive genuine notification items from real local data
  const notifications = useMemo(() => {
    if (cleared) return [];

    const items: Array<{
      id: string;
      title: string;
      description: string;
      time: string;
      type: "info" | "queued" | "ready";
    }> = [];

    // 0. Update available announcement
    if (updateState.status === "update-available" && updateState.availableRelease) {
      items.push({
        id: `update-${updateState.availableRelease.version}`,
        title: `Software Update Available: v${updateState.availableRelease.version}`,
        description: "A newer signed Vectoris release is ready. Review in Settings → About & Updates.",
        time: "Just now",
        type: "ready",
      });
    }

    // 1. Queued / newly added documents
    const queuedDocs = allDocs.filter(
      (d) => d.upload_status === "queued" || d.upload_status === "ingesting" || d.upload_status === "detecting"
    );
    for (const d of queuedDocs) {
      items.push({
        id: `doc-${d.id}`,
        title: `Drawing Queued: ${d.filename}`,
        description: `Awaiting local perception processing · ${d.size_mb.toFixed(1)} MB`,
        time: "Just now",
        type: "queued",
      });
    }

    // 2. Engine status announcement
    items.push({
      id: "engine-status",
      title: "Workstation Core Connected",
      description: `Desktop runtime v${updateState.currentVersion} · Engine status: ${engine.status}`,
      time: "Session active",
      type: "info",
    });

    return items;
  }, [allDocs, engine.status, cleared, updateState]);

  if (!isOpen) return null;

  const content = (
    <div
      ref={popoverRef}
      className="notif-popover"
      style={{
        position: "fixed",
        top: `${coords.top}px`,
        right: `${coords.right}px`,
        zIndex: 900,
      }}
      role="dialog"
      aria-label="Workstation Notifications"
      aria-modal="false"
    >
      <div className="notif-popover__header">
        <div>
          <h3 className="notif-popover__title">Notifications</h3>
          <span className="notif-popover__subtitle">Local Workstation Events</span>
        </div>
        {notifications.length > 0 && (
          <button
            type="button"
            className="notif-popover__clear-btn"
            onClick={() => setCleared(true)}
          >
            Clear all
          </button>
        )}
      </div>

      <div className="notif-popover__list">
        {notifications.length === 0 ? (
          <div className="notif-popover__empty" role="status">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            <p>No new notifications</p>
            <span>All local activity is current.</span>
          </div>
        ) : (
          notifications.map((item) => (
            <div key={item.id} className={`notif-item notif-item--${item.type}`}>
              <div className="notif-item__dot" aria-hidden="true" />
              <div className="notif-item__content">
                <span className="notif-item__title">{item.title}</span>
                <span className="notif-item__desc">{item.description}</span>
                <span className="notif-item__time">{item.time}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}
