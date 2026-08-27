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
   */
  public async signUp(params: SignUpParams): Promise<AuthResult> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: "Supabase connection is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.",
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: params.email.trim(),
        password: params.password,
        options: {
          data: {
            full_name: params.fullName?.trim() || "",
          },
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
