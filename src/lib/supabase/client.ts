"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabaseConfig } from "./config";
let client: SupabaseClient<Database> | undefined;
export function getSupabaseBrowserClient() {
  const config = getSupabaseConfig();
  if (!config) return null;
  client ??= createBrowserClient<Database>(config.url, config.publishableKey, {
    auth: { detectSessionInUrl: false },
    cookieOptions: {
      sameSite: "lax",
      secure: window.location.protocol === "https:",
    },
  });
  return client;
}
