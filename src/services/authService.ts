/**
 * authService.ts — Vectoris Authentication & Session Lifecycle Service.
 *
 * Enforces authentication boundary between UI and Supabase Auth.
 * Handles sign in, sign up, session restore, sign out, and auth state subscriptions.
 */

import type { Session, User, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

export interface AuthResult {
  success: boolean;
  user?: User | null;
  session?: Session | null;
  error?: string;
  isEmailUnconfirmed?: boolean;
  isRecovery?: boolean;
  isExpired?: boolean;
}

export interface SignUpParams {
  email: string;
  password: string;
  fullName?: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface ResetPasswordParams {
  email: string;
}

export interface UpdatePasswordParams {
  password: string;
}

class AuthService {
  private _isRecoveryMode: boolean = false;
  private _recoveryListeners: Set<(isRecovery: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const stored = window.sessionStorage.getItem("vectoris.auth.recovery_mode");
        if (stored === "true") {
          this._isRecoveryMode = true;
        }
      } catch {
        // Ignore storage errors
      }
    }
  }

  /**
   * Checks whether the current active authentication session is in Password Recovery mode.
   */
  public isRecoveryMode(): boolean {
    if (this._isRecoveryMode) return true;
    if (typeof window !== "undefined") {
      try {
        const stored = window.sessionStorage.getItem("vectoris.auth.recovery_mode");
        if (stored === "true") return true;
        const params = new URLSearchParams(window.location.search);
        const hash = window.location.hash;
        return (
          params.get("mode") === "reset" ||
          params.get("type") === "recovery" ||
          hash.includes("type=recovery")
        );
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Sets or clears the Password Recovery mode flag.
   */
  public setRecoveryMode(active: boolean): void {
    this._isRecoveryMode = active;
    if (typeof window !== "undefined") {
      try {
        if (active) {
          window.sessionStorage.setItem("vectoris.auth.recovery_mode", "true");
        } else {
          window.sessionStorage.removeItem("vectoris.auth.recovery_mode");
        }
      } catch {
        // Ignore storage errors
      }
    }
    this._recoveryListeners.forEach((cb) => {
      try {
        cb(active);
      } catch {
        // Ignore listener errors
      }
    });
  }

  /**
   * Subscribes to recovery mode state transitions.
   */
  public onRecoveryStateChange(callback: (active: boolean) => void): () => void {
    this._recoveryListeners.add(callback);
    return () => {
      this._recoveryListeners.delete(callback);
    };
  }

  /**
   * Checks whether the application is running inside a Tauri desktop shell.
   */
  public isTauriEnvironment(): boolean {
    return (
      typeof window !== "undefined" &&
      Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__)
    );
  }

  /**
   * Resolves the primary authentication redirect URL.
   * "vectoris://auth-callback" is the main canonical URL for accepting user authentication in the app.
   */
  public getAuthRedirectUrl(): string {
    return "vectoris://auth-callback";
  }

  /**
   * Checks whether a given user has verified their email address.
   */
  public isEmailConfirmed(user: User | null | undefined): boolean {
    if (!user) return false;
    return Boolean(user.email_confirmed_at || (user as unknown as { confirmed_at?: string }).confirmed_at);
  }

  /**
   * Signs in an existing user with email and password.
   */
  public async signIn(params: SignInParams): Promise<AuthResult> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: "Supabase connection is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.",
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: params.email.trim(),
        password: params.password,
      });

      if (error) {
        let userFacingError = error.message;
        const lower = (error.message || "").toLowerCase();
        const isUnconfirmed =
          lower.includes("email not confirmed") ||
          lower.includes("unconfirmed");

        if (lower.includes("invalid login credentials") || lower.includes("invalid_grant")) {
          userFacingError = "Invalid email or password. Please verify your credentials.";
        }

        return {
          success: false,
          error: userFacingError,
          isEmailUnconfirmed: isUnconfirmed,
        };
      }

      const isConfirmed = this.isEmailConfirmed(data.user);
      if (!isConfirmed && !data.session) {
        return {
          success: false,
          user: data.user,
          error: "Email verification is required before entering the workstation.",
          isEmailUnconfirmed: true,
        };
      }

      return {
        success: true,
        user: data.user,
        session: data.session,
        isEmailUnconfirmed: false,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error during authentication.";
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Signs up a new user with email, password, and optional display metadata.
   * Explicitly attaches the environment-specific emailRedirectTo target.
   */
  public async signUp(params: SignUpParams): Promise<AuthResult> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: "Supabase connection is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.",
      };
    }

    const redirectTo = this.getAuthRedirectUrl();

    try {
      const { data, error } = await supabase.auth.signUp({
        email: params.email.trim(),
        password: params.password,
        options: {
          data: {
            full_name: params.fullName?.trim() || "",
          },
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        let userFacingError = error.message;
        const lower = (error.message || "").toLowerCase();
        if (lower.includes("error sending confirmation email")) {
          userFacingError = "Supabase could not dispatch the confirmation email. Check your SMTP / Resend settings in the Supabase Dashboard (Project Settings > Auth > SMTP Settings).";
        } else if (lower.includes("user already registered")) {
          userFacingError = "An account with this email address already exists. Please switch to Sign In.";
        } else if (lower.includes("rate limit") || lower.includes("too many requests")) {
          userFacingError = "Email rate limit exceeded. Please wait a few minutes or configure Custom SMTP in Supabase.";
        }

        return {
          success: false,
          error: userFacingError,
        };
      }

      const isConfirmed = this.isEmailConfirmed(data.user);
      const isUnconfirmed = !isConfirmed && !data.session;

      return {
        success: true,
        user: data.user,
        session: data.session,
        isEmailUnconfirmed: isUnconfirmed,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error during sign up.";
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Resends the verification confirmation email with the canonical vectoris://auth-callback redirect.
   */
  public async resendVerificationEmail(email: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: true };
    }

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: this.getAuthRedirectUrl(),
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to resend confirmation email.";
      return { success: false, error: message };
    }
  }

  /**
   * Dispatches a secure password reset link to the given work email.
   * Uses email enumeration protection: always returns success to the UI unless a hard network/rate-limit error occurs.
   */
  public async resetPasswordForEmail(email: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: true };
    }

    const redirectTo = this.getAuthRedirectUrl();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) {
        const lower = (error.message || "").toLowerCase();
        // Rate limit errors should be reported honestly without leaking email existence
        if (lower.includes("rate limit") || lower.includes("too many requests")) {
          return {
            success: false,
            error: "Too many reset attempts. Please wait a few minutes before trying again.",
          };
        }
        // Log safe internal warning without leaking sensitive user details
        console.warn("Auth: reset password dispatch notice handled safely.");
      }

      // Neutral success response prevents email enumeration
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error during password reset request.";
      return {
        success: false,
        error: msg,
      };
    }
  }

  /**
   * Updates the password for the current authenticated recovery user.
   */
  public async updatePassword(newPassword: string): Promise<{ success: boolean; user?: User | null; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: true };
    }

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        let userFacingError = error.message;
        const lower = (error.message || "").toLowerCase();
        if (lower.includes("same_password") || lower.includes("should be different")) {
          userFacingError = "New password must be different from your previous password.";
        } else if (lower.includes("password should be at least")) {
          userFacingError = "Password must be at least 8 characters.";
        }

        return {
          success: false,
          error: userFacingError,
        };
      }

      this.setRecoveryMode(false);

      return {
        success: true,
        user: data.user,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update password.";
      return {
        success: false,
        error: msg,
      };
    }
  }

  /**
   * Terminates the current active session.
   */
  public async signOut(): Promise<{ success: boolean; error?: string }> {
    this.setRecoveryMode(false);
    if (!isSupabaseConfigured()) {
      return { success: true };
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error during sign out.";
      return { success: false, error: message };
    }
  }

  /**
   * Retrieves the current session, if any.
   */
  public async getSession(): Promise<Session | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data } = await supabase.auth.getSession();
      return data.session;
    } catch {
      return null;
    }
  }

  /**
   * Retrieves the current authenticated user.
   */
  public async getCurrentUser(): Promise<User | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data } = await supabase.auth.getUser();
      return data.user;
    } catch {
      return null;
    }
  }

  /**
   * Updates the current authenticated user's metadata (e.g. full_name, discipline).
   */
  public async updateProfile(params: {
    fullName?: string;
    email?: string;
    discipline?: string;
  }): Promise<AuthResult> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Supabase is not configured." };
    }

    try {
      const metadata: Record<string, string> = {};
      if (params.fullName !== undefined) {
        metadata.full_name = params.fullName.trim();
      }
      if (params.discipline !== undefined) {
        metadata.discipline = params.discipline.trim();
      }

      const updates: { data?: Record<string, string>; email?: string } = {};
      if (Object.keys(metadata).length > 0) {
        updates.data = metadata;
      }
      if (params.email !== undefined) {
        updates.email = params.email.trim();
      }

      const { data, error } = await supabase.auth.updateUser(updates);
      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, user: data.user };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile.";
      return { success: false, error: msg };
    }
  }

  /**
   * Securely parses authentication parameters (tokens or PKCE code) from a URL or fragment string.
   */
  public extractAuthParams(rawUrlOrFragment: string): {
    accessToken?: string;
    refreshToken?: string;
    code?: string;
    type?: string;
    error?: string;
    errorDescription?: string;
  } {
    const result: {
      accessToken?: string;
      refreshToken?: string;
      code?: string;
      type?: string;
      error?: string;
      errorDescription?: string;
    } = {};

    try {
      // Handle both full URLs (vectoris://auth-callback#...) and fragment/query strings (#access_token=...)
      let queryString = "";
      let fragmentString = "";

      if (rawUrlOrFragment.includes("#")) {
        const parts = rawUrlOrFragment.split("#");
        fragmentString = parts[1] || "";
        const preHash = parts[0] || "";
        if (preHash.includes("?")) {
          queryString = preHash.split("?")[1] || "";
        }
      } else if (rawUrlOrFragment.includes("?")) {
        queryString = rawUrlOrFragment.split("?")[1] || "";
      } else {
        fragmentString = rawUrlOrFragment.startsWith("#") ? rawUrlOrFragment.slice(1) : rawUrlOrFragment;
      }

      const fragmentParams = new URLSearchParams(fragmentString);
      const queryParams = new URLSearchParams(queryString);

      result.accessToken = fragmentParams.get("access_token") || queryParams.get("access_token") || undefined;
      result.refreshToken = fragmentParams.get("refresh_token") || queryParams.get("refresh_token") || undefined;
      result.code = fragmentParams.get("code") || queryParams.get("code") || undefined;
      result.type = fragmentParams.get("type") || queryParams.get("type") || undefined;
      result.error = fragmentParams.get("error") || queryParams.get("error") || undefined;
      result.errorDescription =
        fragmentParams.get("error_description") || queryParams.get("error_description") || undefined;
    } catch {
      // In case of malformed input, safely fail
    }

    return result;
  }

  /**
   * Processes an incoming authentication callback URL (from deep link or browser redirect).
   * Securely establishes the Supabase session and immediately clears raw tokens.
   */
  public async handleAuthCallback(rawUrlOrFragment: string): Promise<AuthResult> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Supabase connection is not configured." };
    }

    const { accessToken, refreshToken, code, type, error, errorDescription } =
      this.extractAuthParams(rawUrlOrFragment);

    if (error || errorDescription) {
      const errText = errorDescription || error || "Authentication verification failed.";
      const isExpired =
        errText.toLowerCase().includes("expired") ||
        errText.toLowerCase().includes("invalid") ||
        errText.toLowerCase().includes("access_denied");
      return {
        success: false,
        error: errText,
        isExpired,
      };
    }

    const isRecovery =
      type === "recovery" ||
      rawUrlOrFragment.includes("type=recovery") ||
      rawUrlOrFragment.includes("mode=reset");

    if (isRecovery) {
      this.setRecoveryMode(true);
    }

    try {
      if (accessToken && refreshToken) {
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        // Immediately sanitize browser URL if present
        if (typeof window !== "undefined" && window.history && (window.location.hash || window.location.search)) {
          try {
            const cleanUrl = isRecovery ? "/auth?mode=reset" : window.location.pathname;
            window.history.replaceState(null, "", cleanUrl);
          } catch {
            // Ignore history errors
          }
        }

        if (sessionError) {
          const isExpired = sessionError.message.toLowerCase().includes("expired");
          return { success: false, error: sessionError.message, isExpired };
        }

        return {
          success: true,
          user: data.user,
          session: data.session,
          isEmailUnconfirmed: false,
          isRecovery,
        };
      }

      if (code) {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        // Sanitize browser URL
        if (typeof window !== "undefined" && window.history && window.location.search) {
          try {
            const cleanUrl = isRecovery ? "/auth?mode=reset" : window.location.pathname;
            window.history.replaceState(null, "", cleanUrl);
          } catch {
            // Ignore history errors
          }
        }

        if (exchangeError) {
          const isExpired = exchangeError.message.toLowerCase().includes("expired");
          return { success: false, error: exchangeError.message, isExpired };
        }

        return {
          success: true,
          user: data.user,
          session: data.session,
          isEmailUnconfirmed: false,
          isRecovery,
        };
      }

      return { success: false, error: "No authentication credentials detected in callback." };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error processing authentication callback.";
      return { success: false, error: msg };
    }
  }

  /**
   * Initializes desktop deep-link listener for 'vectoris://' custom protocol handoffs,
   * as well as web URL fragment checks on initial application mount.
   */
  public initializeDesktopAuthListener(
    onAuthSuccess?: (session: Session, user: User, isRecovery?: boolean) => void,
    onAuthError?: (errorMsg: string, isExpired?: boolean) => void
  ): () => void {
    let isDisposed = false;
    let deepLinkUnlisten: (() => void) | null = null;

    const processIncoming = async (urlStr: string) => {
      if (isDisposed || !urlStr) return;
      if (
        urlStr.includes("access_token") ||
        urlStr.includes("code=") ||
        urlStr.includes("error=") ||
        urlStr.includes("type=recovery") ||
        urlStr.includes("mode=reset")
      ) {
        if (urlStr.includes("type=recovery") || urlStr.includes("mode=reset")) {
          this.setRecoveryMode(true);
        }
        const res = await this.handleAuthCallback(urlStr);
        if (res.success && res.session && res.user) {
          onAuthSuccess?.(res.session, res.user, res.isRecovery);
        } else if (res.error) {
          onAuthError?.(res.error, res.isExpired);
        }
      }
    };

    // 1. Check current window location for web callback or startup fragment
    if (typeof window !== "undefined") {
      const fullLocation = window.location.href;
      if (
        fullLocation.includes("access_token") ||
        fullLocation.includes("code=") ||
        fullLocation.includes("error=")
      ) {
        void processIncoming(fullLocation);
      }
    }

    // 2. Setup Tauri Deep Link Plugin listener if running in desktop shell
    if (this.isTauriEnvironment()) {
      import("@tauri-apps/plugin-deep-link")
        .then(async ({ onOpenUrl, getCurrent }) => {
          if (isDisposed) return;

          // Check if app was cold-started via deep link
          try {
            const initialUrls = await getCurrent();
            if (initialUrls && initialUrls.length > 0) {
              for (const url of initialUrls) {
                await processIncoming(url);
              }
            }
          } catch {
            // Ignore if getCurrent is not supported on platform
          }

          // Listen for active runtime deep link events (app already open)
          try {
            const unlisten = await onOpenUrl((urls) => {
              for (const url of urls) {
                void processIncoming(url);
              }
            });
            if (isDisposed) {
              unlisten();
            } else {
              deepLinkUnlisten = unlisten;
            }
          } catch {
            // Deep link listener registration handled gracefully
          }
        })
        .catch(() => {
          // Ignore import error when running outside Tauri desktop runtime
        });
    }

    return () => {
      isDisposed = true;
      if (deepLinkUnlisten) {
        deepLinkUnlisten();
      }
    };
  }

  /**
   * Subscribes to auth state changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED).
   */
  public onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void
  ): () => void {
    if (!isSupabaseConfigured()) {
      return () => {};
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(callback);

    return () => {
      subscription.unsubscribe();
    };
  }
}

export const authService = new AuthService();
