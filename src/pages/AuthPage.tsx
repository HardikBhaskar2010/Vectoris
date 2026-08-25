import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "../router";
import { BrandMark } from "../components/BrandMark";
import { SystemNotice } from "../components/SystemNotice";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

type AuthMode = "signin" | "signup";
type FormStatus = "idle" | "submitting" | "blocked" | "success";
type FormErrors = Partial<Record<"fullName" | "email" | "password", string>>;

function getInitialMode(): AuthMode {
  const mode = new URLSearchParams(window.location.search).get("mode");
  return mode === "signin" ? "signin" : "signup";
}

function readInviteContext() {
  const params = new URLSearchParams(window.location.search);
  const role = params.get("role");
  const org = params.get("org");
  const email = params.get("email");
  const invite = params.get("invite");
  const isDenied = invite === "expired" || invite === "used";

  return {
    email: email ?? "",
    invite,
    isDenied,
    org: org ?? "Invited organization",
    role: role ?? "Project member",
  };
}

function validateField(
  field: "fullName" | "email" | "password",
  value: string,
  mode: AuthMode,
): string {
  if (field === "fullName" && mode === "signup" && value.trim().length < 2) {
    return "Enter your full name so your organization can identify your approvals.";
  }
  if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    return "Enter a valid work email address.";
  }
  if (field === "password" && value.length < 8) {
    return "Use at least 8 characters.";
  }
  return "";
}

function validateAuthForm(mode: AuthMode, fullName: string, email: string, password: string) {
  const errors: FormErrors = {};
  const nameErr = validateField("fullName", fullName, mode);
  const emailErr = validateField("email", email, mode);
  const passErr = validateField("password", password, mode);
  if (nameErr) errors.fullName = nameErr;
  if (emailErr) errors.email = emailErr;
  if (passErr) errors.password = passErr;
  return errors;
}

