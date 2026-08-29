/**
 * supabaseClient.ts — Core Supabase client initialization & configuration.
 *
 * Adheres to Vectoris Security Architecture:
 * - Only public anonymous credentials (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are consumed on the client.
 * - Never includes or references service_role keys or database superuser credentials.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../data/database.types";

function getEnvValue(key: string): string | undefined {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  const globalProcess = typeof globalThis !== "undefined" ? (globalThis as { process?: { env?: Record<string, string> } }).process : undefined;
  return globalProcess?.env?.[key];
}

let overrideConfigured: boolean | null = null;

export const setSupabaseConfiguredForTest = (configured: boolean | null): void => {
  overrideConfigured = configured;
};

export const isSupabaseConfigured = (): boolean => {
  if (overrideConfigured !== null) return overrideConfigured;
  const url = getEnvValue("VITE_SUPABASE_URL");
  const anonKey = getEnvValue("VITE_SUPABASE_ANON_KEY");
  return Boolean(
    url &&
      anonKey &&
      url !== "https://your-project-ref.supabase.co" &&
      !url.includes("placeholder")
  );
};

let clientInstance: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (clientInstance) {
    return clientInstance;
  }

  const url = getEnvValue("VITE_SUPABASE_URL") || "https://placeholder-vectoris.supabase.co";
  const anonKey = getEnvValue("VITE_SUPABASE_ANON_KEY") || "placeholder-anon-key";

  clientInstance = createClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "vectoris.supabase.auth.token",
    },
  });

  return clientInstance;
}

export const supabase = getSupabaseClient();
