import { useCallback, useState } from "react";
import { useSearchParams } from "react-router";

import type { Audience } from "@/components/home/homeContent";

/**
 * Which homepage audience is active.
 *
 * Resolution order: `?for=patients|professionals` in the URL (shareable, used
 * by campaigns and the patient nav), then the visitor's last choice in this
 * browser, then the professional default. Professionals stay the default so
 * crawlers and first-time trade visitors always receive the full trade page.
 */
const STORAGE_KEY = "cv:home-audience";
const PARAM = "for";

const fromParam = (value: string | null): Audience | null => {
  if (value === "patients" || value === "visitors") return "visitor";
  if (value === "professionals") return "professional";
  return null;
};

const readStored = (): Audience | null => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "visitor" || stored === "professional" ? stored : null;
  } catch {
    return null;
  }
};

export const useHomeAudience = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [audience, setAudienceState] = useState<Audience>(
    () => fromParam(searchParams.get(PARAM)) ?? readStored() ?? "professional",
  );

  const setAudience = useCallback(
    (next: Audience) => {
      setAudienceState(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Storage blocked — the choice still applies for this visit.
      }
      setSearchParams(
        (params) => {
          const updated = new URLSearchParams(params);
          if (next === "visitor") updated.set(PARAM, "patients");
          else updated.delete(PARAM);
          return updated;
        },
        { replace: true, preventScrollReset: true },
      );
    },
    [setSearchParams],
  );

  return [audience, setAudience] as const;
};