export function AuthPage() {
  const isOnline = useOnlineStatus();
  const inviteContext = useMemo(() => readInviteContext(), []);
  const [mode, setMode] = useState<AuthMode>(() => getInitialMode());

  // Theme sync: URL param overrides -> document data-theme -> localStorage -> OS preference
  const [currentTheme, setCurrentTheme] = useState<"dark" | "light">(() => {
    const urlParam = new URLSearchParams(window.location.search).get("theme");
    if (urlParam === "dark" || urlParam === "light") return urlParam;
    const docTheme = document.documentElement.getAttribute("data-theme");
    if (docTheme === "dark" || docTheme === "light") return docTheme;
    try {
      const stored = window.localStorage.getItem("vectoris.themePreference");
      if (stored === "dark" || stored === "light") return stored;
    } catch {
      // Ignore storage errors
    }
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    const handleThemeChange = () => {
      const docTheme = document.documentElement.getAttribute("data-theme");
      if (docTheme === "dark" || docTheme === "light") {
        setCurrentTheme(docTheme);
      }
    };

    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    window.addEventListener("themechange", handleThemeChange);

    return () => {
      observer.disconnect();
      window.removeEventListener("themechange", handleThemeChange);
    };
  }, []);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(inviteContext.email);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formMessage, setFormMessage] = useState("");

  // Refs for transitions-dev sliding pill (tabs-sliding §16)
  const tabsRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  // Refs for transitions-dev error shake (error-state-shake §12)
  const revertTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const isSignup = mode === "signup";
  const isSubmitting = status === "submitting";
  const canSubmit = isOnline && !inviteContext.isDenied && !isSubmitting;

  // ── Sliding pill: move pill to active tab (transitions-dev §16) ──────────
  const movePill = useCallback((animate: boolean) => {
    const bar = tabsRef.current;
    const pill = pillRef.current;
    if (!bar || !pill) return;
    const activeTab = bar.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    if (!activeTab) return;

    if (!animate) {
      const prev = pill.style.transition;
      pill.style.transition = "none";
      pill.style.transform = `translateX(${activeTab.offsetLeft}px)`;
      pill.style.width = `${activeTab.offsetWidth}px`;
      void pill.offsetWidth; // force reflow
      pill.style.transition = prev;
    } else {
      pill.style.transform = `translateX(${activeTab.offsetLeft}px)`;
      pill.style.width = `${activeTab.offsetWidth}px`;
    }
  }, []);

  // Initialize pill on mount and window resize
  useEffect(() => {
    requestAnimationFrame(() => movePill(false));
    const onResize = () => movePill(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [movePill]);

  // Move pill when mode changes (animated)
  useEffect(() => {
    requestAnimationFrame(() => movePill(true));
  }, [mode, movePill]);

  // ── Error shake: trigger shake animation on a field ──────────────────────
  const triggerShake = useCallback((fieldId: string) => {
    const input = document.getElementById(fieldId);
    if (!input) return;
    const wrap = input.closest<HTMLElement>(".auth-field");
    const shakeTarget = input.closest<HTMLElement>(".t-input") ?? input;
    if (!wrap || !shakeTarget) return;

    wrap.classList.add("is-error");
    shakeTarget.classList.add("is-error");
    shakeTarget.classList.remove("is-shaking");
    void shakeTarget.offsetWidth; // reflow to replay
    shakeTarget.classList.add("is-shaking");

    const shakeMs = 80 * 2 + 60 * 2; // matches --shake-dur-a * 2 + --shake-dur-b * 2
    setTimeout(() => shakeTarget.classList.remove("is-shaking"), shakeMs + 20);

    if (revertTimers.current[fieldId]) clearTimeout(revertTimers.current[fieldId]);
    revertTimers.current[fieldId] = setTimeout(() => {
      delete revertTimers.current[fieldId];
      wrap.classList.remove("is-error");
      shakeTarget.classList.remove("is-error");
    }, shakeMs + 3000);
  }, []);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrors({});
    setFormMessage("");
    setStatus("idle");
    // Preserve ?theme param when switching modes
    const params = new URLSearchParams(window.location.search);
    params.set("mode", nextMode);
    window.history.replaceState(null, "", `/auth?${params.toString()}`);
  };

  // ── Inline blur validation (apple-design §16 — validate inline, not submit) ──
  const handleBlur = (field: "fullName" | "email" | "password", value: string) => {
    if (!value) return; // don't validate empty on first visit
    const err = validateField(field, value, mode);
    if (err) {
      setErrors((prev) => ({ ...prev, [field]: err }));
      const idMap = { fullName: "fullName", email: "email", password: "password" };
      triggerShake(idMap[field]);
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Clear error when user starts typing (typing cancels auto-revert — §12)
  const clearFieldError = (field: "fullName" | "email" | "password", fieldId: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      const wrap = document.getElementById(fieldId)?.closest<HTMLElement>(".auth-field");
      const shakeTarget = document.getElementById(fieldId)?.closest<HTMLElement>(".t-input")
        ?? document.getElementById(fieldId);
      if (wrap) wrap.classList.remove("is-error");
      if (shakeTarget) shakeTarget.classList.remove("is-error");
      if (revertTimers.current[fieldId]) {
        clearTimeout(revertTimers.current[fieldId]);
        delete revertTimers.current[fieldId];
      }
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isOnline) {
      setStatus("blocked");
      setFormMessage("No connection detected. Vectoris needs Supabase Auth connectivity before signing in.");
      return;
    }

    if (inviteContext.isDenied) {
      setStatus("blocked");
      setFormMessage("This invitation link is no longer valid. Ask an organization admin for a new invite.");
      return;
    }

    const nextErrors = validateAuthForm(mode, fullName, email, password);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setStatus("blocked");
      setFormMessage("Resolve the highlighted fields before continuing.");
      // Shake all invalid fields
      if (nextErrors.fullName) triggerShake("fullName");
      if (nextErrors.email) triggerShake("email");
      if (nextErrors.password) triggerShake("password");
      return;
    }

    setStatus("submitting");
    setFormMessage("");

    window.setTimeout(() => {
      setStatus("blocked");
      setFormMessage(
        "Supabase Auth is not connected in this frontend build yet. The UI is ready to wire to the locked auth provider.",
      );
    }, 560);
  };

  return (
    <main
      className="auth-shell"
      data-theme={currentTheme}
      data-submitting={isSubmitting ? "true" : undefined}
    >
      {/* ── Art Panel (left) ─────────────────────────────────────── */}
      <section className="auth-art-panel" aria-label="Vectoris engineering intelligence">
        <header className="auth-art-panel__brand">
          <BrandMark />
        </header>

        <img
          src="/assets/isometric-cad-artwork.png"
          alt="Isometric electrical drawing intelligence visualization."
          className="auth-art-panel__image"
        />

        <div className="auth-art-panel__caption">
          <p>Local-first engineering intelligence</p>
          <span>Confidential drawings stay under user control. Organization access is scoped by role.</span>
        </div>
      </section>

      {/* ── Form Panel (right) ───────────────────────────────────── */}
      <section className="auth-form-panel" aria-labelledby="auth-title">
        <div className="auth-form-card">
          {/* Mobile-only brand */}
          <div className="auth-mobile-brand">
            <BrandMark />
          </div>

          {/* Offline notice */}
          {!isOnline ? (
            <SystemNotice
              title="No connection"
              message="Authentication requires network access. The form remains visible so you can review the required fields."
            />
          ) : null}

          {/* Invite context */}
          {inviteContext.invite ? (
            <aside className={inviteContext.isDenied ? "invite-card invite-card--denied" : "invite-card"}>
              <p>{inviteContext.isDenied ? "Invitation unavailable" : "Organization invitation"}</p>
              <span>
                {inviteContext.isDenied
                  ? "This link is expired or already used."
                  : `${inviteContext.org} invited you as ${inviteContext.role}.`}
              </span>
            </aside>
          ) : null}

          {/* Heading — NO eyebrow label above h1 (impeccable craft-floor ban) */}
          <div className="auth-heading">
            <h1 id="auth-title">{isSignup ? "Create your account" : "Sign in to Vectoris"}</h1>
            <span>
              {isSignup
                ? "Join your engineering workspace and start from verified project data."
                : "Continue to your projects, drawing packages, and review queues."}
            </span>
          </div>

          {/* Mode switch — sliding pill (transitions-dev §16) */}
          <div
            ref={tabsRef}
            className="auth-mode-switch t-tabs"
            role="tablist"
            aria-label="Authentication mode"
          >
            {/* Sliding pill — aria-hidden, purely visual */}
            <span ref={pillRef} className="auth-mode-switch__pill t-tabs-pill" aria-hidden="true" />

            <button
              type="button"
              role="tab"
              id="tab-signin"
              aria-selected={!isSignup}
              aria-controls="panel-auth"
              className="auth-mode-switch__tab t-tab"
              onClick={() => switchMode("signin")}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              id="tab-signup"
              aria-selected={isSignup}
              aria-controls="panel-auth"
              className="auth-mode-switch__tab t-tab"
              onClick={() => switchMode("signup")}
            >
              Create account
            </button>
          </div>

          {/* Form-level alert */}
          {formMessage ? (
            <div
              className={status === "success" ? "auth-alert auth-alert--success" : "auth-alert"}
              role="alert"
              tabIndex={-1}
            >
              {formMessage}
            </div>
          ) : null}

          {/* Auth form */}
          <form id="panel-auth" className="auth-form" noValidate onSubmit={handleSubmit}>
            {isSignup ? (
              <div className="auth-field t-input-wrap">
                <label htmlFor="fullName">Full name</label>
                <div className="t-input">
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      clearFieldError("fullName", "fullName");
                    }}
                    onBlur={(e) => handleBlur("fullName", e.target.value)}
                    aria-invalid={Boolean(errors.fullName)}
                    aria-describedby={errors.fullName ? "fullName-error" : undefined}
                    disabled={isSubmitting}
                    placeholder="Jane Doe"
                  />
                </div>
                {errors.fullName ? (
                  <p id="fullName-error" className="t-error-msg auth-field__error">{errors.fullName}</p>
                ) : null}
              </div>
            ) : null}

            <div className="auth-field t-input-wrap">
              <label htmlFor="email">Work email</label>
              <div className="t-input">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearFieldError("email", "email");
                  }}
                  onBlur={(e) => handleBlur("email", e.target.value)}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  disabled={isSubmitting || Boolean(inviteContext.email)}
                  placeholder="jane.doe@company.com"
                />
              </div>
              {errors.email ? (
                <p id="email-error" className="t-error-msg auth-field__error">{errors.email}</p>
              ) : null}
            </div>

            <div className="auth-field t-input-wrap">
              <label htmlFor="password">Password</label>
              <div className="password-control t-input">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFieldError("password", "password");
                  }}
                  onBlur={(e) => handleBlur("password", e.target.value)}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? "password-error password-hint" : "password-hint"}
                  disabled={isSubmitting}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="password-control__toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((c) => !c)}
                  disabled={isSubmitting}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {errors.password ? (
                <p id="password-error" className="t-error-msg auth-field__error">{errors.password}</p>
              ) : null}
              <span id="password-hint" className="auth-field__hint">Password managers and paste are supported.</span>
            </div>

            <button className="auth-submit" type="submit" disabled={!canSubmit}>
              {isSubmitting ? "Checking credentials…" : isSignup ? "Create account" : "Sign in"}
            </button>
          </form>

          {/* ── OAuth ──────────────────────────────────────────────────────── */}
          <div className="auth-oauth">
            <div className="auth-oauth__divider" aria-hidden="true">
              <span>or continue with</span>
            </div>
            <div className="auth-oauth__buttons">
              <button
                type="button"
                className="auth-oauth__btn"
                disabled
                aria-disabled="true"
                aria-label="Sign in with Google (coming soon)"
                title="Google sign-in — coming soon"
              >
                <GoogleWordmark />
              </button>
              <button
                type="button"
                className="auth-oauth__btn"
                disabled
                aria-disabled="true"
                aria-label="Sign in with Microsoft (coming soon)"
                title="Microsoft sign-in — coming soon"
              >
                <MicrosoftWordmark />
              </button>
            </div>
          </div>

          {/* Secondary actions */}
          <div className="auth-secondary-actions">
            {!isSignup ? <Link to="/auth?mode=reset">Forgot password?</Link> : null}
            <button type="button" onClick={() => switchMode(isSignup ? "signin" : "signup")}>
              {isSignup ? "Already have an account? Sign in" : "Need access? Create an account"}
            </button>
          </div>

          {/* Dev / QA Testing Bypass */}
          <div
            className="auth-dev-bypass"
            style={{
              marginTop: "20px",
              paddingTop: "16px",
              borderTop: "1px dashed var(--border-subtle, rgba(255, 255, 255, 0.1))",
              textAlign: "center",
            }}
          >
            <Link
              to="/dashboard"
              className="button button--secondary"
              style={{
                display: "inline-flex",
                width: "100%",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                fontWeight: 600,
                minHeight: "40px",
                borderRadius: "8px",
                textDecoration: "none",
              }}
            >
              <span>Skip to Dashboard (Testing / Dev)</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

