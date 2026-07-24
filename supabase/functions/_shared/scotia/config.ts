// ============================================================
// Scotia eCom+ — shared config resolver
// ------------------------------------------------------------
// Used by both `scotia-payment` (prepare/validate, called from the browser
// with the user's session) and `scotia-return` (the public redirect-back
// endpoint, called by the buyer's browser with no Supabase auth at all).
// Both need the identical StoreID/SharedSecret resolution logic, so it lives
// here once instead of drifting between two copies.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import type { ScotiaEnv } from "./ipgConnect.ts";

export interface ScotiaConfig {
  storeId: string;
  sharedSecret: string;
  env: ScotiaEnv;
  timezone: string;
  currency: string;
}

// Service-role client — every Scotia edge function needs this to read the
// admin-managed credential store (get_scotia_credentials, service-role-only)
// and, for scotia-return, to settle orders/payments with no user session.
export const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

/**
 * Resolve credentials. Primary source is the admin-managed secret store
 * (get_scotia_credentials, service-role only, decrypts server-side). Falls
 * back to environment variables so functions still work before the store is
 * populated (or in local/dev).
 */
export async function getScotiaConfig(): Promise<ScotiaConfig> {
  const envCfg: ScotiaConfig = {
    storeId: Deno.env.get("SCOTIA_STORE_ID") ?? "",
    sharedSecret: Deno.env.get("SCOTIA_SHARED_SECRET") ?? "",
    env: (Deno.env.get("SCOTIA_ENV") ?? "test") as ScotiaEnv,
    timezone: Deno.env.get("SCOTIA_TIMEZONE") ?? "America/Barbados",
    currency: Deno.env.get("SCOTIA_CURRENCY") ?? "840", // 840 = USD
  };

  try {
    const { data, error } = await supabaseAdmin.rpc("get_scotia_credentials");
    const row = Array.isArray(data) ? data[0] : data;
    if (!error && row?.store_id && row?.shared_secret) {
      return {
        storeId: row.store_id,
        sharedSecret: row.shared_secret,
        env: (row.environment ?? envCfg.env) as ScotiaEnv,
        timezone: row.timezone ?? envCfg.timezone,
        currency: row.currency ?? envCfg.currency,
      };
    }
  } catch (_err) {
    // Secret store unavailable → fall back to env config below.
  }

  return envCfg;
}

/** Where scotia-return sends the browser back to after settling the result. */
export function siteOrigin(): string {
  return Deno.env.get("SCOTIA_SITE_ORIGIN") ?? "https://classicvisions.net";
}
