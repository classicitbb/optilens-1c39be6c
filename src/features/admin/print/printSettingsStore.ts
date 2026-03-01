import { resolvePrintSettings } from "@/features/admin/print/printStyles";
import { PrintSettings } from "@/features/admin/print/types";

const STORAGE_KEY = "admin-print-layout-profiles-v1";

type PrintLayoutProfiles = Record<string, PrintSettings>;

const readProfiles = (): PrintLayoutProfiles => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PrintLayoutProfiles;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
};

const writeProfiles = (profiles: PrintLayoutProfiles) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    // ignore storage errors
  }
};

export const getPersistedPrintSettings = (
  profileId: string,
  fallback?: Partial<PrintSettings>,
): PrintSettings => {
  const profiles = readProfiles();
  return resolvePrintSettings({ ...fallback, ...profiles[profileId] });
};

export const savePersistedPrintSettings = (
  profileId: string,
  settings: Partial<PrintSettings>,
): PrintSettings => {
  const profiles = readProfiles();
  const resolved = resolvePrintSettings(settings);
  profiles[profileId] = resolved;
  writeProfiles(profiles);
  return resolved;
};
