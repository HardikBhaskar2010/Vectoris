/**
 * useAuth.ts — React hook for reactive Supabase authentication and user state.
 */

import { useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { authService, AuthResult, SignInParams, SignUpParams } from "../services/authService";

export interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (params: SignInParams) => Promise<AuthResult>;
  signUp: (params: SignUpParams) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    authService.getSession().then((initialSession) => {
      if (!isMounted) return;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);
    });

    const unsubscribe = authService.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = async (params: SignInParams): Promise<AuthResult> => {
    setLoading(true);
    const result = await authService.signIn(params);
    if (result.success && result.session) {
      setSession(result.session);
      setUser(result.session.user);
    }
    setLoading(false);
    return result;
  };

  const signUp = async (params: SignUpParams): Promise<AuthResult> => {
    setLoading(true);
    const result = await authService.signUp(params);
    if (result.success && result.session) {
      setSession(result.session);
      setUser(result.session.user);
    }
    setLoading(false);
    return result;
  };

  const signOut = async (): Promise<void> => {
    setLoading(true);
    await authService.signOut();
    setSession(null);
    setUser(null);
    setLoading(false);
  };

  return {
    user,
    session,
    loading,
    isAuthenticated: Boolean(user),
    signIn,
    signUp,
    signOut,
  };
}
