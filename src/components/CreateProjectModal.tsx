/**
 * CreateProjectModal — Stepped multi-step project initialization modal.
 *
 * Steps:
 *   1. Project Identity (Name * required, Reference optional)
 *   2. Project Context (Client, Sector/Type, Discipline, Location)
 *   3. Scope & Context (Description/Scope, Project Notes)
 *   4. Review & Create (Compact summary with quick step edit links)
 *
 * Contract:
 *   - Only Step 1 requires mandatory input (Project Name).
 *   - Stepper at top with clickable visited steps.
 *   - Enter advances when step is valid; Escape dismisses modal.
 *   - On Create: calls dataService.createProject() and navigates to /project/:id/documents.
 *   - Motion: follows emil-design-eng, apple-design, and transitions-dev guidelines.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { FormEvent } from "react";
import { useRouter } from "../router";
import type { ProjectSector } from "../data/types";
import { dataService } from "../services/dataService";

export interface CreateProjectPayload {
  name: string;
  reference?: string;
  client?: string;
  sector?: ProjectSector;
  discipline?: string;
  location?: string;
  description?: string;
  notes?: string;
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optional custom creation handler */
  onCreate?: (payload: CreateProjectPayload) => Promise<void> | void;
}

const STEPS = [
  { id: 1, title: "Identity", label: "01 Identity" },
  { id: 2, title: "Context",  label: "02 Context" },
  { id: 3, title: "Scope",    label: "03 Scope" },
  { id: 4, title: "Review",   label: "04 Review" },
] as const;

