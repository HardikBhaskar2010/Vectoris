/**
 * ProjectCard — Project tile with t-tilt 3D hover + glare, and list row variant.
 *
 * Motion (transitions-dev 19-card-tilt.md):
 *   - Outer .t-tilt is the flat hit area — never transforms.
 *   - Inner .t-tilt-card rotates via --tilt-rx / --tilt-ry CSS vars written from JS.
 *   - .t-tilt-glare = cursor-tracked radial highlight, mix-blend-mode: screen.
 *   - Return: 1000ms cubic-bezier(0.22, 1, 0.36, 1). Follow: 400ms same curve.
 *   - Pointer-only: gated with (hover: hover) and (pointer: fine).
 *   - prefers-reduced-motion: tilt and glare disabled entirely.
 *
 * Grid entrance: stagger-in via CSS animation, 40ms per card delay (30–50ms range).
 * Progress bar: aria-valuenow for screen readers.
 * Avatar stack: aria-label with all member names.
 */

import { useEffect, useRef } from "react";

export type ProjectSector =
  | "data-center"
  | "industrial"
  | "healthcare"
  | "commercial"
  | "infrastructure";

export type ProjectStatus = "processing" | "review" | "completed" | "verified";

export interface ProjectItem {
  id: string;
  name: string;
  client: string;
  sector: ProjectSector;
  discipline: string;
  status: ProjectStatus;
  sheets: number;
  sheetType: "DWG" | "PDF" | "BIM";
  progress: number;
  updatedAt: string;
  members: Array<{ name: string; initials: string; avatarColor?: string }>;
  description?: string;
}

interface ProjectCardProps {
  project: ProjectItem;
  viewMode?: "grid" | "list";
  staggerIndex?: number;
  onClick?: (project: ProjectItem) => void;
}

