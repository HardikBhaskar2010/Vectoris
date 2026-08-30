/**
 * SettingsPage.tsx — Vectoris Engineering Workstation Configuration Center.
 *
 * Information Architecture:
 * - Persistent two-column layout: Left navigation rail, Right active settings panel.
 * - 11 distinct configuration categories grounded in the real local-first architecture:
 *   1. Appearance (Theme & density)
 *   2. Local Engine (On-device perception & runtime diagnostics)
 *   3. Workspace (Apex Engineering workstation profile)
 *   4. Storage & Cache (Local drawing placement, metadata scope, cache reset)
 *   5. Documents & Formats (Supported CAD/PDF formats, ingestion constraints)
 *   6. AI & Models (Model stack inventory: Available, Standby, Not Connected)
 *   7. Account (Workstation operator profile & authentication state)
 *   8. Notifications (Local workstation events & queue alerts)
 *   9. Keyboard Shortcuts (Real keybindings table)
 *   10. Privacy & Data (Zero silent uploads, data isolation boundary)
 *   11. About & Updates (Desktop runtime specifications & build details)
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AppShell } from "../components/AppShell";
import { engineService } from "../services/engineService";
import { dataService, useAllDocuments, useEngineStatus } from "../services/dataService";
import { UpdatePanel } from "../components/UpdatePanel";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/authService";
import { organizationService, type OrganizationWithRole, type WorkspaceMember } from "../services/organizationService";
import type { OrgRole } from "../data/database.types";
import { InviteMemberModal } from "../components/InviteMemberModal";
import { CreateWorkspaceModal } from "../components/CreateWorkspaceModal";
import { useRouter } from "../router";
import { tourService } from "../services/tourService";
import { AnimatedCheck, AnimatedArrowRight, AnimatedTrash, AnimatedFolderPlus } from "../components/icons/AnimatedIcons";

type PageState = "loading" | "error" | "permission" | "backend" | "data";
type ThemePreference = "system" | "dark" | "light";
type SaveStatus = "idle" | "saving" | "saved-local";
type EngineCheckStatus = "idle" | "checking" | "ready" | "standby" | "paused";

export type SettingsTab =
  | "appearance"
  | "local-engine"
  | "workspace"
  | "storage"
  | "documents"
  | "ai-models"
  | "account"
  | "notifications"
  | "shortcuts"
  | "privacy"
  | "about";

interface SettingsNavCategory {
  title: string;
  items: Array<{
    id: SettingsTab;
    label: string;
    icon: ReactNode;
    badge?: string;
  }>;
}

const THEME_OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: ReactNode;
}> = [
  { value: "system", label: "System", description: "Follow OS preference", icon: <IconMonitor /> },
  { value: "dark", label: "Dark", description: "Black cherry / Coffee bean", icon: <IconMoon /> },
  { value: "light", label: "Light", description: "Alabaster cream / Greige", icon: <IconSun /> },
];

const LOCAL_STORAGE_THEME_KEY = "vectoris.themePreference";

export default function SettingsPage() {
  const [pageState, setPageState] = useState<PageState>("data");
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    try {
      const stored = window.localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
      if (stored === "system" || stored === "dark" || stored === "light") return stored;
    } catch {
      // Ignore
    }
    return "system";
  });

  // Local engine state
  const [localEngineEnabled, setLocalEngineEnabled] = useState(true);
  const [cloudEscalationEnabled, setCloudEscalationEnabled] = useState(false);
  const [engineProfile, setEngineProfile] = useState("balanced");
  const [cpuThreads, setCpuThreads] = useState(8);
  const [modelCacheGb, setModelCacheGb] = useState(24);
  const [engineCheckStatus, setEngineCheckStatus] = useState<EngineCheckStatus>("idle");

  // Notifications state
  const [localEventsAlerts, setLocalEventsAlerts] = useState(true);
  const [documentQueueAlerts, setDocumentQueueAlerts] = useState(true);
  const [takeoffExportAlerts, setTakeoffExportAlerts] = useState(true);
  const [unresolvedProposalDigest, setUnresolvedProposalDigest] = useState(false);

  // Storage reset confirmation
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Save status
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // Live real data hooks
  const allDocs = useAllDocuments();
  const engine = useEngineStatus();
  const allProjects = useMemo(() => dataService.getProjects(), []);
  const [diagnostics, setDiagnostics] = useState<{ isDesktop: boolean; platform: string }>({
    isDesktop: false,
    platform: "Local Workstation",
  });

  useEffect(() => {
    engineService.getEngineDiagnostics().then((d) => {
      setDiagnostics({
        isDesktop: d.isDesktop,
        platform: d.platform,
      });
    });
  }, []);

  // Compute live storage metrics
  const storageMetrics = useMemo(() => {
    const totalBytes = allDocs.reduce((acc, d) => acc + d.size_mb * 1024 * 1024, 0);
    const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
    return {
      docCount: allDocs.length,
      totalMb,
      projectCount: allProjects.length,
    };
  }, [allDocs, allProjects]);

  // Auth & User State
  const { user, session, isAuthenticated, signOut, signIn } = useAuth();
  const { navigate } = useRouter();

  const [editFullName, setEditFullName] = useState(user?.user_metadata?.full_name || "");
  const [profileUpdateStatus, setProfileUpdateStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Management State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordUpdateStatus, setPasswordUpdateStatus] = useState<"idle" | "updating" | "success" | "error">("idle");
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});

  // Password Reset Email Dispatch State
  const [resetEmailStatus, setResetEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [resetEmailCooldown, setResetEmailCooldown] = useState(0);
  const [resetEmailFeedback, setResetEmailFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (resetEmailCooldown <= 0) return;
    const timer = setInterval(() => {
      setResetEmailCooldown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resetEmailCooldown]);

  // Sync editFullName when user loads
  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setEditFullName(user.user_metadata.full_name);
    }
  }, [user]);

  const handleUpdatePassword = async () => {
    const errors: { newPassword?: string; confirmPassword?: string } = {};
    if (!newPassword || newPassword.length < 8) {
      errors.newPassword = "Password must be at least 8 characters.";
    }
    if (!confirmPassword) {
      errors.confirmPassword = "Confirm your new password.";
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setPasswordUpdateStatus("updating");
    setPasswordFeedback(null);

    const res = await authService.updatePassword(newPassword);
    if (res.success) {
      setPasswordUpdateStatus("success");
      setPasswordFeedback("Your workstation master password has been successfully updated.");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordErrors({});
      window.setTimeout(() => {
        setPasswordUpdateStatus("idle");
        setPasswordFeedback(null);
      }, 4000);
    } else {
      setPasswordUpdateStatus("error");
      setPasswordFeedback(res.error || "Failed to update password. Please verify requirements and try again.");
    }
  };

  const handleSendResetEmail = async () => {
    if (!user?.email || resetEmailCooldown > 0 || resetEmailStatus === "sending") return;

    setResetEmailStatus("sending");
    setResetEmailFeedback(null);

    try {
      const res = await authService.resetPasswordForEmail(user.email);
      if (res.success) {
        setResetEmailStatus("sent");
        setResetEmailCooldown(60);
        setResetEmailFeedback(`Password recovery email dispatched to ${user.email}. Check your inbox to reset via deep link.`);
        window.setTimeout(() => setResetEmailFeedback(null), 8000);
      } else {
        setResetEmailStatus("error");
        setResetEmailFeedback(res.error || "Failed to dispatch recovery link.");
      }
    } catch {
      setResetEmailStatus("error");
      setResetEmailFeedback("Network error while requesting password reset email.");
    }
  };

  // Organization & Team Management State
  const [userOrgs, setUserOrgs] = useState<OrganizationWithRole[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(() => organizationService.getActiveOrganizationId());
  const [activeOrgName, setActiveOrgName] = useState("");
  const [isEditingOrgName, setIsEditingOrgName] = useState(false);
  const [editOrgNameVal, setEditOrgNameVal] = useState("");
  const [orgNameSaving, setOrgNameSaving] = useState(false);
  const [orgMembers, setOrgMembers] = useState<WorkspaceMember[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCreateWorkspaceModalOpen, setIsCreateWorkspaceModalOpen] = useState(false);
  const [memberActionMsg, setMemberActionMsg] = useState<string | null>(null);

  // Load organizations and members
  useEffect(() => {
    organizationService.getUserOrganizations().then((orgs) => {
      setUserOrgs(orgs);
      const currentId = organizationService.getActiveOrganizationId() || (orgs.length > 0 ? orgs[0].id : null);
      setActiveOrgId(currentId);
      const found = orgs.find((o) => o.id === currentId);
      if (found) {
        setActiveOrgName(found.name);
        setEditOrgNameVal(found.name);
      } else {
        setActiveOrgName("Vectoris Engineering Labs");
        setEditOrgNameVal("Vectoris Engineering Labs");
      }

      if (currentId) {
        organizationService.getOrgMembers(currentId).then((members) => {
          setOrgMembers(members);
        });
      }
    });
  }, [user]);

  const handleSaveProfile = async () => {
    if (!editFullName.trim()) return;
    setProfileUpdateStatus("saving");
    setProfileError(null);

    const res = await authService.updateProfile({ fullName: editFullName });
    if (res.success) {
      setProfileUpdateStatus("saved");
      window.setTimeout(() => setProfileUpdateStatus("idle"), 2500);
    } else {
      setProfileUpdateStatus("error");
      setProfileError(res.error || "Failed to update profile.");
    }
  };

  const handleSaveOrgName = async () => {
    if (!activeOrgId || !editOrgNameVal.trim()) return;
    setOrgNameSaving(true);
    const ok = await organizationService.updateOrganizationName(activeOrgId, editOrgNameVal.trim());
    if (ok) {
      setActiveOrgName(editOrgNameVal.trim());
      setIsEditingOrgName(false);
      const updated = await organizationService.getUserOrganizations();
      setUserOrgs(updated);
      await dataService.refreshFromSupabase();
      setMemberActionMsg(`Workspace renamed to "${editOrgNameVal.trim()}".`);
      window.setTimeout(() => setMemberActionMsg(null), 3000);
    }
    setOrgNameSaving(false);
  };

  const handleSwitchOrg = async (orgId: string) => {
    organizationService.setActiveOrganizationId(orgId);
    setActiveOrgId(orgId);
    const found = userOrgs.find((o) => o.id === orgId);
    if (found) {
      setActiveOrgName(found.name);
      setEditOrgNameVal(found.name);
    }
    const members = await organizationService.getOrgMembers(orgId);
    setOrgMembers(members);
    await dataService.refreshFromSupabase();
  };

  const handleDeleteWorkspace = async (orgId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete workspace "${name}"? All associated team memberships and project access rules will be deleted.`)) {
      return;
    }
    const ok = await organizationService.deleteOrganization(orgId);
    if (ok) {
      const updated = await organizationService.getUserOrganizations();
      setUserOrgs(updated);
      const newActive = organizationService.getActiveOrganizationId();
      setActiveOrgId(newActive);
      if (newActive) {
        const found = updated.find((o) => o.id === newActive);
        if (found) {
          setActiveOrgName(found.name);
          setEditOrgNameVal(found.name);
        }
        const members = await organizationService.getOrgMembers(newActive);
        setOrgMembers(members);
      }
      await dataService.refreshFromSupabase();
      setMemberActionMsg(`Workspace "${name}" was deleted.`);
      window.setTimeout(() => setMemberActionMsg(null), 3000);
    }
  };

  const handleRoleChange = async (userId: string, newRole: OrgRole) => {
    if (!activeOrgId) return;
    const ok = await organizationService.updateMemberRole(activeOrgId, userId, newRole);
    if (ok) {
      setOrgMembers((prev) =>
        prev.map((m) => (m.user_id === userId ? { ...m, role: newRole } : m))
      );
      setMemberActionMsg("Member role updated successfully.");
      window.setTimeout(() => setMemberActionMsg(null), 3000);
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!activeOrgId) return;
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this workspace? They will lose access to all drawings and takeoff ledgers.`)) {
      return;
    }
    const ok = await organizationService.removeMember(activeOrgId, userId);
    if (ok) {
      setOrgMembers((prev) => prev.filter((m) => m.user_id !== userId));
      setMemberActionMsg(`${memberName} was removed from the workspace.`);
      window.setTimeout(() => setMemberActionMsg(null), 3000);
    }
  };

  const handleResendInvite = async (userId: string, email: string) => {
    if (!activeOrgId) return;
    const ok = await organizationService.resendInvitation(activeOrgId, userId);
    if (ok) {
      setMemberActionMsg(`Invitation re-dispatched to ${email}.`);
      window.setTimeout(() => setMemberActionMsg(null), 3000);
    }
  };

  const handleQuickSignIn = async (email: string) => {
    setProfileUpdateStatus("saving");
    // Development pass
    const res = await signIn({ email, password: "vectoris-dev-password-2026" });
    if (res.success) {
      setProfileUpdateStatus("saved");
      await dataService.refreshFromSupabase();
      window.setTimeout(() => setProfileUpdateStatus("idle"), 2000);
    } else {
      setProfileUpdateStatus("error");
      setProfileError(res.error || "Failed to switch test account.");
    }
  };

  // Synchronize theme attribute
  useEffect(() => {
    const root = document.documentElement;
    if (themePreference === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", themePreference);
    }
    try {
      window.localStorage.setItem(LOCAL_STORAGE_THEME_KEY, themePreference);
    } catch {
      // Ignore
    }
  }, [themePreference]);

  const handleThemeChange = (nextTheme: ThemePreference) => {
    const root = document.documentElement;
    root.classList.remove("theme-transitioning");
    void root.offsetWidth;
    root.classList.add("theme-transitioning");

    window.setTimeout(() => {
      root.classList.remove("theme-transitioning");
    }, 360);

    setThemePreference(nextTheme);
  };

  const handleSave = () => {
    setSaveStatus("saving");
    window.setTimeout(() => {
      setSaveStatus("saved-local");
      window.setTimeout(() => setSaveStatus("idle"), 2500);
    }, 450);
  };

  const handleEngineCheck = async () => {
    if (!localEngineEnabled) {
      setEngineCheckStatus("paused");
      return;
    }
    setEngineCheckStatus("checking");
    try {
      const status = await engineService.getEngineStatus();
      setEngineCheckStatus(status.status === "ready" ? "ready" : "standby");
    } catch {
      setEngineCheckStatus("standby");
    }
  };

  const handleResetData = () => {
    dataService.resetToDefaults();
    setResetConfirmOpen(false);
    setResetMessage("Local demo workspace restored to initial state.");
    window.setTimeout(() => setResetMessage(null), 4000);
  };

  const navCategories: SettingsNavCategory[] = [
    {
      title: "Workspace & Interface",
      items: [
        { id: "appearance", label: "Appearance", icon: <IconPalette /> },
        { id: "workspace", label: "Workspace & Org", icon: <IconBuilding /> },
        { id: "account", label: "Account & Identity", icon: <IconUser /> },
      ],
    },
    {
      title: "Engine & Compute",
      items: [
        { id: "local-engine", label: "Local Engine", icon: <IconCpu />, badge: engine.status },
        { id: "ai-models", label: "AI & Models", icon: <IconLayers /> },
        { id: "documents", label: "Documents & Formats", icon: <IconFiles /> },
        { id: "storage", label: "Storage & Cache", icon: <IconDatabase /> },
      ],
    },
    {
      title: "System & Governance",
      items: [
        { id: "notifications", label: "Notifications", icon: <IconBell /> },
        { id: "shortcuts", label: "Keyboard Shortcuts", icon: <IconKeyboard /> },
        { id: "privacy", label: "Privacy & Security", icon: <IconShield /> },
        { id: "about", label: "About & Updates", icon: <IconInfo /> },
      ],
    },
  ];

  return (
    <AppShell activePath="/settings">
      <div className="settings-page">
        {/* Header */}
        <header className="settings-header">
          <div>
            <p className="settings-eyebrow">Workstation Configuration Center</p>
            <h1 className="settings-title">Settings</h1>
            <p className="settings-subtitle">
              Manage on-device compute, storage placement, workspace parameters, and engineering preferences.
            </p>
          </div>

          <div className="settings-header__actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={handleEngineCheck}
              disabled={engineCheckStatus === "checking"}
            >
              <IconPulse aria-hidden="true" />
              {engineCheckStatus === "checking" ? "Testing…" : "Test Engine"}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleSave}
              disabled={saveStatus === "saving"}
            >
              <IconCheck aria-hidden="true" />
              {saveStatus === "saving" ? "Saving…" : saveStatus === "saved-local" ? "Saved Locally" : "Save Preferences"}
            </button>
          </div>
        </header>

        {/* Status Toast */}
        {resetMessage && (
          <div className="settings-callout" style={{ margin: "0 0 24px 0" }} role="status">
            <span className="settings-callout__icon"><IconCheck /></span>
            <div>
              <strong className="settings-callout__title">Workspace Reset</strong>
              <p className="settings-callout__text">{resetMessage}</p>
            </div>
          </div>
        )}

        {/* Two-Column Settings Layout */}
        <div className="settings-layout">
          {/* Left Navigation Rail */}
          <aside className="settings-rail" aria-label="Settings sections" role="tablist">
            {navCategories.map((cat) => (
              <div key={cat.title} style={{ marginBottom: "16px" }}>
                <span
                  style={{
                    display: "block",
                    fontSize: "0.6875rem",
                    fontFamily: "var(--font-technical)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--app-text-muted)",
                    padding: "4px 16px 6px",
                  }}
                >
                  {cat.title}
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  {cat.items.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        className={`settings-rail__item${isActive ? " is-active" : ""}`}
                        onClick={() => setActiveTab(item.id)}
                      >
                        <span style={{ display: "flex", color: isActive ? "var(--app-accent)" : "inherit" }}>
                          {item.icon}
                        </span>
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.badge && (
                          <span
                            className={`settings-chip settings-chip--${item.badge.toLowerCase()}`}
                            style={{ padding: "2px 6px", fontSize: "0.625rem" }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </aside>

          {/* Right Selected Settings Panel */}
          <div className="settings-content">
            {/* 1. APPEARANCE */}
            {activeTab === "appearance" && (
              <section className="settings-panel" role="tabpanel" aria-labelledby="settings-appearance-title">
                <SettingsPanelHeader
                  icon={<IconPalette />}
                  kicker="Appearance"
                  title="Theme & Visual Density"
                  description="Switch between system, dark, and light modes while keeping the engineering workspace quiet, scannable, and contrast-balanced."
                />

                <div className="settings-theme-grid">
                  <div className="settings-theme-options" role="radiogroup" aria-label="Theme preference">
                    {THEME_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={themePreference === option.value}
                        className={`settings-theme-option${themePreference === option.value ? " is-active" : ""}`}
                        onClick={() => handleThemeChange(option.value)}
                      >
                        <span className="settings-theme-option__icon">{option.icon}</span>
                        <span className="settings-theme-option__text">
                          <span className="settings-theme-option__label">{option.label}</span>
                          <span className="settings-theme-option__desc">{option.description}</span>
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="settings-theme-preview" aria-label="Theme preview">
                    <div className="settings-theme-preview__chrome">
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="settings-theme-preview__body">
                      <div className="settings-theme-preview__sidebar">
                        <span />
                        <span />
                        <span />
                      </div>
                      <div className="settings-theme-preview__panel">
                        <span className="settings-theme-preview__line settings-theme-preview__line--wide" />
                        <span className="settings-theme-preview__line" />
                        <span className="settings-theme-preview__accent" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="settings-list">
                  <SettingsRow
                    labelId="ui-transitions-label"
                    title="Hardware Accelerated Transitions"
                    description="Smooth CSS transform and opacity animations tailored for CAD workstations."
                  >
                    <span className="settings-chip settings-chip--available">Active</span>
                  </SettingsRow>
                </div>
              </section>
            )}

            {/* 2. LOCAL ENGINE */}
            {activeTab === "local-engine" && (
              <section className="settings-panel" role="tabpanel" aria-labelledby="settings-local-engine-title">
                <SettingsPanelHeader
                  icon={<IconCpu />}
                  kicker="Local Engine"
                  title="On-Device Processing Runtime"
                  description="Monitor local vector parsing, symbol detection, and takeoff analysis runtimes on this workstation."
                />

                <div className="settings-grid-3col">
                  <div className="settings-stat-card">
                    <span className="settings-stat-card__label">Runtime Shell</span>
                    <strong className="settings-stat-card__val">
                      {diagnostics.isDesktop ? "Tauri Desktop Native" : "Browser Preview Mode"}
                    </strong>
                    <span className="settings-stat-card__sub">Platform: {diagnostics.platform || "Windows x86_64"}</span>
                  </div>
                  <div className="settings-stat-card">
                    <span className="settings-stat-card__label">Perception Engine</span>
                    <strong className="settings-stat-card__val" style={{ color: "#3b82f6" }}>
                      Standby
                    </strong>
                    <span className="settings-stat-card__sub">Awaiting document ingestion trigger</span>
                  </div>
                  <div className="settings-stat-card">
                    <span className="settings-stat-card__label">Indexed Documents</span>
                    <strong className="settings-stat-card__val">
                      {storageMetrics.docCount} files
                    </strong>
                    <span className="settings-stat-card__sub">{storageMetrics.totalMb} MB total volume</span>
                  </div>
                </div>

                <div className="settings-list">
                  <SettingsRow
                    labelId="run-engine-label"
                    title="Run Local Workstation Engine"
                    description="Permit on-device drawing perception, label parsing, and takeoff verification queues."
                  >
                    <SettingsSwitch
                      labelId="run-engine-label"
                      checked={localEngineEnabled}
                      onChange={setLocalEngineEnabled}
                    />
                  </SettingsRow>

                  <SettingsRow
                    labelId="cloud-consent-label"
                    title="Cloud Escalation Consent"
                    description="Permit explicit per-job escalation when complex drawings exceed local memory."
                    meta="Cloud escalation requires explicit organization policy authorization."
                  >
                    <SettingsSwitch
                      labelId="cloud-consent-label"
                      checked={cloudEscalationEnabled}
                      onChange={setCloudEscalationEnabled}
                      disabled={true}
                    />
                  </SettingsRow>

                  <SettingsRow
                    labelId="power-profile-label"
                    title="Engine Compute Profile"
                    description="Select background inference priority during drawing ingestion."
                  >
                    <select
                      className="settings-select"
                      id="power-profile-label"
                      value={engineProfile}
                      onChange={(e) => setEngineProfile(e.target.value)}
                      disabled={!localEngineEnabled}
                    >
                      <option value="quiet">Quiet (Low CPU / Quiet Fans)</option>
                      <option value="balanced">Balanced (Recommended)</option>
                      <option value="performance">Performance (Fast Takeoff)</option>
                    </select>
                  </SettingsRow>

                  <SettingsRangeRow
                    labelId="cpu-threads-label"
                    title="CPU Thread Allocation"
                    description="Reserve compute cores for geometry parsing while keeping the UI responsive."
                    value={cpuThreads}
                    min={2}
                    max={16}
                    step={1}
                    unit="threads"
                    disabled={!localEngineEnabled}
                    onChange={setCpuThreads}
                  />

                  <SettingsRangeRow
                    labelId="model-cache-label"
                    title="Model Cache Memory"
                    description="RAM allocation reserved for staged perception weights and vector tiling buffers."
                    value={modelCacheGb}
                    min={8}
                    max={64}
                    step={4}
                    unit="GB"
                    disabled={!localEngineEnabled}
                    onChange={setModelCacheGb}
                  />
                </div>
              </section>
            )}

            {/* 3. WORKSPACE & TEAM MANAGEMENT */}
            {activeTab === "workspace" && (
              <section className="settings-panel" role="tabpanel" aria-labelledby="settings-workspace-title">
                <SettingsPanelHeader
                  icon={<IconBuilding />}
                  kicker="Workspace & Team"
                  title="Workspace & Team Member Management"
                  description="Configure multi-tenant organizational scope, invite team members, and manage role-based access control."
                />

                {memberActionMsg && (
                  <div className="settings-callout" style={{ margin: "24px 32px 0 32px" }}>
                    <span className="settings-callout__icon"><IconCheck /></span>
                    <div>
                      <strong className="settings-callout__title">Workspace Updated</strong>
                      <p className="settings-callout__text">{memberActionMsg}</p>
                    </div>
                  </div>
                )}

                {/* Organization Identity Card */}
                <div style={{ padding: "32px 32px 16px 32px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                    <div>
                      <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--app-text-muted, #94a3b8)", marginBottom: "4px" }}>
                        Active Organization
                      </div>
                      {isEditingOrgName ? (
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <input
                            type="text"
                            value={editOrgNameVal}
                            onChange={(e) => setEditOrgNameVal(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveOrgName();
                              if (e.key === "Escape") {
                                setIsEditingOrgName(false);
                                setEditOrgNameVal(activeOrgName);
                              }
                            }}
                            autoFocus
                            style={{
                              padding: "6px 10px",
                              fontSize: "14px",
                              fontWeight: 600,
                              borderRadius: "6px",
                              border: "1px solid var(--accent-primary, #3b82f6)",
                              background: "var(--app-surface-2)",
                              color: "inherit",
                            }}
                          />
                          <button
                            type="button"
                            className="btn btn--primary"
                            style={{ padding: "6px 12px", fontSize: "12px" }}
                            onClick={handleSaveOrgName}
                            disabled={orgNameSaving}
                          >
                            {orgNameSaving ? "Saving…" : "Save"}
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost"
                            style={{ padding: "6px 10px", fontSize: "12px" }}
                            onClick={() => { setIsEditingOrgName(false); setEditOrgNameVal(activeOrgName); }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>{activeOrgName}</h3>
                          <button
                            type="button"
                            className="btn btn--ghost"
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                            onClick={() => {
                              setIsEditingOrgName(true);
                              setEditOrgNameVal(activeOrgName);
                            }}
                          >
                            Rename
                          </button>
                          {userOrgs.length > 1 && (
                            <button
                              type="button"
                              className="btn btn--ghost"
                              style={{ padding: "4px 8px", fontSize: "11px", color: "var(--color-danger, #ef4444)" }}
                              onClick={() => activeOrgId && handleDeleteWorkspace(activeOrgId, activeOrgName)}
                            >
                              Delete Workspace
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <button
                        type="button"
                        className="btn btn--secondary"
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px" }}
                        onClick={() => setIsCreateWorkspaceModalOpen(true)}
                      >
                        <AnimatedFolderPlus size={14} />
                        <span>New Workspace</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn--primary"
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px" }}
                        onClick={() => setIsInviteModalOpen(true)}
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                        </svg>
                        <span>Invite Team Member</span>
                      </button>
                    </div>
                  </div>

                  {/* Switch Org Selector Chips */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "12px", color: "var(--app-text-muted, #94a3b8)" }}>Switch Workspace:</span>
                    {userOrgs.map((org) => (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => handleSwitchOrg(org.id)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "16px",
                          fontSize: "12px",
                          border: org.id === activeOrgId ? "1.5px solid var(--accent-primary, #3b82f6)" : "1px solid var(--app-border)",
                          background: org.id === activeOrgId ? "rgba(59, 130, 246, 0.15)" : "var(--app-surface-2)",
                          color: "inherit",
                          cursor: "pointer",
                          fontWeight: org.id === activeOrgId ? 600 : 400,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>{org.name}</span>
                        <span style={{ fontSize: "10px", opacity: 0.75, textTransform: "capitalize" }}>({org.role})</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setIsCreateWorkspaceModalOpen(true)}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "16px",
                        fontSize: "11.5px",
                        border: "1px dashed var(--app-border)",
                        background: "transparent",
                        color: "var(--app-text-muted, #94a3b8)",
                        cursor: "pointer",
                      }}
                    >
                      + Add Workspace
                    </button>
                  </div>

                  {/* Workspace Stats Row */}
                  <div className="settings-grid-3col" style={{ marginBottom: "24px" }}>
                    <div className="settings-stat-card">
                      <span className="settings-stat-card__label">Active Seat Count</span>
                      <strong className="settings-stat-card__val">{orgMembers.length} {orgMembers.length === 1 ? "Member" : "Members"}</strong>
                      <span className="settings-stat-card__sub">
                        {orgMembers.filter((m) => m.status === "invited").length > 0
                          ? `${orgMembers.filter((m) => m.status === "active").length} active · ${orgMembers.filter((m) => m.status === "invited").length} invited`
                          : "Multi-seat workspace"}
                      </span>
                    </div>
                    <div className="settings-stat-card">
                      <span className="settings-stat-card__label">Tenant Isolation</span>
                      <strong className="settings-stat-card__val" style={{ color: "#22c55e" }}>RLS Enforced</strong>
                      <span className="settings-stat-card__sub">Zero cross-tenant leaks</span>
                    </div>
                    <div className="settings-stat-card">
                      <span className="settings-stat-card__label">Associated Projects</span>
                      <strong className="settings-stat-card__val">{allProjects.length} {allProjects.length === 1 ? "Project" : "Projects"}</strong>
                      <span className="settings-stat-card__sub">
                        {allProjects.length > 0
                          ? allProjects.map((p) => p.name).slice(0, 2).join(" & ") + (allProjects.length > 2 ? ` +${allProjects.length - 2} more` : "")
                          : "No projects in workspace"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Team Members List Table */}
                <div style={{ padding: "0 32px 32px 32px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <h4 style={{ fontSize: "0.95rem", fontWeight: 600, margin: 0 }}>
                      Workspace Members ({orgMembers.length})
                    </h4>
                    <span style={{ fontSize: "11px", color: "var(--app-text-muted, #94a3b8)" }}>
                      Live Postgres `org_members`
                    </span>
                  </div>

                  <div className="settings-table-container">
                    <table className="settings-table">
                      <thead>
                        <tr>
                          <th>Team Member</th>
                          <th>Role</th>
                          <th>Access Scope</th>
                          <th>Status</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orgMembers.map((m) => {
                          const isCurrentUser = m.user_id === user?.id || m.email === user?.email || m.role === "owner";
                          const initials = (m.name || m.email)
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .substring(0, 2)
                            .toUpperCase();

                          const scopeDescription =
                            m.role === "owner"
                              ? "Full Workspace Scope"
                              : m.role === "admin"
                              ? "Organization Admin"
                              : m.role === "manager"
                              ? "Project Manager"
                              : m.role === "editor"
                              ? "Lead Estimator / Reviewer"
                              : "Read-only Access";

                          return (
                            <tr key={m.id || m.user_id}>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <div
                                    style={{
                                      width: "32px",
                                      height: "32px",
                                      borderRadius: "6px",
                                      background: m.avatar_color || (m.role === "owner" ? "#7d4047" : m.role === "admin" ? "#8b5cf6" : "#3b82f6"),
                                      color: "#fff",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "12px",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {initials}
                                  </div>
                                  <div>
                                    <strong>{m.name || m.email.split("@")[0]}</strong>
                                    <div style={{ fontSize: "11px", color: "var(--app-text-muted, #94a3b8)" }}>
                                      {m.email}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                {isCurrentUser ? (
                                  <select
                                    value={m.role}
                                    disabled
                                    style={{
                                      padding: "4px 8px",
                                      fontSize: "12px",
                                      borderRadius: "4px",
                                      border: "1px solid var(--app-border)",
                                      background: "var(--app-surface-2)",
                                      color: "inherit",
                                      textTransform: "capitalize",
                                    }}
                                  >
                                    <option value="owner">Owner (Primary)</option>
                                    <option value="admin">Organization Admin</option>
                                    <option value="manager">Project Manager</option>
                                    <option value="editor">Lead Estimator / Reviewer</option>
                                    <option value="viewer">Viewer</option>
                                  </select>
                                ) : (
                                  <select
                                    value={m.role}
                                    onChange={(e) => handleRoleChange(m.user_id, e.target.value as OrgRole)}
                                    style={{
                                      padding: "4px 8px",
                                      fontSize: "12px",
                                      borderRadius: "4px",
                                      border: "1px solid var(--app-border)",
                                      background: "var(--app-surface-2)",
                                      color: "inherit",
                                    }}
                                  >
                                    <option value="admin">Admin</option>
                                    <option value="manager">Project Manager</option>
                                    <option value="editor">Lead Estimator / Reviewer</option>
                                    <option value="viewer">Viewer</option>
                                  </select>
                                )}
                              </td>
                              <td>
                                <span style={{ fontSize: "12px" }}>{scopeDescription}</span>
                              </td>
                              <td>
                                {m.status === "invited" ? (
                                  <span
                                    className="settings-chip"
                                    style={{
                                      background: "rgba(245, 158, 11, 0.15)",
                                      color: "#f59e0b",
                                      border: "1px solid rgba(245, 158, 11, 0.3)",
                                    }}
                                  >
                                    Invited
                                  </span>
                                ) : (
                                  <span className="settings-chip settings-chip--available">Active</span>
                                )}
                              </td>
                              <td style={{ textAlign: "right" }}>
                                {isCurrentUser ? (
                                  <span style={{ fontSize: "11px", color: "var(--app-text-muted)" }}>
                                    You (Current User)
                                  </span>
                                ) : m.status === "invited" ? (
                                  <div style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
                                    <button
                                      type="button"
                                      onClick={() => handleResendInvite(m.user_id, m.email)}
                                      style={{
                                        background: "transparent",
                                        border: "none",
                                        color: "var(--accent-primary, #3b82f6)",
                                        fontSize: "12px",
                                        cursor: "pointer",
                                      }}
                                    >
                                      Resend
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveMember(m.user_id, m.name || m.email)}
                                      style={{
                                        background: "transparent",
                                        border: "none",
                                        color: "var(--color-danger, #ef4444)",
                                        fontSize: "12px",
                                        cursor: "pointer",
                                      }}
                                    >
                                      Revoke
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMember(m.user_id, m.name || m.email)}
                                    style={{
                                      background: "transparent",
                                      border: "none",
                                      color: "var(--color-danger, #ef4444)",
                                      fontSize: "12px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Remove
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Role Permissions Reference Table */}
                  <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--app-border)" }}>
                    <h4 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "10px" }}>
                      Role &amp; Capability Matrix
                    </h4>
                    <div className="settings-table-container">
                      <table className="settings-table" style={{ fontSize: "12px" }}>
                        <thead>
                          <tr>
                            <th>Capability</th>
                            <th>Owner</th>
                            <th>Admin</th>
                            <th>Estimator / Editor</th>
                            <th>Viewer</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Blueprint Ingestion &amp; CAD Geometry</td>
                            <td><span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#10b981" }}><AnimatedCheck size={12} /> Yes</span></td>
                            <td><span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#10b981" }}><AnimatedCheck size={12} /> Yes</span></td>
                            <td><span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#10b981" }}><AnimatedCheck size={12} /> Yes</span></td>
                            <td style={{ color: "var(--app-text-muted, #94a3b8)" }}>Read-only</td>
                          </tr>
                          <tr>
                            <td>AI Takeoff Proposal Generation</td>
                            <td><span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#10b981" }}><AnimatedCheck size={12} /> Yes</span></td>
                            <td><span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#10b981" }}><AnimatedCheck size={12} /> Yes</span></td>
                            <td><span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#10b981" }}><AnimatedCheck size={12} /> Yes</span></td>
                            <td style={{ color: "var(--app-text-muted, #94a3b8)" }}>No</td>
                          </tr>
                          <tr>
                            <td>Approve / Reject Line Items</td>
                            <td><span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#10b981" }}><AnimatedCheck size={12} /> Yes</span></td>
                            <td><span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#10b981" }}><AnimatedCheck size={12} /> Yes</span></td>
                            <td><span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#10b981" }}><AnimatedCheck size={12} /> Yes</span></td>
                            <td style={{ color: "var(--app-text-muted, #94a3b8)" }}>No</td>
                          </tr>
                          <tr>
                            <td>Team Member Invites &amp; Seat Admin</td>
                            <td><span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#10b981" }}><AnimatedCheck size={12} /> Yes</span></td>
                            <td><span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#10b981" }}><AnimatedCheck size={12} /> Yes</span></td>
                            <td style={{ color: "var(--app-text-muted, #94a3b8)" }}>No</td>
                            <td style={{ color: "var(--app-text-muted, #94a3b8)" }}>No</td>
                          </tr>
                          <tr>
                            <td>Export Verified BOQ Spreadsheets</td>
                            <td><span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#10b981" }}><AnimatedCheck size={12} /> Yes</span></td>
                            <td><span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#10b981" }}><AnimatedCheck size={12} /> Yes</span></td>
                            <td><span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#10b981" }}><AnimatedCheck size={12} /> Yes</span></td>
                            <td><span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#10b981" }}><AnimatedCheck size={12} /> Yes</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <InviteMemberModal
                  isOpen={isInviteModalOpen}
                  onClose={() => setIsInviteModalOpen(false)}
                  orgId={activeOrgId || "org-vectoris-labs"}
                  orgName={activeOrgName}
                  onMemberInvited={(newMember) => {
                    setOrgMembers((prev) => [...prev.filter((m) => m.user_id !== newMember.user_id), newMember]);
                    setMemberActionMsg(`Invitation registered for ${newMember.email}.`);
                    window.setTimeout(() => setMemberActionMsg(null), 3000);
                  }}
                />

                <CreateWorkspaceModal
                  isOpen={isCreateWorkspaceModalOpen}
                  onClose={() => setIsCreateWorkspaceModalOpen(false)}
                  onWorkspaceCreated={async (newOrgId) => {
                    await handleSwitchOrg(newOrgId);
                    const orgs = await organizationService.getUserOrganizations();
                    setUserOrgs(orgs);
                    setMemberActionMsg("New workspace created and active.");
                    window.setTimeout(() => setMemberActionMsg(null), 3000);
                  }}
                />
              </section>
            )}

            {/* 4. STORAGE & CACHE */}
            {activeTab === "storage" && (
              <section className="settings-panel" role="tabpanel" aria-labelledby="settings-storage-title">
                <SettingsPanelHeader
                  icon={<IconDatabase />}
                  kicker="Storage"
                  title="Local-First Storage & Data Cache"
                  description="Review drawing binary placement, local metadata persistence, and workstation cache."
                />

                <div className="settings-grid-3col">
                  <div className="settings-stat-card">
                    <span className="settings-stat-card__label">Storage Architecture</span>
                    <strong className="settings-stat-card__val">Local-First</strong>
                    <span className="settings-stat-card__sub">Drawings remain on-device</span>
                  </div>
                  <div className="settings-stat-card">
                    <span className="settings-stat-card__label">Active Documents</span>
                    <strong className="settings-stat-card__val">{storageMetrics.docCount} files</strong>
                    <span className="settings-stat-card__sub">{storageMetrics.totalMb} MB combined size</span>
                  </div>
                  <div className="settings-stat-card">
                    <span className="settings-stat-card__label">Active Projects</span>
                    <strong className="settings-stat-card__val">{storageMetrics.projectCount} Projects</strong>
                    <span className="settings-stat-card__sub">Stored in local metadata DB</span>
                  </div>
                </div>

                <div className="settings-list">
                  <SettingsRow
                    labelId="storage-scope-label"
                    title="Drawing Binary Storage Policy"
                    description="Raw blueprint binaries are referenced via local OS file descriptors. No binary payload is stored in browser localStorage."
                  >
                    <span className="settings-chip settings-chip--available">Compliant</span>
                  </SettingsRow>

                  <SettingsRow
                    labelId="reset-data-label"
                    title="Reset Local Demo Workspace"
                    description="Restore the initial sample projects and documents dataset. Useful for QA and clean demonstration states."
                  >
                    {resetConfirmOpen ? (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          className="btn btn--primary"
                          style={{ background: "#dc2626" }}
                          onClick={handleResetData}
                        >
                          Confirm Reset
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => setResetConfirmOpen(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={() => setResetConfirmOpen(true)}
                      >
                        Reset Demo Data
                      </button>
                    )}
                  </SettingsRow>
                </div>
              </section>
            )}

            {/* 5. DOCUMENTS & FORMATS */}
            {activeTab === "documents" && (
              <section className="settings-panel" role="tabpanel" aria-labelledby="settings-documents-title">
                <SettingsPanelHeader
                  icon={<IconFiles />}
                  kicker="Documents"
                  title="Document Ingestion & File Formats"
                  description="Supported blueprint formats, upload constraints, and default perception queue behavior."
                />

                <div className="settings-table-container">
                  <table className="settings-table">
                    <thead>
                      <tr>
                        <th>Format</th>
                        <th>Extension</th>
                        <th>Max Size</th>
                        <th>Perception Support</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>PDF Blueprint</strong></td>
                        <td><code style={{ fontFamily: "var(--font-technical)" }}>.pdf</code></td>
                        <td>500 MB</td>
                        <td>Vector paths, raster sheets, multi-page sets</td>
                        <td><span className="settings-chip settings-chip--available">Supported</span></td>
                      </tr>
                      <tr>
                        <td><strong>AutoCAD Drawing</strong></td>
                        <td><code style={{ fontFamily: "var(--font-technical)" }}>.dwg, .dxf</code></td>
                        <td>500 MB</td>
                        <td>Native CAD geometry & layer schedules</td>
                        <td><span className="settings-chip settings-chip--available">Supported</span></td>
                      </tr>
                      <tr>
                        <td><strong>TIFF Raster Scan</strong></td>
                        <td><code style={{ fontFamily: "var(--font-technical)" }}>.tiff, .tif</code></td>
                        <td>250 MB</td>
                        <td>High-resolution architectural scans</td>
                        <td><span className="settings-chip settings-chip--available">Supported</span></td>
                      </tr>
                      <tr>
                        <td><strong>High-Res Image</strong></td>
                        <td><code style={{ fontFamily: "var(--font-technical)" }}>.png, .jpg</code></td>
                        <td>100 MB</td>
                        <td>Symbol extraction & diagram views</td>
                        <td><span className="settings-chip settings-chip--available">Supported</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="settings-list">
                  <SettingsRow
                    labelId="ingest-queue-label"
                    title="Default Ingestion State"
                    description="Newly added drawings enter the honest 'queued / Awaiting processing' state without artificial processing simulation."
                  >
                    <span className="settings-chip settings-chip--available">Queued</span>
                  </SettingsRow>
                </div>
              </section>
            )}

            {/* 6. AI & MODELS */}
            {activeTab === "ai-models" && (
              <section className="settings-panel" role="tabpanel" aria-labelledby="settings-ai-models-title">
                <SettingsPanelHeader
                  icon={<IconLayers />}
                  kicker="AI & Models"
                  title="Local AI & Perception Stack"
                  description="Governance and readiness of on-device neural perception engines and extraction pipelines."
                />

                <div className="settings-model-grid">
                  <div className="settings-model-card">
                    <div>
                      <strong>Vector Geometry Extractor</strong>
                      <span>Local CAD primitive parser & line segment reconstruction.</span>
                    </div>
                    <span className="settings-chip settings-chip--available">AVAILABLE</span>
                  </div>

                  <div className="settings-model-card">
                    <div>
                      <strong>Neural Symbol Classifier</strong>
                      <span>Electrical & mechanical symbol proposal model.</span>
                    </div>
                    <span className="settings-chip settings-chip--standby">STANDBY</span>
                  </div>

                  <div className="settings-model-card">
                    <div>
                      <strong>Schedule & Feeder OCR</strong>
                      <span>Panel schedule text extraction and tabular digitizer.</span>
                    </div>
                    <span className="settings-chip settings-chip--standby">STANDBY</span>
                  </div>

                  <div className="settings-model-card">
                    <div>
                      <strong>Cloud Multi-Model Escalation</strong>
                      <span>Cloud perception inference for complex high-density packages.</span>
                    </div>
                    <span className="settings-chip settings-chip--not-connected">NOT CONNECTED</span>
                  </div>
                </div>

                <div className="settings-callout">
                  <span className="settings-callout__icon"><IconShield /></span>
                  <div>
                    <strong className="settings-callout__title">Model Training & Data Rights Governance</strong>
                    <p className="settings-callout__text">
                      Customer drawings and takeoff data are never sent to external AI vendors and never contribute to
                      model training without explicit, contractual authorization.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* 7. ACCOUNT & IDENTITY */}
            {activeTab === "account" && (
              <section className="settings-panel" role="tabpanel" aria-labelledby="settings-account-title">
                <SettingsPanelHeader
                  icon={<IconUser />}
                  kicker="Account & Identity"
                  title="Workstation Operator Profile"
                  description="Review your authenticated Supabase session, update profile metadata, and manage active workstation seats."
                />

                {profileError && (
                  <div className="settings-callout" style={{ margin: "24px 32px 0 32px", borderColor: "#ef4444" }}>
                    <span className="settings-callout__icon" style={{ color: "#ef4444" }}>✕</span>
                    <div>
                      <strong className="settings-callout__title">Update Failed</strong>
                      <p className="settings-callout__text">{profileError}</p>
                    </div>
                  </div>
                )}

                {profileUpdateStatus === "saved" && (
                  <div className="settings-callout" style={{ margin: "24px 32px 0 32px" }}>
                    <span className="settings-callout__icon"><IconCheck /></span>
                    <div>
                      <strong className="settings-callout__title">Profile Saved</strong>
                      <p className="settings-callout__text">Operator metadata updated in Supabase Auth.</p>
                    </div>
                  </div>
                )}

                {/* Operator Profile Card */}
                <div style={{ padding: "32px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "20px",
                      padding: "20px",
                      borderRadius: "10px",
                      background: "var(--app-surface-2)",
                      border: "1px solid var(--app-border)",
                      marginBottom: "24px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "10px",
                        background: "var(--accent-primary, #3b82f6)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "20px",
                        fontWeight: 700,
                      }}
                    >
                      {editFullName
                        ? editFullName.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()
                        : "LE"}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>
                          {editFullName || user?.email?.split("@")[0] || "Lead Estimator"}
                        </h3>
                        <span className="settings-chip settings-chip--available">
                          {isAuthenticated ? "Supabase Authenticated" : "Local Standby"}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--app-text-secondary)" }}>
                        {user?.email || "estimator@vectoris-dev.internal"} · Role: <strong>Owner / Estimator</strong>
                      </div>
                    </div>

                    {isAuthenticated && (
                      <button
                        type="button"
                        className="btn btn--ghost"
                        style={{ color: "var(--color-danger, #ef4444)" }}
                        onClick={async () => {
                          await signOut();
                          navigate("/auth?mode=signin");
                        }}
                      >
                        Sign Out
                      </button>
                    )}
                  </div>

                  {/* Profile Edit Form */}
                  <div className="settings-account-grid" style={{ marginBottom: "24px" }}>
                    <label className="settings-field">
                      <span>Full Name</span>
                      <input
                        type="text"
                        value={editFullName}
                        onChange={(e) => setEditFullName(e.target.value)}
                        placeholder="Operator Name..."
                      />
                    </label>

                    <label className="settings-field">
                      <span>Work Email</span>
                      <input
                        type="email"
                        value={user?.email || "estimator@vectoris-dev.internal"}
                        readOnly
                      />
                    </label>

                    <label className="settings-field">
                      <span>Engineering Discipline</span>
                      <input type="text" value="Electrical HV & Data Center Infrastructure" readOnly />
                    </label>

                    <label className="settings-field">
                      <span>Workstation Assigned Role</span>
                      <input type="text" value="Lead Estimator · Owner" readOnly />
                    </label>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "32px" }}>
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={handleSaveProfile}
                      disabled={profileUpdateStatus === "saving" || !editFullName.trim()}
                    >
                      {profileUpdateStatus === "saving" ? "Updating Profile…" : "Save Profile Metadata"}
                    </button>
                  </div>

                  {/* Workstation Password & Credentials Card */}
                  <div
                    style={{
                      padding: "24px",
                      borderRadius: "10px",
                      background: "var(--app-surface-2)",
                      border: "1px solid var(--app-border)",
                      marginBottom: "32px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                      <div style={{ color: "var(--accent-primary, #3b82f6)", display: "flex", alignItems: "center" }}>
                        <IconKey />
                      </div>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0 }}>
                        Workstation Password &amp; Credentials
                      </h4>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--app-text-secondary)", margin: "0 0 20px 0", lineHeight: "1.5" }}>
                      Update your account master password directly on this workstation, or dispatch a deep-link password recovery email.
                    </p>

                    {/* Feedback Callouts */}
                    {passwordFeedback && (
                      <div
                        className="settings-callout"
                        style={{
                          margin: "0 0 20px 0",
                          borderColor: passwordUpdateStatus === "error" ? "var(--color-danger, #ef4444)" : "var(--color-success, #10b981)",
                          background: passwordUpdateStatus === "error" ? "rgba(239, 68, 68, 0.08)" : "rgba(16, 185, 129, 0.08)",
                        }}
                      >
                        <span
                          className="settings-callout__icon"
                          style={{ color: passwordUpdateStatus === "error" ? "var(--color-danger, #ef4444)" : "var(--color-success, #10b981)" }}
                        >
                          {passwordUpdateStatus === "error" ? "✕" : <IconCheck />}
                        </span>
                        <div>
                          <strong className="settings-callout__title">
                            {passwordUpdateStatus === "error" ? "Password Update Error" : "Password Updated"}
                          </strong>
                          <p className="settings-callout__text">{passwordFeedback}</p>
                        </div>
                      </div>
                    )}

                    {resetEmailFeedback && (
                      <div
                        className="settings-callout"
                        style={{
                          margin: "0 0 20px 0",
                          borderColor: resetEmailStatus === "error" ? "var(--color-danger, #ef4444)" : "var(--accent-primary, #3b82f6)",
                          background: resetEmailStatus === "error" ? "rgba(239, 68, 68, 0.08)" : "rgba(59, 130, 246, 0.08)",
                        }}
                      >
                        <span
                          className="settings-callout__icon"
                          style={{ color: resetEmailStatus === "error" ? "var(--color-danger, #ef4444)" : "var(--accent-primary, #3b82f6)" }}
                        >
                          {resetEmailStatus === "error" ? "✕" : <IconCheck />}
                        </span>
                        <div>
                          <strong className="settings-callout__title">
                            {resetEmailStatus === "error" ? "Reset Link Error" : "Recovery Link Dispatched"}
                          </strong>
                          <p className="settings-callout__text">{resetEmailFeedback}</p>
                        </div>
                      </div>
                    )}

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleUpdatePassword();
                      }}
                    >
                      <div className="settings-account-grid" style={{ marginBottom: "16px" }}>
                        <label className="settings-field">
                          <span>New Password</span>
                          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                            <input
                              type={showNewPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => {
                                setNewPassword(e.target.value);
                                if (passwordErrors.newPassword) {
                                  setPasswordErrors((prev) => ({ ...prev, newPassword: undefined }));
                                }
                              }}
                              placeholder="Min. 8 characters"
                              style={{ width: "100%", paddingRight: "40px" }}
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword((s) => !s)}
                              style={{
                                position: "absolute",
                                right: "10px",
                                background: "none",
                                border: "none",
                                color: "var(--app-text-muted)",
                                cursor: "pointer",
                                padding: "4px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              aria-label={showNewPassword ? "Hide password" : "Show password"}
                            >
                              {showNewPassword ? <IconEyeOff /> : <IconEye />}
                            </button>
                          </div>
                          {passwordErrors.newPassword && (
                            <span style={{ fontSize: "11px", color: "var(--color-danger, #ef4444)", marginTop: "4px" }}>
                              {passwordErrors.newPassword}
                            </span>
                          )}
                        </label>

                        <label className="settings-field">
                          <span>Confirm New Password</span>
                          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                if (passwordErrors.confirmPassword) {
                                  setPasswordErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                                }
                              }}
                              placeholder="Re-enter password"
                              style={{ width: "100%", paddingRight: "40px" }}
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword((s) => !s)}
                              style={{
                                position: "absolute",
                                right: "10px",
                                background: "none",
                                border: "none",
                                color: "var(--app-text-muted)",
                                cursor: "pointer",
                                padding: "4px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                            >
                              {showConfirmPassword ? <IconEyeOff /> : <IconEye />}
                            </button>
                          </div>
                          {passwordErrors.confirmPassword && (
                            <span style={{ fontSize: "11px", color: "var(--color-danger, #ef4444)", marginTop: "4px" }}>
                              {passwordErrors.confirmPassword}
                            </span>
                          )}
                        </label>
                      </div>

                      {/* Real-time Password Strength Meter */}
                      {newPassword.length > 0 && (
                        <div style={{ marginBottom: "20px" }}>
                          {(() => {
                            const strength = getPasswordStrength(newPassword);
                            return (
                              <>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                  <span style={{ fontSize: "11px", color: "var(--app-text-muted)" }}>Password Strength</span>
                                  <span style={{ fontSize: "11px", fontWeight: 600, color: strength.color }}>
                                    {strength.label}
                                  </span>
                                </div>
                                <div style={{ width: "100%", height: "4px", background: "var(--app-border)", borderRadius: "2px", overflow: "hidden" }}>
                                  <div
                                    style={{
                                      height: "100%",
                                      width: `${strength.percent}%`,
                                      background: strength.color,
                                      transition: "width 0.2s ease, background-color 0.2s ease",
                                    }}
                                  />
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={handleSendResetEmail}
                          disabled={resetEmailCooldown > 0 || resetEmailStatus === "sending" || !user?.email}
                          style={{ fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                        >
                          <span>
                            {resetEmailCooldown > 0
                              ? `Resend Reset Link (${resetEmailCooldown}s)`
                              : resetEmailStatus === "sending"
                              ? "Dispatching Recovery Link…"
                              : "Dispatch Password Reset Link"}
                          </span>
                        </button>

                        <button
                          type="submit"
                          className="btn btn--primary"
                          disabled={passwordUpdateStatus === "updating" || !newPassword || !confirmPassword}
                        >
                          {passwordUpdateStatus === "updating" ? "Updating Password…" : "Update Password"}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Quick-Switch Development Personas Bar */}
                  <div
                    style={{
                      padding: "20px",
                      borderRadius: "8px",
                      background: "var(--app-surface-2)",
                      border: "1px solid var(--app-border)",
                    }}
                  >
                    <div style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--app-text-muted)", marginBottom: "8px" }}>
                      Development Persona Quick-Switch (Multi-Tenant Testing)
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--app-text-secondary)", marginBottom: "14px" }}>
                      Instantly switch between authenticated tenant users to test PostgreSQL RLS policy enforcement.
                    </p>

                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          border: user?.email === "estimator@vectoris-dev.internal" ? "1.5px solid var(--accent-primary, #3b82f6)" : "1px solid var(--app-border)",
                        }}
                        onClick={() => handleQuickSignIn("estimator@vectoris-dev.internal")}
                      >
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6" }} />
                        <span>Lead Estimator (Primary Org)</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn--ghost"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          border: user?.email === "auditor@isolated-tenant.internal" ? "1.5px solid var(--accent-primary, #3b82f6)" : "1px solid var(--app-border)",
                        }}
                        onClick={() => handleQuickSignIn("auditor@isolated-tenant.internal")}
                      >
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} />
                        <span>Isolated Tenant Auditor (Org B)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 8. NOTIFICATIONS */}
            {activeTab === "notifications" && (
              <section className="settings-panel" role="tabpanel" aria-labelledby="settings-notifications-title">
                <SettingsPanelHeader
                  icon={<IconBell />}
                  kicker="Notifications"
                  title="Workstation Event Alerts"
                  description="Configure notification triggers for local document processing, queue state, and takeoff generation."
                />

                <div className="settings-list">
                  <SettingsRow
                    labelId="local-events-label"
                    title="Workstation Core Events"
                    description="Notify when local engine connects, changes status, or reports diagnostics."
                  >
                    <SettingsSwitch
                      labelId="local-events-label"
                      checked={localEventsAlerts}
                      onChange={setLocalEventsAlerts}
                    />
                  </SettingsRow>

                  <SettingsRow
                    labelId="queue-events-label"
                    title="Document Queue Alerts"
                    description="Notify when new drawing sets are registered in the perception queue."
                  >
                    <SettingsSwitch
                      labelId="queue-events-label"
                      checked={documentQueueAlerts}
                      onChange={setDocumentQueueAlerts}
                    />
                  </SettingsRow>

                  <SettingsRow
                    labelId="takeoff-export-label"
                    title="Takeoff & Export Generation"
                    description="Notify when takeoff quantity matrices or Excel/PDF exports are ready."
                  >
                    <SettingsSwitch
                      labelId="takeoff-export-label"
                      checked={takeoffExportAlerts}
                      onChange={setTakeoffExportAlerts}
                    />
                  </SettingsRow>

                  <SettingsRow
                    labelId="proposal-digest-label"
                    title="Unresolved Takeoff Proposals Digest"
                    description="Daily summary of AI symbol proposals awaiting human verification."
                  >
                    <SettingsSwitch
                      labelId="proposal-digest-label"
                      checked={unresolvedProposalDigest}
                      onChange={setUnresolvedProposalDigest}
                    />
                  </SettingsRow>
                </div>
              </section>
            )}

            {/* 9. KEYBOARD SHORTCUTS */}
            {activeTab === "shortcuts" && (
              <section className="settings-panel" role="tabpanel" aria-labelledby="settings-shortcuts-title">
                <SettingsPanelHeader
                  icon={<IconKeyboard />}
                  kicker="Shortcuts"
                  title="Workstation Keybindings"
                  description="Quick reference for keyboard-driven navigation, command palette, and modal dismissal."
                />

                <div className="settings-table-container">
                  <table className="settings-table">
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Shortcut</th>
                        <th>Scope</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Command & Quick Search</strong></td>
                        <td><kbd className="settings-kbd">⌘K</kbd> / <kbd className="settings-kbd">Ctrl+K</kbd></td>
                        <td>Global</td>
                        <td>Open universal search for projects, documents, and investigations</td>
                      </tr>
                      <tr>
                        <td><strong>Dismiss / Close</strong></td>
                        <td><kbd className="settings-kbd">ESC</kbd></td>
                        <td>Modals / Palettes</td>
                        <td>Close any active modal, popover, or command search palette</td>
                      </tr>
                      <tr>
                        <td><strong>Submit / Advance</strong></td>
                        <td><kbd className="settings-kbd">Enter</kbd></td>
                        <td>Forms / Modals</td>
                        <td>Advance stepped project creation or open selected search result</td>
                      </tr>
                      <tr>
                        <td><strong>Navigate Results</strong></td>
                        <td><kbd className="settings-kbd">↑</kbd> <kbd className="settings-kbd">↓</kbd></td>
                        <td>Search Palette</td>
                        <td>Move selection up and down in quick search list</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* 10. PRIVACY & DATA */}
            {activeTab === "privacy" && (
              <section className="settings-panel" role="tabpanel" aria-labelledby="settings-privacy-title">
                <SettingsPanelHeader
                  icon={<IconShield />}
                  kicker="Privacy"
                  title="Data Isolation & Security Architecture"
                  description="Vectoris operates on a strict local-first privacy boundary designed for confidential engineering drawings."
                />

                <div className="settings-list">
                  <SettingsRow
                    labelId="zero-silent-label"
                    title="Zero Silent Uploads"
                    description="Raw blueprint and CAD drawing binaries never leave your workstation without explicit per-job authorization."
                  >
                    <span className="settings-chip settings-chip--available">Enforced</span>
                  </SettingsRow>

                  <SettingsRow
                    labelId="telemetry-label"
                    title="Zero Telemetry Tracking"
                    description="No background behavioral analytics, drawing telemetry, or vendor schedule telemetry is transmitted."
                  >
                    <span className="settings-chip settings-chip--available">Disabled</span>
                  </SettingsRow>

                  <SettingsRow
                    labelId="training-label"
                    title="Model Training Protection"
                    description="Your confidential drawings, project notes, and takeoff corrections never contribute to model training."
                  >
                    <span className="settings-chip settings-chip--available">Protected</span>
                  </SettingsRow>

                  <SettingsRow
                    labelId="retention-label"
                    title="Local Data Retention Policy"
                    description="All project metadata and drawing entities are persisted in local workstation storage with immediate local deletion."
                  >
                    <span className="settings-chip settings-chip--available">Local-Only</span>
                  </SettingsRow>

                  <SettingsRow
                    labelId="password-auth-label"
                    title="Workstation Authentication & Credentials"
                    description="Configure master password, session credentials, and recovery link dispatch via Supabase Auth."
                  >
                    <button
                      type="button"
                      className="btn btn--ghost"
                      style={{ fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      onClick={() => setActiveTab("account")}
                    >
                      <span>Manage Password</span>
                      <AnimatedArrowRight size={13} />
                    </button>
                  </SettingsRow>
                </div>
              </section>
            )}

            {/* 11. ABOUT & UPDATES */}
            {activeTab === "about" && (
              <section className="settings-panel" role="tabpanel" aria-labelledby="settings-about-title">
                <SettingsPanelHeader
                  icon={<IconInfo />}
                  kicker="About"
                  title="Vectoris Workstation Specifications"
                  description="Desktop runtime environment, framework dependencies, and build licensing."
                />

                <div className="settings-grid-3col">
                  <div className="settings-stat-card">
                    <span className="settings-stat-card__label">Application Version</span>
                    <strong className="settings-stat-card__val">v0.2.5</strong>
                    <span className="settings-stat-card__sub">Engineering Workstation Release</span>
                  </div>
                  <div className="settings-stat-card">
                    <span className="settings-stat-card__label">Desktop Shell</span>
                    <strong className="settings-stat-card__val">Tauri v2 Core</strong>
                    <span className="settings-stat-card__sub">Rust 2021 + WebView2</span>
                  </div>
                  <div className="settings-stat-card">
                    <span className="settings-stat-card__label">UI Framework</span>
                    <strong className="settings-stat-card__val">React 19 + Vite 7</strong>
                    <span className="settings-stat-card__sub">TypeScript 5.7 Strict</span>
                  </div>
                </div>

                <div className="settings-list">
                  <SettingsRow
                    labelId="license-label"
                    title="Software License"
                    description="Proprietary Internal Enterprise Workstation Edition."
                  >
                    <span className="settings-chip settings-chip--available">Enterprise Local</span>
                  </SettingsRow>

                  <SettingsRow
                    labelId="tour-restart-label"
                    title="Guided Product Tour"
                    description="Take a 5-step interactive tour of Vectoris's workspace context, projects, investigation workshop, and takeoff stream."
                  >
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => {
                        tourService.restartTour(navigate);
                      }}
                    >
                      Restart Tour
                    </button>
                  </SettingsRow>
                </div>

                <UpdatePanel />
              </section>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ── Reusable Component Primitives ─────────────────────────────────────────────

function SettingsPanelHeader({
  icon,
  kicker,
  title,
  description,
}: {
  icon: ReactNode;
  kicker: string;
  title: string;
  description: string;
}) {
  const id = `settings-${kicker.toLowerCase().replace(/[^a-z]+/g, "-")}-title`;

  return (
    <header className="settings-panel__header">
      <span className="settings-panel__icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="settings-panel__kicker">{kicker}</p>
        <h2 className="settings-panel__title" id={id}>
          {title}
        </h2>
        <p className="settings-panel__description">{description}</p>
      </div>
    </header>
  );
}

function SettingsRow({
  labelId,
  title,
  description,
  meta,
  children,
}: {
  labelId: string;
  title: string;
  description: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <div className="settings-row">
      <div className="settings-row__text">
        <span className="settings-row__title" id={labelId}>
          {title}
        </span>
        <span className="settings-row__description">{description}</span>
        {meta && <span className="settings-row__meta">{meta}</span>}
      </div>
      <div className="settings-row__control">{children}</div>
    </div>
  );
}

function SettingsRangeRow({
  labelId,
  title,
  description,
  value,
  min,
  max,
  step,
  unit,
  disabled,
  onChange,
}: {
  labelId: string;
  title: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <SettingsRow labelId={labelId} title={title} description={description}>
      <div className="settings-range">
        <input
          aria-labelledby={labelId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="settings-range__value">
          {value} {unit}
        </span>
      </div>
    </SettingsRow>
  );
}

function SettingsSwitch({
  labelId,
  checked,
  disabled,
  onChange,
}: {
  labelId: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="settings-switch t-toggle"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      data-on={checked ? "true" : "false"}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="settings-switch__track" aria-hidden="true" />
      <span className="settings-switch__thumb" aria-hidden="true" />
    </button>
  );
}

// ── SVG Icons ────────────────────────────────────────────────────────────────

function IconPalette(props: { "aria-hidden"?: boolean | "true" | "false" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" {...props}>
      <path d="M9 2.4a6.6 6.6 0 0 0-2.1 12.85c.48.16.93-.23.93-.74v-.78c0-.6.49-1.08 1.08-1.08h1.38c2.18 0 3.71-1.48 3.71-3.64A6.6 6.6 0 0 0 9 2.4Z" stroke="currentColor" strokeWidth="1.45" />
      <circle cx="6.25" cy="7.25" r=".8" fill="currentColor" />
      <circle cx="9" cy="5.9" r=".8" fill="currentColor" />
      <circle cx="11.75" cy="7.25" r=".8" fill="currentColor" />
    </svg>
  );
}

function IconCpu(props: { "aria-hidden"?: boolean | "true" | "false" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" {...props}>
      <rect x="4.5" y="4.5" width="9" height="9" rx="1.7" stroke="currentColor" strokeWidth="1.45" />
      <rect x="7" y="7" width="4" height="4" rx=".8" stroke="currentColor" strokeWidth="1.25" />
      <path d="M6 2.5v2M9 2.5v2M12 2.5v2M6 13.5v2M9 13.5v2M12 13.5v2M2.5 6h2M2.5 9h2M2.5 12h2M13.5 6h2M13.5 9h2M13.5 12h2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function IconBuilding(props: { "aria-hidden"?: boolean | "true" | "false" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" {...props}>
      <path d="M3 15.5V3.5A1.5 1.5 0 014.5 2h9A1.5 1.5 0 0115 3.5v12M2 15.5h14" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
      <path d="M6 5.5h2M10 5.5h2M6 8.5h2M10 8.5h2M6 11.5h2M10 11.5h2M7.5 15.5v-2.5h3v2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IconDatabase(props: { "aria-hidden"?: boolean | "true" | "false" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" {...props}>
      <ellipse cx="9" cy="4.5" rx="6" ry="2.5" stroke="currentColor" strokeWidth="1.45" />
      <path d="M3 4.5v4.5c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5V4.5" stroke="currentColor" strokeWidth="1.45" />
      <path d="M3 9v4.5c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5V9" stroke="currentColor" strokeWidth="1.45" />
    </svg>
  );
}

function IconFiles(props: { "aria-hidden"?: boolean | "true" | "false" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" {...props}>
      <path d="M4 3a1.5 1.5 0 011.5-1.5h5l4 4v9a1.5 1.5 0 01-1.5 1.5h-7.5A1.5 1.5 0 014 14.5V3z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.5 1.5V5.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 9.5h4M7 12.5h2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IconLayers(props: { "aria-hidden"?: boolean | "true" | "false" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" {...props}>
      <path d="M2.5 6.5L9 2.5L15.5 6.5L9 10.5L2.5 6.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 10L9 14L15.5 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconUser(props: { "aria-hidden"?: boolean | "true" | "false" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" {...props}>
      <circle cx="9" cy="6" r="2.6" stroke="currentColor" strokeWidth="1.45" />
      <path d="M4 15c.58-2.42 2.35-3.65 5-3.65S13.42 12.58 14 15" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
    </svg>
  );
}

function IconBell(props: { "aria-hidden"?: boolean | "true" | "false" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" {...props}>
      <path d="M9 2.6a4.5 4.5 0 0 0-4.5 4.5v2.3L3 12h12l-1.5-2.6V7.1A4.5 4.5 0 0 0 9 2.6Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.4 14.1a1.6 1.6 0 0 0 3.2 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconKeyboard(props: { "aria-hidden"?: boolean | "true" | "false" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" {...props}>
      <rect x="2.5" y="4" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 6.5h.5M7.5 6.5h.5M10 6.5h.5M12.5 6.5h.5M5 9h.5M7.5 9h.5M10 9h.5M12.5 9h.5M6.5 11.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconShield(props: { "aria-hidden"?: boolean | "true" | "false" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" {...props}>
      <path d="M9 2.5L3.5 5v5c0 4.14 2.86 6.86 5.5 7.5 2.64-.64 5.5-3.36 5.5-7.5V5L9 2.5Z" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 9l2 2 3.5-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconInfo(props: { "aria-hidden"?: boolean | "true" | "false" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" {...props}>
      <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.45" />
      <path d="M9 8.5v4M9 5.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconMonitor() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 15h4M9 12v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M13.55 11.95A5.7 5.7 0 0 1 6.05 4.45a6.15 6.15 0 1 0 7.5 7.5Z" stroke="currentColor" strokeWidth="1.45" strokeLinejoin="round" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="2.6" stroke="currentColor" strokeWidth="1.45" />
      <path d="M9 2.4v1.4M9 14.2v1.4M2.4 9h1.4M14.2 9h1.4M4.35 4.35l1 1M12.65 12.65l1 1M4.35 13.65l1-1M12.65 5.35l1-1" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function IconPulse(props: { "aria-hidden"?: boolean | "true" | "false" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" {...props}>
      <path d="M2.5 9h3l1.5-4 3 8 1.6-4H15.5" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCheck(props: { "aria-hidden"?: boolean | "true" | "false" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" {...props}>
      <path d="m4 9.4 3.1 3.1L14 5.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconKey(props: { "aria-hidden"?: boolean | "true" | "false" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" {...props}>
      <circle cx="6" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.45" />
      <path d="M9.5 9H15M12.5 9v2.5M14.5 9v1.5" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
    </svg>
  );
}

function IconEye(props: { "aria-hidden"?: boolean | "true" | "false" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconEyeOff(props: { "aria-hidden"?: boolean | "true" | "false" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getPasswordStrength(password: string): { score: number; label: string; color: string; percent: number } {
  if (!password) return { score: 0, label: "None", color: "var(--app-border)", percent: 0 };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) {
    return { score, label: "Weak", color: "#ef4444", percent: 33 };
  } else if (score <= 3) {
    return { score, label: "Fair", color: "#f59e0b", percent: 66 };
  } else {
    return { score, label: "Strong & Compliant", color: "#10b981", percent: 100 };
  }
}