export function CreateProjectModal({ isOpen, onClose, onCreate }: CreateProjectModalProps) {
  // Wizard state
  const { navigate } = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [maxVisitedStep, setMaxVisitedStep] = useState<number>(1);

  // Form fields
  const [name, setName] = useState("");
  const [reference, setReference] = useState("");
  const [client, setClient] = useState("");
  const [sector, setSector] = useState<ProjectSector>("commercial");
  const [discipline, setDiscipline] = useState("Electrical");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  // Validation & status
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // t-modal state machine: "closed" | "open" | "closing"
  const [modalState, setModalState] = useState<"closed" | "open" | "closing">("closed");
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Reset and focus on open
  useEffect(() => {
    if (isOpen) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      setCurrentStep(1);
      setMaxVisitedStep(1);
      setName("");
      setReference("");
      setClient("");
      setSector("commercial");
      setDiscipline("Electrical");
      setLocation("");
      setDescription("");
      setNotes("");
      setFieldError(null);
      setIsSubmitting(false);
      setModalState("open");

      const t = setTimeout(() => nameInputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Close transition
  const triggerClose = useCallback(() => {
    if (isSubmitting) return;
    setModalState("closing");
    closeTimerRef.current = setTimeout(() => {
      setModalState("closed");
      onClose();
    }, 150);
  }, [isSubmitting, onClose]);

  // Global Escape key
  useEffect(() => {
    if (modalState !== "open") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") triggerClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modalState, triggerClose]);

  // Lock scroll
  useEffect(() => {
    if (modalState === "open") {
      document.body.style.overflow = "hidden";
    } else if (modalState === "closed") {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalState]);

  if (modalState === "closed") return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) triggerClose();
  };

  // Step validation
  const validateCurrentStep = (): boolean => {
    if (currentStep === 1) {
      const trimmed = name.trim();
      if (!trimmed) {
        setFieldError("Project name is required.");
        nameInputRef.current?.focus();
        return false;
      }
    }
    setFieldError(null);
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    if (currentStep < 4) {
      const next = currentStep + 1;
      setCurrentStep(next);
      setMaxVisitedStep((prev) => Math.max(prev, next));
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleJumpToStep = (stepNumber: number) => {
    // Only allow jump to visited steps or step 1
    if (stepNumber <= maxVisitedStep) {
      if (currentStep === 1 && !name.trim() && stepNumber > 1) {
        validateCurrentStep();
        return;
      }
      setCurrentStep(stepNumber);
    }
  };

  // Final creation
  const handleFinalSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    try {
      const payload: CreateProjectPayload = {
        name: name.trim(),
        reference: reference.trim() || undefined,
        client: client.trim() || "Apex Engineering",
        sector,
        discipline,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (onCreate) {
        await onCreate(payload);
      } else {
        const fullDesc = [
          payload.description,
          payload.reference ? `Ref: ${payload.reference}` : "",
          payload.location ? `Location: ${payload.location}` : "",
          payload.notes ? `Notes: ${payload.notes}` : "",
        ].filter(Boolean).join("\n");

        const newProj = await dataService.createProjectAsync({
          name: payload.name,
          description: fullDesc || payload.description,
          client: payload.client,
          sector: payload.sector,
          discipline: payload.discipline,
        });

        triggerClose();
        // Direct navigation to Documents page per contract
        navigate(`/project/${newProj.id}/documents`);
      }
    } catch (err) {
      setFieldError(
        err instanceof Error ? err.message : "Failed to create project. Please try again."
      );
      setIsSubmitting(false);
    }
  };

  // Keyboard navigation on form
  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      if (currentStep < 4) {
        handleNext();
      } else {
        handleFinalSubmit();
      }
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
        className={`t-modal create-project-modal create-project-modal--stepped${modalState === "open" ? " is-open" : ""}${modalState === "closing" ? " is-closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cpm-title"
        onKeyDown={handleFormKeyDown}
      >
        {/* Top accent border */}
        <div className="create-project-modal__accent" aria-hidden="true" />

        {/* Modal Header */}
        <div className="create-project-modal__header">
          <div>
            <h2 id="cpm-title" className="create-project-modal__title">
              Initialize Project Workspace
            </h2>
            <p className="create-project-modal__subtitle">
              Configure engineering parameters and takeoff workspace.
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

        {/* Stepper Progress Header */}
        <nav className="cpm-stepper" aria-label="Project initialization steps">
          {STEPS.map((step, idx) => {
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep || (step.id <= maxVisitedStep && !isActive);
            const isAccessible = step.id <= maxVisitedStep;

            return (
              <div key={step.id} className="cpm-stepper__item-wrapper">
                <button
                  type="button"
                  className={`cpm-stepper__item${isActive ? " is-active" : ""}${isCompleted ? " is-completed" : ""}`}
                  onClick={() => handleJumpToStep(step.id)}
                  disabled={!isAccessible || isSubmitting}
                  aria-current={isActive ? "step" : undefined}
                >
                  <span className="cpm-stepper__dot" aria-hidden="true">
                    {isCompleted && !isActive ? "✓" : step.id}
                  </span>
                  <span className="cpm-stepper__label">{step.title}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`cpm-stepper__connector${step.id < currentStep ? " is-filled" : ""}`}
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </nav>

        {/* Form Body */}
        <form onSubmit={(e) => { e.preventDefault(); if (currentStep === 4) handleFinalSubmit(); else handleNext(); }} className="create-project-modal__form" noValidate>
          <div className="create-project-modal__body">

            {/* ── STEP 1: PROJECT IDENTITY ─────────────────────────────── */}
            {currentStep === 1 && (
              <div className="cpm-step-panel" role="region" aria-label="Step 1: Project Identity">
                <div className="cpm-step-panel__intro">
                  <span className="cpm-step-panel__tag">Step 1 of 4</span>
                  <h3 className="cpm-step-panel__heading">Project Identity</h3>
                  <p className="cpm-step-panel__sub">
                    Establish the primary name and identifier for this takeoff workspace.
                  </p>
                </div>

                {/* Project Name (Required) */}
                <div className="cpm-field">
                  <label htmlFor="cpm-name" className="cpm-field__label">
                    Project Name <span className="cpm-field__required" aria-hidden="true">*</span>
                  </label>
                  <input
                    ref={nameInputRef}
                    id="cpm-name"
                    type="text"
                    className={`cpm-field__input${fieldError ? " cpm-field__input--error" : ""}`}
                    placeholder="e.g., Project Titan Phase 2"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (fieldError) setFieldError(null);
                    }}
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

                {/* Reference Number (Optional) */}
                <div className="cpm-field">
                  <label htmlFor="cpm-ref" className="cpm-field__label">
                    Project Reference / Job Number <span className="cpm-field__optional">(Optional)</span>
                  </label>
                  <input
                    id="cpm-ref"
                    type="text"
                    className="cpm-field__input"
                    placeholder="e.g., PRJ-2026-084 or E-2401"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    disabled={isSubmitting}
                    autoComplete="off"
                  />
                </div>
              </div>
            )}

            {/* ── STEP 2: PROJECT CONTEXT ──────────────────────────────── */}
            {currentStep === 2 && (
              <div className="cpm-step-panel" role="region" aria-label="Step 2: Project Context">
                <div className="cpm-step-panel__intro">
                  <span className="cpm-step-panel__tag">Step 2 of 4</span>
                  <h3 className="cpm-step-panel__heading">Project Context</h3>
                  <p className="cpm-step-panel__sub">
                    Establish engineering parameters to assist automated drawing and document parsing.
                  </p>
                </div>

                <div className="cpm-grid-2col">
                  {/* Client / Organization */}
                  <div className="cpm-field">
                    <label htmlFor="cpm-client" className="cpm-field__label">
                      Client / Organization <span className="cpm-field__optional">(Optional)</span>
                    </label>
                    <input
                      id="cpm-client"
                      type="text"
                      className="cpm-field__input"
                      placeholder="e.g., Apex Engineering, Equinix"
                      value={client}
                      onChange={(e) => setClient(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Project Sector / Type */}
                  <div className="cpm-field">
                    <label htmlFor="cpm-sector" className="cpm-field__label">
                      Project Type / Sector
                    </label>
                    <select
                      id="cpm-sector"
                      className="cpm-field__select"
                      value={sector}
                      onChange={(e) => setSector(e.target.value as ProjectSector)}
                      disabled={isSubmitting}
                    >
                      <option value="data-center">Data Center</option>
                      <option value="commercial">Commercial</option>
                      <option value="industrial">Industrial</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="infrastructure">Infrastructure</option>
                    </select>
                  </div>

                  {/* Discipline */}
                  <div className="cpm-field">
                    <label htmlFor="cpm-discipline" className="cpm-field__label">
                      Primary Discipline
                    </label>
                    <select
                      id="cpm-discipline"
                      className="cpm-field__select"
                      value={discipline}
                      onChange={(e) => setDiscipline(e.target.value)}
                      disabled={isSubmitting}
                    >
                      <option value="Electrical">Electrical</option>
                      <option value="Mechanical">Mechanical</option>
                      <option value="Low Voltage / Telecom">Low Voltage / Telecom</option>
                      <option value="Plumbing">Plumbing</option>
                      <option value="Fire Protection">Fire Protection</option>
                      <option value="Civil / Structural">Civil / Structural</option>
                      <option value="General">General / Multi-Discipline</option>
                    </select>
                  </div>

                  {/* Location */}
                  <div className="cpm-field">
                    <label htmlFor="cpm-location" className="cpm-field__label">
                      Facility Location <span className="cpm-field__optional">(Optional)</span>
                    </label>
                    <input
                      id="cpm-location"
                      type="text"
                      className="cpm-field__input"
                      placeholder="e.g., Ashburn, VA or Dallas, TX"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: SCOPE & CONTEXT ──────────────────────────────── */}
            {currentStep === 3 && (
              <div className="cpm-step-panel" role="region" aria-label="Step 3: Scope and Context">
                <div className="cpm-step-panel__intro">
                  <span className="cpm-step-panel__tag">Step 3 of 4</span>
                  <h3 className="cpm-step-panel__heading">Scope &amp; Context</h3>
                  <p className="cpm-step-panel__sub">
                    Provide human-readable scope to guide drawing interpretation and BOQ categorization.
                  </p>
                </div>

                {/* Scope Description */}
                <div className="cpm-field">
                  <label htmlFor="cpm-desc" className="cpm-field__label">
                    Project Scope / Description <span className="cpm-field__optional">(Optional)</span>
                  </label>
                  <textarea
                    id="cpm-desc"
                    className="cpm-field__textarea"
                    placeholder="Brief description of facility expansion, main feeders, or specific equipment scope…"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Special Notes */}
                <div className="cpm-field">
                  <label htmlFor="cpm-notes" className="cpm-field__label">
                    Project Notes / Special Requirements <span className="cpm-field__optional">(Optional)</span>
                  </label>
                  <input
                    id="cpm-notes"
                    type="text"
                    className="cpm-field__input"
                    placeholder="e.g., Drawings in imperial units; standard NEC 2023 specs."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Intelligence Note */}
                <div className="cpm-ai-notice" role="note">
                  <span className="cpm-ai-notice__icon" aria-hidden="true">
                    <IconDrawingIngest />
                  </span>
                  <div className="cpm-ai-notice__text">
                    <strong className="cpm-ai-notice__heading">Drawing-First Ingestion</strong>
                    <p className="cpm-ai-notice__desc">
                      Detailed equipment specifications and feeder schedules will be extracted automatically
                      from your drawing package once uploaded in the Documents workspace.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 4: REVIEW & CREATE ──────────────────────────────── */}
            {currentStep === 4 && (
              <div className="cpm-step-panel" role="region" aria-label="Step 4: Review and Initialize">
                <div className="cpm-step-panel__intro">
                  <span className="cpm-step-panel__tag">Step 4 of 4</span>
                  <h3 className="cpm-step-panel__heading">Review Project Configuration</h3>
                  <p className="cpm-step-panel__sub">
                    Verify initialized workspace parameters before creation.
                  </p>
                </div>

                <div className="cpm-review-card">
                  <div className="cpm-review-row">
                    <div className="cpm-review-item">
                      <span className="cpm-review-item__label">Project Name</span>
                      <strong className="cpm-review-item__val">{name}</strong>
                    </div>
                    <button
                      type="button"
                      className="cpm-review-edit-btn"
                      onClick={() => setCurrentStep(1)}
                      title="Edit project name"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="cpm-review-grid">
                    <div className="cpm-review-item">
                      <span className="cpm-review-item__label">Reference Number</span>
                      <span className="cpm-review-item__val">{reference || "—"}</span>
                    </div>
                    <div className="cpm-review-item">
                      <span className="cpm-review-item__label">Client / Org</span>
                      <span className="cpm-review-item__val">{client || "Apex Engineering"}</span>
                    </div>
                    <div className="cpm-review-item">
                      <span className="cpm-review-item__label">Type / Sector</span>
                      <span className="cpm-review-item__val" style={{ textTransform: "capitalize" }}>
                        {sector.replace("-", " ")}
                      </span>
                    </div>
                    <div className="cpm-review-item">
                      <span className="cpm-review-item__label">Discipline</span>
                      <span className="cpm-review-item__val">{discipline}</span>
                    </div>
                    <div className="cpm-review-item">
                      <span className="cpm-review-item__label">Location</span>
                      <span className="cpm-review-item__val">{location || "—"}</span>
                    </div>
                    <div className="cpm-review-item">
                      <span className="cpm-review-item__label">Storage Scope</span>
                      <span className="cpm-review-item__val">Local Workstation</span>
                    </div>
                  </div>

                  {description && (
                    <div className="cpm-review-item cpm-review-item--full">
                      <span className="cpm-review-item__label">Scope Description</span>
                      <p className="cpm-review-item__text">{description}</p>
                    </div>
                  )}

                  {notes && (
                    <div className="cpm-review-item cpm-review-item--full">
                      <span className="cpm-review-item__label">Special Notes</span>
                      <p className="cpm-review-item__text">{notes}</p>
                    </div>
                  )}
                </div>

                <p className="cpm-review-note">
                  Next step: You will land in the <strong>Documents</strong> workspace to upload drawing sheets and blueprints.
                </p>
              </div>
            )}
          </div>

          {/* Modal Footer with Step Navigation */}
          <div className="create-project-modal__footer">
            {currentStep > 1 ? (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                ← Back
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={triggerClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            )}

            {currentStep < 3 ? (
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleNext}
                disabled={isSubmitting}
              >
                Continue →
              </button>
            ) : currentStep === 3 ? (
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleNext}
                disabled={isSubmitting}
              >
                Review Project →
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => handleFinalSubmit()}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="btn-spinner" aria-hidden="true" />
                    Initializing Workspace…
                  </>
                ) : (
                  <>
                    Create Project →
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────
function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4.5 4.5L13.5 13.5M4.5 13.5L13.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6.5 4v3.5M6.5 9v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IconDrawingIngest() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3 4C3 2.89543 3.89543 2 5 2H11L17 8V16C17 17.1046 16.1046 18 15 18H5C3.89543 18 3 17.1046 3 16V4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M11 2V8H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 11.5H13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M7 14.5H10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
