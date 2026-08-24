/**
 * SettingsPage - Global user, organization, appearance, and local engine controls.
 *
 * Source of truth:
 *   docs/06_PAGES/SETTINGS.md
 *   docs/01_PRODUCT/APP_FLOW.md
 *   docs/03_ARCHITECTURE/LOCAL_FIRST_ARCHITECTURE.md
 *
 * State override for QA:
 *   ?state=loading | error | permission | backend | data
 *
 * Demo-only note:
 *   Controls are local UI state until Supabase settings APIs and Tauri engine
 *   adapters are wired. The page avoids claiming server persistence.
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AppShell } from "../components/AppShell";

type PageState = "loading" | "error" | "permission" | "backend" | "data";
type ThemePreference = "system" | "dark" | "light";
type SaveStatus = "idle" | "saving" | "saved-local";
type EngineCheckStatus = "idle" | "checking" | "ready" | "paused";
type SettingsTab = "appearance" | "local-engine" | "account" | "notifications";

const PAGE_STATES: PageState[] = ["loading", "error", "permission", "backend", "data"];

const THEME_OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: ReactNode;
}> = [
  { value: "system", label: "System", description: "Follow device", icon: <IconMonitor /> },
  { value: "dark", label: "Dark", description: "Black cherry", icon: <IconMoon /> },
  { value: "light", label: "Light", description: "Alabaster", icon: <IconSun /> },
];

const ENGINE_BUNDLES = [
  { name: "Drawing perception", status: "Ready", detail: "Symbol and object proposals" },
  { name: "Label parser", status: "Ready", detail: "Sheet text and tag extraction" },
  { name: "Quantity verifier", status: "Queued", detail: "Human-reviewed takeoff checks" },
];

const LOCAL_STORAGE_THEME_KEY = "vectoris.themePreference";

function getPageState(): PageState {
  const state = new URLSearchParams(window.location.search).get("state");
  return PAGE_STATES.includes(state as PageState) ? (state as PageState) : "data";
}

function getInitialTheme(): ThemePreference {
  const params = new URLSearchParams(window.location.search);
  const queryTheme = params.get("theme");
  if (queryTheme === "dark" || queryTheme === "light") return queryTheme;

  try {
    const stored = window.localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
    if (stored === "system" || stored === "dark" || stored === "light") return stored;
  } catch {
    // Local storage may be unavailable in strict desktop/privacy contexts.
  }

  return "system";
}

function writeThemeToUrl(theme: ThemePreference) {
  const url = new URL(window.location.href);
  if (theme === "system") {
    url.searchParams.delete("theme");
  } else {
    url.searchParams.set("theme", theme);
  }
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function writeStateToUrl(state: PageState | null) {
  const url = new URL(window.location.href);
  if (!state || state === "data") {
    url.searchParams.delete("state");
  } else {
    url.searchParams.set("state", state);
  }
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export default function SettingsPage() {
  const [pageState, setPageState] = useState<PageState>(getPageState);
  const [themePreference, setThemePreference] = useState<ThemePreference>(getInitialTheme);
  const [localEngineEnabled, setLocalEngineEnabled] = useState(true);
  const [cloudEscalationEnabled, setCloudEscalationEnabled] = useState(false);
  const [engineProfile, setEngineProfile] = useState("balanced");
  const [cpuThreads, setCpuThreads] = useState(8);
  const [modelCacheGb, setModelCacheGb] = useState(24);
  const [jobCompleteAlerts, setJobCompleteAlerts] = useState(true);
  const [reviewDigest, setReviewDigest] = useState(true);
  const [approvalRequests, setApprovalRequests] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [engineCheckStatus, setEngineCheckStatus] = useState<EngineCheckStatus>("idle");
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");

  const isPermissionLimited = pageState === "permission";
  const backendDisconnected = pageState === "backend" || saveStatus === "saved-local";

  const roleLabel = isPermissionLimited ? "Editor" : "Owner";
  const engineStatusLabel = useMemo(() => {
    if (!localEngineEnabled) return "Paused on this device";
    if (engineCheckStatus === "checking") return "Checking local runtime";
    if (engineCheckStatus === "ready") return "Local runtime responding";
    return "Local runtime configured";
  }, [engineCheckStatus, localEngineEnabled]);

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
      // Non-critical in desktop shells where storage may be blocked.
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
    writeThemeToUrl(nextTheme);
  };

  const handleSave = () => {
    if (isPermissionLimited) return;

    setSaveStatus("saving");
    window.setTimeout(() => {
      setSaveStatus("saved-local");
    }, 640);
  };

  const handleRetry = () => {
    setPageState("data");
    writeStateToUrl("data");
  };

  const handleEngineCheck = () => {
    if (!localEngineEnabled) {
      setEngineCheckStatus("paused");
      return;
    }
    setEngineCheckStatus("checking");
    window.setTimeout(() => setEngineCheckStatus("ready"), 760);
  };

  return (
    <AppShell activePath="/settings">
      {pageState === "loading" && <SettingsSkeleton />}
      {pageState === "error" && <SettingsError onRetry={handleRetry} />}

      {pageState !== "loading" && pageState !== "error" && (
        <div className="settings-page">
          <header className="settings-header">
            <div>
              <p className="settings-eyebrow">Global configuration</p>
              <h1 className="settings-title">Settings</h1>
              <p className="settings-subtitle">
                Control appearance, local engine behavior, account access, and notification defaults for Vectoris.
              </p>
            </div>

            <div className="settings-header__actions">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={handleEngineCheck}
                disabled={engineCheckStatus === "checking"}
              >
                <IconPulse aria-hidden="true" />
                {engineCheckStatus === "checking" ? "Testing" : "Test Engine"}
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSave}
                disabled={isPermissionLimited || saveStatus === "saving"}
              >
                <IconCheck aria-hidden="true" />
                {saveStatus === "saving" ? "Saving" : "Save Changes"}
              </button>
            </div>
          </header>

          <div className="settings-status-stack" aria-live="polite">
            {isPermissionLimited && (
              <SettingsBanner
                tone="warning"
                title="Limited permissions"
                description="This view is using the Editor role state. Organization policy and billing controls are read-only."
                icon={<IconLock />}
              />
            )}

            {backendDisconnected && (
              <SettingsBanner
                tone="neutral"
                title="Backend persistence pending"
                description="Changes are reflected in this interface only. Supabase settings APIs and audit events still need to be connected."
                icon={<IconCloudOff />}
              />
            )}
          </div>

          <div className="settings-layout">
            <aside className="settings-rail" aria-label="Settings sections">
              <button
                type="button"
                className={`settings-rail__item${activeTab === "appearance" ? " is-active" : ""}`}
                onClick={() => setActiveTab("appearance")}
              >
                <IconPalette aria-hidden="true" />
                <span>Appearance</span>
              </button>
              <button
                type="button"
                className={`settings-rail__item${activeTab === "local-engine" ? " is-active" : ""}`}
                onClick={() => setActiveTab("local-engine")}
              >
                <IconCpu aria-hidden="true" />
                <span>Local Engine</span>
              </button>
              <button
                type="button"
                className={`settings-rail__item${activeTab === "account" ? " is-active" : ""}`}
                onClick={() => setActiveTab("account")}
              >
                <IconUser aria-hidden="true" />
                <span>Account</span>
              </button>
              <button
                type="button"
                className={`settings-rail__item${activeTab === "notifications" ? " is-active" : ""}`}
                onClick={() => setActiveTab("notifications")}
              >
                <IconBell aria-hidden="true" />
                <span>Notifications</span>
              </button>
            </aside>

            <div className="settings-content">
              {activeTab === "appearance" && (
                <section className="settings-panel" id="appearance" aria-labelledby="settings-appearance-title">
                <SettingsPanelHeader
                  icon={<IconPalette />}
                  kicker="Appearance"
                  title="Theme and density"
                  description="Switch Vectoris between system, dark, and light modes while keeping the engineering workspace quiet and scannable."
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
              </section>
              )}

              {activeTab === "local-engine" && (
                <section className="settings-panel" id="local-engine" aria-labelledby="settings-engine-title">
                <SettingsPanelHeader
                  icon={<IconCpu />}
                  kicker="Local engine"
                  title="On-device processing"
                  description="Tune local inference preferences. Raw drawings remain local unless a later backend flow explicitly asks for cloud escalation."
                />

                <div className="settings-engine-summary">
                  <div className="settings-engine-summary__status" data-paused={!localEngineEnabled}>
                    <span className="settings-engine-summary__dot" aria-hidden="true" />
                    <div>
                      <strong>{engineStatusLabel}</strong>
                      <span>Tauri adapter and real engine telemetry are pending.</span>
                    </div>
                  </div>
                  <div className="settings-engine-summary__metric">
                    <span>CPU allocation</span>
                    <strong>{cpuThreads} threads</strong>
                  </div>
                  <div className="settings-engine-summary__metric">
                    <span>Model cache</span>
                    <strong>{modelCacheGb} GB</strong>
                  </div>
                </div>

                <div className="settings-list">
                  <SettingsRow
                    labelId="local-engine-enabled-label"
                    title="Run local engine"
                    description="Use this device for drawing perception, label parsing, and verification queues."
                  >
                    <SettingsSwitch
                      labelId="local-engine-enabled-label"
                      checked={localEngineEnabled}
                      onChange={setLocalEngineEnabled}
                    />
                  </SettingsRow>

                  <SettingsRow
                    labelId="cloud-escalation-label"
                    title="Cloud escalation consent"
                    description="Permit explicit per-job escalation when local processing cannot complete a task."
                    meta="Every escalation must remain auditable and user-visible."
                  >
                    <SettingsSwitch
                      labelId="cloud-escalation-label"
                      checked={cloudEscalationEnabled}
                      onChange={setCloudEscalationEnabled}
                      disabled={isPermissionLimited}
                    />
                  </SettingsRow>

                  <SettingsRow
                    labelId="engine-profile-label"
                    title="Power profile"
                    description="Select the default local processing behavior for new jobs."
                  >
                    <select
                      className="settings-select"
                      id="engine-profile-label"
                      value={engineProfile}
                      onChange={(event) => setEngineProfile(event.target.value)}
                      disabled={!localEngineEnabled}
                    >
                      <option value="quiet">Quiet</option>
                      <option value="balanced">Balanced</option>
                      <option value="performance">Performance</option>
                    </select>
                  </SettingsRow>

                  <SettingsRangeRow
                    labelId="cpu-threads-label"
                    title="CPU thread allocation"
                    description="Reserve capacity for local drawing processing while keeping the desktop responsive."
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
                    title="Model cache"
                    description="Space reserved for local model bundles and OCR artifacts."
                    value={modelCacheGb}
                    min={8}
                    max={64}
                    step={4}
                    unit="GB"
                    disabled={!localEngineEnabled}
                    onChange={setModelCacheGb}
                  />
                </div>

                <div className="settings-model-grid" aria-label="Local model bundles">
                  {ENGINE_BUNDLES.map((bundle) => (
                    <div className="settings-model-card" key={bundle.name}>
                      <div>
                        <strong>{bundle.name}</strong>
                        <span>{bundle.detail}</span>
                      </div>
                      <span className={`settings-chip settings-chip--${bundle.status.toLowerCase()}`}>
                        {bundle.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              )}

              {activeTab === "account" && (
                <section className="settings-panel" id="account" aria-labelledby="settings-account-title">
                <SettingsPanelHeader
                  icon={<IconUser />}
                  kicker="Account and organization"
                  title="Identity and access"
                  description="Review the active account, workspace role, and organization-level controls."
                />

                <div className="settings-account-grid">
                  <label className="settings-field">
                    <span>Name</span>
                    <input type="text" value="Hardik Bhaskar" readOnly />
                  </label>
                  <label className="settings-field">
                    <span>Email</span>
                    <input type="email" value="hardik@apexeng.example" readOnly />
                  </label>
                  <label className="settings-field">
                    <span>Organization</span>
                    <input type="text" value="Apex Engineering" readOnly />
                  </label>
                  <label className="settings-field">
                    <span>Role</span>
                    <input type="text" value={roleLabel} readOnly />
                  </label>
                </div>

                <div className="settings-list">
                  <SettingsRow
                    labelId="org-policy-label"
                    title="Organization AI policy"
                    description="Only owners can change global cloud-processing policy and audit defaults."
                    meta={isPermissionLimited ? "Read-only for Editor role." : "Owner permission available in this demo state."}
                  >
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      disabled={isPermissionLimited}
                    >
                      Manage Policy
                    </button>
                  </SettingsRow>

                  <SettingsRow
                    labelId="billing-label"
                    title="Billing and subscription"
                    description="Billing controls are reserved for owners and require backend account integration."
                    meta="Backend-dependent."
                  >
                    <button type="button" className="btn btn--secondary btn--sm" disabled>
                      Configure Billing
                    </button>
                  </SettingsRow>
                </div>
              </section>
              )}

              {activeTab === "notifications" && (
                <section className="settings-panel" id="notifications" aria-labelledby="settings-notifications-title">
                <SettingsPanelHeader
                  icon={<IconBell />}
                  kicker="Notifications"
                  title="Workflow alerts"
                  description="Set default notification behavior for processing, review, and approval events."
                />

                <div className="settings-list">
                  <SettingsRow
                    labelId="job-complete-label"
                    title="Processing completion"
                    description="Notify me when local drawing processing or export generation finishes."
                  >
                    <SettingsSwitch
                      labelId="job-complete-label"
                      checked={jobCompleteAlerts}
                      onChange={setJobCompleteAlerts}
                    />
                  </SettingsRow>

                  <SettingsRow
                    labelId="review-digest-label"
                    title="Review digest"
                    description="Summarize unresolved AI proposals and rejected line items at the start of each day."
                  >
                    <SettingsSwitch
                      labelId="review-digest-label"
                      checked={reviewDigest}
                      onChange={setReviewDigest}
                    />
                  </SettingsRow>

                  <SettingsRow
                    labelId="approval-requests-label"
                    title="Approval requests"
                    description="Alert me when teammates assign takeoff review or export approval work."
                  >
                    <SettingsSwitch
                      labelId="approval-requests-label"
                      checked={approvalRequests}
                      onChange={setApprovalRequests}
                    />
                  </SettingsRow>
                </div>
              </section>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function SettingsSkeleton() {
  return (
    <div className="settings-page settings-page--skeleton" aria-busy="true" aria-label="Loading settings">
      <div className="settings-header">
        <div>
          <div className="skeleton skeleton--label" />
          <div className="skeleton skeleton--h2" />
          <div className="skeleton skeleton--p" />
        </div>
        <div className="settings-header__actions">
          <div className="skeleton skeleton--btn" />
          <div className="skeleton skeleton--btn" />
        </div>
      </div>
      <div className="settings-layout">
        <aside className="settings-rail">
          {[0, 1, 2, 3].map((index) => (
            <div className="settings-rail__item settings-rail__item--skeleton" key={index}>
              <span className="skeleton" />
              <span className="skeleton" />
            </div>
          ))}
        </aside>
        <div className="settings-content">
          {[0, 1, 2].map((index) => (
            <section className="settings-panel settings-panel--skeleton" key={index}>
              <div className="skeleton skeleton--label" />
              <div className="skeleton skeleton--h2" />
              <div className="settings-skeleton-rows">
                <div className="skeleton" />
                <div className="skeleton" />
                <div className="skeleton" />
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="settings-page">
      <section className="settings-empty-state" role="alert">
        <span className="settings-empty-state__icon" aria-hidden="true">
          <IconAlert />
        </span>
        <h1>Settings could not load</h1>
        <p>
          The interface can render the shell, but the settings payload is unavailable in this forced QA state.
        </p>
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          Retry
        </button>
      </section>
    </div>
  );
}

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

function SettingsBanner({
  icon,
  title,
  description,
  tone,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  tone: "neutral" | "warning";
}) {
  return (
    <aside className={`settings-banner settings-banner--${tone}`} role="note">
      <span className="settings-banner__icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </aside>
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

function IconLock() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="4" y="8" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.45" />
      <path d="M6.4 8V6.2a2.6 2.6 0 0 1 5.2 0V8" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
    </svg>
  );
}

function IconCloudOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M3.2 3.2 14.8 14.8" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
      <path d="M5.3 13.5h6.8M4.6 11.7A3 3 0 0 1 7 7.2a3.6 3.6 0 0 1 5.4-.4 2.9 2.9 0 0 1 2.1 4.9" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <path d="M13 3.2 24 22H2L13 3.2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M13 9v6M13 18.6v.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}
