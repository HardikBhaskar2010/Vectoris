/**
 * OnboardingPage.tsx — Vectoris Post-Auth Organization Onboarding Flow.
 *
 * Implements locked specifications:
 * - docs/01_PRODUCT/USER_ROLES.md (Owner, Admin, Manager, Editor, Viewer)
 * - docs/01_PRODUCT/APP_FLOW.md (Auth → Onboarding → Dashboard)
 * - docs/06_PAGES/ONBOARDING.md (Focused, dismissible, Urbanist typography)
 * - docs/02_DESIGN/DESIGN_SYSTEM.md & MOTION.md
 * - Real Supabase multi-tenant persistence (zero fake persistence)
 */

import { useState, useEffect, useRef, useMemo, type FormEvent, type ReactNode } from "react";
import { useRouter } from "../router";
import { BrandMark } from "../components/BrandMark";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/authService";
import { organizationService } from "../services/organizationService";
import { dataService } from "../services/dataService";
import { tourService } from "../services/tourService";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import type { OrgRole } from "../data/database.types";

type OnboardingStep = 1 | 2;
type OrgMode = "create" | "join";

// ── Real SVG Vector Icons (Zero Emojis) ────────────────────────────────────────

function IconElectrical() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconDataCenter() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" strokeWidth="2.5" />
      <line x1="6" y1="18" x2="6.01" y2="18" strokeWidth="2.5" />
    </svg>
  );
}

function IconMechanical() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function IconCommercial() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="3 21 21 21 21 3 3 21" />
      <line x1="9" y1="21" x2="9" y2="17" />
      <line x1="13" y1="21" x2="13" y2="15" />
      <line x1="17" y1="21" x2="17" y2="13" />
      <line x1="21" y1="9" x2="17" y2="9" />
      <line x1="21" y1="13" x2="15" y2="13" />
      <line x1="21" y1="17" x2="13" y2="17" />
    </svg>
  );
}

function IconEstimating() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <path d="M3 20h18" />
    </svg>
  );
}

function IconCheckmark() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const DISCIPLINES: Array<{
  id: string;
  label: string;
  scope: string;
  icon: () => ReactNode;
}> = [
  {
    id: "elec-hv",
    label: "Electrical HV & Substation Infrastructure",
    scope: "Switchgear, transformers, cable trays & high-voltage feeder schedules",
    icon: IconElectrical,
  },
  {
    id: "datacenter",
    label: "Mission-Critical Data Center MEP",
    scope: "Power density, CRAC/CRAH cooling, busway routes & redundant feeds",
    icon: IconDataCenter,
  },
  {
    id: "mech-piping",
    label: "Mechanical, HVAC & Process Piping",
    scope: "Chillers, ductwork, hydronic piping, valves & mechanical takeoffs",
    icon: IconMechanical,
  },
  {
    id: "commercial-mep",
    label: "Commercial & Industrial MEP",
    scope: "Branch power, lighting troffers, fire alarm & conduit runs",
    icon: IconCommercial,
  },
  {
    id: "estimating",
    label: "General Pre-Construction & Estimating",
    scope: "Multi-discipline measurement, quantity takeoff & BOQ schedule compilation",
    icon: IconEstimating,
  },
];

const ROLES: Array<{
  role: OrgRole;
  label: string;
  badgeColor: string;
  description: string;
}> = [
  {
    role: "owner",
    label: "Owner / Principal Engineer",
    badgeColor: "#8b5cf6",
    description: "Full administrative and billing authority over the engineering workspace.",
  },
  {
    role: "admin",
    label: "Organization Admin",
    badgeColor: "#ec4899",
    description: "Manages team members, compute policies, and organizational project scopes.",
  },
  {
    role: "manager",
    label: "Project Manager",
    badgeColor: "#f59e0b",
    description: "Oversees drawing deliverables, schedules, and cross-discipline takeoffs.",
  },
  {
    role: "editor",
    label: "Lead Estimator / Reviewer",
    badgeColor: "#3b82f6",
    description: "Performs CAD takeoff inspection, approves line items, and exports BOQ sheets.",
  },
];