export function ProjectCard({
  project,
  viewMode = "grid",
  staggerIndex = 0,
  onClick,
}: ProjectCardProps) {
  const {
    id,
    name,
    client,
    sector,
    discipline,
    status,
    sheets,
    sheetType,
    progress,
    updatedAt,
    members,
  } = project;

  const tiltWrapRef = useRef<HTMLDivElement>(null);
  const tiltCardRef = useRef<HTMLDivElement>(null);
  const MAX_TILT = 12; // degrees — tasteful lean per Emil philosophy

  // t-tilt JS orchestration — bound to the OUTER wrapper (never transforms)
  useEffect(() => {
    if (viewMode !== "grid") return;
    const wrap = tiltWrapRef.current;
    const card = tiltCardRef.current;
    if (!wrap || !card) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointerFine = window.matchMedia("(hover: hover) and (pointer: fine)");

    function reset() {
      wrap!.classList.remove("is-hover");
      card!.classList.remove("is-tilting");
      card!.style.setProperty("--tilt-rx", "0deg");
      card!.style.setProperty("--tilt-ry", "0deg");
    }

    function track(e: PointerEvent) {
      if (reducedMotion.matches || !pointerFine.matches) return;
      const r = wrap!.getBoundingClientRect();
      const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      wrap!.classList.add("is-hover");
      card!.classList.add("is-tilting");
      card!.style.setProperty("--tilt-ry", ((px - 0.5) * MAX_TILT).toFixed(2) + "deg");
      card!.style.setProperty("--tilt-rx", ((0.5 - py) * MAX_TILT).toFixed(2) + "deg");
      card!.style.setProperty("--tilt-gx", (px * 100).toFixed(1) + "%");
      card!.style.setProperty("--tilt-gy", (py * 100).toFixed(1) + "%");
    }

    function onPointerDown(e: PointerEvent) {
      if (e.pointerType !== "mouse") {
        try { wrap!.setPointerCapture(e.pointerId); } catch (_) {}
      }
    }
    function onPointerLeave(e: PointerEvent) {
      if (e.pointerType === "mouse") reset();
    }

    wrap.addEventListener("pointerdown", onPointerDown);
    wrap.addEventListener("pointermove", track);
    wrap.addEventListener("pointerup", reset);
    wrap.addEventListener("pointercancel", reset);
    wrap.addEventListener("pointerleave", onPointerLeave);

    return () => {
      wrap.removeEventListener("pointerdown", onPointerDown);
      wrap.removeEventListener("pointermove", track);
      wrap.removeEventListener("pointerup", reset);
      wrap.removeEventListener("pointercancel", reset);
      wrap.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [viewMode]);

  const statusLabel =
    status === "processing" ? "Processing"
    : status === "review"   ? "In Review"
    : status === "verified" ? "Verified"
    : "Completed";

  const statusMod =
    status === "processing" ? "processing"
    : status === "review"   ? "review"
    : "completed";

  const isProcessing = status === "processing";
  const isCompleted  = status === "completed" || status === "verified";

  if (viewMode === "list") {
    return (
      <tr
        className="project-row"
        onClick={() => onClick?.(project)}
        tabIndex={0}
        role="button"
        aria-label={`Open project ${name}`}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(project); } }}
      >
        <td className="project-row__main">
          <div className={`project-row__icon project-icon--${sector}`} aria-hidden="true">
            <SectorIcon sector={sector} />
          </div>
          <div className="project-row__name-group">
            <span className="project-row__name">{name}</span>
            <span className="project-row__client font-mono">{client}</span>
          </div>
        </td>
        <td className="project-row__discipline">
          <span className="project-badge">{discipline}</span>
        </td>
        <td className="project-row__sheets font-mono">{sheets} {sheetType}</td>
        <td className="project-row__status">
          <span className={`project-status-pill project-status-pill--${statusMod}`}>
            {isProcessing && <IconSync aria-hidden="true" />}
            {isCompleted  && <IconCheck aria-hidden="true" />}
            {!isProcessing && !isCompleted && <IconClock aria-hidden="true" />}
            <span>{statusLabel}</span>
          </span>
        </td>
        <td className="project-row__progress">
          <div
            className="project-mini-bar"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${progress}% complete`}
          >
            <div
              className={`project-mini-bar__fill project-mini-bar__fill--${statusMod}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="project-mini-bar__pct font-mono">{progress}%</span>
        </td>
        <td className="project-row__team">
          <AvatarStack members={members} />
        </td>
        <td className="project-row__updated font-mono">{updatedAt}</td>
        <td className="project-row__actions">
          <a
            href={`/workspace?project=${id}`}
            className="project-row__inspect-btn"
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
          >
            Inspect
          </a>
        </td>
      </tr>
    );
  }

  // Grid card — t-tilt pattern from transitions-dev 19-card-tilt.md
  return (
    <div
      className="t-tilt"
      ref={tiltWrapRef}
      style={{ "--stagger-i": staggerIndex } as React.CSSProperties}
    >
      <div
        className="t-tilt-card project-card"
        ref={tiltCardRef}
        onClick={() => onClick?.(project)}
        tabIndex={0}
        role="button"
        aria-label={`Open project ${name}`}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(project); } }}
      >
        {/* Cursor-tracked glare — mix-blend-mode: screen */}
        <div className="t-tilt-glare" aria-hidden="true" />

        {/* Sector-colored ambient glow on hover */}
        <div className={`project-card__glow project-card__glow--${sector}`} aria-hidden="true" />

        {/* Card Header */}
        <div className="project-card__header">
          <div className="project-card__identity">
            <div className={`project-card__icon project-icon--${sector}`} aria-hidden="true">
              <SectorIcon sector={sector} />
            </div>
            <div className="project-card__titles">
              <h3 className="project-card__name">{name}</h3>
              <p className="project-card__client font-mono">{client}</p>
            </div>
          </div>
          <button
            type="button"
            className="project-card__menu-btn"
            aria-label={`Options for ${name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <IconMoreHoriz />
          </button>
        </div>

        {/* Status + Sheet count */}
        <div className="project-card__meta">
          <div>
            <span className="project-card__meta-label">Takeoff Status</span>
            <span className={`project-status-pill project-status-pill--${statusMod}`}>
              {isProcessing && <IconSync aria-hidden="true" />}
              {isCompleted  && <IconCheck aria-hidden="true" />}
              {!isProcessing && !isCompleted && <IconClock aria-hidden="true" />}
              <span>{statusLabel}</span>
            </span>
          </div>
          <div className="project-card__sheets">
            <span className="project-card__sheet-count font-mono">{sheets}</span>
            <span className="project-card__sheet-label">{sheetType} Sheets</span>
          </div>
        </div>

        {/* Progress Track */}
        <div
          className="project-card__progress"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${statusLabel} — ${progress}% complete`}
        >
          <div
            className={`project-card__progress-fill project-card__progress-fill--${statusMod}${isProcessing ? " is-pulsing" : ""}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Footer: Avatars + Timestamp */}
        <div className="project-card__footer">
          <AvatarStack members={members} />
          <span className="project-card__timestamp font-mono">Updated {updatedAt}</span>
        </div>
      </div>
    </div>
  );
}

// ── Avatar Stack ─────────────────────────────────────────────────────────────
function AvatarStack({ members }: { members: Array<{ name: string; initials: string; avatarColor?: string }> }) {
  const visible   = members.slice(0, 2);
  const remainder = members.length - visible.length;
  return (
    <div
      className="avatar-stack"
      aria-label={`Team: ${members.map((m) => m.name).join(", ")}`}
    >
      {visible.map((m, i) => (
        <div
          key={i}
          className="avatar-stack__item"
          style={{ backgroundColor: m.avatarColor }}
          title={m.name}
        >
          {m.initials}
        </div>
      ))}
      {remainder > 0 && (
        <div className="avatar-stack__item avatar-stack__item--more font-mono">+{remainder}</div>
      )}
    </div>
  );
}

// ── Sector Icons ─────────────────────────────────────────────────────────────
function SectorIcon({ sector }: { sector: ProjectSector }) {
  switch (sector) {
    case "data-center":
      return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="3" y="3" width="14" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="3" y="12" width="14" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="6" cy="5.5" r="0.85" fill="currentColor"/>
          <circle cx="8.2" cy="5.5" r="0.85" fill="currentColor"/>
          <circle cx="6" cy="14.5" r="0.85" fill="currentColor"/>
          <circle cx="8.2" cy="14.5" r="0.85" fill="currentColor"/>
        </svg>
      );
    case "industrial":
      return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M3 17V8l4 3V8l4 3V4h6v13H3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M14 7h2M14 10h2M14 13h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      );
    case "healthcare":
      return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="3" y="3" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M10 6.5v7M6.5 10h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      );
    case "commercial":
      return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="4" y="2" width="12" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M7 6h2M11 6h2M7 9h2M11 9h2M7 12h2M11 12h2M9 18v-3h2v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      );
    case "infrastructure":
    default:
      return (
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M3 16l6-12 2 4 6 8H3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M7 12h7" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      );
  }
}

// ── Status Icons ─────────────────────────────────────────────────────────────
function IconSync() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="icon-spin-slow" aria-hidden="true">
      <path d="M1.5 7a5.5 5.5 0 019.5-3.8L12.5 5M12.5 1.5V5H9"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12.5 7a5.5 5.5 0 01-9.5 3.8L1.5 9M1.5 12.5V9H5"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M4.5 7l2 2 3.5-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M7 3.5V7l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}
function IconMoreHoriz() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="4" cy="8" r="1.2" fill="currentColor"/>
      <circle cx="8" cy="8" r="1.2" fill="currentColor"/>
      <circle cx="12" cy="8" r="1.2" fill="currentColor"/>
    </svg>
  );
}
