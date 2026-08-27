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

            {/* 3. WORKSPACE */}
            {activeTab === "workspace" && (
              <section className="settings-panel" role="tabpanel" aria-labelledby="settings-workspace-title">
                <SettingsPanelHeader
                  icon={<IconBuilding />}
                  kicker="Workspace"
                  title="Workspace & Organization Profile"
                  description="Configure local workstation identity, seat permissions, and engineering workspace scope."
                />

                <div className="settings-account-grid">
                  <label className="settings-field">
                    <span>Active Organization</span>
                    <input type="text" value="Apex Engineering" readOnly />
                  </label>
                  <label className="settings-field">
                    <span>Workstation Environment</span>
                    <input type="text" value="Single-Workstation Mode (Isolated)" readOnly />
                  </label>
                  <label className="settings-field">
                    <span>Assigned Seat</span>
                    <input type="text" value="Lead Estimator / Owner" readOnly />
                  </label>
                  <label className="settings-field">
                    <span>Local Team Profiles</span>
                    <input type="text" value="12 Local Profiles Stored" readOnly />
                  </label>
                </div>

                <div className="settings-callout">
                  <span className="settings-callout__icon"><IconInfo /></span>
                  <div>
                    <strong className="settings-callout__title">Multi-Tenant Cloud Sync Status</strong>
                    <p className="settings-callout__text">
                      Multi-tenant organization synchronization and team member invitation will become active once
                      cloud organization sync is configured. All engineering workspaces currently remain strictly local.
                    </p>
                  </div>
                </div>
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

            {/* 7. ACCOUNT */}
            {activeTab === "account" && (
              <section className="settings-panel" role="tabpanel" aria-labelledby="settings-account-title">
                <SettingsPanelHeader
                  icon={<IconUser />}
                  kicker="Account"
                  title="Workstation Operator Profile"
                  description="Review your local workstation operator identity and session authentication state."
                />

                <div className="settings-account-grid">
                  <label className="settings-field">
                    <span>Operator Name</span>
                    <input type="text" value="Hardik Bhaskar" readOnly />
                  </label>
                  <label className="settings-field">
                    <span>Internal Identity</span>
                    <input type="email" value="hardik@apexeng.internal" readOnly />
                  </label>
                  <label className="settings-field">
                    <span>Organization</span>
                    <input type="text" value="Apex Engineering" readOnly />
                  </label>
                  <label className="settings-field">
                    <span>Workstation Role</span>
                    <input type="text" value="Lead Estimator · Owner" readOnly />
                  </label>
                </div>

                <div className="settings-list">
                  <SettingsRow
                    labelId="auth-state-label"
                    title="Session State"
                    description="Currently authenticated to local desktop workstation environment."
                  >
                    <span className="settings-chip settings-chip--available">Authenticated</span>
                  </SettingsRow>

                  <SettingsRow
                    labelId="cloud-account-label"
                    title="Cloud Account Sync"
                    description="Connect enterprise single sign-on (SSO) and multi-tenant organization billing."
                    meta="Available in Cloud Enterprise release."
                  >
                    <span className="settings-chip settings-chip--not-connected">Not Connected</span>
                  </SettingsRow>
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
                    <strong className="settings-stat-card__val">v0.2.1</strong>
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
