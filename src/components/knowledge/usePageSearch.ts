import { useEffect, useMemo, useState } from "react";

import {
  loadPublicContentIndex,
  searchPublicPages,
  type PageSearchHit,
} from "@/lib/publicSiteSearch";
import type { PublicContentEntry } from "@/lib/generated/publicContentIndex";

const MIN_QUERY_LENGTH = 2;

/**
 * Site-wide page results for a query, alongside the knowledge-article results.
 * The generated prose index is fetched on first use and cached for the session;
 * the matches themselves are derived during render, not stored.
 */
export const usePageSearch = (query: string): PageSearchHit[] => {
  const [index, setIndex] = useState<PublicContentEntry[] | null>(null);
  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < MIN_QUERY_LENGTH || index) return;

    let cancelled = false;
    loadPublicContentIndex().then((loaded) => {
      if (!cancelled) setIndex(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [index, trimmed]);

  return useMemo(
    () => (index && trimmed.length >= MIN_QUERY_LENGTH ? searchPublicPages(index, trimmed) : []),
    [index, trimmed],
  );
};