// ── OAuth brand marks ─────────────────────────────────────────────────────
// SVGs match official Google and Microsoft brand guidelines.

function GoogleWordmark() {
  return (
    <svg
      width="80"
      height="20"
      viewBox="0 0 80 20"
      fill="none"
      aria-hidden="true"
      role="img"
    >
      {/* Google "G" mark */}
      <g clipPath="url(#g-clip)">
        <path
          d="M10 4.18c1.56 0 2.95.54 4.05 1.44l3.01-3.01A9.72 9.72 0 0010 .5a9.75 9.75 0 00-8.7 5.35l3.5 2.72A5.81 5.81 0 0110 4.18z"
          fill="#EA4335"
        />
        <path
          d="M19.25 10.19c0-.65-.06-1.27-.17-1.87H10v3.54h5.21a4.46 4.46 0 01-1.93 2.93l2.99 2.32c1.74-1.6 2.98-3.97 2.98-6.92z"
          fill="#4285F4"
        />
        <path
          d="M4.8 11.85A5.82 5.82 0 014.5 10c0-.65.11-1.28.3-1.88L1.3 5.4A9.74 9.74 0 000 10c0 1.57.38 3.06 1.3 4.6l3.5-2.75z"
          fill="#FBBC05"
        />
        <path
          d="M10 19.5a9.73 9.73 0 006.77-2.47l-2.99-2.32A5.8 5.8 0 0110 15.82c-2.54 0-4.7-1.72-5.47-4.03l-3.5 2.75A9.75 9.75 0 0010 19.5z"
          fill="#34A853"
        />
      </g>
      <defs>
        <clipPath id="g-clip"><rect width="19.5" height="19" x="0" y=".5"/></clipPath>
      </defs>
      {/* "oogle" wordmark */}
      <text x="24" y="15" fontFamily="-apple-system,system-ui,sans-serif" fontSize="13" fontWeight="500" fill="currentColor" letterSpacing="-0.01em">Google</text>
    </svg>
  );
}

function MicrosoftWordmark() {
  return (
    <svg
      width="94"
      height="20"
      viewBox="0 0 94 20"
      fill="none"
      aria-hidden="true"
      role="img"
    >
      {/* Microsoft 4-square logo */}
      <rect x="0"  y="0"  width="9" height="9" fill="#F25022"/>
      <rect x="10" y="0"  width="9" height="9" fill="#7FBA00"/>
      <rect x="0"  y="10" width="9" height="9" fill="#00A4EF"/>
      <rect x="10" y="10" width="9" height="9" fill="#FFB900"/>
      {/* "Microsoft" wordmark */}
      <text x="24" y="15" fontFamily="-apple-system,system-ui,sans-serif" fontSize="13" fontWeight="500" fill="currentColor" letterSpacing="-0.01em">Microsoft</text>
    </svg>
  );
}
