import type { Session } from "@supabase/supabase-js";

/**
 * Admin portal emulation state. Newer Website Portals emulation signs the tab
 * in as the customer through Supabase Auth and keeps the original admin session
 * in sessionStorage so this tab can return to admin afterward.
 */

export interface PortalEmulationTarget {
  userId: string;
  label: string;
  mode?: "identity" | "signed-in-as";
}

interface StoredAdminSession {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string | null;
}

const KEY = "cv.portalEmulation";
const ADMIN_SESSION_KEY = "cv.portalAdminSession";
const EVENT = "cv:portal-emulation-changed";

export function getPortalEmulation(): PortalEmulationTarget | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PortalEmulationTarget;
    return parsed && typeof parsed.userId === "string" && parsed.userId
      ? {
          ...parsed,
          mode: parsed.mode === "signed-in-as" ? "signed-in-as" : "identity",
        }
      : null;
  } catch {
    return null;
  }
}

export function getStoredPortalAdminSession(): StoredAdminSession | null {
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAdminSession;
    return parsed?.accessToken && parsed?.refreshToken ? parsed : null;
  } catch {
    return null;
  }
}

export function startPortalEmulation(target: PortalEmulationTarget, adminSession?: Session | null) {
  sessionStorage.setItem(KEY, JSON.stringify(target));
  if (adminSession?.access_token && adminSession.refresh_token && adminSession.user?.id) {
    const stored: StoredAdminSession = {
      accessToken: adminSession.access_token,
      refreshToken: adminSession.refresh_token,
      userId: adminSession.user.id,
      email: adminSession.user.email ?? null,
    };
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(stored));
  }
  window.dispatchEvent(new Event(EVENT));
}

export function stopPortalEmulation() {
  sessionStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function clearStoredPortalAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

export async function restorePortalAdminSession(supabaseClient: {
  auth: {
    setSession: (session: { access_token: string; refresh_token: string }) => Promise<{ error: Error | null }>;
  };
}) {
  const stored = getStoredPortalAdminSession();
  if (!stored) return false;

  const { error } = await supabaseClient.auth.setSession({
    access_token: stored.accessToken,
    refresh_token: stored.refreshToken,
  });
  if (error) throw error;
  return true;
}

export function onPortalEmulationChange(listener: () => void) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
