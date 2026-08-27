/**
 * supabaseClient.ts — Core Supabase client initialization & configuration.
 *
 * Adheres to Vectoris Security Architecture:
 * - Only public anonymous credentials (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are consumed on the client.
 * - Never includes or references service_role keys or database superuser credentials.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../data/database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      supabaseUrl !== "https://your-project-ref.supabase.co" &&
      !supabaseUrl.includes("placeholder")
  );
};

let clientInstance: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (clientInstance) {
    return clientInstance;
  }

  const url = supabaseUrl || "https://placeholder-vectoris.supabase.co";
  const anonKey = supabaseAnonKey || "placeholder-anon-key";

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
