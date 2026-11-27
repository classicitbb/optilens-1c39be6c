import { useEffect, useMemo, useState } from "react";
import { loadPublicContentIndex, searchPublicPages } from "@/lib/publicSiteSearch";
import type { PublicContentEntry } from "@/lib/generated/publicContentIndex";
import { useOnlineStatus } from "./useOnlineStatus";

export function usePublicPageSearch(query: string) {
  const [index, setIndex] = useState<PublicContentEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const online = useOnlineStatus();
  const active = query.trim().length >= 2;
  useEffect(() => {
    if (!active || index || !online) return;
    let cancelled = false;
    setFailed(false);
    loadPublicContentIndex().then((loaded) => {
      if (!cancelled) setIndex(loaded);
    }).catch(() => {
      if (!cancelled) setFailed(true);
    });
    return () => { cancelled = true; };
  }, [active, attempt, index, online]);
  const hits = useMemo(() => active && index ? searchPublicPages(index, query.trim(), 6) : [], [active, index, query]);
  return {
    hits,
    status: !active ? "idle" : index ? "ready" : !online ? "offline" : failed ? "error" : "loading",
    retry: () => { setFailed(false); setAttempt((value) => value + 1); },
  };
}
