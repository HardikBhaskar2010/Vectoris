/**
 * CreateProjectModal — Accessible dialog with t-modal transition pattern.
 *
 * Motion: transitions-dev 06-modal.md
 *   - Open: scale 0.96 → 1.0, 250ms, cubic-bezier(0.22, 1, 0.36, 1)
 *   - Close: scale 1.0 → 0.96, 150ms, same ease (asymmetric — faster exit)
 *   - State: .is-open / .is-closing class machine — no layout thrashing
 *   - Backdrop: opacity fade, 250ms on open / 150ms on close
 *   - prefers-reduced-motion: transitions zeroed, instant state swap
 *
 * SPEC (docs/06_PAGES/CREATE_PROJECT.md - LOCKED):
 *   - Project Name (required) + Description (optional) only.
 *   - AI notice: disciplines inferred from blueprints, no manual entry.
 *   - Escape to dismiss, backdrop click to dismiss, keyboard accessible.
 *   - Submission error inline under name field.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { FormEvent } from "react";

export interface CreateProjectPayload {
  name: string;
  description: string;
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: CreateProjectPayload) => Promise<void> | void;
}

export function CreateProjectModal({ isOpen, onClose, onCreate }: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // t-modal state machine: "closed" | "open" | "closing"
  const [modalState, setModalState] = useState<"closed" | "open" | "closing">("closed");
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Open transition
  useEffect(() => {
    if (isOpen) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      setName("");
      setDescription("");
      setFieldError(null);
      setIsSubmitting(false);
      setModalState("open");
      // Focus after transition begins so focus is available but doesn't interrupt paint
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Close transition — use the 150ms close duration from t-modal spec
  const triggerClose = useCallback(() => {
    if (isSubmitting) return;
    setModalState("closing");
    closeTimerRef.current = setTimeout(() => {
      setModalState("closed");
      onClose();
    }, 150); // --modal-close-dur
  }, [isSubmitting, onClose]);

  // Escape key
  useEffect(() => {
    if (modalState !== "open") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") triggerClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modalState, triggerClose]);

  // Trap focus inside modal when open
  useEffect(() => {
    if (modalState === "open") {
      document.body.style.overflow = "hidden";
    } else if (modalState === "closed") {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [modalState]);

  if (modalState === "closed") return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) triggerClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setFieldError("Project name is required.");
      inputRef.current?.focus();
      return;
    }
    setFieldError(null);
    setIsSubmitting(true);
    try {
      await onCreate({ name: trimmed, description: description.trim() });
    } catch (err) {
      setFieldError(
        err instanceof Error ? err.message : "Failed to create project. Please try again."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`modal-backdrop${modalState === "open" ? " is-open" : ""}${modalState === "closing" ? " is-closing" : ""}`}
      onClick={handleBackdropClick}
      role="presentation"
      aria-hidden={modalState !== "open"}
    >
      <div
        className={`t-modal create-project-modal${modalState === "open" ? " is-open" : ""}${modalState === "closing" ? " is-closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cpm-title"
      >
        {/* Glowing top accent line */}
        <div className="create-project-modal__accent" aria-hidden="true" />

        {/* Header */}
        <div className="create-project-modal__header">
          <div>
            <h2 id="cpm-title" className="create-project-modal__title">
              Create New Project
            </h2>
            <p className="create-project-modal__subtitle">
              Start a new evidence-backed takeoff workspace.
            </p>
          </div>
          <button
            type="button"
            className="cpm-close-btn"
            onClick={triggerClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
          >
            <IconClose />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="create-project-modal__form" noValidate>
          <div className="create-project-modal__body">
            {/* AI Intelligent Onboarding Notice */}
            <div className="cpm-ai-notice" role="note">
              <span className="cpm-ai-notice__icon" aria-hidden="true">✨</span>
              <div className="cpm-ai-notice__text">
                <strong className="cpm-ai-notice__heading">Intelligent Onboarding</strong>
                <p className="cpm-ai-notice__desc">
                  Vectoris organizes your project context across drawings, requirements,
                  takeoffs, BOQs, and supporting documents — no manual metadata entry needed.
                </p>
              </div>
            </div>

            {/* Project Name */}
            <div className="cpm-field">
              <label htmlFor="cpm-name" className="cpm-field__label">
                Project Name{" "}
                <span className="cpm-field__required" aria-hidden="true">*</span>
              </label>
              <input
                ref={inputRef}
                id="cpm-name"
                type="text"
                className={`cpm-field__input${fieldError ? " cpm-field__input--error" : ""}`}
                placeholder="e.g., Project Titan Phase 2"
                value={name}
                onChange={(e) => { setName(e.target.value); if (fieldError) setFieldError(null); }}
                disabled={isSubmitting}
                aria-required="true"
                aria-invalid={fieldError ? "true" : undefined}
                aria-describedby={fieldError ? "cpm-name-error" : undefined}
                autoComplete="off"
              />
              {fieldError && (
                <span id="cpm-name-error" className="cpm-field__error" role="alert">
                  <IconAlert />
                  {fieldError}
                </span>
              )}
            </div>

            {/* Description */}
            <div className="cpm-field">
              <label htmlFor="cpm-desc" className="cpm-field__label">
                Description{" "}
                <span className="cpm-field__optional">(Optional)</span>
              </label>
              <textarea
                id="cpm-desc"
                className="cpm-field__textarea"
                placeholder="Brief context about this facility or scope of work…"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="create-project-modal__footer">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={triggerClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="btn-spinner" aria-hidden="true" />
                  Creating Workspace…
                </>
              ) : (
                <>
                  Create Project &amp; Upload Drawings
                  <IconArrowRight />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Inline SVG Icons ────────────────────────────────────────────────────────
function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4.5 4.5L13.5 13.5M4.5 13.5L13.5 4.5"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}
function IconArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2.5 7h9M8.5 3.5L12 7l-3.5 3.5"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconAlert() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M6.5 4v3.5M6.5 9v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}
