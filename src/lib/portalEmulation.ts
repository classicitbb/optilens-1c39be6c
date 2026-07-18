/**
 * Admin portal emulation: lets staff view the customer portal as a specific
 * portal account without logging into it. Client-side only — the admin stays
 * signed in as themselves; usePortalIdentity resolves the target's identity,
 * and the live-data-gateway honors website_customer_id overrides for staff
 * server-side. Session-scoped: closing the tab exits emulation.
 */

export interface PortalEmulationTarget {
  userId: string;
  label: string;
}

const KEY = "cv.portalEmulation";
const EVENT = "cv:portal-emulation-changed";

export function getPortalEmulation(): PortalEmulationTarget | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PortalEmulationTarget;
    return parsed && typeof parsed.userId === "string" && parsed.userId ? parsed : null;
  } catch {
    return null;
  }
}

export function startPortalEmulation(target: PortalEmulationTarget) {
  sessionStorage.setItem(KEY, JSON.stringify(target));
  window.dispatchEvent(new Event(EVENT));
}

export function stopPortalEmulation() {
  sessionStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function onPortalEmulationChange(listener: () => void) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