export function OnboardingPage() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const isOnline = useOnlineStatus();

  // Read URL invite parameters if user clicked an invite link
  const inviteParams = useMemo(() => {
    const p = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const invite = p.get("invite");
    const org = p.get("org");
    const role = p.get("role");
    return {
      inviteCode: invite ?? "",
      orgName: org ?? "",
      assignedRole: (role as OrgRole) ?? "editor",
      hasInvite: Boolean(invite && invite !== "expired" && invite !== "used"),
    };
  }, []);

  const [step, setStep] = useState<OnboardingStep>(1);
  const [orgMode, setOrgMode] = useState<OrgMode>(inviteParams.hasInvite ? "join" : "create");

  // Step 1: Profile State
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [discipline, setDiscipline] = useState(DISCIPLINES[0].label);

  // Step 2: Org State
  const [orgName, setOrgName] = useState(inviteParams.orgName || "");
  const [selectedRole, setSelectedRole] = useState<OrgRole>(inviteParams.assignedRole || "owner");
  const [inviteCode, setInviteCode] = useState(inviteParams.inviteCode || "");

  // Submission & Error State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shakeField, setShakeField] = useState<string | null>(null);

  const fullNameInputRef = useRef<HTMLInputElement>(null);
  const orgNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.user_metadata?.full_name && !fullName) {
      setFullName(user.user_metadata.full_name);
    }
  }, [user, fullName]);

  // Guard: if user is logged in but email is unconfirmed, route to verification check
  useEffect(() => {
    if (user && !authService.isEmailConfirmed(user)) {
      navigate(`/auth?verify=pending&email=${encodeURIComponent(user.email || "")}`);
    }
  }, [user, navigate]);

  useEffect(() => {
    if (step === 1) {
      fullNameInputRef.current?.focus();
    } else if (step === 2 && orgMode === "create") {
      orgNameInputRef.current?.focus();
    }
  }, [step, orgMode]);

  const triggerShake = (field: string) => {
    setShakeField(field);
    window.setTimeout(() => setShakeField(null), 500);
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      if (fullName.trim()) {
        await authService.updateProfile({ fullName: fullName.trim(), discipline }).catch(() => null);
      }
      if (!organizationService.getActiveOrganizationId()) {
        const existingOrgs = await organizationService.getUserOrganizations().catch(() => []);
        if (existingOrgs.length > 0) {
          organizationService.setActiveOrganizationId(existingOrgs[0].id);
        } else {
          organizationService.setActiveOrganizationId("local-workspace");
        }
      }
      tourService.resetTour();
      await dataService.refreshFromSupabase().catch(() => null);
      navigate("/dashboard");
    } catch {
      navigate("/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStep1Submit = (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMsg("Please provide your full name so team members can identify your approvals.");
      triggerShake("fullName");
      return;
    }
    setErrorMsg(null);
    setStep(2);
  };

  const handleStep2Submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isOnline) {
      setErrorMsg("No network connection detected. Please verify connectivity.");
      return;
    }

    if (orgMode === "create" && !orgName.trim()) {
      setErrorMsg("Please enter your organization or engineering company name.");
      triggerShake("orgName");
      return;
    }

    if (orgMode === "join" && !inviteCode.trim()) {
      setErrorMsg("Please enter a valid workspace invite token or organization ID.");
      triggerShake("inviteCode");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Update user profile metadata
      try {
        await authService.updateProfile({
          fullName: fullName.trim(),
          discipline,
        });
      } catch (profileErr) {
        console.warn("Profile update notice:", profileErr);
      }

      // 2. Create or join organization
      if (orgMode === "create") {
        const newOrgId = await organizationService.createOrganization(orgName.trim(), {
          discipline,
          initial_role: selectedRole,
          onboarding_completed: true,
        });

        if (!newOrgId) {
          throw new Error("Could not initialize organization. Please try again or click Skip.");
        }
      } else {
        const joinResult = await organizationService.joinOrganizationByCode(
          inviteCode.trim(),
          selectedRole
        );

        if (!joinResult.success) {
          throw new Error(joinResult.error || "Failed to join organization with provided code.");
        }
      }

      // 3. Reset tour status so guided tour runs on initial workspace landing
      tourService.resetTour();

      // 4. Refresh real Supabase data cache
      await dataService.refreshFromSupabase().catch(() => null);

      // 5. Navigate to Dashboard
      navigate("/dashboard");
    } catch (err) {
      console.error("Onboarding failed:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to complete onboarding.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="onboarding-container" role="main" aria-label="Vectoris Workspace Onboarding">
      <div className="onboarding-ambient-glow" aria-hidden="true" />

      <div className="onboarding-card">
        {/* Top Navigation Bar */}
        <div className="onboarding-top-nav">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <BrandMark />
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--app-text-muted, rgba(46, 46, 46, 0.6))",
                letterSpacing: "0.02em",
              }}
            >
              / Workspace Onboarding
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <button
              type="button"
              className="onboarding-skip-link"
              onClick={handleSkip}
              disabled={isSubmitting}
            >
              <span>Skip Setup</span>
              <span className="arrow-icon">→</span>
            </button>

            {/* Stepper Badge */}
            <div className="onboarding-step-pill">
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "var(--accent-primary, #7d4047)",
                }}
              />
              <span>Step {step} of 2</span>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="onboarding-error-banner" role="alert">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontWeight: 700 }}>✕</span>
              <span>{errorMsg}</span>
            </div>
            <button type="button" onClick={handleSkip} className="onboarding-error-skip">
              Skip to Workspace →
            </button>
          </div>
        )}

        {/* Header Hero Area */}
        <div className="onboarding-header-hero">
          <div className="onboarding-eyebrow">
            <span>{step === 1 ? "STEP 01 // OPERATOR IDENTITY" : "STEP 02 // WORKSPACE CONTEXT"}</span>
          </div>
          <h1 className="onboarding-title">
            {step === 1 ? "Operator Profile Setup" : "Engineering Workspace Setup"}
          </h1>
          <p className="onboarding-desc">
            {step === 1
              ? "Establish your engineering signature for drawing reviews, AI takeoff authorizations, and BOQ revision signatures."
              : "Provision your team workspace or enter an active invitation code to synchronize project drawings."}
          </p>
        </div>

        {/* ── STEP 1: OPERATOR PROFILE ────────────────────────────────────────── */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="onboarding-form-body">
            {/* Operator Full Name */}
            <div className="onboarding-field">
              <label htmlFor="onboarding-fullname" className="onboarding-label">
                Operator Full Name
              </label>
              <input
                id="onboarding-fullname"
                ref={fullNameInputRef}
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="e.g. Hardik Bhaskar"
                required
                className={`onboarding-input ${shakeField === "fullName" ? "onboarding-input--shake" : ""}`}
              />
              <span className="onboarding-hint">
                Used on takeoff proposal approvals, revision sign-offs, and exported BOQs.
              </span>
            </div>

            {/* Primary Engineering Discipline */}
            <div className="onboarding-field" style={{ marginBottom: "28px" }}>
              <label className="onboarding-label" style={{ marginBottom: "6px" }}>
                Primary Engineering Discipline
              </label>
              <span className="onboarding-hint" style={{ marginBottom: "12px", marginTop: 0 }}>
                Tailors default CAD layer filters, measurement units, and AI symbol recognition.
              </span>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {DISCIPLINES.map((d) => {
                  const isSelected = discipline === d.label;
                  const Icon = d.icon;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDiscipline(d.label)}
                      className={`discipline-option-card ${isSelected ? "discipline-option-card--active" : ""}`}
                      aria-pressed={isSelected}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div className="discipline-icon-glyph">
                          <Icon />
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: "13.5px",
                              fontWeight: 600,
                              color: isSelected ? "var(--app-text-primary, #1e293b)" : "inherit",
                              letterSpacing: "-0.01em",
                            }}
                          >
                            {d.label}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "var(--app-text-secondary, rgba(46, 46, 46, 0.68))",
                              marginTop: "2px",
                              lineHeight: "1.3",
                            }}
                          >
                            {d.scope}
                          </div>
                        </div>
                      </div>

                      <div className={`selection-radio-dot ${isSelected ? "selection-radio-dot--active" : ""}`}>
                        {isSelected && <div className="selection-radio-dot__inner" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Actions */}
            <div className="onboarding-form-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleSkip}
                disabled={isSubmitting}
                style={{ padding: "10px 16px", fontSize: "13px", color: "var(--app-text-muted, rgba(46, 46, 46, 0.6))" }}
              >
                Skip for now
              </button>

              <button type="submit" className="onboarding-primary-btn">
                <span>Continue to Workspace Setup</span>
                <span className="arrow-icon">→</span>
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 2: ORGANIZATION / WORKSPACE ────────────────────────────────── */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="onboarding-form-body">
            {/* Mode Switch Tabs */}
            <div className="onboarding-mode-tabs" role="tablist" aria-label="Organization Setup Mode">
              <button
                type="button"
                role="tab"
                aria-selected={orgMode === "create"}
                onClick={() => setOrgMode("create")}
                className={`onboarding-mode-tab ${orgMode === "create" ? "onboarding-mode-tab--active" : ""}`}
              >
                Create New Organization
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={orgMode === "join"}
                onClick={() => setOrgMode("join")}
                className={`onboarding-mode-tab ${orgMode === "join" ? "onboarding-mode-tab--active" : ""}`}
              >
                Join with Invite Code
              </button>
            </div>

            {/* CREATE MODE */}
            {orgMode === "create" && (
              <>
                <div className="onboarding-field">
                  <label htmlFor="onboarding-orgname" className="onboarding-label">
                    Organization / Company Name
                  </label>
                  <input
                    id="onboarding-orgname"
                    ref={orgNameInputRef}
                    type="text"
                    value={orgName}
                    onChange={(e) => {
                      setOrgName(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="e.g. Apex MEP Consulting Engineers"
                    required
                    className={`onboarding-input ${shakeField === "orgName" ? "onboarding-input--shake" : ""}`}
                  />
                  <span className="onboarding-hint">
                    Multi-tenant workspace container for shared drawing packages, takeoffs, and BOQs.
                  </span>
                </div>

                {/* Initial Role Status */}
                <div className="onboarding-field" style={{ marginBottom: "28px" }}>
                  <label className="onboarding-label" style={{ marginBottom: "6px" }}>
                    Your Administrative Role
                  </label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      padding: "12px 14px",
                      borderRadius: "8px",
                      background: "rgba(139, 92, 246, 0.08)",
                      border: "1px solid rgba(139, 92, 246, 0.25)",
                    }}
                  >
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "4px",
                        background: "#8b5cf618",
                        color: "#8b5cf6",
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        border: "1px solid #8b5cf635",
                        marginTop: "2px",
                      }}
                    >
                      Owner
                    </span>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600 }}>Workspace Owner / Principal</div>
                      <div style={{ fontSize: "11.5px", color: "var(--app-text-secondary)", marginTop: "2px", lineHeight: "1.4" }}>
                        As the organization creator, you receive full administrative privileges, team seat management, and drawing takeoff export authority.
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* JOIN MODE */}
            {orgMode === "join" && (
              <div className="onboarding-field" style={{ marginBottom: "28px" }}>
                <label htmlFor="onboarding-invitecode" className="onboarding-label">
                  Workspace Invitation Code or Organization ID
                </label>
                <input
                  id="onboarding-invitecode"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Paste invite token, link, or organization UUID..."
                  required
                  className={`onboarding-input ${shakeField === "inviteCode" ? "onboarding-input--shake" : ""}`}
                  style={{ fontFamily: "var(--font-technical, monospace)" }}
                />
                <span className="onboarding-hint">
                  Ask your workspace administrator for a 14-day single-use link or organization UUID.
                </span>
              </div>
            )}

            {/* Navigation Actions */}
            <div className="onboarding-form-actions">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    setStep(1);
                    setErrorMsg(null);
                  }}
                  style={{ padding: "10px 14px", fontSize: "13px" }}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={handleSkip}
                  disabled={isSubmitting}
                  style={{ padding: "10px 12px", fontSize: "13px", color: "var(--app-text-muted, rgba(46, 46, 46, 0.6))" }}
                >
                  Skip for now
                </button>
              </div>

              <button type="submit" className="onboarding-primary-btn" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span>Initializing Workspace…</span>
                ) : (
                  <>
                    <span>Enter Vectoris Workspace</span>
                    <span className="arrow-icon">→</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Embedded CSS for flawless styling & micro-interactions */}
      <style>{`
        @keyframes onboardingFadeIn {
          from { opacity: 0; transform: translateY(10px) scale(0.99); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes stepSlideIn {
          from { opacity: 0; transform: translateX(8px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes checkmarkPop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes fieldShake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }

        .onboarding-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: var(--app-bg, #f1ece6);
          background-image: radial-gradient(var(--app-border, rgba(46, 46, 46, 0.14)) 1px, transparent 1px);
          background-size: 24px 24px;
          color: var(--app-text-primary, #2e2e2e);
          padding: 32px 16px;
          font-family: var(--font-ui, "Urbanist", system-ui, sans-serif);
          position: relative;
          overflow-x: hidden;
        }

        .onboarding-ambient-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 680px;
          height: 680px;
          background: radial-gradient(circle, rgba(125, 64, 71, 0.08) 0%, rgba(59, 130, 246, 0.03) 45%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .onboarding-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 600px;
          background: var(--app-surface-1, #ffffff);
          border: 1px solid var(--app-border, rgba(46, 46, 46, 0.14));
          border-radius: var(--radius-md, 14px);
          box-shadow: 0 24px 64px -12px rgba(46, 46, 46, 0.14), 0 0 0 1px var(--app-border, rgba(46, 46, 46, 0.08));
          overflow: hidden;
          animation: onboardingFadeIn 220ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .onboarding-top-nav {
          padding: 18px 28px 14px 28px;
          border-bottom: 1px solid var(--app-border, rgba(46, 46, 46, 0.1));
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--app-surface-2, rgba(0, 0, 0, 0.02));
        }

        .onboarding-skip-link {
          background: none;
          border: none;
          font-size: 12.5px;
          font-weight: 500;
          color: var(--app-text-muted, rgba(46, 46, 46, 0.6));
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 6px;
          border-radius: 4px;
          transition: color var(--duration-fast, 150ms) var(--ease-standard), transform var(--duration-fast, 150ms) var(--ease-standard);
        }

        .onboarding-skip-link:hover {
          color: var(--accent-primary, #7d4047);
        }

        .onboarding-skip-link:hover .arrow-icon {
          transform: translateX(3px);
        }

        .onboarding-step-pill {
          padding: 4px 10px;
          border-radius: 20px;
          background: var(--app-surface-3, rgba(0, 0, 0, 0.05));
          font-size: 11.5px;
          font-weight: 600;
          color: var(--accent-primary, #7d4047);
          border: 1px solid var(--app-border, rgba(46, 46, 46, 0.1));
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-technical, monospace);
        }

        .onboarding-header-hero {
          padding: 24px 28px 4px 28px;
        }

        .onboarding-eyebrow {
          font-family: var(--font-technical, "IBM Plex Mono", monospace);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--accent-primary, #7d4047);
          margin-bottom: 6px;
        }

        .onboarding-title {
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--app-text-primary, #2e2e2e);
          margin: 0 0 6px 0;
          letter-spacing: -0.015em;
        }

        .onboarding-desc {
          font-size: 13px;
          color: var(--app-text-secondary, rgba(46, 46, 46, 0.68));
          margin: 0;
          line-height: 1.45;
        }

        .onboarding-form-body {
          padding: 20px 28px 28px 28px;
          animation: stepSlideIn 200ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .onboarding-field {
          margin-bottom: 18px;
        }

        .onboarding-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 6px;
          color: var(--app-text-primary, #2e2e2e);
        }

        .onboarding-input {
          width: 100%;
          padding: 10px 14px;
          font-size: 13.5px;
          font-family: inherit;
          border-radius: var(--radius-sm, 8px);
          border: 1px solid var(--app-border, rgba(46, 46, 46, 0.18));
          background: var(--app-surface-2, #f6f3ee);
          color: var(--app-text-primary, #2e2e2e);
          outline: none;
          transition: border-color var(--duration-fast, 150ms) var(--ease-standard),
                      box-shadow var(--duration-fast, 150ms) var(--ease-standard),
                      background var(--duration-fast, 150ms) var(--ease-standard);
        }

        .onboarding-input:focus {
          border-color: var(--accent-primary, #7d4047);
          box-shadow: 0 0 0 3px var(--focus-ring, rgba(125, 64, 71, 0.25));
          background: var(--app-surface-1, #ffffff);
        }

        .onboarding-input--shake {
          border-color: #ef4444 !important;
          animation: fieldShake 350ms ease-in-out;
        }

        .onboarding-hint {
          display: block;
          font-size: 11.5px;
          color: var(--app-text-muted, rgba(46, 46, 46, 0.55));
          margin-top: 5px;
          line-height: 1.35;
        }

        .discipline-option-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 10px 14px;
          border-radius: var(--radius-sm, 8px);
          border: 1px solid var(--app-border, rgba(46, 46, 46, 0.12));
          background: var(--app-surface-1, #ffffff);
          color: var(--app-text-primary, #2e2e2e);
          cursor: pointer;
          text-align: left;
          transition: border-color 150ms var(--ease-standard),
                      background 150ms var(--ease-standard),
                      transform 150ms var(--ease-standard),
                      box-shadow 150ms var(--ease-standard);
          user-select: none;
        }

        .discipline-option-card:hover {
          border-color: var(--accent-primary, #7d4047);
          background: var(--app-surface-2, rgba(125, 64, 71, 0.04));
          transform: translateY(-1px);
        }

        .discipline-option-card:active {
          transform: scale(0.995);
        }

        .discipline-option-card--active {
          border-color: var(--accent-primary, #7d4047) !important;
          background: var(--app-surface-2, rgba(125, 64, 71, 0.06)) !important;
          box-shadow: 0 0 0 1px var(--accent-primary, #7d4047), 0 2px 8px rgba(125, 64, 71, 0.12);
        }

        .discipline-icon-glyph {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--app-surface-2, #f6f3ee);
          border: 1px solid var(--app-border, rgba(46, 46, 46, 0.1));
          color: var(--accent-primary, #7d4047);
          flex-shrink: 0;
          transition: all 150ms var(--ease-standard);
        }

        .discipline-option-card--active .discipline-icon-glyph {
          background: var(--accent-primary, #7d4047);
          color: #ffffff;
          border-color: var(--accent-primary, #7d4047);
        }

        .selection-radio-dot {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 1.5px solid var(--app-border-strong, rgba(46, 46, 46, 0.3));
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 150ms var(--ease-standard);
        }

        .selection-radio-dot--active {
          border-color: var(--accent-primary, #7d4047);
          background: var(--accent-primary, #7d4047);
          box-shadow: 0 0 6px rgba(125, 64, 71, 0.35);
        }

        .selection-radio-dot__inner {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ffffff;
          animation: checkmarkPop 160ms var(--ease-standard);
        }

        .onboarding-form-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 24px;
          padding-top: 18px;
          border-top: 1px solid var(--app-border, rgba(46, 46, 46, 0.08));
        }

        .onboarding-primary-btn {
          padding: 10px 22px;
          font-size: 13.5px;
          font-weight: 600;
          border-radius: var(--radius-sm, 8px);
          border: none;
          background: var(--accent-primary, #7d4047);
          color: #ffffff;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 2px 8px rgba(125, 64, 71, 0.25);
          transition: background var(--duration-fast, 150ms) var(--ease-standard),
                      transform var(--duration-fast, 150ms) var(--ease-standard),
                      box-shadow var(--duration-fast, 150ms) var(--ease-standard);
        }

        .onboarding-primary-btn:hover {
          background: var(--accent-strong, #643138);
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(125, 64, 71, 0.35);
        }

        .onboarding-primary-btn:hover .arrow-icon {
          transform: translateX(3px);
        }

        .onboarding-primary-btn:active {
          transform: scale(0.98);
        }

        .arrow-icon {
          transition: transform 150ms var(--ease-standard);
        }

        .onboarding-mode-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          padding: 4px;
          border-radius: var(--radius-sm, 8px);
          background: var(--app-surface-2, #f6f3ee);
          border: 1px solid var(--app-border, rgba(46, 46, 46, 0.12));
          margin-bottom: 20px;
        }

        .onboarding-mode-tab {
          padding: 8px 12px;
          border: none;
          border-radius: 6px;
          background: transparent;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--app-text-secondary, rgba(46, 46, 46, 0.68));
          cursor: pointer;
          transition: all 150ms var(--ease-standard);
        }

        .onboarding-mode-tab--active {
          background: var(--app-surface-1, #ffffff);
          color: var(--app-text-primary, #2e2e2e);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
        }

        .onboarding-error-banner {
          margin: 16px 28px 0 28px;
          padding: 10px 14px;
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #dc2626;
          font-size: 12.5px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .onboarding-error-skip {
          background: none;
          border: none;
          color: #dc2626;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
          padding: 0;
        }
      `}</style>
    </div>
  );
}
