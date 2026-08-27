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

class AuthService {
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
   * Resolves the appropriate authentication redirect URL based on runtime environment.
   * - Installed Tauri Desktop: "vectoris://auth-callback"
   * - Web Development: "http://localhost:5173/auth?mode=callback" (or current origin)
   */
  public getAuthRedirectUrl(): string {
    if (this.isTauriEnvironment()) {
      return "vectoris://auth-callback";
    }
    if (typeof window !== "undefined" && window.location) {
      return `${window.location.origin}/auth?mode=callback`;
    }
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
        const isUnconfirmed =
          error.message?.toLowerCase().includes("email not confirmed") ||
          error.message?.toLowerCase().includes("unconfirmed");
        return {
          success: false,
          error: error.message || "Failed to sign in. Please verify your credentials.",
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
        return {
          success: false,
          error: error.message || "Failed to create account. Please try again.",
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
   * Resends the verification confirmation email.
   */
  public async resendVerificationEmail(email: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: true };
    }

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
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
   * Terminates the current active session.
   */
  public async signOut(): Promise<{ success: boolean; error?: string }> {
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

    const { accessToken, refreshToken, code, error, errorDescription } =
      this.extractAuthParams(rawUrlOrFragment);

    if (error || errorDescription) {
      return {
        success: false,
        error: errorDescription || error || "Authentication verification failed.",
      };
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
            const cleanUrl = window.location.pathname;
            window.history.replaceState(null, "", cleanUrl);
          } catch {
            // Ignore history errors
          }
        }

        if (sessionError) {
          return { success: false, error: sessionError.message };
        }

        return {
          success: true,
          user: data.user,
          session: data.session,
          isEmailUnconfirmed: false,
        };
      }

      if (code) {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        // Sanitize browser URL
        if (typeof window !== "undefined" && window.history && window.location.search) {
          try {
            window.history.replaceState(null, "", window.location.pathname);
          } catch {
            // Ignore history errors
          }
        }

        if (exchangeError) {
          return { success: false, error: exchangeError.message };
        }

        return {
          success: true,
          user: data.user,
          session: data.session,
          isEmailUnconfirmed: false,
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
    onAuthSuccess?: (session: Session, user: User) => void,
    onAuthError?: (errorMsg: string) => void
  ): () => void {
    let isDisposed = false;
    let deepLinkUnlisten: (() => void) | null = null;

    const processIncoming = async (urlStr: string) => {
      if (isDisposed || !urlStr) return;
      if (urlStr.includes("access_token") || urlStr.includes("code=") || urlStr.includes("error=")) {
        const res = await this.handleAuthCallback(urlStr);
        if (res.success && res.session && res.user) {
          onAuthSuccess?.(res.session, res.user);
        } else if (res.error) {
          onAuthError?.(res.error);
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
